// The single source of the app version — Settings reads it back from this cache
// name, so bump only here.
const CACHE = 'abidingsteps-v59';
const ASSETS = ['./index.html', './manifest.json', './icon.svg'];
// George's own bundled background tracks. These live in a SEPARATE, unversioned
// cache — MUSIC_CACHE, not CACHE — specifically so a normal app-version bump (which
// deletes every cache except the current CACHE) never touches them. Music only ever
// needs downloading once per device, not once per update. Self-heals on every
// activate (not just install), so a partial download from a bad connection keeps
// getting retried instead of silently staying incomplete forever.
const MUSIC_CACHE = 'abidingsteps-music';
const MUSIC_ASSETS = [
  'music/step/sanctum-pulse.mp3',
  'music/step/sanctum-pulse-2.mp3',
  'music/step/quiet-way-i-live.mp3',
  'music/step/tape-delay-crescendo.mp3',
  'music/step/what-next-lord-2.mp3',
  'music/step/welling-up.mp3',
  'music/step/here-in-the-withness.mp3',
  'music/step/with-you-from-you-for-you.mp3',
  'music/step/its-good-to-be-yours.mp3',
  'music/ahead/quiet-way-i-live.mp3',
  'music/ahead/its-good-to-be-yours.mp3',
  'music/ahead/with-you-from-you-for-you.mp3',
  'music/abide/here-in-the-withness.mp3',
];
function fillMusicCache() {
  return caches.open(MUSIC_CACHE).then(c =>
    Promise.all(MUSIC_ASSETS.map(url => c.match(url).then(hit => hit || c.add(url).catch(() => {}))))
  );
}

self.addEventListener('install', e => {
  e.waitUntil(Promise.all([caches.open(CACHE).then(c => c.addAll(ASSETS)), fillMusicCache()]));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('abidingsteps-') && k !== CACHE && k !== MUSIC_CACHE).map(k => caches.delete(k)))
    ).then(fillMusicCache)
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  // cross-origin (Firebase, YouTube) goes straight to the network, untouched by this cache
  if (new URL(req.url).origin !== self.location.origin) return;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const isMusic = req.url.includes('/music/');
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
        // self-heal any cache miss — music goes to the stable, version-proof
        // cache so it's never re-downloaded just because the app updated
        if (res.ok) { const copy = res.clone(); caches.open(isMusic ? MUSIC_CACHE : CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
