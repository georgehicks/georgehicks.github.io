const CACHE_NAME = 'focus-timers-cache-v1';
const urlsToCache = [
  '/FocusTimers/',
  '/FocusTimers/index.html'  // Cache the HTML explicitly
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});