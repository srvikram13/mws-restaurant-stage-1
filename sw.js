/*
Original Source : https://googlechrome.github.io/samples/service-worker/basic/
*/


const PRECACHE = 'precache-v1';
const RUNTIME = 'runtime';

// A list of local resources we always want to be cached.
const PRECACHE_URLS = [
  'index.html',
  'restaurant.html',
  './', // Alias for index.html
  'css/styles.css',
  'js/dbhelper.js',
  'js/main.js',
  'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
  'js/restaurant_info.js',
  'images/1-medium.jpg',
  'images/1-small.jpg',
  'images/2-medium.jpg',
  'images/2-small.jpg',
  'images/3-medium.jpg',
  'images/3-small.jpg',
  'images/4-medium.jpg',
  'images/4-small.jpg',
  'images/5-medium.jpg',
  'images/5-small.jpg',
  'images/6-medium.jpg',
  'images/6-small.jpg',
  'images/7-medium.jpg',
  'images/7-small.jpg',
  'images/8-medium.jpg',
  'images/8-small.jpg',
  'images/9-medium.jpg',
  'images/9-small.jpg',
  'images/10-medium.jpg',
  'images/10-small.jpg',
];

// The install handler takes care of precaching the resources we always need.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
      .catch(err => console.log("error installing sw", err))
  );
/*   event.registerForeignFetch({
		scopes:['/'],
		origins:['*'] // or simply '*' to allow all origins
	}); */
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// The fetch handler serves responses for same-origin resources from a cache.
// If no response is found, it populates the runtime cache with the response
// from the network before returning it to the page.
self.addEventListener('fetch', event => {
  
  // Skip cross-origin requests, like those for Google Analytics.
  //  if (event.request.url.startsWith(self.location.origin)) {
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request.url.split("?")[0]).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return caches.open(RUNTIME).then(cache => {
          return fetch(event.request).then(response => {
            // Put a copy of the response in the runtime cache.
            return cache.put(event.request, response.clone()).then(() => {
              return response;
            });
          });
        });
      })
    );
  }
});