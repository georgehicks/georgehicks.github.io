// Empty service worker that does nothing but is required for PWA compatibility
self.addEventListener('install', event => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Claim clients immediately
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Pass through all requests without caching
  event.respondWith(fetch(event.request));
});