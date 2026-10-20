"""AbidingSteps core — the agent API, applied directly to the cloud copy of your data. Standard library only.

Why this exists: an LLM agent should be able to survey and manage your outcomes ON THE FLY, while none of your
devices has the app open, and your devices catch up (merge) the next time you open them. There is no server of
yours in the loop: this code runs in the agent's own runtime and talks to Firestore over plain HTTPS.

It mirrors the in-app API (`window.abidingAgent`, see AGENTIC_GUIDE.md): the same operations, arguments, results and
error messages, the same step grammar ("- open", "+ done", 2-space indent = substep, @context, >date) and the same
bucket rules, so an agent can use either path interchangeably.

Safe against your devices: it edits only `data.outcomes` and `data.notes` of the cloud doc, using an optimistic
precondition (the doc's updateTime) and retrying on conflict, never touching other keys. Your devices merge its change
with their own work (three-way), exactly as they merge each other's.

    from abidingsteps_core import call, RestStore, FileStore
    call("state")                                  # uses RestStore() configured from the environment
    call("addStep", {"outcome": "Plan retreat", "text": "Call venue @call >fri"})
"""
import base64
import datetime as _dt
import hashlib
import json
import os
import random
import re
import string
import time
import urllib.error
import urllib.parse
import urllib.request

BUCKETS = ["Inbox", "Today", "Week", "Later", "Open", "Maybe", "Done"]
STEP_RE = re.compile(r"^\s*([-+])\s+(\S.*?)\s*$")
CTX_RE = re.compile(r"(^|\s)@([A-Za-z][\w-]*)")
DATE_RE = re.compile(r"(^|\s)>(\d{4}-\d{2}-\d{2}|\d{1,2}-\d{1,2})(?=\s|$)")
WORD_DATE_RE = re.compile(r"(^|\s)>(today|tomorrow|(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*)(?=\s|$)", re.I)
WEEKDAY_OK = re.compile(r"^(sun(day)?|mon(day)?|tue(s|sday)?|wed(nesday)?|thu(r|rs|rsday)?|fri(day)?|sat(urday)?)$")
DOW = {"sun": 0, "mon": 1, "tue": 2, "wed": 3, "thu": 4, "fri": 5, "sat": 6}
_TODAY = {"override": None}


class AgentError(Exception):
    def __init__(self, msg, extra=None):
        super().__init__(msg)
        self.extra = extra or {}


class Conflict(Exception):
    """The cloud doc changed between reading and writing — reload and retry."""


def fail(msg, extra=None):
    raise AgentError(msg, extra)


# ------------------------------------------------------------------------------------------------ dates & text
def today():
    if _TODAY["override"]:
        return _TODAY["override"]
    tz = os.environ.get("ABIDINGSTEPS_TZ")
    if tz:
        try:
            from zoneinfo import ZoneInfo
            return _dt.datetime.now(ZoneInfo(tz)).date()
        except Exception:
            pass
    return _dt.date.today()


def set_today(d):  # tests
    _TODAY["override"] = d


def key(d):
    return d.isoformat()


def add_days_key(n):
    return key(today() + _dt.timedelta(days=n))


def next_weekday_key(dow):  # the next such day strictly after today (0=Sun … 6=Sat)
    t = today()
    js_dow = (t.weekday() + 1) % 7
    return key(t + _dt.timedelta(days=((dow - js_dow) % 7) or 7))


def abs_dates(text):
    def sub(m):
        pre, w = m.group(1), m.group(2).lower()
        if w not in ("today", "tomorrow") and not WEEKDAY_OK.match(w):
            return m.group(0)
        if w == "today":
            return pre + ">" + add_days_key(0)
        if w == "tomorrow":
            return pre + ">" + add_days_key(1)
        return pre + ">" + next_weekday_key(DOW[w[:3]])
    return WORD_DATE_RE.sub(sub, str(text))


def date_in(text):
    m = DATE_RE.search(str(text))
    if not m:
        return None
    v = m.group(2)
    if len(v) == 10:
        return v
    mo, d = (int(x) for x in v.split("-"))
    t = today()
    y = t.year
    try:
        if _dt.date(y, mo, d) < t - _dt.timedelta(days=180):
            y += 1
        return "%04d-%02d-%02d" % (y, mo, d)
    except ValueError:
        return None


def ctx_in(text):
    return [m.group(2).lower() for m in CTX_RE.finditer(str(text))]


def norm(t):
    return str(t if t is not None else "").strip().lower()


def indent_of(ln):
    return len(re.match(r"^[ \t]*", ln).group(0).replace("\t", "  "))


def check_date(v):
    if v == "today":
        return key(today())
    s = str(v)
    abs_ = s if re.match(r"^\d{4}-\d{2}-\d{2}$", s) else abs_dates(">" + s)[1:]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", abs_):
        fail("bad date — use YYYY-MM-DD, today, tomorrow or a weekday")
    return abs_


def new_id(prefix):
    n = int(time.time() * 1000)
    b36 = ""
    digits = string.digits + string.ascii_lowercase
    while n:
        n, r = divmod(n, 36)
        b36 = digits[r] + b36
    return prefix + b36 + "".join(random.choice(digits) for _ in range(5 if prefix == "o" else 4))


