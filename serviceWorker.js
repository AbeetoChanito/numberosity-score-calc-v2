const CACHE_NAME = 'highStakesV5RCCalc';
const urlsToCache = [
  '/vexScoreCalc/',
  '/vexScoreCalc/index.html',
  '/vexScoreCalc/styles.css',
  '/vexScoreCalc/script.js',
  '/vexScoreCalc/manifest.json',
  '/vexScoreCalc/icons/highStakesMogo192x192.png',
  '/vexScoreCalc/icons/highStakesMogo512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .catch(error => console.error('Install failed:', error))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }) // Ignore query strings for matching
      .then(response => {
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }
        // If no cache match, try fetching from network
        return fetch(event.request).catch(() => {
          // Network failed (offline), handle navigation requests
          if (event.request.mode === 'navigate') {
            console.log('Offline, falling back to /vexScoreCalc/index.html for:', event.request.url);
            return caches.match('/vexScoreCalc/index.html') || Promise.reject('No fallback available');
          }
          // For non-navigation requests, let it fail silently (e.g., images)
          return Promise.reject('No cache or network available');
        });
      })
      .catch(error => {
        console.error('Fetch handler error:', error, 'for:', event.request.url);
        // Final fallback if caches.match('/vexScoreCalc/index.html') returns undefined
        return caches.match('/vexScoreCalc/index.html') || new Response('Offline and no fallback available', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Ensure new SW takes control immediately
  );
});