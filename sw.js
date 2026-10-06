// Service worker mínimo — solo para que el navegador permita instalar la
// app como PWA. No hay modo sin conexión: los datos siempre se leen en
// vivo desde Supabase, así que este service worker NO cachea nada del
// backend, solo el "cascarón" estático de la propia página para que abra
// un poco más rápido en visitas repetidas.

// v2 (23 sept 2026): suma ikai-dojo.html (App de clases, módulo
// Entrenamiento) al cascarón, así la herramienta de clase abre aunque la
// conexión del dojo falle. Cada archivo se cachea por separado: si uno
// falta en el servidor, los demás se guardan igual.
// v3 (5 oct 2026): módulo Eventos / Torneos (sin archivos nuevos; solo fuerza
// a los dispositivos a tomar el index.html actualizado).
const CACHE_NAME = 'ikai-gestion-shell-v3';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './ikai-dojo.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(SHELL_FILES.map((f) => cache.add(f).catch(() => {})))
    )
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
        // Solo respuestas válidas: no guardar un 404 como si fuera la página.
        if (res.ok) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
