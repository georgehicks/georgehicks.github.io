#!/usr/bin/env python3
"""AbidingSteps always-on worker — a signed-in browser that is simply "a device that is always open".

Why: agents queue operations in the cloud inbox (see ../../AGENTIC_GUIDE.md, Path A). A signed-in copy of the app
has to be open somewhere to apply them. This keeps one open, headless, forever, so a bot never waits for your phone.

    python abidingsteps_worker.py --login      # ONCE: opens a normal window — sign in with Google (Settings → Sync)
    python abidingsteps_worker.py              # run headless, restart on any trouble
    python abidingsteps_worker.py --status     # is it alive? (reads status.json)

State lives in ~/.abidingsteps-worker/ (override with ABIDINGSTEPS_WORKER_HOME): `profile/` is the browser profile
(holds the Google sign-in and the app's data), `status.json` is a heartbeat written every ~30 s.

Environment (all optional):
  ABIDINGSTEPS_URL              app address            (default https://georgehicks.github.io/AbidingSteps/index.html)
  ABIDINGSTEPS_BROWSER_CHANNEL  "chrome" (your installed Chrome, default) | "msedge" | "" for Playwright's bundled Chromium
  ABIDINGSTEPS_HEARTBEAT        seconds between health checks (default 30)
  ABIDINGSTEPS_RELOAD_HOURS     reload the page this often so it picks up new app versions (default 6)

Exit codes: 0 stopped on request · 2 not signed in (run --login) · 3 --login timed out.
"""
import argparse
import json
import os
import pathlib
import signal
import sys
import time

HOME = pathlib.Path(os.environ.get("ABIDINGSTEPS_WORKER_HOME", "~/.abidingsteps-worker")).expanduser()
PROFILE = HOME / "profile"
STATUS = HOME / "status.json"
URL = os.environ.get("ABIDINGSTEPS_URL", "https://georgehicks.github.io/AbidingSteps/index.html")
CHANNEL = os.environ.get("ABIDINGSTEPS_BROWSER_CHANNEL", "chrome") or None
HEARTBEAT = float(os.environ.get("ABIDINGSTEPS_HEARTBEAT", "30"))
RELOAD_EVERY = float(os.environ.get("ABIDINGSTEPS_RELOAD_HOURS", "6")) * 3600
STOP = {"now": False}


def log(msg):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), msg, flush=True)


def write_status(**kw):
    HOME.mkdir(parents=True, exist_ok=True)
    data = {"time": time.time(), "pid": os.getpid(), "url": URL}
    data.update(kw)
    tmp = STATUS.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=1))
    tmp.replace(STATUS)


def show_status():
    if not STATUS.exists():
        print("no status yet — the worker has never run")
        return 1
    d = json.loads(STATUS.read_text())
    age = time.time() - d.get("time", 0)
    alive = age < max(120, HEARTBEAT * 4) and d.get("state") == "running"
    print(json.dumps(d, indent=1))
    print("ALIVE" if alive else "NOT RUNNING (last heartbeat %.0f s ago, state=%s)" % (age, d.get("state")))
    return 0 if alive else 1


def launch(p, headless, login=False):
    PROFILE.mkdir(parents=True, exist_ok=True)
    kwargs = dict(channel=CHANNEL, headless=headless, viewport={"width": 480, "height": 900})
    if login:   # Google is less likely to refuse the sign-in if the window doesn't announce itself as automated
        kwargs.update(ignore_default_args=["--enable-automation"], args=["--disable-blink-features=AutomationControlled"])
    return p.chromium.launch_persistent_context(str(PROFILE), **kwargs)


def wait_ready(page, timeout=60000):
    page.wait_for_function("window.abidingAgent && window.abidingAgent.ready", timeout=timeout)


def state(page):
    return page.evaluate("() => window.abidingAgent.call('state')")


def signed_in(page):
    try:
        st = state(page)
        return bool(st.get("ok") and st.get("sync", {}).get("signedIn"))
    except Exception:
        return False


