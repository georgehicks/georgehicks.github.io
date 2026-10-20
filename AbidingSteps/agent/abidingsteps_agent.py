#!/usr/bin/env python3
"""AbidingSteps agent helper — talk to the user's app through the cloud, no browser needed.

How it works (see ../AGENTIC_GUIDE.md):
  * WRITE / ANSWER: drop an operation doc ("as-op-<id>") next to the user's data doc. Whichever signed-in
    AbidingSteps device is open claims it, applies it with the app's own code, pushes the change so every
    other device sees it, and writes the answer to "as-res-<id>". This never overwrites the data doc.
  * READ without any device open: `read` fetches the data doc and prints a compact outline (approximate
    buckets; the `state`/`outline` ops answered by a device are authoritative).

Two ways to sign in (see the guide, section 5):
  A) bot login (recommended — no admin key; Firestore rules limit it to the as-op / as-res docs; stdlib only):
       export ABIDINGSTEPS_UID=<UID shown in the app: Settings → Sync>
       export ABIDINGSTEPS_BOT_EMAIL=… ABIDINGSTEPS_BOT_PASSWORD=… ABIDINGSTEPS_API_KEY=<Firebase web API key>
  B) service account (reaches the WHOLE database and ignores the rules — guard the key):
       pip install firebase-admin
       export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json ABIDINGSTEPS_UID=<UID>

Usage:
  python abidingsteps_agent.py state
  python abidingsteps_agent.py op addStep '{"outcome":"Plan retreat","text":"Call venue @call >fri"}'
  python abidingsteps_agent.py batch '[{"op":"setStep","args":{"outcome":"Plan retreat","step":"Call venue","done":true}},{"op":"state"}]'
  python abidingsteps_agent.py read            # no device needed; outline of open outcomes
As a library:  from abidingsteps_agent import send, read_outline
"""
import json
import os
import sys
import time
import uuid

import urllib.error
import urllib.request

_db = None
PROJECT = os.environ.get("ABIDINGSTEPS_PROJECT", "focusflowgeorge")
_tok = {"t": None, "exp": 0.0}


def _rest():
    return bool(os.environ.get("ABIDINGSTEPS_BOT_EMAIL"))


