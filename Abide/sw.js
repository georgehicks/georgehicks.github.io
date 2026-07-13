const CACHE = 'abide-v3';
const ASSETS = [
  './index.html',
  './app.js',
  './manifest.json',
  './icon.svg',
  './content/verses.js',
  './content/assertions.js',
  './content/index.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
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
    e.respondWith(caches.match(req).then(c => c || fetch(req)));
  }
});