# ------------------------------------------------------------------------------------------------ the model
class Model:
    """outcomes (list of dicts) + notes (key → text), exactly as the app stores them."""

    def __init__(self, outcomes, notes):
        self.outcomes = outcomes
        self.notes = notes

    # note text ↔ lines
    def key_for(self, o, m=None):
        return o["id"] + ("#" + m["id"] if m else "")

    def lines(self, o, m=None):
        t = self.notes.get(self.key_for(o, m), "")
        return [] if t == "" else t.split("\n")

    def write_lines(self, o, m, lines):
        k = self.key_for(o, m)
        text = "\n".join(lines)
        if text.strip() == "":
            self.notes.pop(k, None)
        else:
            self.notes[k] = text
        self.sync_scope(o, m)

    def write_text(self, o, m, text):
        k = self.key_for(o, m)
        if str(text).strip() == "":
            self.notes.pop(k, None)
        else:
            self.notes[k] = str(text)
        self.sync_scope(o, m)

    def sync_scope(self, o, m):  # the app derives subs/doneSubs from the notes; keep the cache consistent
        scope = m or o
        top = [STEP_RE.match(l) for l in self.lines(o, m) if indent_of(l) == 0]
        top = [r for r in top if r]
        scope["subs"] = list(dict.fromkeys(r.group(2) for r in top if r.group(1) == "-"))
        scope["doneSubs"] = list(dict.fromkeys(r.group(2) for r in top if r.group(1) == "+"))
        scope["nl"] = True

    def end_line(self, o, m=None):
        lines = self.lines(o, m)
        i = len(lines)
        while i > 0 and lines[i - 1].strip() == "":
            i -= 1
        return i


def block_end(lines, i):
    ind = indent_of(lines[i])
    last = i
    for j in range(i + 1, len(lines)):
        if lines[j].strip() == "":
            continue
        if indent_of(lines[j]) > ind:
            last = j
        else:
            break
    return last + 1


def is_open_step(l):
    r = STEP_RE.match(l)
    return bool(r and r.group(1) == "-")


def scan_steps(model, o):
    """Every open step of the outcome and its live milestones, with inherited @contexts and >date."""
    items = []
    for m in [None] + [x for x in o.get("milestones", []) if not x.get("completed")]:
        stack = []
        for raw in model.lines(o, m):
            if raw.strip() == "":
                continue
            ind = indent_of(raw)
            while stack and stack[-1]["ind"] >= ind:
                stack.pop()
            par = stack[-1] if stack else None
            r = STEP_RE.match(raw)
            text = r.group(2) if r else raw.strip()
            ctx = list(dict.fromkeys((par["ctx"] if par else []) + ctx_in(text)))
            date = date_in(text) or (par["date"] if par else None)
            top = par["top"] if par else None
            closed = par["closed"] if par else False
            if ind == 0:
                top = r.group(2) if (r and r.group(1) == "-") else None
                closed = bool(r and r.group(1) == "+")
            stack.append({"ind": ind, "ctx": ctx, "top": top, "closed": closed, "date": date})
            if r and r.group(1) == "-" and not closed:
                items.append({"o": o, "m": m, "text": text, "ctx": ctx, "sub": top, "date": date})
    return items


def eff_info(model, o):
    tk = key(today())
    own = o.get("planned") if (o.get("planned") and o["planned"] > tk) else None
    steps = scan_steps(model, o)
    dated = sorted(x["date"] for x in steps if x["date"])
    first = dated[0] if dated else None
    if own:
        return {"date": first, "step": True} if (first and first < own) else {"date": own, "step": False}
    if first and not any(not x["date"] for x in steps):
        return {"date": first, "step": True}
    return {"date": None, "step": False}


def is_today(o):
    return bool(o.get("planned")) and o["planned"] <= key(today())


def snoozed_until(model, o):
    e = eff_info(model, o)
    return e["date"] if (e["date"] and e["date"] > key(today())) else None


def bucket_of(model, o):
    if o.get("completed"):
        return "Done"
    if o.get("maybe"):
        return "Maybe"
    if is_today(o):
        return "Today"
    d = snoozed_until(model, o)
    if d:
        return "Week" if d <= add_days_key(7) else "Later"
    return "Open" if o.get("type") else "Inbox"


def move_to_bucket(model, o, b):
    o["completed"] = False
    o["maybe"] = False
    if b == "Inbox":
        o["planned"] = None
        o["type"] = None
    elif b == "Today":
        o["planned"] = key(today())
    elif b == "Week":
        if bucket_of(model, o) != "Week":
            o["planned"] = add_days_key(1)
    elif b == "Later":
        if bucket_of(model, o) != "Later":
            o["planned"] = add_days_key(14)
    elif b == "Open":
        o["planned"] = None
        o["type"] = o.get("type") or "Destination"
    elif b == "Maybe":
        o["maybe"] = True
    elif b == "Done":
        o["completed"] = True


def snooze_outcome(o, k):
    if not k or k <= key(today()):
        o["planned"] = key(today())
    else:
        o["planned"] = k


def make_outcome(title, typ=None, tag=None, **extra):
    o = {"id": new_id("o"), "t": title, "type": typ or None, "tag": tag or None, "budget": None, "starred": False,
         "planned": None, "completed": False, "maybe": False, "subs": [], "milestones": [], "lastWorked": None}
    o.update(extra)
    return o


def make_milestone(title):
    return {"id": new_id("m"), "t": title, "completed": False, "maybe": False, "planned": None, "lastWorked": None, "subs": []}


def apply_budget(o, spec):
    if not spec:
        o["budget"] = None
    elif o.get("budget") and o["budget"].get("period") == spec["period"]:
        o["budget"]["target"] = spec["target"]
    else:
        o["budget"] = {"target": spec["target"], "period": spec["period"], "acc": 0, "countedAt": int(time.time() * 1000)}


