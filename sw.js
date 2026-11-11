const CACHE_NAME = 'comanda-cache-v3';
// Fotos de productos: cache aparte que NO se borra cuando cambia la version de la app.
const CACHE_FOTOS = 'comanda-fotos-v1';
const MAX_FOTOS_EN_CACHE = 150;
const ARCHIVOS_BASE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './config.js',
  './manifest.json',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_BASE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME && n !== CACHE_FOTOS).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

function esFotoDeProducto(url) {
  return url.pathname.includes('/storage/v1/object/public/productos/');
}

// Deja como maximo MAX_FOTOS_EN_CACHE fotos guardadas (se borran las mas antiguas): las fotos viejas
// que ya no se usan no se acumulan para siempre.
async function recortarCacheFotos(cache) {
  const claves = await cache.keys();
  for (let i = 0; i < claves.length - MAX_FOTOS_EN_CACHE; i++) await cache.delete(claves[i]);
}

// Las fotos nunca cambian: cada archivo lleva la hora de subida en el nombre, y al reemplazar una foto se
// sube un archivo nuevo con otro nombre. Por eso se guardan la primera vez y despues se sirven desde el
// telefono, sin volver a bajarlas cada vez que se abre la app.
async function fotoDesdeCacheOInternet(peticion) {
  const cache = await caches.open(CACHE_FOTOS);
  const guardada = await cache.match(peticion.url);
  if (guardada) return guardada;
  // Se pide con CORS para que la respuesta no quede "opaca" (las opacas ocupan mucha cuota de almacenamiento).
  const respuesta = await fetch(peticion.url, { mode: 'cors', credentials: 'omit' });
  if (respuesta.ok) {
    await cache.put(peticion.url, respuesta.clone());
    recortarCacheFotos(cache).catch(() => {});
  }
  return respuesta;
}

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  if (esFotoDeProducto(new URL(evento.request.url))) {
    evento.respondWith(fotoDesdeCacheOInternet(evento.request).catch(() => Response.error()));
    return;
  }
  evento.respondWith(
    fetch(evento.request, { cache: 'no-store' })
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(evento.request))
  );
});
