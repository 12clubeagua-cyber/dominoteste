const CACHE_NAME = 'domino-felipe-v5'; // Incrementado para v5: Design System e Glassmorphism aplicados

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/config.js', '/state.js', '/names.js', '/utils.js',
  '/logic.js', '/dealer.js', '/referee.js', '/bots.js',
  '/audio.js', '/animations.js', '/renderer.js',
  '/dashboard.js', '/flowui.js', '/identity.js', '/ui.js',
  '/network.js', '/seats.js', '/multiplayer.js', '/input.js', '/lobby.js', '/game.js'
];

self.addEventListener('install', event => {
    // skipWaiting força o novo SW a instalar imediatamente, sem esperar fechar a aba
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', event => {
    // Apaga os caches antigos para garantir que a versão nova entre no ar
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Assume o controle de todas as abas abertas
    );
});

self.addEventListener('fetch', event => {
    // Stale-While-Revalidate strategy for optimal performance
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    if (networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
                return cachedResponse || fetchPromise;
            });
        })
    );
});