# ------------------------------------------------------------------------------------------------ lookups
def find_o(model, ref):
    if ref is None or ref == "":
        fail("outcome required")
    ref = str(ref)
    by_id = [x for x in model.outcomes if x["id"] == ref]
    if by_id:
        return by_id[0]
    n = norm(ref)
    exact = [x for x in model.outcomes if norm(x["t"]) == n]
    if len(exact) == 1:
        return exact[0]
    part = exact or [x for x in model.outcomes if n in norm(x["t"])]
    if len(part) == 1:
        return part[0]
    fail("ambiguous outcome" if part else "no such outcome",
         {"candidates": [{"id": x["id"], "title": x["t"]} for x in part[:8]]} if part else None)


def find_m(o, ref):
    if ref is None or ref == "":
        return None
    n = norm(ref)
    ms = o.get("milestones", [])
    hit = next((m for m in ms if m["id"] == ref), None)
    if not hit:
        ex = [m for m in ms if norm(m["t"]) == n]
        hit = ex[0] if len(ex) == 1 else None
    if not hit:
        pt = [m for m in ms if n in norm(m["t"])]
        hit = pt[0] if len(pt) == 1 else None
    if not hit:
        fail("no such milestone", {"milestones": [{"id": m["id"], "title": m["t"]} for m in ms]})
    return hit


def find_line(model, o, mref, text, steps_only, nth=None):
    if not text:
        fail("step text required")
    scopes = [find_m(o, mref)] if (mref is not None and mref != "") else [None] + o.get("milestones", [])
    n = re.sub(r"^[-+]\s+", "", norm(text))
    hits = []
    for m in scopes:
        for i, ln in enumerate(model.lines(o, m)):
            r = STEP_RE.match(ln)
            if steps_only and not r:
                continue
            t = norm(r.group(2) if r else ln)
            if t == n or n in t:
                hits.append({"m": m, "i": i, "ln": ln, "exact": t == n})
    ex = [h for h in hits if h["exact"]]
    use = ex or hits
    if len(use) == 1:
        return use[0]
    if nth and 1 <= int(nth) <= len(use):
        return use[int(nth) - 1]
    fail("ambiguous step — add nth (1-based) to pick one of the identical/similar lines" if use else "no such step",
         {"candidates": [dict({"nth": i + 1}, **({"milestone": h["m"]["t"]} if h["m"] else {}), line=h["ln"].strip()) for i, h in enumerate(use[:8])]} if use else None)


# ------------------------------------------------------------------------------------------------ reading helpers
def open_count(model, o):
    return len(scan_steps(model, o))


def row(model, o):
    r = {"id": o["id"], "title": o["t"], "bucket": bucket_of(model, o)}
    if o.get("starred"):
        r["starred"] = 1
    if o.get("planned"):
        r["planned"] = o["planned"]
    if o.get("type"):
        r["type"] = o["type"]
    n = open_count(model, o)
    if n:
        r["open"] = n
    if o.get("milestones"):
        r["milestones"] = len(o["milestones"])
    return r


def outline_of(model, o):
    head = "# %s %s [%s]%s%s%s" % (o["id"], o["t"], bucket_of(model, o), " ★" if o.get("starred") else "",
                                  " plan:" + o["planned"] if o.get("planned") else "", " " + o["type"] if o.get("type") else "")
    out = [head] + model.lines(o)
    for m in o.get("milestones", []):
        out.append("◆ %s %s%s" % (m["id"], m["t"], " (done)" if m.get("completed") else ""))
        out.extend(("  " + l) for l in model.lines(o, m))
    return "\n".join(out)


def canon_bucket(b):
    return next((x for x in BUCKETS if norm(x) == norm(b)), None)


def clip(n, d):
    try:
        return max(1, min(200, int(n)))
    except (TypeError, ValueError):
        return d


# ------------------------------------------------------------------------------------------------ pruning done things
def prune_done_lines(lines):
    out, removed, i = [], 0, 0
    while i < len(lines):
        ln = lines[i]
        r = STEP_RE.match(ln)
        if r and r.group(1) == "+":
            ind = indent_of(ln)
            j = i + 1
            while j < len(lines) and (lines[j].strip() == "" or indent_of(lines[j]) > ind):
                j += 1
            blk = lines[i:j]
            if not any(is_open_step(b) for b in blk):
                removed += sum(1 for b in blk if (STEP_RE.match(b) and STEP_RE.match(b).group(1) == "+"))
                i = j
                continue
        out.append(ln)
        i += 1
    return out, removed


def clear_done_in(model, o):
    steps = mss = 0
    lines, removed = prune_done_lines(model.lines(o))
    if removed:
        model.write_lines(o, None, lines)
        steps += removed
    for m in list(o.get("milestones", [])):
        mlines, rm = prune_done_lines(model.lines(o, m))
        if rm:
            model.write_lines(o, m, mlines)
            steps += rm
        if m.get("completed") and not any(is_open_step(l) for l in model.lines(o, m)):
            o["milestones"] = [x for x in o["milestones"] if x is not m]
            mss += 1
            k = model.key_for(o, m)
            for nk in [x for x in model.notes if x == k or x.startswith(k + "|")]:
                model.notes.pop(nk, None)
    return steps, mss


# ------------------------------------------------------------------------------------------------ operations
def _ok(**kw):
    d = {"ok": True}
    d.update(kw)
    return d


def op_state(model, a):
    tk = key(today())
    counts = {b: 0 for b in BUCKETS}
    due = starred = 0
    for o in model.outcomes:
        counts[bucket_of(model, o)] += 1
        if o.get("starred") and not o.get("completed"):
            starred += 1
        if not o.get("completed") and not o.get("maybe"):
            due += sum(1 for it in scan_steps(model, o) if it["date"] and it["date"] <= tk)
    todays = [o for o in model.outcomes if bucket_of(model, o) == "Today"]
    todays.sort(key=lambda o: 0 if o.get("starred") else 1)
    nxt = []
    for o in todays[:5]:
        st = scan_steps(model, o)
        d = {"id": o["id"], "outcome": o["t"]}
        if st:
            d["step"] = st[0]["text"]
        nxt.append(d)
    return _ok(today=tk, counts=counts, starred=starred, dueSteps=due, nextUp=nxt, timer=None,
               sync={"mode": "direct-cloud (no device)"})


