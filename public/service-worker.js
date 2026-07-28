// Kill-switch service worker: clears old caches and unregisters itself so
// returning browsers stop intercepting requests (the previous version was
// breaking Supabase POSTs).
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.allSettled(names.map((n) => caches.delete(n)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      await Promise.allSettled(clients.map((c) => c.navigate(c.url)));
    } finally {
      await self.registration.unregister();
    }
  })());
});
