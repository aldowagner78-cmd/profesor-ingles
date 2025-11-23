// Service Worker para PWA - Profesor IA v4.0
const CACHE_NAME = 'profesor-ia-v4.2-splash-cache';
const BASE_PATH = '/profesor-ingles';
const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/css/styles.css`,
  `${BASE_PATH}/js/app.js`,
  `${BASE_PATH}/js/config.js`,
  `${BASE_PATH}/js/state.js`,
  `${BASE_PATH}/js/services/gemini.js`,
  `${BASE_PATH}/js/services/voice.js`,
  `${BASE_PATH}/js/modules/camera.js`,
  `${BASE_PATH}/js/modules/chat.js`,
  `${BASE_PATH}/js/modules/profile.js`,
  `${BASE_PATH}/js/utils/ui.js`,
  `${BASE_PATH}/manifest.json`,
  'https://cdn.jsdelivr.net/npm/lucide-static@latest/font/lucide.js',
  'https://cdn.jsdelivr.net/npm/marked@latest/marked.min.js'
];

// Instalación: cachear archivos
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando archivos');
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'})));
      })
      .catch(err => console.error('[SW] Error al cachear:', err))
  );
  self.skipWaiting();
});

// Activación: limpiar caches viejos
self.addEventListener('activate', event => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch: estrategia Network First con fallback a Cache
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Ignorar llamadas a la API de Gemini (siempre necesita red)
  if (request.url.includes('generativelanguage.googleapis.com')) {
    return; // No cachear llamadas a la API
  }
  
  // Ignorar solicitudes que no sean GET
  if (request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    fetch(request)
      .then(response => {
        // Si la respuesta es válida, cachearla
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, usar cache
        return caches.match(request).then(cached => {
          if (cached) {
            console.log('[SW] Sirviendo desde cache:', request.url);
            return cached;
          }
          // Si no hay en cache, mostrar página offline
          if (request.destination === 'document') {
            return caches.match(`${BASE_PATH}/index.html`);
          }
        });
      })
  );
});
