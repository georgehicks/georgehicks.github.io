# AbidingSteps always-on worker

A signed-in headless browser that acts as **a device that is always open**, so cloud operations from bots
(Path A in [`../../AGENTIC_GUIDE.md`](../../AGENTIC_GUIDE.md)) are applied within seconds — even when your phone and
laptop are closed. It runs the real app (`?agent=1`), so it uses the same merge-based sync as every other device.

> **Status: written but not yet run.** Nothing here has been installed or executed against your account. Do the steps
> below in order; step 3 is the proof.

## Where to run it

| Host | Verdict |
|---|---|
| A machine that is always on (Mac mini, a spare Mac, a small Linux box/VPS) | ✅ true 24/7 |
| This laptop | Works while it is awake. `service-macos.sh` uses `caffeinate` so it won't idle-sleep, but closing the lid sleeps it and the worker stops until it wakes. |

## Steps (macOS; Linux is the same minus step 4 — use a systemd user service or `nohup`)

1. **Set up** (private Python environment; uses your installed Chrome, downloads no browser):
   `./setup.sh`
2. **Sign in once** — a normal window opens; use Settings → Sync → *Sign in with Google*; it closes itself when done:
   `~/.abidingsteps-worker/venv/bin/python abidingsteps_worker.py --login`
   (Google sometimes refuses sign-in inside an automated browser. The window is launched without the automation banner to
   reduce that. If it still refuses, sign in with that same profile directory using a plain Chrome:
   `open -na "Google Chrome" --args --user-data-dir="$HOME/.abidingsteps-worker/profile"`, sign in at the app's Settings → Sync, quit Chrome.)
3. **Prove it works** (foreground; Ctrl+C to stop; in another terminal run `--status`):
   `~/.abidingsteps-worker/venv/bin/python abidingsteps_worker.py`
   then send any operation, e.g. `python ../abidingsteps_agent.py state` — it should answer in a couple of seconds.
4. **Keep it running** (starts at login, restarts if it dies): `./service-macos.sh install`
   — check with `./service-macos.sh status`, read `./service-macos.sh logs`, remove with `./service-macos.sh uninstall`.

## What it does for you

- Reloads the page every 6 h so it picks up new app versions; restarts the browser on a crash, a network drop or a lost sign-in
  (backing off up to 5 min); writes `~/.abidingsteps-worker/status.json` every ~30 s (`--status` reads it).
- If it is not signed in it says so and waits (`--service`) instead of spinning.
- Quiet mode (`?agent=1`): no welcome, no Abide invitation, no celebrations — nothing to click.

## Cautions

- The profile folder `~/.abidingsteps-worker/profile` contains your Google sign-in session. Treat it like a password;
  don't copy it around or commit it.
- It is one more device in your sync: it holds a full copy of your data and takes part in merges like any other.
- Only one process may use the profile at a time (the `--login` window and the service can't run together; stop the service first).