def op_list(model, a):
    items = list(model.outcomes)
    if a.get("bucket"):
        b = canon_bucket(a["bucket"])
        if not b:
            fail("bucket must be one of " + "|".join(BUCKETS))
        items = [o for o in items if bucket_of(model, o) == b]
    else:
        items = [o for o in items if not o.get("completed")]
    if a.get("q"):
        items = [o for o in items if norm(a["q"]) in norm(o["t"])]
    if a.get("starred"):
        items = [o for o in items if o.get("starred")]
    return _ok(total=len(items), items=[row(model, o) for o in items[:clip(a.get("limit"), 25)]])


def op_outline(model, a):
    if a.get("outcome") not in (None, ""):
        return _ok(text=outline_of(model, find_o(model, a["outcome"])))
    b = canon_bucket(a["bucket"]) if a.get("bucket") else None
    if a.get("bucket") and not b:
        fail("bucket must be one of " + "|".join(BUCKETS))
    items = [o for o in model.outcomes if (bucket_of(model, o) == b if b else (not o.get("completed") and not o.get("maybe")))]
    return _ok(count=len(items), text="\n\n".join(outline_of(model, o) for o in items))


def op_agenda(model, a):
    tk = key(today())
    ctx = re.sub(r"^@", "", norm(a["context"])) if a.get("context") else None
    lim = check_date(a["date"]) if a.get("date") else None
    items = []
    for o in model.outcomes:
        if o.get("completed") or o.get("maybe"):
            continue
        for it in scan_steps(model, o):
            if not ctx and not it["date"] and not a.get("due") and not lim:
                continue
            if ctx and ctx not in it["ctx"]:
                continue
            if a.get("due") and not (it["date"] and it["date"] <= tk):
                continue
            if lim and not (it["date"] and it["date"] <= lim):
                continue
            if not a.get("includeFuture") and it["date"] and it["date"] > tk and not lim:
                continue
            r = {"outcome": o["t"], "id": o["id"], "step": it["text"]}
            if it["m"]:
                r["milestone"] = it["m"]["t"]
            if it["ctx"]:
                r["ctx"] = it["ctx"]
            if it["date"]:
                r["date"] = it["date"]
            items.append(r)
    items.sort(key=lambda x: x.get("date") or "9")
    return _ok(total=len(items), items=items[:clip(a.get("limit"), 50)])


def op_find(model, a):
    n = norm(a.get("q"))
    if not n:
        fail("q required")
    hits = []
    for o in model.outcomes:
        if n in norm(o["t"]):
            hits.append({"outcome": o["t"], "id": o["id"], "title": True})
        for m in [None] + o.get("milestones", []):
            for ln in model.lines(o, m):
                if n in norm(ln):
                    h = {"outcome": o["t"], "id": o["id"], "line": ln.strip()}
                    if m:
                        h["milestone"] = m["t"]
                    hits.append(h)
    return _ok(total=len(hits), items=hits[:clip(a.get("limit"), 20)])


def op_add(model, a):
    if not a.get("title") or not str(a["title"]).strip():
        fail("title required")
    b = canon_bucket(a["bucket"]) if a.get("bucket") else None
    if a.get("bucket") and not b:
        fail("bucket must be one of " + "|".join(BUCKETS))
    if a.get("type") not in (None, "", "Destination", "Directive"):
        fail("type must be Destination or Directive")
    planned = check_date(a["planned"]) if a.get("planned") else None
    o = make_outcome(str(a["title"]).strip(), a.get("type"), a.get("tag"))
    if a.get("starred"):
        o["starred"] = True
    model.outcomes.append(o)
    if b:
        move_to_bucket(model, o, b)
    if planned:
        snooze_outcome(o, planned)
    lines = ["- " + re.sub(r"^[-+]\s+", "", abs_dates(str(s).strip())) for s in (a.get("steps") or [])]
    if a.get("notes"):
        lines.extend(str(a["notes"]).split("\n"))
    if lines:
        model.write_lines(o, None, lines)
    return _ok(**row(model, o))


def op_update(model, a):
    o = find_o(model, a.get("outcome"))
    b = canon_bucket(a["bucket"]) if a.get("bucket") else None
    if a.get("bucket") and not b:
        fail("bucket must be one of " + "|".join(BUCKETS))
    if "type" in a and a["type"] and a["type"] not in ("Destination", "Directive"):
        fail("type must be Destination or Directive")
    planned = check_date(a["planned"]) if a.get("planned") else None
    if a.get("title"):
        o["t"] = str(a["title"]).strip()
    for f in ("starred", "maybe", "completed"):
        if f in a:
            o[f] = bool(a[f])
    if "type" in a:
        o["type"] = a["type"] or None
    if "tag" in a:
        o["tag"] = a["tag"] or None
    if "planned" in a:
        if not a["planned"]:
            o["planned"] = None
        else:
            snooze_outcome(o, planned)
    if b:
        move_to_bucket(model, o, b)
    if "budget" in a:
        bd = a["budget"]
        apply_budget(o, {"target": int(bd["minutes"]), "period": "total" if bd.get("per") == "total" else "week"} if bd else None)
    return _ok(**row(model, o))


