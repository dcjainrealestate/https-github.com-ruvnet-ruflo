// DC Jain Task Management System — app-shell service worker.
// Caches only the HTML shell so the installed app opens instantly and
// still loads (to a last-known state) if briefly offline. Every other
// request — Supabase data, fonts, CDN scripts — is left to the network
// untouched, since this app's task/meeting data must always be live.
const CACHE_NAME = 'dcjain-tms-shell-v1';
const SHELL_URL = './index.html';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(SHELL_URL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_URL, copy));
        return res;
      })
      .catch(() => caches.match(SHELL_URL))
  );
});
