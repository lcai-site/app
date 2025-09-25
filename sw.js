const CACHE_NAME = 'ai-image-studio-v1';

// Ativa o service worker assim que instalado
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// Assume o controle de todas as páginas abertas para que o service worker
// possa começar a interceptar requisições imediatamente.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Intercepta todas as requisições de rede.
// Usa a estratégia "stale-while-revalidate":
// 1. Tenta buscar a resposta do cache.
// 2. Se estiver no cache, retorna a resposta em cache imediatamente.
// 3. Em paralelo, faz uma requisição à rede para buscar a versão mais recente.
// 4. Se a requisição de rede for bem-sucedida, atualiza o cache com a nova resposta.
// 5. Se não estiver no cache, aguarda a resposta da rede e a armazena no cache para futuras requisições.
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não são GET para evitar cache de POSTs, etc.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignora requisições para a API do Gemini para evitar problemas de cache com respostas dinâmicas.
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Apenas armazena em cache respostas válidas
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(error => {
          console.warn('Fetch failed; a resposta em cache será usada se disponível.', error);
          // Retorna a resposta em cache se a rede falhar.
          // Se não houver resposta em cache, o erro se propagará.
          return response;
        });

        // Retorna a resposta do cache se existir, caso contrário, aguarda a rede.
        return response || fetchPromise;
      });
    })
  );
});
