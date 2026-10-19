# AbidingSteps — guide for agents and automation

Point your bot (GrokBot or any tool-calling agent) at this file. **Never use screenshots.** The app has a small
text API, so a typical read is ~100–400 tokens and a write is one short JSON call.

## 0. Paste-ready system prompt (copy this into the bot)

```
You manage the user's task app "AbidingSteps" through the tool `abidingsteps(op, args)` (and
`abidingsteps_batch`). Hierarchy: outcome → milestone → step. Steps are plain lines: "- open", "+ done",
2-space indent = substep, "@call" = context, ">2026-10-20" (or >tomorrow, >wed) = not before that day.
"starred" means important; "planned" is the day to work on it (today or earlier = Today bucket).
Work cheaply: start with op "state", read one outcome with "outline", find things with "agenda"/"find".
Name outcomes/milestones/steps by id, exact title, or a unique piece of the title. Batch writes into one
call. Never delete (remove*/setNotes need confirm:true) unless the user clearly asked. After a change,
re-read only that outcome's "outline". If a call fails, the error lists candidates — fix and retry once.
```

Tool definitions (JSON schema, generated from the app itself): [`agent-tools.json`](agent-tools.json).

## 1. Pick a path (your data must stay in sync with your devices)

| Path | Needs | Best for | Sync with phone/desktop |
|---|---|---|---|
| **A. Cloud inbox** *(recommended)* | Firebase service account + your UID; at least one signed-in AbidingSteps open somewhere | bots that run on a server/shell/cron | ✅ automatic — a device applies each op with the app's own code and pushes |
| **B. Browser API** | a headless browser logged in to your sync | bots with a browser tool and no Firebase access | ✅ if that browser profile is signed in (then it is just another device) |
| **C. Read-only** | service account | dashboards, "what's due?" with no device open | n/a (reads the cloud copy) |

Never write to the data doc (`users/{uid}/apps/abidingsteps`) directly: devices overwrite it wholesale and
will clobber (or be clobbered by) a raw edit. Path A exists to avoid exactly that.

## 2. The operations (same on every path)

Call shape: `op` + `args` → `{ok:true, ...}` or `{ok:false, error, candidates?}`. Dates: `YYYY-MM-DD`, `today`,
`tomorrow`, or a weekday name (resolved to the *next* such day). Buckets: Inbox · Today · Week · Later · Open · Maybe · Done.

| op | args | returns |
|---|---|---|
| `state` | – | counts per bucket, starred, dueSteps, nextUp[5], timer, sync — **call this first** |
| `list` | `{bucket?, q?, starred?, limit=25}` | compact outcome rows |
| `outline` | `{outcome}` or `{bucket}` | the notes outline as text — **cheapest way to read an outcome** |
| `agenda` | `{context?, due?, date?, includeFuture?, limit=50}` | open steps by `@context` / date |
| `find` | `{q, limit=20}` | title and step/note line hits |
| `add` | `{title, bucket?, planned?, starred?, type?, tag?, steps?[], notes?}` | new outcome row |
| `update` | `{outcome, title?, starred?, planned?, bucket?, type?, tag?, maybe?, completed?, budget?}` | row |
| `addStep` | `{outcome, text, milestone?, under?}` | outline |
| `setStep` | `{outcome, step, done?, milestone?}` (omit `done` = toggle) | the new line |
| `editStep` | `{outcome, step, text, milestone?}` | the new line |
| `note` | `{outcome, text, milestone?, under?}` | – |
| `addMilestone` / `updateMilestone` | `{outcome, title, steps?[]}` / `{outcome, milestone, title?, done?}` | id |
| `removeStep` `removeMilestone` `remove` `setNotes` | need `confirm:true` | – |
| `start` / `stop` / `timer` | `{outcome, minutes=15, milestone?, step?}` | focus timer (also plans it for today) |
| `undo` | – | undoes the last change **made by this API on that device** (40 deep) |
| `syncNow` | – | pushes now (browser path) |
| `batch` | `{ops:[{op,args}], stopOnError?}` | `{results:[…]}` — **one round trip for many ops** |

`window.abidingAgent.help()` returns this list from the running app — trust it over this file if they differ.

## 3. The model in 60 seconds

- **Outcome** — a thing you're moving toward (`type` Destination = finishable, Directive = ongoing). Has
  `starred` (important) and `planned` (the day you intend to work on it; today or earlier ⇒ **Today** bucket).
- **Everything inside an outcome is its notes text.** A line beginning `- ` is an open step, `+ ` a done step,
  anything else is a plain note, and a line indented two more spaces than the one above is its child.
  Milestones (◆) are sub-containers with their own lines.
- `@word` anywhere in a step = context (GTD); children inherit their parent's contexts and date.
  `>date` = not before that day; until then the step stays out of the Step picker, and a dated step coming due
  pulls its outcome onto Today. (Effective next date = the earliest of the plan and any step date.)
