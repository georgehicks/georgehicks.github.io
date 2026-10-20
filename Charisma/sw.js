const CACHE = 'charisma-v3';
// Only ever clean up THIS app's own old caches. Cache Storage is shared by every app on the domain, so
// deleting "everything that isn't mine" would also wipe the other apps' offline copies (and AbidingSteps' music).
const CACHE_PREFIX = CACHE.replace(/v\d+$/, '');
const ASSETS = [
  './index.html',
  './app.js',
  './manifest.json',
  './icon.svg',
  './content/stats.js',
  './content/badges.js',
  './content/index.js',
  './content/modules/first-impressions.js',
  './content/modules/confidence.js',
  './content/modules/conversation.js',
  './content/modules/storytelling.js',
  './content/modules/presence.js',
  './content/modules/leadership.js',
  './content/packs/humor.js',
  './content/packs/conflict.js',
  './content/packs/small-talk.js',
  './content/packs/presenting.js',
  './content/packs/meetings.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k)))
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
