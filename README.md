# georgehicks.github.io

## Shared storage rules (all apps on this domain share one localStorage, Cache Storage and Firebase project)

- Keep every localStorage key inside your app's own prefix (`treasure:`, `iamhere.`, `with.`, `abidingsteps:` …). Never call
  `localStorage.clear()` and never scan other apps' keys.
- A service worker may only delete caches that start with its **own** cache prefix (`const CACHE_PREFIX = CACHE.replace(/v\d+$/, '')`);
  never "delete everything that isn't mine".
- Firebase is used only by AbidingSteps and FocusFlowFireBase; a sync engine must only touch its own keys.
- `python3 _scripts/check-storage-isolation.py` enforces this (and `pwa-push.sh` runs it before every push).
- AbidingSteps additionally keeps rolling safety copies in IndexedDB and restores them automatically if its data ever disappears.