- Steps are identified **by their text** (no ids). Use a unique piece of it in `step`.

## 4. Spend fewer tokens

1. `state` → `nextUp` answers "what should I do now?" without reading anything else.
2. Read **one** outcome with `outline`, never `list` everything. Use `agenda{context:"call"}` for "all my calls".
3. Writes return the data you need (`addStep` returns the outline) — don't re-read afterwards unless unsure.
4. Group related writes in `abidingsteps_batch`. Set `limit` on lists.
5. Use ids once you have them (they are stable); titles are fine for a first reference.
6. Keep the tool description (in `agent-tools.json`) in the model's tools list instead of pasting this guide each turn.

## 5. Path A — cloud inbox (recommended)

How it works: the bot writes a small doc `users/{uid}/apps/as-op-{id}`; any signed-in AbidingSteps device that is
open claims it (a transaction deletes the doc, so only one device applies it), runs it through
`window.abidingAgent`, writes `as-res-{id}`, and pushes immediately — so your other devices update too.

1. Firebase console → project **focusflowgeorge** → Project settings → Service accounts → create a key. Better: in Google
   Cloud IAM create a **dedicated service account with only `Cloud Datastore User`** and use its key. *(Admin
   credentials bypass Firestore rules and the project is shared with your other apps — keep the key secret.)*
2. In the app: Settings → Sync shows **"For automation — your ID"**; tap to copy it.
3. `pip install firebase-admin`, then:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/key.json ABIDINGSTEPS_UID=<uid>
python agent/abidingsteps_agent.py state
python agent/abidingsteps_agent.py op addStep '{"outcome":"Plan retreat","text":"Call venue @call >fri"}'
```

As a library: `from abidingsteps_agent import send, batch, read_outline` (`send("addStep", {...})` blocks until a device answers).
Without Python, the protocol is just two docs:

```
create  users/{uid}/apps/as-op-{id}  {kind:"as-op", id, op, args:{…}, at:<ms epoch>}
read    users/{uid}/apps/as-res-{id}  → {ok, result:"<JSON string>"}      (delete it after reading)
```

Semantics to design around: **at-most-once** (an op is claimed before it runs); ops older than 6 h are refused;
if no device is open the op waits (no answer in time ⇒ read state before retrying a non-idempotent op like
`addStep`); results should be deleted by the reader. For **always-on** operation, run one headless browser (Path B)
signed in to your account — it is simply a device that is always open.

## 6. Path B — headless browser

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context("/data/abidingsteps-profile", headless=True)   # keeps login + data
    page = ctx.new_page()
    page.goto("https://georgehicks.github.io/AbidingSteps/index.html?agent=1")
    page.wait_for_function("window.abidingAgent && window.abidingAgent.ready")
    r = page.evaluate("([op, args]) => window.abidingAgent.call(op, args)", ["state", {}])
    page.evaluate("() => window.abidingAgent.call('syncNow')")       # push before closing
```

- **`?agent=1`** switches off the welcome, the Abide invitation, celebrations and the glow so nothing blocks the page.
- The profile directory is the data store. For it to share your devices' data it must be **signed in once**
  (Settings → Sync → Sign in with Google). Google often refuses sign-in inside automated browsers; do the one-time
  sign-in with that same profile launched normally (headed, not automated), then reuse it headless.
- Cheap alternatives to screenshots if you must look at the page: `document.body.innerText`, or `window.abidingAgent.call('outline', {outcome})`.

## 7. Path C — read-only

`python agent/abidingsteps_agent.py read` fetches the data doc and prints the outline with no device open (bucket
names are approximate; `state`/`list` answered by a device are authoritative). Data doc fields are JSON *strings*:
`data.outcomes`, `data.notes` (`{outcomeId: text, "outcomeId#milestoneId": text}`).

## 8. Safety

- Deletes and wholesale rewrites need `confirm:true`; ask the human before sending them.
- `undo` is per device and in memory (cleared on reload); for a bot, the safe habit is: read `outline` before a
  risky edit and keep it to restore with `setNotes`.
- Don't loop: one `state` per task, then targeted reads. Repeated identical writes create duplicates (steps are text).
- Dates relative to "today" are resolved at write time, in the device's local timezone.

## 9. Troubleshooting

| symptom | cause / fix |
|---|---|
| `no such outcome` + no candidates | wrong name; call `find{q}` |
| `ambiguous …` with `candidates` | use an id from `candidates` |
| Path A times out | no signed-in AbidingSteps is open; open the app (or run the headless worker) |
| `expired` | op sat >6 h; send again |
| Browser path loses data | the persistent profile wasn't reused (`launch_persistent_context` dir) |
| Changes missing on phone | `syncNow` (browser) / wait for the device push; phone must be open or reopened to pull |

*Status: the in-app API and the inbox claim/apply logic are tested in a browser with a stand-in for Firestore;
the Firestore rules/service-account setup and the Python helper have not been run against your live project.*
