"""Tests for abidingsteps_core. Run:  python3 -m unittest discover -s tests -v   (from the agent/ folder)

The headline test replays a fixed list of operations (tests/parity_ops.json) and checks every answer against what the
REAL in-app API (window.abidingAgent) returned for the same operations on 2026-10-20 (tests/parity_expected_from_app.json,
recorded from the app). If the Python port ever drifts from the app's rules, that test fails.
"""
import datetime
import json
import os
import re
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import abidingsteps_core as core  # noqa: E402

core.set_today(datetime.date(2026, 10, 20))
strip = lambda t: re.sub(r"(# |◆ )\S+ ", r"\1", t)
no_id = lambda items: [{k: v for k, v in r.items() if k != "id"} for r in items]


def fresh():
    d = tempfile.mkdtemp()
    return core.FileStore(os.path.join(d, "doc.json"))


class Parity(unittest.TestCase):
    def test_matches_the_app(self):
        st = fresh()
        ops = json.load(open(os.path.join(HERE, "parity_ops.json")))
        exp = json.load(open(os.path.join(HERE, "parity_expected_from_app.json")))
        res = [core.call(o["op"], o.get("args"), store=st) for o in ops]
        got = [{k: (strip(v) if k == "outline" else v) for k, v in r.items() if k not in ("id", "undo")} for r in res]
        self.assertEqual(got, exp["results"])
        for t, text in exp["outlines"].items():
            self.assertEqual(strip(core.call("outline", {"outcome": t}, store=st)["text"]), text, t)
        self.assertEqual(no_id(core.call("list", {"q": "Parity", "limit": 50}, store=st)["items"]), exp["list"])
        self.assertEqual(no_id(core.call("list", {"q": "Parity", "bucket": "Later"}, store=st)["items"]), exp["listAll"])
        self.assertEqual(no_id(core.call("agenda", {"context": "call", "includeFuture": True}, store=st)["items"]), exp["agenda"])
        self.assertEqual(no_id(core.call("agenda", {"date": "2026-12-31"}, store=st)["items"]), exp["agendaDate"])
        self.assertEqual(no_id(core.call("find", {"q": "alpha"}, store=st)["items"]), exp["find"])


