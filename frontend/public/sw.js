self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Activate');
});

self.addEventListener('fetch', (e) => {
  // Dummy fetch handler is required by Chrome for PWA installability
});