def _http(method, url, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise RuntimeError("HTTP %s from %s: %s" % (e.code, url.split("?")[0], e.read()[:300].decode("utf-8", "replace")))


def _id_token():
    if _tok["t"] and time.time() < _tok["exp"] - 60:
        return _tok["t"]
    body = json.dumps({"email": os.environ["ABIDINGSTEPS_BOT_EMAIL"], "password": os.environ["ABIDINGSTEPS_BOT_PASSWORD"], "returnSecureToken": True}).encode()
    r = _http("POST", "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + os.environ["ABIDINGSTEPS_API_KEY"], body)
    _tok["t"], _tok["exp"] = r["idToken"], time.time() + int(r["expiresIn"])
    return _tok["t"]


def _uid():
    uid = os.environ.get("ABIDINGSTEPS_UID")
    if not uid:
        raise SystemExit("Set ABIDINGSTEPS_UID (Settings → Sync shows it).")
    return uid


def _rest_send(op, args, wait, poll):
    base = "https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/users/%s/apps" % (PROJECT, _uid())
    op_id = uuid.uuid4().hex[:12]
    fields = {"kind": {"stringValue": "as-op"}, "id": {"stringValue": op_id}, "op": {"stringValue": op},
              "argsJson": {"stringValue": json.dumps(args or {})}, "at": {"integerValue": str(int(time.time() * 1000))}}
    _http("POST", "%s?documentId=as-op-%s" % (base, op_id), json.dumps({"fields": fields}).encode(), _id_token())
    deadline = time.time() + wait
    while time.time() < deadline:
        d = _http("GET", "%s/as-res-%s" % (base, op_id), token=_id_token())
        if d:
            _http("DELETE", "%s/as-res-%s" % (base, op_id), token=_id_token())
            return json.loads(d["fields"]["result"]["stringValue"])
        time.sleep(poll)
    return {"ok": False, "error": "no device answered in %ds — is a signed-in AbidingSteps open?" % wait, "id": op_id}


def _apps():
    global _db
    if _db is None:
        import firebase_admin                      # service-account mode only
        from firebase_admin import credentials, firestore
        if not firebase_admin._apps:
            cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            firebase_admin.initialize_app(credentials.Certificate(cred_path) if cred_path else None)
        _db = firestore.client()
    return _db.collection("users").document(_uid()).collection("apps")


def send(op, args=None, wait=60, poll=1.0):
    """Queue one operation and wait for the device's answer. Returns the app's result dict.
    At-most-once: if nobody answers in `wait` seconds, the op may still run later (it expires after 6 h) —
    check with a read op before re-sending anything that isn't idempotent."""
    if _rest():
        return _rest_send(op, args, wait, poll)
    apps = _apps()
    op_id = uuid.uuid4().hex[:12]
    apps.document("as-op-" + op_id).set(
        {"kind": "as-op", "id": op_id, "op": op, "args": args or {}, "at": int(time.time() * 1000)}
    )
    res_ref = apps.document("as-res-" + op_id)
    deadline = time.time() + wait
    while time.time() < deadline:
        snap = res_ref.get()
        if snap.exists:
            res_ref.delete()
            return json.loads(snap.to_dict()["result"])
        time.sleep(poll)
    return {"ok": False, "error": "no device answered in %ds — is a signed-in AbidingSteps open?" % wait, "id": op_id}


def batch(ops, stop_on_error=False, wait=90):
    return send("batch", {"ops": ops, "stopOnError": stop_on_error}, wait=wait)


def read_outline(include_done=False):
    """Read the data doc directly (service-account mode, no device needed; buckets here are approximate).
    In bot-login mode the bot can't read the data doc, so this asks a device for the outline instead."""
    if _rest():
        return (send("outline", {"bucket": "Today"}) or {}).get("text", "")
    snap = _apps().document("abidingsteps").get()
    if not snap.exists:
        return "(no data yet)"
    data = (snap.to_dict() or {}).get("data", {})
    outcomes = json.loads(data.get("outcomes", "[]"))
    notes = json.loads(data.get("notes", "{}"))
    today = time.strftime("%Y-%m-%d")
    out = []
    for o in outcomes:
        if o.get("completed") and not include_done:
            continue
        planned = o.get("planned")
        bucket = ("Done" if o.get("completed") else "Maybe" if o.get("maybe")
                  else "Today" if planned and planned <= today else "Planned" if planned else "Open" if o.get("type") else "Inbox")
        out.append("# %s %s [%s]%s%s" % (o["id"], o["t"], bucket, " ★" if o.get("starred") else "", " plan:" + planned if planned else ""))
        out.extend(notes.get(o["id"], "").splitlines())
        for m in o.get("milestones", []):
            out.append("◆ %s %s%s" % (m["id"], m["t"], " (done)" if m.get("completed") else ""))
            out.extend("  " + ln for ln in notes.get("%s#%s" % (o["id"], m["id"]), "").splitlines())
    return "\n".join(out)


def _main(argv):
    if not argv:
        print(__doc__)
        return 0
    cmd = argv[0]
    if cmd == "read":
        print(read_outline("--all" in argv))
    elif cmd == "state":
        print(json.dumps(send("state"), ensure_ascii=False))
    elif cmd == "op" and len(argv) >= 2:
        print(json.dumps(send(argv[1], json.loads(argv[2]) if len(argv) > 2 else {}), ensure_ascii=False))
    elif cmd == "batch" and len(argv) >= 2:
        print(json.dumps(batch(json.loads(argv[1])), ensure_ascii=False))
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))