def do_login():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        ctx = launch(p, headless=False, login=True)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(URL)
        try:
            wait_ready(page)
            page.evaluate("() => switchTab('settings')")
        except Exception:
            pass
        log("A browser window is open. In it: Settings → Sync → 'Sign in with Google'. This window closes by itself once you are signed in.")
        deadline = time.time() + 600
        while time.time() < deadline:
            time.sleep(2)
            try:
                if signed_in(page):
                    log("Signed in. Letting the profile settle…")
                    time.sleep(6)   # give the browser time to write the login to disk
                    ctx.close()
                    log("Done. Now run the worker:  python abidingsteps_worker.py")
                    return 0
            except Exception:
                pass
        log("Timed out waiting for sign-in (10 min).")
        try:
            ctx.close()
        except Exception:
            pass
        return 3


def run_once(check_signin=True):
    """One browser lifetime. Returns normally when asked to stop; raises on trouble (the caller restarts)."""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        ctx = launch(p, headless=True)
        try:
            page = ctx.pages[0] if ctx.pages else ctx.new_page()
            crashed = {"v": False}
            page.on("crash", lambda *_: crashed.update(v=True))
            page.goto(URL + ("&" if "?" in URL else "?") + "agent=1", wait_until="domcontentloaded")
            wait_ready(page)
            deadline = time.time() + 30
            while time.time() < deadline and not signed_in(page):   # the sign-in restores asynchronously
                time.sleep(1)
            if check_signin and not signed_in(page):
                write_status(state="needs-login", message="not signed in — run: python abidingsteps_worker.py --login")
                log("Not signed in. Run:  python abidingsteps_worker.py --login")
                return 2
            log("Running. Cloud operations will be applied by this browser.")
            loaded = time.time()
            while not STOP["now"]:
                st = state(page)
                handled = page.evaluate("() => (typeof cloudSync !== 'undefined' && cloudSync.opCount) || 0")
                write_status(state="running", signedIn=bool(st.get("sync", {}).get("signedIn")), counts=st.get("counts"),
                             opsHandledThisPage=handled, lastSyncedAt=st.get("sync", {}).get("lastSyncedAt"))
                if crashed["v"]:
                    raise RuntimeError("page crashed")
                if check_signin and not st.get("sync", {}).get("signedIn"):
                    raise RuntimeError("signed out of cloud sync")
                if time.time() - loaded > RELOAD_EVERY:   # pick up a new app version
                    log("Reloading the page (scheduled).")
                    page.reload(wait_until="domcontentloaded")
                    wait_ready(page)
                    loaded = time.time()
                for _ in range(int(HEARTBEAT)):
                    if STOP["now"]:
                        break
                    time.sleep(1)
            return 0
        finally:
            try:
                ctx.close()
            except Exception:
                pass


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--login", action="store_true", help="one-time: open a normal window and sign in")
    ap.add_argument("--status", action="store_true", help="show whether the worker is alive")
    ap.add_argument("--no-signin-check", action="store_true", help="development: keep running even when signed out")
    ap.add_argument("--service", action="store_true", help="for a background service: when not signed in, wait and retry instead of exiting")
    a = ap.parse_args()
    if a.status:
        return show_status()
    if a.login:
        return do_login()
    signal.signal(signal.SIGTERM, lambda *_: STOP.update(now=True))
    signal.signal(signal.SIGINT, lambda *_: STOP.update(now=True))
    backoff = 5
    while not STOP["now"]:
        try:
            code = run_once(check_signin=not a.no_signin_check)
            if code == 2:
                if not a.service:
                    return 2      # interactive: tell the human and stop
                log("Waiting for a sign-in (run --login). Checking again in 2 minutes.")
                for _ in range(120):
                    if STOP["now"]:
                        break
                    time.sleep(1)
                continue
            backoff = 5
        except Exception as e:     # browser died, network dropped, signed out… start over
            log("Trouble: %s — restarting in %ds" % (e, backoff))
            write_status(state="restarting", message=str(e)[:300])
            for _ in range(backoff):
                if STOP["now"]:
                    break
                time.sleep(1)
            backoff = min(backoff * 2, 300)
    write_status(state="stopped")
    log("Stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
