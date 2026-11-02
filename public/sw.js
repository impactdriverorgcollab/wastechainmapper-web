// Lets the field app open without signal. It stores the app's own files, never data from the API:
// records are kept in IndexedDB by the app itself, and anything under /backend always goes to the network.
const CACHE = 'wcm-shell-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/backend')) return;

  const isShellAsset = url.pathname.startsWith('/_next/static/') || url.pathname === '/icon.svg';
  const isFieldPage = req.mode === 'navigate' && url.pathname.startsWith('/field');
  if (!isShellAsset && !isFieldPage) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(isFieldPage ? '/field' : req, copy));
        }
        return res;
      })
      .catch(() => caches.match(isFieldPage ? '/field' : req).then((hit) => hit || Response.error())),
  );
});
