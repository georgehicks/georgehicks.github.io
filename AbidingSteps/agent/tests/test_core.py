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


class Reliability(unittest.TestCase):
    """What the live GrokBot run reported: failures come back as {ok:false}, undo can't be missing, undo ids expire."""

    def setUp(self):
        self.st = fresh()
        core.call("add", {"title": "Rel", "bucket": "Today", "steps": ["one"]}, store=self.st)

    def test_undo_record_failing_means_nothing_changes(self):
        def boom(rec):
            raise RuntimeError("permission denied")
        self.st.put_undo = boom
        r = core.call("addStep", {"outcome": "Rel", "text": "two"}, store=self.st)
        self.assertFalse(r["ok"])
        self.assertIn("nothing was changed", r["error"])
        self.assertNotIn("two", core.call("outline", {"outcome": "Rel"}, store=self.st)["text"])

    def test_network_and_signin_failures_are_results_not_exceptions(self):
        def down():
            raise RuntimeError("service-account sign-in failed (HTTP 401)")
        self.st.load = down
        r = core.call("state", {}, store=self.st)
        self.assertEqual(r["ok"], False)
        self.assertIn("cloud access failed", r["error"])

    def test_undo_expires_after_24h_and_old_records_are_swept(self):
        w = core.call("addStep", {"outcome": "Rel", "text": "two"}, store=self.st)
        u = self.st._undos()
        u[w["undo"]]["at"] -= core.UNDO_TTL_MS + 60000      # make it 24 h + 1 min old
        self.st._write_undos(u)
        r = core.call("undo", {"id": w["undo"]}, store=self.st)
        self.assertFalse(r["ok"])
        self.assertIn("expired", r["error"])
        w2 = core.call("addStep", {"outcome": "Rel", "text": "three"}, store=self.st)
        u = self.st._undos()
        u[w2["undo"]]["at"] -= core.UNDO_TTL_MS + 60000
        self.st._write_undos(u)
        self.st.prune_undos(core.UNDO_TTL_MS)
        left = self.st._undos()
        self.assertNotIn(w2["undo"], left)          # the old record is swept…
        self.assertEqual(len(left), 1)              # …the recent one (from setUp's add) is kept

    def test_undo_without_an_id_explains_itself(self):
        r = core.call("undo", {}, store=self.st)
        self.assertFalse(r["ok"])
        self.assertIn("pass the undo id", r["error"])

    def test_batch_reports_failures_and_can_stop(self):
        ops = [{"op": "addStep", "args": {"outcome": "Rel", "text": "a"}},
               {"op": "setStep", "args": {"outcome": "Rel", "step": "nope"}},
               {"op": "addStep", "args": {"outcome": "Rel", "text": "b"}}]
        r = core.batch(ops, store=self.st)
        self.assertEqual((r["ok"], r["failed"], len(r["results"])), (True, [1], 3))
        r = core.batch(ops, stop_on_error=True, store=self.st)         # python name
        self.assertEqual(len(r["results"]), 2)
        r = core.batch(ops, stopOnError=True, store=self.st)           # schema name
        self.assertEqual(len(r["results"]), 2)

    def test_unknown_op_lists_the_ops(self):
        r = core.call("nope", {}, store=self.st)
        self.assertEqual(r["error"], "unknown op")
        self.assertIn("addStep", r["ops"])


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


