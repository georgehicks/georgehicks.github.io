// Keep this version suffix in sync with any version marker shown in-app so a
// stale cache is easy to spot and force-refresh.
const CACHE = 'abidingsteps-v28';
const ASSETS = ['./index.html', './manifest.json', './icon.svg'];
// George's own bundled background tracks — precached at install so they play with
// zero network hit. Cached with allSettled (not part of the main addAll) so one
// slow/dropped track on a bad connection can't fail the whole service-worker install;
// any that miss here still get cached on first play via the fetch handler below.
const MUSIC_ASSETS = [
  'music/step/sanctum-pulse.mp3',
  'music/step/sanctum-pulse-2.mp3',
  'music/step/quiet-way-i-live.mp3',
  'music/step/tape-delay-crescendo.mp3',
  'music/step/what-next-lord-2.mp3',
  'music/step/welling-up.mp3',
  'music/step/here-in-the-withness.mp3',
  'music/ahead/quiet-way-i-live.mp3',
  'music/ahead/its-good-to-be-yours.mp3',
  'music/abide/here-in-the-withness.mp3',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(ASSETS).then(() => Promise.allSettled(MUSIC_ASSETS.map(url => c.add(url))))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('abidingsteps-') && k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  // cross-origin (Firebase, YouTube) goes straight to the network, untouched by this cache
  if (new URL(req.url).origin !== self.location.origin) return;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
  } else {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        // self-heal any precache miss (e.g. a bundled track skipped during install)
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
