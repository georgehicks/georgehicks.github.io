const CACHE = 'bloomscroll-v35';
const ASSETS = ['./', './index.html', './app.js', './engine.js', './content.js', './text.js', './places.js', './art.js', './gamekit.js', './cheers.js', './games.js', './pass.js', './games-board.js', './games-cards.js', './papertoss.js', './rally.js', './blast.js', './putt.js', './billiards.js', './mathcmd.js', './games-extra.js', './music.js', './release.js', './treasuring.js', './clips.js', './voice.js', './voice/manifest.json', './manifest.json', './icon.svg', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('bloomscroll-') && k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Network first (so an updated file is never hidden behind an older neighbour); the cache is the offline fallback.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // Recorded readings never change (the file name is a hash of the words), so keep them for good, apart from the versioned cache.
  if (/\/voice\/[0-9a-f]{16}\.mp3$/.test(url.pathname)) {
    e.respondWith(caches.open('manna-voice').then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }))));
    return;
  }
  e.respondWith(
    fetch(new Request(e.request.url, { cache: 'no-cache' })).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
  );
});
