const CACHE = 'archivo-personal-v1';
const SHELL = ['./', './index.html', './app.js', './manifest.json', './icon.png'];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e)=>{
  // Shell propio: cache-first. Librerías externas (CDN): network-first.
  const url = new URL(e.request.url);
  if(url.origin === self.location.origin){
    e.respondWith(
      caches.match(e.request).then(cached=> cached || fetch(e.request))
    );
  }
});
