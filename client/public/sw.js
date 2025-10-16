// Service Worker for aggressive cache busting on iOS WebKit
// Version: 1760625660849

const CACHE_NAME = 'allinya-v1760625660849';
const BUILD_TIMESTAMP = '1760625660849';

// List of resources to never cache
const NEVER_CACHE_PATTERNS = [
  /\.js$/,
  /\.tsx?$/,
  /\.jsx?$/,
  /\.css$/,
  /\/api\//,
  /\/src\//,
  /\/@/,
  /\/node_modules\//,
  /\/@vite/,
  /\/@react-refresh/,
  /\/assets\//,
  /\.hot-update/
];

// Force immediate activation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new service worker, timestamp:', BUILD_TIMESTAMP);
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker, clearing all caches');
  event.waitUntil(
    // Delete ALL old caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return clients.claim();
    }).then(() => {
      // Force reload all clients to get fresh content
      return clients.matchAll({ type: 'window' }).then((windowClients) => {
        windowClients.forEach((client) => {
          // Send message to reload
          client.postMessage({ type: 'CACHE_UPDATED', timestamp: BUILD_TIMESTAMP });
        });
      });
    })
  );
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Check if this resource should never be cached
  const shouldBypassCache = NEVER_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
  
  if (shouldBypassCache) {
    // For JavaScript and CSS files, always fetch from network
    // Add cache-busting query parameter for iOS WebKit
    const bustUrl = new URL(event.request.url);
    bustUrl.searchParams.set('_t', BUILD_TIMESTAMP);
    
    const init = {
      method: event.request.method,
      headers: new Headers(event.request.headers),
      mode: event.request.mode,
      credentials: event.request.credentials,
      cache: 'no-store', // Force no caching
      redirect: event.request.redirect
    };
    
    // Add cache-control headers for aggressive prevention
    init.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    init.headers.set('Pragma', 'no-cache');
    init.headers.set('Expires', '0');
    
    event.respondWith(
      fetch(bustUrl, init)
        .then(response => {
          // Clone the response and modify headers
          const modifiedResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: new Headers(response.headers)
          });
          
          // Add aggressive no-cache headers to response
          modifiedResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          modifiedResponse.headers.set('Pragma', 'no-cache');
          modifiedResponse.headers.set('Expires', '0');
          modifiedResponse.headers.set('X-Build-Timestamp', BUILD_TIMESTAMP);
          
          return modifiedResponse;
        })
        .catch(error => {
          console.error('[SW] Fetch failed:', error);
          // If network fails, return error response
          return new Response('Network error', { status: 503 });
        })
    );
  } else {
    // For other resources (images, fonts), use normal network-first strategy
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  }
});

// Listen for messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_VERSION') {
    event.ports[0].postMessage({ 
      version: BUILD_TIMESTAMP,
      cacheCleared: true 
    });
  }
});