def op_addStep(model, a):
    o = find_o(model, a.get("outcome"))
    if not a.get("text") or not str(a["text"]).strip():
        fail("text required")
    text = re.sub(r"^[-+]\s+", "", abs_dates(str(a["text"]).strip()))

    def same(l):
        r = STEP_RE.match(l)
        return bool(r and norm(r.group(2)) == norm(text))
    if a.get("under"):
        h = find_line(model, o, a.get("milestone"), a["under"], False, a.get("nth"))
        lines = model.lines(o, h["m"])
        end = block_end(lines, h["i"])
        if not a.get("allowDuplicate") and any(same(l) for l in lines[h["i"] + 1:end]):
            return _ok(duplicate=True)
        lines.insert(end, " " * (indent_of(lines[h["i"]]) + 2) + "- " + text)
        model.write_lines(o, h["m"], lines)
    else:
        m = find_m(o, a.get("milestone"))
        lines = model.lines(o, m)
        if not a.get("allowDuplicate") and any(indent_of(l) == 0 and same(l) for l in lines):
            return _ok(duplicate=True)
        lines.insert(model.end_line(o, m), "- " + text)
        model.write_lines(o, m, lines)
    return _ok(outline=outline_of(model, o))


def op_setStep(model, a):
    o = find_o(model, a.get("outcome"))
    h = find_line(model, o, a.get("milestone"), a.get("step"), True, a.get("nth"))
    lines = model.lines(o, h["m"])
    is_done = bool(re.match(r"^\s*\+", lines[h["i"]]))
    want = bool(a["done"]) if "done" in a else (not is_done)
    lines[h["i"]] = re.sub(r"^(\s*)[-+]", lambda m: m.group(1) + ("+" if want else "-"), lines[h["i"]], count=1)
    model.write_lines(o, h["m"], lines)
    return _ok(line=lines[h["i"]].strip())


def op_editStep(model, a):
    o = find_o(model, a.get("outcome"))
    h = find_line(model, o, a.get("milestone"), a.get("step"), True, a.get("nth"))
    if not a.get("text"):
        fail("text required")
    lines = model.lines(o, h["m"])
    old = STEP_RE.match(lines[h["i"]])
    lines[h["i"]] = re.sub(r"^(\s*[-+]\s+).*$", lambda m: m.group(1) + abs_dates(str(a["text"]).strip()), lines[h["i"]], count=1)
    model.write_lines(o, h["m"], lines)
    new = STEP_RE.match(lines[h["i"]])
    if old and new and indent_of(lines[h["i"]]) == 0 and new.group(2) != old.group(2):   # a step's own notes follow its new name
        k0 = model.key_for(o, h["m"]) + "|" + old.group(2)
        k1 = model.key_for(o, h["m"]) + "|" + new.group(2)
        if k0 in model.notes:
            model.notes[k1] = model.notes.pop(k0)
    return _ok(line=lines[h["i"]].strip())


def op_removeStep(model, a):
    if a.get("confirm") is not True:
        fail("removeStep needs confirm:true")
    o = find_o(model, a.get("outcome"))
    h = find_line(model, o, a.get("milestone"), a.get("step"), False, a.get("nth"))
    lines = model.lines(o, h["m"])
    del lines[h["i"]:block_end(lines, h["i"])]
    model.write_lines(o, h["m"], lines)
    return _ok()


def op_note(model, a):
    o = find_o(model, a.get("outcome"))
    if not a.get("text") or not str(a["text"]).strip():
        fail("text required")
    text = re.sub(r"^[-+]\s+", "", str(a["text"]).strip())
    if a.get("under"):
        h = find_line(model, o, a.get("milestone"), a["under"], False, a.get("nth"))
        lines = model.lines(o, h["m"])
        lines.insert(block_end(lines, h["i"]), " " * (indent_of(lines[h["i"]]) + 2) + text)
        model.write_lines(o, h["m"], lines)
    else:
        m = find_m(o, a.get("milestone"))
        lines = model.lines(o, m)
        lines.insert(model.end_line(o, m), text)
        model.write_lines(o, m, lines)
    return _ok()


def op_setNotes(model, a):
    if a.get("confirm") is not True:
        fail("setNotes needs confirm:true")
    o = find_o(model, a.get("outcome"))
    m = find_m(o, a.get("milestone"))
    model.write_text(o, m, a.get("text") if a.get("text") is not None else "")
    return _ok(outline=outline_of(model, o))


def op_addMilestone(model, a):
    o = find_o(model, a.get("outcome"))
    if not a.get("title"):
        fail("title required")
    m = make_milestone(str(a["title"]).strip())
    o["milestones"].append(m)
    if a.get("steps"):
        model.write_lines(o, m, ["- " + abs_dates(str(s).strip()) for s in a["steps"]])
    return _ok(id=m["id"])


def op_updateMilestone(model, a):
    o = find_o(model, a.get("outcome"))
    m = find_m(o, a.get("milestone"))
    if not m:
        fail("milestone required")
    if a.get("title"):
        m["t"] = str(a["title"]).strip()
    if "done" in a:
        m["completed"] = bool(a["done"])
    return _ok(id=m["id"], title=m["t"], done=bool(m.get("completed")))


def op_removeMilestone(model, a):
    if a.get("confirm") is not True:
        fail("removeMilestone needs confirm:true")
    o = find_o(model, a.get("outcome"))
    m = find_m(o, a.get("milestone"))
    if not m:
        fail("milestone required")
    o["milestones"] = [x for x in o["milestones"] if x is not m]
    k = model.key_for(o, m)
    for nk in [x for x in model.notes if x == k or x.startswith(k + "|")]:
        model.notes.pop(nk, None)
    return _ok()


