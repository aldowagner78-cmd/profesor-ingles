// Service Worker para PWA - Profesor IA v5.0 (Critical Fixes)
const CACHE_NAME = 'profesor-ia-v5.0-critical';
const BASE_PATH = '/profesor-ingles';

// Recursos críticos para funcionamiento offline
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/state.js',
  './js/services/gemini.js',
  './js/services/voice.js',
  './js/modules/camera.js',
  './js/modules/chat.js',
  './js/modules/profile.js',
  './js/utils/ui.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/lucide-static@latest/font/lucide.js',
  'https://cdn.jsdelivr.net/npm/marked@latest/marked.min.js',
  'https://cdn-icons-png.flaticon.com/512/1903/1903172.png'
];

// Instalación: cachear archivos
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker v5.0...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando archivos críticos');
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'})));
      })
      .catch(err => console.error('[SW] Error al cachear:', err))
  );
  self.skipWaiting(); // Forzar activación inmediata
});

// Activación: limpiar caches viejos y tomar control
self.addEventListener('activate', event => {
  console.log('[SW] Activando Service Worker v5.0...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando cache obsoleto:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Tomar control de todos los clientes inmediatamente
});

// Fetch: Estrategia Stale-While-Revalidate para mejor rendimiento y actualizaciones
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Ignorar llamadas a la API de Gemini y otros orígenes no controlados (excepto CDNs cacheados)
  if (request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }
  
  // Solo manejar GET
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      // Si hay cache, devolverlo, pero actualizar en segundo plano (Stale-While-Revalidate)
      const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(err => console.log('[SW] Fetch error (offline):', err));

      return cachedResponse || fetchPromise;
    })
  );
});
