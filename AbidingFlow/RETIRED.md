# AbidingFlow — retired (2026-10-20)

**Why:** AbidingSteps replaced it, and AbidingFlow's built-in Firebase sync was a hazard. Every app on
`georgehicks.github.io` shares one `localStorage`, and this app's sync uploaded *every* key on the domain to
`abidingflow_users/{uid}` and wrote every key back on each sync — so a stale copy of another app's data
(AbidingSteps, Treasure, I Am Here, …) could overwrite that app's current data on a device. It is the same engine
FocusFlowFireBase uses.

**What was done**
- `index.html` is now a static "retired" page that points to AbidingSteps. It runs no scripts and reads or writes
  no saved data. (The installed home-screen icon, if any, opens this page; the service worker was bumped so it updates.)
- The last working code is kept, inert, as plain text: `reference/index.original.html.txt` (it has a banner explaining this).
  Rename it back to `index.html` only to read it running locally — and remove its Firebase sync first.
- `FIREBASE-SETUP.md` / `CALENDAR-SETUP.md` are left as historical notes.

**Loose ends (not touched by code)**
- Cloud data: the Firestore document `abidingflow_users/{uid}` still exists; delete it in the Firebase console if you
  don't want it. The matching `match /abidingflow_users/...` rule can be removed from the Firestore rules.
- On-device data: AbidingFlow's own saved data stays in each browser's localStorage under its (unprefixed) keys until
  site data is cleared; nothing reads it any more.
