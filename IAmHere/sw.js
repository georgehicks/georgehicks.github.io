const CACHE = 'iamhere-v79';
const ASSETS = ['./', './index.html', './app.js', './engine.js', './content.json', './verses.json', './manifest.json', './icon.svg',
  './studies/inner-and-outer-man.html', './studies/inner-and-outer-man-mobile.html', './studies/not-quite.html',
  './studies/not-quite-mobile.html', './studies/why-he-came.html', './studies/why-he-came-mobile.html',
  './studies/thinkers-feelers-doers.html', './studies/thinkers-feelers-doers-mobile.html'];

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
  } else {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(c => c || fetch(req)));
  }
});
