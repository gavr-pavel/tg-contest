self.addEventListener('install', () => {
  console.log('sw installed');
});

self.addEventListener('fetch', (event) => {
  if (/bg\.jpg\?blurred$/.test(event.request.url)) {
    event.respondWith(
        caches.match(event.request).then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});
