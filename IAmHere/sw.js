const CACHE = 'iamhere-v15';
const ASSETS = ['./', './index.html', './app.js', './engine.js', './content.json', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the HTTP cache so a version bump really fetches fresh files
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

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
  if (isHTML && !isShell) return;
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