def op_remove(model, a):
    if a.get("confirm") is not True:
        fail("remove needs confirm:true")
    o = find_o(model, a.get("outcome"))
    model.outcomes[:] = [x for x in model.outcomes if x is not o]
    for nk in [x for x in model.notes if x == o["id"] or x.startswith(o["id"] + "|") or x.startswith(o["id"] + "#")]:
        model.notes.pop(nk, None)
    return _ok()


def op_clearDone(model, a):
    if a.get("confirm") is not True:
        fail("clearDone needs confirm:true")
    b = canon_bucket(a["bucket"]) if a.get("bucket") else None
    if a.get("bucket") and not b:
        fail("bucket must be one of " + "|".join(BUCKETS))
    if a.get("outcome") not in (None, ""):
        targets = [find_o(model, a["outcome"])]
    elif b:
        targets = [o for o in model.outcomes if bucket_of(model, o) == b]
    elif a.get("all"):
        targets = list(model.outcomes)
    else:
        fail("give outcome, bucket or all:true")
    steps = mss = outs = 0
    for o in targets:
        if o.get("completed"):
            if a.get("all") or b == "Done":
                model.outcomes[:] = [x for x in model.outcomes if x is not o]
                outs += 1
                for nk in [x for x in model.notes if x == o["id"] or x.startswith(o["id"] + "|") or x.startswith(o["id"] + "#")]:
                    model.notes.pop(nk, None)
            continue
        s, m = clear_done_in(model, o)
        steps += s
        mss += m
    return _ok(steps=steps, milestones=mss, outcomes=outs)


def _device_only(name):
    def f(model, a):
        fail("%s needs a device or browser running the app — not available in direct-cloud mode" % name)
    return f


OPS = {
    "state": op_state, "list": op_list, "outline": op_outline, "agenda": op_agenda, "find": op_find,
    "add": op_add, "update": op_update, "addStep": op_addStep, "setStep": op_setStep, "editStep": op_editStep,
    "removeStep": op_removeStep, "note": op_note, "setNotes": op_setNotes, "addMilestone": op_addMilestone,
    "updateMilestone": op_updateMilestone, "removeMilestone": op_removeMilestone, "remove": op_remove,
    "clearDone": op_clearDone,
}
READ_ONLY = {"state", "list", "outline", "agenda", "find"}


# ------------------------------------------------------------------------------------------------ undo (same record format as the app)
def _snap_outcomes(model):
    return {o["id"]: {"j": json.dumps(o, separators=(",", ":"), ensure_ascii=False), "i": i} for i, o in enumerate(model.outcomes)}


def build_undo(model, pre_o, pre_n):
    post_o = _snap_outcomes(model)
    o, post, n, npost = {}, {}, {}, {}
    for oid in set(pre_o) | set(post_o):
        a, b = pre_o.get(oid), post_o.get(oid)
        if (json.loads(a["j"]) if a else None) != (json.loads(b["j"]) if b else None):
            o[oid] = {"j": a["j"], "i": a["i"]} if a else None
            post[oid] = b["j"] if b else None
    for k in set(pre_n) | set(model.notes):
        if pre_n.get(k) != model.notes.get(k):
            n[k] = pre_n.get(k)
            npost[k] = model.notes.get(k)
    if not o and not n:
        return None
    return {"id": new_id("u")[-8:], "at": int(time.time() * 1000), "o": o, "post": post, "n": n, "npost": npost}


def apply_undo(model, rec, force=False):
    if not force:
        changed = 0
        for oid, pj in rec["post"].items():
            cur = next((x for x in model.outcomes if x["id"] == oid), None)
            if (cur if cur is not None else None) != (json.loads(pj) if pj else None):
                changed += 1
        for k, t in rec["npost"].items():
            if model.notes.get(k) != t:
                changed += 1
        if changed:
            fail("those items changed since that edit — undo with force:true to overwrite the newer changes", {"changed": changed})
    for oid, pre in rec["o"].items():
        idx = next((i for i, x in enumerate(model.outcomes) if x["id"] == oid), -1)
        if pre is None:
            if idx >= 0:
                del model.outcomes[idx]
        else:
            obj = json.loads(pre["j"])
            if idx >= 0:
                model.outcomes[idx] = obj
            else:
                model.outcomes.insert(min(pre["i"], len(model.outcomes)), obj)
    for k, t in rec["n"].items():
        if t is None:
            model.notes.pop(k, None)
        else:
            model.notes[k] = t


# ------------------------------------------------------------------------------------------------ stores

# ------------------------------------------------------------------------------------------------ service-account sign-in (stdlib only)
def _b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _der_read(data, i):
    """One DER element at data[i:] → (tag, content bytes, next index)."""
    tag = data[i]
    ln = data[i + 1]
    j = i + 2
    if ln & 0x80:
        nb = ln & 0x7F
        ln = int.from_bytes(data[j:j + nb], "big")
        j += nb
    return tag, data[j:j + ln], j + ln


def _rsa_private_key(pem):
    """(n, d) from a PKCS#8 ('BEGIN PRIVATE KEY') or PKCS#1 ('BEGIN RSA PRIVATE KEY') PEM."""
    body = "".join(l for l in pem.strip().splitlines() if not l.startswith("-----"))
    der = base64.b64decode(body)
    _, seq, _ = _der_read(der, 0)
    t, first, nxt = _der_read(seq, 0)
    if "RSA PRIVATE KEY" not in pem:                 # PKCS#8: version, algorithm, OCTET STRING holding the PKCS#1 key
        _, _, nxt = _der_read(seq, nxt)              # skip the algorithm identifier
        _, octets, _ = _der_read(seq, nxt)
        _, seq, _ = _der_read(octets, 0)
        t, first, nxt = _der_read(seq, 0)            # version
    _, n_b, nxt = _der_read(seq, nxt)
    _, _e, nxt = _der_read(seq, nxt)
    _, d_b, _ = _der_read(seq, nxt)
    return int.from_bytes(n_b, "big"), int.from_bytes(d_b, "big")


