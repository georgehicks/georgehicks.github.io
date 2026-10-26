# AbidingSteps — guide for agents and automation

Point your agent (GrokBot or any tool-calling LLM agent) at this file. **Never use screenshots**: the app has a small text
API, so a typical read costs ~100–400 tokens and a write is one short JSON call.

## The idea

You talk with an LLM to **survey and plan**, and it **manages your outcomes on the fly — even while none of your devices
is open**. Later, when you open the app on your phone or desktop, your devices **catch up automatically** (they merge the
agent's changes with anything you did there, three-way, so neither side loses work). Devices already open show the
agent's changes within seconds. There is no server of yours in the loop.

How: the agent's own runtime (a code-execution tool, or a shell) talks to your cloud copy over plain HTTPS using the
standard-library Python in `agent/` — the same operations as the in-app API, with the same rules.

## 0. Paste-ready system prompt (copy this into the agent)

```
You help the user plan and run their task app "AbidingSteps" through the tool `abidingsteps(op, args)` (and
`abidingsteps_batch`). Hierarchy: outcome → milestone → step. Steps are plain lines: "- open", "+ done",
2-space indent = substep, "@call" = context, ">2026-10-20" (or >tomorrow, >wed) = not before that day.
"starred" means important; "planned" is the day to work on it (today or earlier = Today bucket).
Survey first, cheaply: op "state", then "outline" for one outcome, "agenda"/"find" for slices. Talk the plan through
with the user, then apply it with one batch. Name outcomes/milestones/steps by id, exact title, or a unique piece of
the title. Never delete (remove*/setNotes/clearDone need confirm:true) unless the user clearly asked. Every write
returns an `undo` id — keep it and offer it if the user changes their mind. If a call fails, the error lists
candidates — fix and retry once. The user also edits on their own devices; re-read an outcome's "outline" before
changing it if time has passed.
```

Tool definitions (JSON schema, generated from the app itself): [`agent-tools.json`](agent-tools.json).

## 1. Pick a path

| Path | Works when no device is open? | Needs | Use when |
|---|---|---|---|
| **A. Direct** *(recommended)* | ✅ yes | code execution (Python 3) + a bot login | the agent can run code or a shell |
| **B. Agent's own browser** | ✅ yes | a browser tool, signed in once | the agent can drive a browser; also gives the focus timer |
| **C. Via your devices** *(optional)* | ❌ waits for a device | bot login | you want the app's own code to apply each change |

All three keep your devices in sync. Paths A and B are "just another device" to the cloud copy.

## 2. The operations (same on every path)

Call shape: `op` + `args` → `{ok:true, ...}` or `{ok:false, error, candidates?}`. Dates: `YYYY-MM-DD`, `today`,
`tomorrow`, or a weekday name (resolved to the *next* such day). Buckets: Inbox · Today · Week · Later · Open · Maybe · Done.

| op | args | returns |
|---|---|---|
| `state` | – | counts per bucket, starred, dueSteps, `nextUp` (**up to** 5 items; fewer if fewer exist) — **call this first** |
| `list` | `{bucket?, q?, starred?, limit=25}` | compact outcome rows |
| `outline` | `{outcome}` or `{bucket}` | `{text}` — the notes outline as text — **cheapest way to read an outcome** |
| `agenda` | `{context?, due?, date?, includeFuture?, limit=50}` | open steps by `@context` / date |
| `find` | `{q, limit=20}` | title and step/note line hits |
| `add` | `{title, bucket?, planned?, starred?, type?, tag?, steps?[], notes?}` | new outcome row |
| `update` | `{outcome, title?, starred?, planned?, bucket?, type?, tag?, maybe?, completed?, budget?}` | row |
| `addStep` | `{outcome, text, milestone?, under?, nth?, allowDuplicate?}` — a step already there is **not** added twice (`duplicate:true`) | outline |
| `setStep` | `{outcome, step, done?, milestone?, nth?}` (omit `done` = toggle; `nth` picks one of several identical steps) | the new line |
| `editStep` | `{outcome, step, text, milestone?}` | the new line |
| `note` | `{outcome, text, milestone?, under?}` | – |
| `addMilestone` / `updateMilestone` | `{outcome, title, steps?[]}` / `{outcome, milestone, title?, done?}` | id |
| `removeStep` `removeMilestone` `remove` `setNotes` `clearDone` | need `confirm:true` (`clearDone{outcome\|bucket\|all}` removes done steps and milestones) | – |
| `undo` | `{id? \| ids?[], force?}` | **every write returns `undo:<id>`**; `undo{id}` reverses exactly that change (any path, **24 h**, and **each id works once**). Several ids go newest-first. Refuses (`changed since`) if those items were edited afterwards, unless `force:true`. **In direct-cloud mode `id`/`ids` is required** — there is no "last change" (that form works only in the browser/device paths) |
| `start` / `stop` / `timer` / `syncNow` | – | the focus timer and a manual push — **browser path (B) and via-devices (C) only**; Path A answers `needs a device or browser running the app — not available in direct-cloud mode` |
| `batch` | `{ops:[{op,args}], stopOnError?}` (Python: `stop_on_error=`; CLI: `--stop-on-error`) | `{ok:true, results:[…], failed?:[indexes]}` — `ok:true` means the batch ran; check `failed` for steps that didn't. **One round trip for many ops** |

**Result field names:** the `outline` op returns its text in `text`; writes (`addStep`, `setStep`, `setNotes`…) return the outline in `outline`. Failures — including network and sign-in problems — always come back as `{ok:false, error, …}` (an unknown op also returns `ops`, the list of valid ones).

`window.abidingAgent.help()` (Path B) returns this list from the running app — trust it over this file if they differ.

## 3. The model in 60 seconds

- **Outcome** — a thing you're moving toward (`type` Deliverable = finishable, Directive = ongoing; the old word `Destination` is retired and still accepted as input — it is stored as Deliverable). Has
  `starred` (important) and `planned` (the day you intend to work on it; today or earlier ⇒ **Today** bucket).
- **Everything inside an outcome is its notes text.** A line beginning `- ` is an open step, `+ ` a done step,
  anything else is a plain note, and a line indented two more spaces than the one above is its child.
  Milestones (◆) are sub-containers with their own lines.
- `@word` anywhere in a step = context (GTD); children inherit their parent's contexts and date.
  `>date` = not before that day; until then the step stays out of the Step picker, and a dated step coming due
  pulls its outcome onto Today. (Effective next date = the earliest of the plan and any step date.)
- Steps are identified **by their text** (they have no ids). A piece of the text works if it is unique; otherwise the error
  returns `candidates` with an `nth` for each, and you resend with `nth`. Repeating the same `addStep` is harmless.

## 4. Spend fewer tokens

1. `state` → `nextUp` answers "what should I do now?" without reading anything else.
2. Read **one** outcome with `outline`, never `list` everything. Use `agenda{context:"call"}` for "all my calls".
3. Writes return the data you need (`addStep` returns the outline) — don't re-read afterwards unless unsure.
4. Group related writes in `abidingsteps_batch`. Set `limit` on lists.
5. Use ids once you have them (they are stable); titles are fine for a first reference.
6. Keep the tool description (`agent-tools.json`) in the model's tools list instead of pasting this guide each turn.

## 5. Path A — Direct (agent's code ⇄ your cloud copy)

The library is `agent/abidingsteps_core.py` (standard library only, no installs). The CLI is `agent/abidingsteps_agent.py`.

**One-time setup (a few minutes):**

1. **Make a bot login.** Firebase console → Authentication → add an email/password user just for the agent
   (e.g. `bot@yourdomain.example`). Note the project's **web API key** (Project settings → General).
2. **Lock it down with Firestore rules** — inside the existing `match /users/{userId}` block, replace/extend the `apps` rule:

   ```
   match /apps/{docId} {
     allow read, write: if request.auth != null && request.auth.uid == userId;       // you (the app) — as before
     // the agent: read the data doc, change ONLY its outcomes and notes, nothing else, no create/delete
     allow get:    if isBot() && docId == 'abidingsteps';
     allow update: if isBot() && docId == 'abidingsteps'
                   && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['data', 'updatedAt'])
                   && request.resource.data.data.diff(resource.data.data).affectedKeys().hasOnly(['outcomes', 'notes']);
     allow create, get, delete: if isBot() && docId.matches('as-undo-.*');            // its undo records
     allow list:   if isBot() && resource.data.kind == 'as-undo';                       // lets it sweep old undo records (optional)
   }
   function isBot() { return request.auth != null && request.auth.token.email == 'bot@yourdomain.example'; }
   ```
   (`isBot()` sits next to your other top-level rules/functions. Optional, only for Path C, add:
   `allow create: if isBot() && docId.matches('as-op-.*'); allow get, delete: if isBot() && docId.matches('as-res-.*');`)
3. **Your user id:** the app's Settings → Sync shows **"For automation — your ID"**; tap to copy it.
4. **Give the agent's runtime these environment variables** (as secrets): `ABIDINGSTEPS_UID`, `ABIDINGSTEPS_BOT_EMAIL`,
   `ABIDINGSTEPS_BOT_PASSWORD`, `ABIDINGSTEPS_API_KEY`. Copy the `agent/` folder next to it.

**All the settings, and which sign-in wins** (the first one set is used):

| variable | meaning |
|---|---|
| `ABIDINGSTEPS_UID` | your user id (required) |
| `ABIDINGSTEPS_ID_TOKEN` | a ready-made bearer token (any kind) — wins over everything below |
| `ABIDINGSTEPS_BOT_EMAIL` + `ABIDINGSTEPS_BOT_PASSWORD` + `ABIDINGSTEPS_API_KEY` | the bot login — wins over a service account if its email is set |
| `ABIDINGSTEPS_SERVICE_ACCOUNT` (or `GOOGLE_APPLICATION_CREDENTIALS`) = key-file path, or `ABIDINGSTEPS_SERVICE_ACCOUNT_JSON` = the key as text | the service-account key |
| `ABIDINGSTEPS_FILE` | work on a local JSON file instead of the cloud (tests, offline) |
| `ABIDINGSTEPS_PROJECT` | Firebase project id (default: from the key file, else `focusflowgeorge`) |
| `ABIDINGSTEPS_TZ` | your timezone, e.g. `America/New_York` — what "today" means |

**Already have a service-account key (for example one GrokBot holds)? Use it instead — steps 1–2 aren't needed:**
set `ABIDINGSTEPS_UID` and point `ABIDINGSTEPS_SERVICE_ACCOUNT` at the key file (or `GOOGLE_APPLICATION_CREDENTIALS`, or put the
JSON itself in `ABIDINGSTEPS_SERVICE_ACCOUNT_JSON`). The library signs in to Google itself — still no installs. The project is read
from the key file. **Know what that means:** a service account is *admin* — it ignores the Firestore rules and can read and
change everything in the project (every app's data, not just AbidingSteps). The restriction "outcomes and notes only" is enforced
by the rules, so it does **not** apply to this key; only the library's own behaviour keeps it to outcomes and notes. If you use
it, keep the key in one place, scope the service account's IAM role to **Cloud Datastore User** (not Owner/Editor), and prefer
the bot login when you can.
5. **Try it:**

```bash
python agent/abidingsteps_agent.py state
python agent/abidingsteps_agent.py op addStep '{"outcome":"Plan retreat","text":"Call venue @call >fri"}'
python agent/abidingsteps_agent.py batch '[{"op":"setStep","args":{"outcome":"Plan retreat","step":"Call venue","done":true}},{"op":"state"}]'
```

As a library: `from abidingsteps_core import call, batch` → `call("addStep", {...})`. With a tool-calling platform, register the two
tools from `agent-tools.json` and have your tool executor call `call(op, args)` / `batch(ops)`.

**Why this is safe alongside your devices:** each change reads the cloud doc, applies the operation, and writes back **only
`data.outcomes` and `data.notes`**, guarded by the doc's `updateTime` — if a device wrote in between, it reloads and re-applies
(never overwrites). Your devices then merge the agent's changes with theirs line by line. The Python rules are tested against
the app's own answers (see `agent/tests/`).

## 6. Path B — the agent's own browser

If the agent has a browser tool: open `https://georgehicks.github.io/AbidingSteps/index.html?agent=1`, sign in with Google
once (Settings → Sync), then `window.abidingAgent.call(op, args)` runs any operation, including the focus timer, and
`window.abidingAgent.call('syncNow')` pushes before the agent finishes.

- **`?agent=1`** switches off the welcome, the Abide invitation, celebrations and the glow so nothing blocks the page.
- Its browser profile is a device like any other; keep it persistent so the sign-in survives.
- Cheap alternatives to screenshots if you must look at the page: `document.body.innerText`, or `window.abidingAgent.call('outline', {outcome})`.

## 7. Path C — via your devices (optional)

`python agent/abidingsteps_agent.py --via-devices op state` queues the operation in the cloud; whichever of your signed-in devices
has the app open applies it with the app's own code (answer in ~2–3 s). If none is open, it waits (up to 6 h). Use it only if you
specifically want the app itself to run the operation (for example the timer). Path A already works with no device open.

## 8. Safety

- Deletes and wholesale rewrites need `confirm:true`; ask the human before sending them.
- **Undo:** keep the `undo` id each write returns. It works from any path, even from another machine, will not overwrite later
  edits unless you pass `force:true`, **works once**, and expires after 24 h (old records are swept automatically). The id is stored
  *before* the change is written, so a change can never exist without its undo id; if the record can't be stored, nothing is changed.
- Don't loop: one `state` per task, then targeted reads.
- Dates relative to "today" resolve at write time in the agent's timezone — set `ABIDINGSTEPS_TZ=America/New_York` (or your zone) in Path A.
- **What the credential can reach depends on how it signs in.** With the **bot login** + the rules above, it can read your data doc and change only its outcomes and notes — nothing else in your database. With a **service-account key** it is an *admin*: the rules don't apply, so it can read and change everything in the Firebase project (every app's data); only the library's own behaviour keeps it to outcomes and notes. Narrow that key's IAM role to **Cloud Datastore User** (not Owner/Editor), keep the key in one place, and never commit it.

## 9. Troubleshooting

| symptom | cause / fix |
|---|---|
| `no such outcome` + no candidates | wrong name; call `find{q}` |
| `ambiguous …` with `candidates` | use an id from `candidates`, or `nth` for identical steps |
| Path A: `cloud access failed — …` | network, sign-in or permission problem — the text after the dash says which |
| Path A: `HTTP 403` | bot login: the rules aren't published, or the bot's email in `isBot()` doesn't match · service account: the key's IAM role lacks Datastore access |
| Path A: `service-account sign-in failed` | wrong/expired key file, or the key's project isn't the one holding your data (set `ABIDINGSTEPS_PROJECT`) |
| Path A: `the cloud copy kept changing` | a device was writing constantly; just retry |
| Path A: `needs a device or browser` | that op (timer/syncNow) isn't available directly; use Path B or C |
| Phone doesn't show the agent's change | a device that was closed merges it when it next opens; an open one within seconds |
| `expired` (Path C) | op sat >6 h; send again |

*Status:* **verified live (2026-10-20):** an agent ran `state`, then a write and its undo, against the real Firebase project with a
service-account key and no device open. The Python library is also checked against the in-app API's own recorded answers and
unit-tested; the agent→device merge was tested with the real app code. **Not yet exercised live:** the bot-login mode and the rules above.