class Behaviour(unittest.TestCase):
    def setUp(self):
        self.st = fresh()
        self.a = core.call("add", {"title": "Undo test", "bucket": "Today", "steps": ["alpha", "beta"]}, store=self.st)

    def test_undo_by_id_and_conflict(self):
        s = core.call("addStep", {"outcome": "Undo test", "text": "gamma"}, store=self.st)
        self.assertTrue(s["undo"])
        core.call("setStep", {"outcome": "Undo test", "step": "gamma", "done": True}, store=self.st)   # a later edit to the same notes
        r = core.call("undo", {"id": s["undo"]}, store=self.st)
        self.assertFalse(r["ok"])
        self.assertIn("changed since", r["error"])
        r = core.call("undo", {"id": s["undo"], "force": True}, store=self.st)
        self.assertTrue(r["ok"])
        self.assertNotIn("gamma", core.call("outline", {"outcome": "Undo test"}, store=self.st)["text"])

    def test_undo_of_creation_and_batch(self):
        made = core.call("add", {"title": "Temp"}, store=self.st)
        self.assertTrue(core.call("undo", {"id": made["undo"]}, store=self.st)["ok"])
        self.assertEqual(core.call("list", {"q": "Temp"}, store=self.st)["total"], 0)
        b = core.batch([{"op": "addStep", "args": {"outcome": "Undo test", "text": "b1"}},
                        {"op": "addStep", "args": {"outcome": "Undo test", "text": "b2"}}], store=self.st)
        self.assertTrue(core.call("undo", {"ids": [r["undo"] for r in b["results"]]}, store=self.st)["ok"])
        self.assertNotIn("b1", core.call("outline", {"outcome": "Undo test"}, store=self.st)["text"])

    def test_concurrent_device_write_is_retried_not_lost(self):
        """A device writes between this call's read and write → the call reloads and re-applies; both changes survive."""
        real_save = self.st.save
        state = {"n": 0}

        def sneaky_save(outcomes, notes, version):
            if state["n"] == 0:                      # simulate another writer sneaking in first
                state["n"] = 1
                o, n, v = self.st.load()
                n[o[0]["id"]] = n[o[0]["id"]] + "\n- written by a device"
                real_save(o, n, v)
            return real_save(outcomes, notes, version)   # now stale → Conflict → retry
        self.st.save = sneaky_save
        r = core.call("addStep", {"outcome": "Undo test", "text": "from the agent"}, store=self.st)
        self.st.save = real_save
        self.assertTrue(r["ok"])
        text = core.call("outline", {"outcome": "Undo test"}, store=self.st)["text"]
        self.assertIn("written by a device", text)
        self.assertIn("from the agent", text)

    def test_duplicate_nth_and_confirm(self):
        core.call("addStep", {"outcome": "Undo test", "text": "twin", "allowDuplicate": True}, store=self.st)
        core.call("addStep", {"outcome": "Undo test", "text": "twin", "allowDuplicate": True}, store=self.st)
        self.assertIn("nth", core.call("setStep", {"outcome": "Undo test", "step": "twin"}, store=self.st)["error"])
        self.assertTrue(core.call("setStep", {"outcome": "Undo test", "step": "twin", "nth": 2, "done": True}, store=self.st)["ok"])
        self.assertTrue(core.call("addStep", {"outcome": "Undo test", "text": "alpha"}, store=self.st)["duplicate"])
        self.assertFalse(core.call("remove", {"outcome": "Undo test"}, store=self.st)["ok"])
        self.assertTrue(core.call("remove", {"outcome": "Undo test", "confirm": True}, store=self.st)["ok"])

    def test_device_only_ops_say_so(self):
        for op in ("start", "stop", "timer", "syncNow"):
            self.assertIn("device or browser", core.call(op, {}, store=self.st)["error"])

    def test_caches_stay_consistent_for_the_app(self):
        o, notes, _ = self.st.load()
        self.assertEqual(o[0]["subs"], ["alpha", "beta"])
        core.call("setStep", {"outcome": "Undo test", "step": "alpha", "done": True}, store=self.st)
        o, _, _ = self.st.load()
        self.assertEqual((o[0]["subs"], o[0]["doneSubs"]), (["beta"], ["alpha"]))


class RestRequests(unittest.TestCase):
    """The Firestore REST calls are shaped correctly (no network: the HTTP layer is replaced)."""

    def test_load_and_save_shapes(self):
        calls = []
        s = core.RestStore(uid="UID1", project="proj", id_token="TOKEN")
        doc = {"updateTime": "2026-10-20T10:00:00.5Z", "fields": {"data": {"mapValue": {"fields": {
            "outcomes": {"stringValue": json.dumps([{"id": "o1", "t": "X", "milestones": [], "subs": []}])},
            "notes": {"stringValue": "{}"}, "settings": {"stringValue": "{}"}}}}, "updatedAt": {"integerValue": "1"}}}

        def fake_http(method, url, body=None, auth=True):
            calls.append((method, url, json.loads(body) if body else None))
            return doc if method == "GET" else {}
        s._http = fake_http
        outcomes, notes, version = s.load()
        self.assertEqual((outcomes[0]["id"], notes, version), ("o1", {}, "2026-10-20T10:00:00.5Z"))
        s.save(outcomes, {"o1": "- a"}, version)
        method, url, body = calls[-1]
        self.assertEqual(method, "PATCH")
        self.assertIn("/users/UID1/apps/abidingsteps?", url)
        self.assertIn("updateMask.fieldPaths=data.outcomes", url)
        self.assertIn("updateMask.fieldPaths=data.notes", url)
        self.assertNotIn("data.settings", url)                 # other keys are never touched
        self.assertIn("currentDocument.updateTime=2026-10-20T10%3A00%3A00.5Z", url)
        self.assertEqual(json.loads(body["fields"]["data"]["mapValue"]["fields"]["notes"]["stringValue"]), {"o1": "- a"})


if __name__ == "__main__":
    unittest.main()