_SHA256_PREFIX = bytes.fromhex("3031300d060960864801650304020105000420")


def rs256_sign(message, pem):
    """RSASSA-PKCS1-v1_5 with SHA-256 — what Google expects for a service-account JWT."""
    n, d = _rsa_private_key(pem)
    k = (n.bit_length() + 7) // 8
    t = _SHA256_PREFIX + hashlib.sha256(message).digest()
    em = b"\x00\x01" + b"\xff" * (k - len(t) - 3) + b"\x00" + t
    return pow(int.from_bytes(em, "big"), d, n).to_bytes(k, "big")


def service_account_jwt(sa, scope, now=None):
    now = int(now or time.time())
    head = _b64u(json.dumps({"alg": "RS256", "typ": "JWT"}, separators=(",", ":")).encode())
    claims = _b64u(json.dumps({"iss": sa["client_email"], "scope": scope, "aud": sa.get("token_uri", "https://oauth2.googleapis.com/token"),
                               "iat": now, "exp": now + 3600}, separators=(",", ":")).encode())
    signing_input = (head + "." + claims).encode()
    return head + "." + claims + "." + _b64u(rs256_sign(signing_input, sa["private_key"]))


def load_service_account():
    """From ABIDINGSTEPS_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS (a key-file path) or
    ABIDINGSTEPS_SERVICE_ACCOUNT_JSON (the JSON itself). None if not configured."""
    raw = os.environ.get("ABIDINGSTEPS_SERVICE_ACCOUNT_JSON")
    path = os.environ.get("ABIDINGSTEPS_SERVICE_ACCOUNT") or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if raw:
        return json.loads(raw)
    if path and os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return None

def _typed(v):
    return {"stringValue": v}


