#!/usr/bin/env python3
"""AbidingSteps always-on worker — a signed-in headless browser that is simply "a device that is always open".

Two ways to use it — NEITHER needs a background service unless you want one:

  ONE-SHOT (no service): open the app signed in, do one operation, sync, close. Seconds, then nothing is left running.
      python abidingsteps_worker.py --call state
      python abidingsteps_worker.py --call addStep --args '{"outcome":"Plan retreat","text":"Call venue @call"}'

  ALWAYS-ON (optional): keep one open so a bot with no browser of its own gets answers even when none of your devices are
  open (agents queue operations in the cloud inbox — see ../../AGENTIC_GUIDE.md, Path A). Only then does it need
  something to keep it alive.

Runs anywhere Python + a Chromium/Chrome runs (macOS, Windows, Linux, Raspberry Pi, a container). It has no
OS-specific service of its own — run it under whatever keeps processes alive for you (Docker, systemd, pm2, Task
Scheduler, tmux…; see README.md).

    python abidingsteps_worker.py --login        # ONCE, on any desktop: sign in with Google; writes auth-state.json
    python abidingsteps_worker.py --call OP      # one-shot: run one operation and exit (see above)
    python abidingsteps_worker.py --service      # always-on: run headless; restarts the browser on any trouble
    python abidingsteps_worker.py --status       # is it alive? (reads status.json)

Sign-in is carried by ONE FILE, auth-state.json (cookies + the app's local data + its IndexedDB — where the cloud
sign-in lives). Make it on any machine with a screen, copy it to wherever the worker runs. It is a credential:
treat it like a password. (A browser *profile folder* would not travel between operating systems; this does.)

Environment (all optional):
  ABIDINGSTEPS_WORKER_HOME      where auth-state.json and status.json live      (default ~/.abidingsteps-worker)
  ABIDINGSTEPS_URL              app address            (default https://georgehicks.github.io/AbidingSteps/index.html)
  ABIDINGSTEPS_BROWSER_CHANNEL  "chrome" (installed Chrome, default) | "msedge" | "" for Playwright's bundled Chromium
  ABIDINGSTEPS_NO_SANDBOX       set to 1 when running as root in a container
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
STATE = HOME / "auth-state.json"
STATUS = HOME / "status.json"
URL = os.environ.get("ABIDINGSTEPS_URL", "https://georgehicks.github.io/AbidingSteps/index.html")
CHANNEL = os.environ.get("ABIDINGSTEPS_BROWSER_CHANNEL", "chrome") or None
HEARTBEAT = float(os.environ.get("ABIDINGSTEPS_HEARTBEAT", "30"))
RELOAD_EVERY = float(os.environ.get("ABIDINGSTEPS_RELOAD_HOURS", "6")) * 3600
SAVE_STATE_EVERY = 3600
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


def start_browser(p, headless, login=False):
    args = []
    if os.environ.get("ABIDINGSTEPS_NO_SANDBOX"):
        args.append("--no-sandbox")
    kw = dict(channel=CHANNEL, headless=headless, args=args)
    if login:   # Google is less likely to refuse the sign-in if the window doesn't announce itself as automated
        kw.update(ignore_default_args=["--enable-automation"], args=args + ["--disable-blink-features=AutomationControlled"])
    return p.chromium.launch(**kw)


def save_state(ctx, path):
    """Write cookies + local data + IndexedDB. Atomic; falls back if this Playwright can't include IndexedDB."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    try:
        ctx.storage_state(path=str(tmp), indexed_db=True)
    except TypeError:   # older Playwright: no IndexedDB in the file → the cloud sign-in may not carry over
        log("WARNING: this Playwright cannot save IndexedDB (need >= 1.51); the sign-in may not carry over. pip install -U playwright")
        ctx.storage_state(path=str(tmp))
    try:
        os.chmod(tmp, 0o600)
    except Exception:
        pass
    tmp.replace(path)


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


def do_login(out_path):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = start_browser(p, headless=False, login=True)
        ctx = browser.new_context(viewport={"width": 480, "height": 900})
        page = ctx.new_page()
        page.goto(URL)
        try:
            wait_ready(page)
            page.evaluate("() => switchTab('settings')")
        except Exception:
            pass
        log("A browser window is open. In it: Settings → Sync → 'Sign in with Google'. It closes by itself once you are signed in.")
        deadline = time.time() + 600
        while time.time() < deadline:
            time.sleep(2)
            try:
                if signed_in(page):
                    time.sleep(5)   # let the app finish its first sync
                    save_state(ctx, out_path)
                    browser.close()
                    log("Signed in. Saved %s" % out_path)
                    log("Copy that file to the machine that runs the worker (into its worker folder), then:  python abidingsteps_worker.py --service")
                    return 0
            except Exception:
                pass
        log("Timed out waiting for sign-in (10 min).")
        browser.close()
        return 3


READ_ONLY = {"state", "list", "outline", "agenda", "find", "timer"}


