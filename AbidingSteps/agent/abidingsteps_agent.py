#!/usr/bin/env python3
"""AbidingSteps agent CLI — let an LLM agent survey and manage your outcomes while your devices are closed.

Default (direct): the agent's own runtime reads/edits the cloud copy of your data (Firestore, plain HTTPS) with the same
operations as the in-app API. Your devices merge those changes the next time they open. No server of yours, no device
needed. Standard library only. See ../AGENTIC_GUIDE.md.

Sign in as a dedicated bot user (rules in the guide limit it to this one doc):
    export ABIDINGSTEPS_UID=<your UID — Settings → Sync shows it>
    export ABIDINGSTEPS_BOT_EMAIL=…  ABIDINGSTEPS_BOT_PASSWORD=…  ABIDINGSTEPS_API_KEY=<Firebase web API key>

Usage:
    python abidingsteps_agent.py state
    python abidingsteps_agent.py op outline '{"outcome":"Plan retreat"}'
    python abidingsteps_agent.py op addStep '{"outcome":"Plan retreat","text":"Call venue @call >fri"}'
    python abidingsteps_agent.py batch '[{"op":"setStep","args":{"outcome":"Plan retreat","step":"Call venue","done":true}},{"op":"state"}]'
    python abidingsteps_agent.py --file doc.json state          # work on a local JSON file instead (tests, offline)
    python abidingsteps_agent.py --via-devices op state         # optional: queue it for one of YOUR devices to apply (needs the app open)

As a library:   from abidingsteps_core import call, batch      (call("addStep", {...}) → {ok, …, undo})
"""
import json
import os
import sys
import time
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import abidingsteps_core as core  # noqa: E402


def via_devices(op, args=None, wait=60, poll=1.0):
    """Optional: drop an operation in the cloud inbox for an open signed-in device to apply (timer ops, or answers
    straight from the app's own code). Needs one of your devices to have the app open."""
    s = core.RestStore()
    op_id = uuid.uuid4().hex[:12]
    fields = {"kind": {"stringValue": "as-op"}, "id": {"stringValue": op_id}, "op": {"stringValue": op},
              "argsJson": {"stringValue": json.dumps(args or {})}, "at": {"integerValue": str(int(time.time() * 1000))}}
    s._http("POST", "%s?documentId=as-op-%s" % (s.base, op_id), json.dumps({"fields": fields}).encode())
    deadline = time.time() + wait
    while time.time() < deadline:
        d = s._http("GET", "%s/as-res-%s" % (s.base, op_id))
        if d:
            s._http("DELETE", "%s/as-res-%s" % (s.base, op_id))
            return json.loads(d["fields"]["result"]["stringValue"])
        time.sleep(poll)
    return {"ok": False, "error": "no device answered in %ds — is the app open and signed in on one of your devices?" % wait, "id": op_id}


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    store = None
    devices = False
    while argv and argv[0].startswith("--"):
        flag = argv.pop(0)
        if flag == "--file":
            store = core.FileStore(argv.pop(0))
        elif flag == "--via-devices":
            devices = True
        else:
            print("unknown option", flag)
            return 2
    cmd = argv[0] if argv else ""
    if cmd == "state":
        op, args = "state", {}
    elif cmd == "op" and len(argv) >= 2:
        op, args = argv[1], (json.loads(argv[2]) if len(argv) > 2 else {})
    elif cmd == "batch" and len(argv) >= 2:
        ops = json.loads(argv[1])
        res = core.batch(ops, store=store) if not devices else {"ok": True, "results": [via_devices(o["op"], o.get("args")) for o in ops]}
        print(json.dumps(res, ensure_ascii=False))
        return 0
    else:
        print(__doc__)
        return 2
    res = via_devices(op, args) if devices else core.call(op, args, store=store)
    print(json.dumps(res, ensure_ascii=False))
    return 0 if res.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
