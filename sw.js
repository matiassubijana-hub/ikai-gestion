// Service worker mínimo — solo para que el navegador permita instalar la
// app como PWA. No hay modo sin conexión: los datos siempre se leen en
// vivo desde Supabase, así que este service worker NO cachea nada del
// backend, solo el "cascarón" estático de la propia página para que abra
// un poco más rápido en visitas repetidas.

const CACHE_NAME = 'ikai-gestion-shell-v1';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
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
  const url = new URL(event.request.url);

  // Solo intervenimos en pedidos GET al propio origen del "cascarón".
  // Todo lo demás (Supabase, fuentes externas, etc.) va directo a la red,
  // sin pasar por el cache, para que los datos siempre sean los reales.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
