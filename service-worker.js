const CACHE = 'archivo-personal-v6';
const SHELL = ['./', './index.html', './app.js', './manifest.json', './icon.png'];

/* ---- IndexedDB mínimo (mismo esquema que app.js) para dejar los archivos
   recibidos por "Compartir" en una bandeja temporal ("incoming") ---- */
const DB_NAME = 'archivo-personal-db';
const DB_VERSION = 2;
function swOpenDB(){
  return new Promise((res, rej)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains('files')) db.createObjectStore('files', {keyPath:'id'});
      if(!db.objectStoreNames.contains('incoming')) db.createObjectStore('incoming', {keyPath:'id'});
    };
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
}
async function saveIncomingFiles(fileList){
  const db = await swOpenDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('incoming','readwrite');
    fileList.forEach(file=>{
      tx.objectStore('incoming').put({id: crypto.randomUUID(), name: file.name, blob: file});
    });
    tx.oncomplete = ()=>res();
    tx.onerror = ()=>rej(tx.error);
  });
}

async function handleShareTarget(event){
  try{
    const formData = await event.request.formData();
    const files = formData.getAll('files').filter(f=> f && f.name);
    if(files.length) await saveIncomingFiles(files);
  }catch(err){ /* si algo falla, igual redirigimos a la app */ }
  return Response.redirect(new URL('./?shared=1', event.request.url).toString(), 303);
}

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
  const url = new URL(e.request.url);

  // Archivo entrante desde el menú "Compartir" de Android
  if(e.request.method === 'POST' && url.pathname.endsWith('/share-target')){
    e.respondWith(handleShareTarget(e));
    return;
  }

  // Shell propio: cache-first. Librerías externas (CDN): network-first.
  if(url.origin === self.location.origin){
    e.respondWith(
      caches.match(e.request).then(cached=> cached || fetch(e.request))
    );
  }
});
