// Minimal service worker for PWA support
// This is required for the "Add to Home Screen" prompt to appear on Android/Chrome

const CACHE_NAME = "colist-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Network-first strategy for most requests
  // For now, we just pass through to the network
  event.respondWith(
    fetch(event.request).catch(() => {
      // Fallback if network is unavailable
      return caches.match(event.request);
    })
  );
});