class FileStore:
    """A local JSON file in the same shape as the cloud doc: {"data": {"outcomes": "<json>", "notes": "<json>"}}.
    For tests and offline use."""

    def __init__(self, path):
        self.path = path
        self.undo_path = path + ".undo.json"

    def load(self):
        d = self._read()
        data = d.get("data", {})
        return json.loads(data.get("outcomes") or "[]"), json.loads(data.get("notes") or "{}"), d.get("_v", 0)

    def save(self, outcomes, notes, version):
        d = self._read()
        if d.get("_v", 0) != version:
            raise Conflict()
        d.setdefault("data", {})
        d["data"]["outcomes"] = json.dumps(outcomes, ensure_ascii=False)
        d["data"]["notes"] = json.dumps(notes, ensure_ascii=False)
        d["updatedAt"] = int(time.time() * 1000)
        d["_v"] = version + 1
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False)

    def _read(self):
        try:
            with open(self.path, encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return {"data": {}}

    def _undos(self):
        try:
            with open(self.undo_path, encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}

    def _write_undos(self, u):
        with open(self.undo_path, "w", encoding="utf-8") as f:
            json.dump(u, f)

    def put_undo(self, rec):
        u = self._undos()
        u[rec["id"]] = rec
        self._write_undos(u)

    def get_undo(self, uid):
        return self._undos().get(uid)

    def del_undo(self, uid):
        u = self._undos()
        u.pop(uid, None)
        self._write_undos(u)


class RestStore:
    """The user's cloud data doc over Firestore REST, signed in as a dedicated bot user (see the guide for the rules).
    Reads/edits only data.outcomes and data.notes, guarded by the doc's updateTime."""

    def __init__(self, uid=None, project=None, email=None, password=None, api_key=None, id_token=None, service_account=None):
        env = os.environ.get
        self.uid = uid or env("ABIDINGSTEPS_UID")
        self.sa = service_account if service_account is not None else (None if (id_token or env("ABIDINGSTEPS_ID_TOKEN") or env("ABIDINGSTEPS_BOT_EMAIL")) else load_service_account())
        self.project = project or env("ABIDINGSTEPS_PROJECT") or (self.sa or {}).get("project_id") or "focusflowgeorge"
        self.email = email or env("ABIDINGSTEPS_BOT_EMAIL")
        self.password = password or env("ABIDINGSTEPS_BOT_PASSWORD")
        self.api_key = api_key or env("ABIDINGSTEPS_API_KEY")
        self._tok = id_token or env("ABIDINGSTEPS_ID_TOKEN")
        self._exp = 1e18 if self._tok else 0
        if not self.uid:
            raise SystemExit("Set ABIDINGSTEPS_UID (the app's Settings → Sync shows it).")
        self.base = "https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/users/%s/apps" % (self.project, self.uid)

    def _token(self):
        if self._tok and time.time() < self._exp - 60:
            return self._tok
        if self.sa:   # service account: a signed request to Google's token endpoint → an access token (acts as admin; ignores rules)
            form = urllib.parse.urlencode({"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                                           "assertion": service_account_jwt(self.sa, "https://www.googleapis.com/auth/datastore")}).encode()
            req = urllib.request.Request(self.sa.get("token_uri", "https://oauth2.googleapis.com/token"), data=form, method="POST",
                                         headers={"Content-Type": "application/x-www-form-urlencoded"})
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    r = json.loads(resp.read())
            except urllib.error.HTTPError as e:
                raise RuntimeError("service-account sign-in failed (HTTP %s): %s" % (e.code, e.read()[:300].decode("utf-8", "replace")))
            self._tok, self._exp = r["access_token"], time.time() + int(r.get("expires_in", 3600))
            return self._tok
        body = json.dumps({"email": self.email, "password": self.password, "returnSecureToken": True}).encode()
        r = self._http("POST", "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + self.api_key, body, auth=False)
        self._tok, self._exp = r["idToken"], time.time() + int(r["expiresIn"])
        return self._tok

    def _http(self, method, url, body=None, auth=True):
        headers = {"Content-Type": "application/json"}
        if auth:
            headers["Authorization"] = "Bearer " + self._token()
        req = urllib.request.Request(url, data=body, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code in (409, 412):
                raise Conflict()
            raise RuntimeError("HTTP %s: %s" % (e.code, e.read()[:300].decode("utf-8", "replace")))

    def load(self):
        d = self._http("GET", self.base + "/abidingsteps")
        if not d:
            return [], {}, None
        data = (((d.get("fields") or {}).get("data") or {}).get("mapValue") or {}).get("fields") or {}
        out = (data.get("outcomes") or {}).get("stringValue") or "[]"
        notes = (data.get("notes") or {}).get("stringValue") or "{}"
        return json.loads(out), json.loads(notes), d.get("updateTime")

    def save(self, outcomes, notes, version):
        fields = {"data": {"mapValue": {"fields": {"outcomes": _typed(json.dumps(outcomes, ensure_ascii=False)),
                                                   "notes": _typed(json.dumps(notes, ensure_ascii=False))}}},
                  "updatedAt": {"integerValue": str(int(time.time() * 1000))}}
        q = [("updateMask.fieldPaths", p) for p in ("data.outcomes", "data.notes", "updatedAt")]
        q.append(("currentDocument.updateTime", version) if version else ("currentDocument.exists", "false"))
        self._http("PATCH", self.base + "/abidingsteps?" + urllib.parse.urlencode(q), json.dumps({"fields": fields}).encode())

    def put_undo(self, rec):
        f = {"kind": _typed("as-undo"), "id": _typed(rec["id"]), "at": {"integerValue": str(rec["at"])}, "rec": _typed(json.dumps(rec))}
        self._http("POST", self.base + "?documentId=as-undo-" + rec["id"], json.dumps({"fields": f}).encode())

    def get_undo(self, uid):
        d = self._http("GET", self.base + "/as-undo-" + uid)
        return json.loads(d["fields"]["rec"]["stringValue"]) if d else None

    def del_undo(self, uid):
        self._http("DELETE", self.base + "/as-undo-" + uid)


# ------------------------------------------------------------------------------------------------ the entry point
_default = {"store": None}


def default_store():
    if _default["store"] is None:
        path = os.environ.get("ABIDINGSTEPS_FILE")
        _default["store"] = FileStore(path) if path else RestStore()
    return _default["store"]


def call(op, args=None, store=None, retries=4):
    """Run one operation against the cloud copy (or a FileStore). Returns {ok:true,…} or {ok:false,error,…}.
    Every change returns `undo:<id>`; call("undo", {"id": …}) reverses it."""
    store = store or default_store()
    args = args if isinstance(args, dict) else {}
    if op == "undo":
        return _undo(store, args, retries)
    if op in ("start", "stop", "timer", "syncNow"):
        return {"ok": False, "error": "%s needs a device or browser running the app — not available in direct-cloud mode" % op}
    fn = OPS.get(op)
    if not fn:
        return {"ok": False, "error": "unknown op", "ops": sorted(list(OPS) + ["undo"])}
    for attempt in range(retries):
        outcomes, notes, version = store.load()
        model = Model(outcomes, notes)
        pre_o, pre_n = _snap_outcomes(model), dict(model.notes)
        try:
            res = fn(model, args)
        except AgentError as e:
            r = {"ok": False, "error": str(e)}
            r.update(e.extra)
            return r
        if op in READ_ONLY or res.get("duplicate"):
            return res
        rec = build_undo(model, pre_o, pre_n)
        if not rec:
            return res
        try:
            store.save(model.outcomes, model.notes, version)
        except Conflict:
            time.sleep(0.2 * (attempt + 1))
            continue   # someone (a device) wrote meanwhile: reload and redo the operation on the fresh data
        try:
            store.put_undo(rec)
            res["undo"] = rec["id"]
        except Exception:
            pass
        return res
    return {"ok": False, "error": "the cloud copy kept changing — try again"}


def _undo(store, args, retries):
    ids = list(reversed(args["ids"])) if isinstance(args.get("ids"), list) else ([args["id"]] if args.get("id") else [])
    if not ids:
        return {"ok": False, "error": "pass the undo id returned by the write (direct-cloud mode keeps no per-device history)"}
    done = []
    for uid in ids:
        rec = store.get_undo(uid)
        if not rec:
            return {"ok": False, "error": "unknown or expired undo id %s" % uid, "undone": done}
        for attempt in range(retries):
            outcomes, notes, version = store.load()
            model = Model(outcomes, notes)
            try:
                apply_undo(model, rec, bool(args.get("force")))
            except AgentError as e:
                r = {"ok": False, "error": str(e)}
                r.update(e.extra)
                return r
            try:
                store.save(model.outcomes, model.notes, version)
            except Conflict:
                continue
            break
        else:
            return {"ok": False, "error": "the cloud copy kept changing — try again", "undone": done}
        try:
            store.del_undo(uid)
        except Exception:
            pass
        done.append(uid)
    return {"ok": True, "undone": done}


def batch(ops, stop_on_error=False, store=None):
    out = []
    for it in ops or []:
        r = call(it.get("op"), it.get("args"), store=store)
        out.append(r)
        if stop_on_error and not r.get("ok"):
            break
    return {"ok": True, "results": out}
