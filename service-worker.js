// service-worker.js
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalado');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativado');
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Verifica se a requisição é para o nosso endpoint de compartilhamento
  if (event.request.method === 'POST' && url.pathname === '/share-target/') {
    console.log('Service Worker: Requisição de compartilhamento interceptada!');
    
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const imageFile = formData.get('image');

        if (!imageFile || !(imageFile instanceof File)) {
          console.log('Service Worker: Nenhum arquivo de imagem encontrado no compartilhamento.');
          return Response.redirect('/', 303); // Redireciona para a página inicial
        }

        // Encontra a janela/cliente do nosso app que está aberta
        const clients = await self.clients.matchAll({ type: 'window' });
        if (clients.length > 0) {
          // Envia o arquivo de imagem para a janela principal do app
          clients[0].postMessage({ file: imageFile });
          console.log('Service Worker: Arquivo enviado para o app.');
        }
        
        // Redireciona o usuário de volta para o app
        return Response.redirect('/', 303);
      })()
    );
  } else {
    // Para todas as outras requisições, continue com o comportamento padrão
    event.respondWith(fetch(event.request));
  }
});