self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('mindtree-cache').then(cache => {
      return cache.addAll(['/', 'index.html', 'manifest.json', 'app.js']);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});
