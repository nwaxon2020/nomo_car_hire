const CACHE_NAME = 'nomo-cars-v1';
const STATIC_ASSETS = [
  '/',
  '/user/mobility/bookings',
  '/user/mobility/car-hire',
  '/user/mobility/transport-hub',
  '/user/mobility/load-booking',
  '/favicon.png',
  '/manifest.json',
  '/site.webmanifest',
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll failed for some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network first, cache as fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and browser extension/chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Allow Firebase realtime queries but NOT auth/token endpoints (for offline resilience)
  const url = new URL(event.request.url);
  const isAuthOrToken = url.pathname.includes('token') || url.pathname.includes('auth') || url.pathname.includes('securtoken');
  
  if (
    (url.hostname.includes('firestore.googleapis.com') && isAuthOrToken) ||
    (url.hostname.includes('firebase.googleapis.com') && isAuthOrToken) ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com')
  ) {
    return; // Skip auth calls - always live
  }
  
  // Allow Firestore data calls through to service worker for caching

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache good responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline fallback: serve from cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, serve the root
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
