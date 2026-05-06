const CACHE_NAME = 'domino-felipe-v1'; // Mude este número sempre que atualizar o código!

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
    // Network-First para arquivos locais durante o desenvolvimento
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});