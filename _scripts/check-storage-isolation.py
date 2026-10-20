#!/usr/bin/env python3
"""Fail if any app could damage another app's saved data.

Every app on georgehicks.github.io shares ONE localStorage (and one Cache Storage, and one Firebase project),
so isolation is by convention: each app keeps to its own key prefix and its own cache-name prefix. This script
checks that convention on the source files. Run it before pushing:

    python3 _scripts/check-storage-isolation.py          # exit 1 on any FAIL

It checks:
  1. nobody calls localStorage.clear() / sessionStorage.clear()
  2. namespaced apps only use keys inside their own namespace, and never enumerate localStorage
  3. service workers only delete caches with their own prefix, and no app's prefix matches another app's caches
  4. Firebase is used only by AbidingSteps and FocusFlowFireBase, and FocusFlowFireBase's sync skips other apps' keys
  5. AbidingSteps' cloud sync only collects its own `abidingsteps:` keys
"""
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# app folder -> key prefixes it owns. Apps not listed here use unprefixed keys (the FocusFlow family, microsprint,
# focus-app) and are only checked for the global rules.
NAMESPACES = {
    "AbidingSteps": ["abidingsteps:"],
    "Treasure": ["treasure:"],
    "IAmHere": ["iamhere."],
    "With": ["with."],
    "Notice": ["notice-"],
    "Span": ["span-"],
    "Flash": ["flash-"],
    "Vox": ["vox-"],
    "Charisma": ["charisma-"],
    "Abide": ["abide-"],
}
FIREBASE_ALLOWED = {"AbidingSteps", "FocusFlowFireBase"}
SKIP_DIRS = {".git", "node_modules", "reference", "_scripts", "illustrations", "studies"}

fails, warns = [], []


def source_files(app):
    base = os.path.join(ROOT, app)
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for f in filenames:
            if f.endswith((".html", ".js", ".mjs")) and not f.endswith((".test.js",)) and f not in ("tests.js", "tests.html"):
                yield os.path.join(dirpath, f)


def rel(p):
    return os.path.relpath(p, ROOT)


def apps():
    for name in sorted(os.listdir(ROOT)):
        p = os.path.join(ROOT, name)
        if os.path.isdir(p) and name not in SKIP_DIRS and not name.startswith("."):
            yield name


def literal_keys(src):
    """String literals used as localStorage keys: direct get/set/removeItem calls and key-constant declarations."""
    keys = set()
    for m in re.finditer(r"localStorage\.(?:get|set|remove)Item\(\s*['\"]([^'\"]+)['\"]", src):
        keys.add(m.group(1))
    for m in re.finditer(r"\b(?:const|let|var)\s+(?:[A-Z_]*KEY[A-Z_]*|LS_[A-Z_]+|STORE_PREFIX)\s*=\s*['\"]([^'\"]+)['\"]", src):
        keys.add(m.group(1))
    for m in re.finditer(r"\bKEY\s*=\s*\{([^}]*)\}", src):          # const KEY = { settings: 'iamhere.settings', ... }
        for v in re.finditer(r":\s*['\"]([^'\"]+)['\"]", m.group(1)):
            keys.add(v.group(1))
    return keys


def check_app(app):
    prefixes = NAMESPACES.get(app)
    for path in source_files(app):
        src = open(path, encoding="utf-8", errors="ignore").read()
        name = rel(path)
        if re.search(r"(?:local|session)Storage\.clear\s*\(", src):
            fails.append(f"{name}: calls storage.clear() — would wipe every app's data on this domain")
        enum = re.search(r"localStorage\.key\s*\(|Object\.(?:keys|entries)\s*\(\s*localStorage|localStorage\.length", src)
        if enum:
            # fine for a namespaced app if it filters what it scans down to its own prefix
            filtered = prefixes and any(("startsWith(STORE_PREFIX" in src) or (f"startsWith('{p}" in src) for p in prefixes)
            if not filtered:
                (fails if prefixes else warns).append(
                    f"{name}: enumerates localStorage" + ("" if not prefixes else " without filtering to its own prefix — would scan other apps' keys"))
        if prefixes:
            # AbidingSteps reaches storage through a wrapper that adds STORE_PREFIX, so only direct calls are literal keys
            keys = set(re.findall(r"localStorage\.(?:get|set|remove)Item\(\s*['\"]([^'\"]+)['\"]", src)) if "STORE_PREFIX" in src else literal_keys(src)
            for k in sorted(keys):
                if not any(k.startswith(p) for p in prefixes):
                    fails.append(f"{name}: key '{k}' is outside this app's namespace {prefixes}")


def cache_names():
    out = {}
    for app in apps():
        sw = os.path.join(ROOT, app, "sw.js")
        if os.path.exists(sw):
            src = open(sw, encoding="utf-8", errors="ignore").read()
            m = re.search(r"const\s+CACHE\s*=\s*['\"]([a-zA-Z0-9_-]+?)-v\d+['\"]", src)
            if m:
                out[app] = m.group(1) + "-"
    return out


def check_caches():
    names = cache_names()
    for app, prefix in names.items():
        for other, oprefix in names.items():
            if other != app and (oprefix.startswith(prefix) or prefix.startswith(oprefix)):
                fails.append(f"{app}/sw.js: cache prefix '{prefix}' overlaps {other}'s '{oprefix}'")
        src = open(os.path.join(ROOT, app, "sw.js"), encoding="utf-8", errors="ignore").read()
        for m in re.finditer(r"startsWith\(\s*['\"]([^'\"]*)['\"]\s*\)", src):
            if m.group(1) != prefix:
                fails.append(f"{app}/sw.js: deletes caches starting '{m.group(1)}' (own prefix is '{prefix}')")
        if re.search(r"caches\.keys\(\)[^;]*\.map\(\s*k\s*=>\s*caches\.delete", src) and "startsWith" not in src:
            fails.append(f"{app}/sw.js: deletes every cache, not just its own")


def check_firebase():
    for app in apps():
        if app in FIREBASE_ALLOWED:
            continue
        for path in source_files(app):
            src = open(path, encoding="utf-8", errors="ignore").read()
            if re.search(r"firebase|firestore|focusflowgeorge", src, re.I):
                fails.append(f"{rel(path)}: uses Firebase but only {sorted(FIREBASE_ALLOWED)} may")
    ff = os.path.join(ROOT, "FocusFlowFireBase", "focus-flow.html")
    if os.path.exists(ff) and "FOREIGN_APP_KEY" not in open(ff, encoding="utf-8").read():
        fails.append("FocusFlowFireBase/focus-flow.html: sync no longer skips other apps' keys (FOREIGN_APP_KEY missing)")
    ab = os.path.join(ROOT, "AbidingSteps", "index.html")
    if os.path.exists(ab):
        s = open(ab, encoding="utf-8").read()
        m = re.search(r"allData\(\)\s*\{(.*?)\n    \},", s, re.S)
        if not m or "startsWith(STORE_PREFIX)" not in m.group(1):
            fails.append("AbidingSteps/index.html: allData() no longer limits sync to its own prefix")


def main():
    for app in apps():
        check_app(app)
    check_caches()
    check_firebase()
    for w in warns:
        print("WARN ", w)
    for f in fails:
        print("FAIL ", f)
    print(f"\nstorage isolation: {len(fails)} failure(s), {len(warns)} warning(s)")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
