# AbidingSteps always-on worker

**You do not need a background service.** Why anything is needed at all: the app has no server — the logic that applies
a change (step grammar, merging, undo) runs inside the app in a browser — so some browser must run it. Three ways:

1. **One-shot (no service) — the simple one.** The bot's own machine runs one command; a signed-in headless browser opens
   the app, does the operation, syncs it to your other devices, and closes. Nothing stays running:
   `python abidingsteps_worker.py --call state`
   `python abidingsteps_worker.py --call addStep --args '{"outcome":"Plan retreat","text":"Call venue @call"}'`
2. **One of your own devices.** The cloud inbox (Path A in the guide) is for bots without a browser: if your phone or
   laptop has the app open, it applies the operation.
3. **Always-on (optional)** — only if a bot with no browser needs answers when none of your devices is open. This is the
   part that needs something to keep a process alive (Docker, systemd, …) — everything below from "Keep it running".

It is **not tied to any operating system**: one Python file. It runs the real app (`?agent=1`), so it uses the same
merge-based sync as every other device.

> **Status: written but not yet run.** Nothing here has been executed against your account. Step 3 is the proof.

## The one idea: sign in once, carry one file

Sign-in happens in a real browser window on any machine with a screen (any OS). That writes **`auth-state.json`** — the
cookies, the app's local data and its IndexedDB, which is where the cloud sign-in lives. Copy that single file to the
worker's machine. (A browser *profile folder* doesn't travel between operating systems; this file does.)
**auth-state.json is a credential: treat it like a password, never commit or share it.**

## Steps

1. **Install** (on the worker machine and on the machine you'll sign in from):
   `pip install -r requirements.txt` (a virtualenv is fine). By default it drives your installed **Chrome** — no browser
   download. No Chrome? `playwright install chromium` and set `ABIDINGSTEPS_BROWSER_CHANNEL=` (empty).
2. **Sign in once**, on any machine with a screen:
   `python abidingsteps_worker.py --login` → a window opens; Settings → Sync → *Sign in with Google*; it saves
   `auth-state.json` (default folder `~/.abidingsteps-worker/`, or choose with `--state PATH`) and closes itself.
   Google sometimes refuses sign-in in an automated browser; the window hides the automation banner to reduce that. If it
   still refuses, tell me — there is a manual route.
3. **Prove it works** (one-shot, no service): `python abidingsteps_worker.py --call state` — it should print your overview
   within a few seconds. (For the always-on route: `python abidingsteps_worker.py`, then from anywhere
   `python ../abidingsteps_agent.py state`; `--status` shows its heartbeat.)
4. **Only for always-on — keep it running**; pick what fits that machine:

   **Docker** (works everywhere Docker does):
   ```
   mkdir -p data && cp /path/to/auth-state.json data/
   docker compose up -d --build        # restarts by itself; status: cat data/status.json
   ```

   **systemd** (Linux): `~/.config/systemd/user/abidingsteps-worker.service`
   ```
   [Service]
   ExecStart=/usr/bin/python3 /path/to/abidingsteps_worker.py --service
   Restart=always
   RestartSec=15
   [Install]
   WantedBy=default.target
   ```
   then `systemctl --user enable --now abidingsteps-worker` (and `loginctl enable-linger $USER` so it runs without a login).

   **Anything else** (pm2, supervisor, Windows Task Scheduler/NSSM, `tmux`…): the command is just
   `python abidingsteps_worker.py --service`. It restarts its own browser on trouble; you only need something to restart
   *it* if the whole process dies.

## What it does for you

- Reloads the page every 6 h so it picks up new app versions; restarts the browser on a crash, a network drop or a lost
  sign-in (backing off up to 5 min); refreshes `auth-state.json` hourly; writes `status.json` every ~30 s
  (`--status` reads it).
- If the sign-in file is missing or stops working it says so and waits (`--service`) — replace the file and it recovers.
- Quiet mode (`?agent=1`): no welcome, no Abide invitation, no celebrations — nothing to click.

## Cautions

- It is one more device in your sync: it holds a full copy of your data and takes part in merges like any other.
- If you sign out of cloud sync on the worker's account, or revoke the session in your Google account, the saved sign-in
  stops working (the worker will say so).
- Laptops sleep: on a laptop it only works while awake. Use a machine that stays on.