class ServiceAccount(unittest.TestCase):
    """The service-account sign-in is plain Python (no libraries): its RS256 signature must verify with real OpenSSL."""

    def setUp(self):
        import shutil
        if not shutil.which("openssl"):
            self.skipTest("openssl not available")
        import subprocess
        self.dir = tempfile.mkdtemp()
        run = lambda *a: subprocess.run(a, cwd=self.dir, check=True, capture_output=True)
        run("openssl", "genrsa", "-out", "k.pem", "2048")                                     # PKCS#1 or PKCS#8 depending on the OpenSSL
        run("openssl", "pkcs8", "-topk8", "-nocrypt", "-in", "k.pem", "-out", "k8.pem")      # PKCS#8 (the form Google's key files use)
        run("openssl", "rsa", "-in", "k.pem", "-pubout", "-out", "pub.pem")
        self.run_cmd = run

    def _verify(self, pem_name):
        with open(os.path.join(self.dir, pem_name)) as f:
            pem = f.read()
        msg = b"header.claims"
        with open(os.path.join(self.dir, "msg"), "wb") as f:
            f.write(msg)
        with open(os.path.join(self.dir, "sig"), "wb") as f:
            f.write(core.rs256_sign(msg, pem))
        r = self.run_cmd("openssl", "dgst", "-sha256", "-verify", "pub.pem", "-signature", "sig", "msg")
        self.assertIn(b"Verified OK", r.stdout)

    def test_signature_verifies_pkcs8(self):
        self._verify("k8.pem")

    def test_signature_verifies_whatever_openssl_wrote(self):
        self._verify("k.pem")

    def test_jwt_shape_and_reststore_uses_service_account(self):
        import base64 as b64
        with open(os.path.join(self.dir, "k8.pem")) as f:
            pem = f.read()
        sa = {"client_email": "bot@proj.iam.gserviceaccount.com", "private_key": pem, "project_id": "proj-x"}
        jwt = core.service_account_jwt(sa, "https://www.googleapis.com/auth/datastore", now=1000)
        head, claims, sig = jwt.split(".")
        dec = lambda t: json.loads(b64.urlsafe_b64decode(t + "=" * (-len(t) % 4)))
        self.assertEqual(dec(head), {"alg": "RS256", "typ": "JWT"})
        c = dec(claims)
        self.assertEqual((c["iss"], c["scope"], c["iat"], c["exp"]), ("bot@proj.iam.gserviceaccount.com", "https://www.googleapis.com/auth/datastore", 1000, 4600))
        self.assertEqual(c["aud"], "https://oauth2.googleapis.com/token")
        s = core.RestStore(uid="U", service_account=sa)
        self.assertIn("/projects/proj-x/", s.base)          # project taken from the key file


class VisionLinks(unittest.TestCase):
    def setUp(self):
        self.store = fresh()
        vs = [{"id": "v1", "type": "VisionDestination", "t": "A house of prayer", "status": "praying", "picture": "p", "why": "w", "scripture": "s"},
              {"id": "v2", "type": "VisionDestination", "t": "Healthy family", "status": "held", "picture": "", "why": "", "scripture": ""}]
        with open(self.store.path, "w") as f:
            json.dump({"data": {"outcomes": "[]", "notes": "{}", "visions": json.dumps(vs)}, "_v": 0}, f)

    def test_visions_is_read_only_and_lists_linked_outcomes(self):
        core.call("add", {"title": "Plan retreat"}, store=self.store)
        r = core.call("update", {"outcome": "Plan retreat", "toward": "house of prayer"}, store=self.store)
        self.assertTrue(r["ok"], r)
        self.assertEqual(r["toward"], "A house of prayer")
        v = core.call("visions", {}, store=self.store)
        self.assertEqual(v["total"], 2)
        self.assertEqual(v["items"][0]["outcomes"], ["Plan retreat"])
        self.assertEqual(v["items"][0]["status"], "praying")
        self.assertNotIn("undo", v)
        self.assertEqual(v["items"][0]["sessions"], 0)
        self.assertIsNone(v["items"][0]["lastSession"])

    def test_toward_unknown_or_ambiguous_fails_and_null_clears(self):
        core.call("add", {"title": "X"}, store=self.store)
        self.assertFalse(core.call("update", {"outcome": "X", "toward": "nonsense"}, store=self.store)["ok"])
        self.assertFalse(core.call("update", {"outcome": "X", "toward": "h"}, store=self.store)["ok"])   # matches both titles
        core.call("update", {"outcome": "X", "toward": "v2"}, store=self.store)
        r = core.call("update", {"outcome": "X", "toward": None}, store=self.store)
        self.assertTrue(r["ok"])
        self.assertNotIn("toward", r)

    def test_toward_change_can_be_undone(self):
        core.call("add", {"title": "X"}, store=self.store)
        r = core.call("update", {"outcome": "X", "toward": "v1"}, store=self.store)
        self.assertTrue(core.call("undo", {"id": r["undo"]}, store=self.store)["ok"])
        self.assertNotIn("toward", core.call("list", {}, store=self.store)["items"][0])


class VisionSessions(unittest.TestCase):
    def test_visions_reports_session_count_and_date_but_not_the_words(self):
        st = fresh()
        vs = [{"id": "v1", "t": "A", "status": "held", "journal": [{"id": "j1", "at": 1790000000000, "heard": "private words"}]}]
        with open(st.path, "w") as f:
            json.dump({"data": {"outcomes": "[]", "notes": "{}", "visions": json.dumps(vs)}, "_v": 0}, f)
        it = core.call("visions", {}, store=st)["items"][0]
        self.assertEqual(it["sessions"], 1)
        self.assertEqual(it["lastSession"], "2026-09-21")
        self.assertNotIn("private words", json.dumps(it))


if __name__ == "__main__":
    unittest.main()