def do_call(op, args_json):
    """One-shot: open the app signed in, run ONE operation, push it to the cloud, close. Prints the result as JSON."""
    from playwright.sync_api import sync_playwright
    try:
        args = json.loads(args_json) if args_json else {}
    except ValueError as e:
        print(json.dumps({"ok": False, "error": "--args is not valid JSON: %s" % e}))
        return 1
    if not STATE.exists():
        print(json.dumps({"ok": False, "error": "no auth-state.json — run --login on a machine with a screen first"}))
        return 2
    with sync_playwright() as p:
        browser = start_browser(p, headless=True)
        try:
            ctx = browser.new_context(storage_state=str(STATE), viewport={"width": 480, "height": 900})
            page = ctx.new_page()
            page.goto(URL + ("&" if "?" in URL else "?") + "agent=1", wait_until="domcontentloaded")
            wait_ready(page)
            deadline = time.time() + 30
            while time.time() < deadline and not signed_in(page):
                time.sleep(1)
            if not signed_in(page):
                print(json.dumps({"ok": False, "error": "the saved sign-in no longer works — run --login again"}))
                return 2
            time.sleep(2)   # let the first cloud sync land, so the operation sees your current data
            result = page.evaluate("([op, args]) => window.abidingAgent.call(op, args)", [op, args])
            if op not in READ_ONLY and result.get("ok"):
                page.evaluate("() => window.abidingAgent.call('syncNow')")   # push the change before closing
            try:
                save_state(ctx, STATE)
            except Exception:
                pass
            print(json.dumps(result, ensure_ascii=False))
            return 0 if result.get("ok") else 1
        finally:
            try:
                browser.close()
            except Exception:
                pass


def run_once(check_signin=True):
    """One browser lifetime. Returns normally when asked to stop; raises on trouble (the caller restarts)."""
    from playwright.sync_api import sync_playwright
    if not STATE.exists():
        write_status(state="needs-login", message="no auth-state.json — run --login on a machine with a screen and copy it here")
        log("No %s. Run --login on a machine with a screen, then copy the file here." % STATE)
        return 2
    with sync_playwright() as p:
        browser = start_browser(p, headless=True)
        try:
            ctx = browser.new_context(storage_state=str(STATE), viewport={"width": 480, "height": 900})
            page = ctx.new_page()
            crashed = {"v": False}
            page.on("crash", lambda *_: crashed.update(v=True))
            page.goto(URL + ("&" if "?" in URL else "?") + "agent=1", wait_until="domcontentloaded")
            wait_ready(page)
            deadline = time.time() + 30
            while time.time() < deadline and not signed_in(page):   # the sign-in restores asynchronously
                time.sleep(1)
            if check_signin and not signed_in(page):
                write_status(state="needs-login", message="the saved sign-in no longer works — run --login again")
                log("The saved sign-in no longer works. Run --login again and replace auth-state.json.")
                return 2
            log("Running. Cloud operations will be applied by this browser.")
            loaded = saved = time.time()
            while not STOP["now"]:
                st = state(page)
                handled = page.evaluate("() => (typeof cloudSync !== 'undefined' && cloudSync.opCount) || 0")
                write_status(state="running", signedIn=bool(st.get("sync", {}).get("signedIn")), counts=st.get("counts"),
                             opsHandledThisPage=handled, lastSyncedAt=st.get("sync", {}).get("lastSyncedAt"))
                if crashed["v"]:
                    raise RuntimeError("page crashed")
                if check_signin and not st.get("sync", {}).get("signedIn"):
                    raise RuntimeError("signed out of cloud sync")
                if time.time() - saved > SAVE_STATE_EVERY:      # keep the saved sign-in fresh
                    try:
                        save_state(ctx, STATE)
                    except Exception as e:
                        log("could not refresh auth-state.json: %s" % e)
                    saved = time.time()
                if time.time() - loaded > RELOAD_EVERY:       # pick up a new app version
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
                browser.close()
            except Exception:
                pass


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--login", action="store_true", help="once, on a machine with a screen: sign in and write auth-state.json")
    ap.add_argument("--call", metavar="OP", help="one-shot (no service): run one operation, push it, exit — e.g. --call state")
    ap.add_argument("--args", help="JSON arguments for --call")
    ap.add_argument("--status", action="store_true", help="show whether the worker is alive")
    ap.add_argument("--state", help="path of auth-state.json (default: <worker home>/auth-state.json)")
    ap.add_argument("--service", action="store_true", help="for a supervisor/container: when not signed in, wait and retry instead of exiting")
    ap.add_argument("--no-signin-check", action="store_true", help="development: keep running even when signed out")
    a = ap.parse_args()
    global STATE
    if a.state:
        STATE = pathlib.Path(a.state).expanduser()
    if a.status:
        return show_status()
    if a.login:
        return do_login(STATE)
    if a.call:
        return do_call(a.call, a.args)
    signal.signal(signal.SIGTERM, lambda *_: STOP.update(now=True))
    signal.signal(signal.SIGINT, lambda *_: STOP.update(now=True))
    backoff = 5
    while not STOP["now"]:
        try:
            code = run_once(check_signin=not a.no_signin_check)
            if code == 2:
                if not a.service:
                    return 2      # interactive: tell the human and stop
                log("Waiting for a sign-in file. Checking again in 2 minutes.")
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
