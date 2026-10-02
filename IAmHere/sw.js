const CACHE = 'iamhere-v54';
const ASSETS = ['./', './index.html', './app.js', './engine.js', './content.json', './manifest.json', './icon.svg',
  './links/inner-and-outer-man-1.jpg', './links/why-off-1.jpg', './links/why-he-came-1.jpg'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the HTTP cache so a version bump really fetches fresh files
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
  // no skipWaiting here: a new version waits so an open page never mixes old code with
  // new files. The app tells it to take over (below) when the person is on a resting screen.
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('iamhere-') && k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  // only the app's own page refreshes the cached shell (not e.g. tests.html)
  const isShell = /\/IAmHere\/(index\.html)?$/.test(new URL(req.url).pathname);
  // other pages (e.g. a Links PDF opened directly): saved copy if we have one, else network;
  // never stored as the app shell
  if (isHTML && !isShell) { e.respondWith(caches.match(req, { ignoreSearch: true }).then(c => c || fetch(req))); return; }
  if (isHTML) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
  } else if (new URL(req.url).pathname.includes('/IAmHere/links/')) {
    // study pages: saved the first time they're viewed (the phone pages are precached above)
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(c => c || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(cache => cache.put(req, copy)); }
      return res;
    })));
  } else {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(c => c || fetch(req)));
  }
});
