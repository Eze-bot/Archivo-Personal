/* ===================== Archivo Personal — app.js =====================
   App de un solo archivo (+libs por CDN). Guarda los documentos en el
   propio dispositivo (IndexedDB) — nada se sube a ningún servidor.
   ======================================================================= */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* ---------- IndexedDB muy simple ---------- */
const DB_NAME = 'archivo-personal-db';
const STORE = 'files';
const INCOMING = 'incoming';
function openDB(){
  return new Promise((res, rej)=>{
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains(STORE)){
        db.createObjectStore(STORE, {keyPath:'id'});
      }
      if(!db.objectStoreNames.contains(INCOMING)){
        db.createObjectStore(INCOMING, {keyPath:'id'});
      }
    };
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
}
async function dbPut(record){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = ()=>res();
    tx.onerror = ()=>rej(tx.error);
  });
}
async function dbDelete(id){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = ()=>res();
    tx.onerror = ()=>rej(tx.error);
  });
}
async function dbGetAll(){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = ()=>res(req.result || []);
    req.onerror = ()=>rej(req.error);
  });
}
async function dbClear(){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = ()=>res();
    tx.onerror = ()=>rej(tx.error);
  });
}
async function dbGetAllIncoming(){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(INCOMING,'readonly');
    const req = tx.objectStore(INCOMING).getAll();
    req.onsuccess = ()=>res(req.result || []);
    req.onerror = ()=>rej(req.error);
  });
}
async function dbClearIncoming(){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(INCOMING,'readwrite');
    tx.objectStore(INCOMING).clear();
    tx.oncomplete = ()=>res();
    tx.onerror = ()=>rej(tx.error);
  });
}

/* ---------- Utilidades ---------- */
const $ = (sel)=>document.querySelector(sel);
const extOf = (name)=> (name.split('.').pop()||'').toLowerCase();
const fmtSize = (bytes)=>{
  if(bytes < 1024) return bytes+' B';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(0)+' KB';
  return (bytes/1024/1024).toFixed(1)+' MB';
};
const fmtDate = (ts)=> new Date(ts).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit'});
function tag(ext){
  if(ext==='pdf') return 'PDF';
  if(['doc','docx'].includes(ext)) return 'WORD';
  if(['xls','xlsx'].includes(ext)) return 'EXCEL';
  if(ext==='csv') return 'CSV';
  if(ext==='tsv') return 'TSV';
  if(ext==='txt') return 'TXT';
  if(['md','markdown'].includes(ext)) return 'MD';
  if(ext==='log') return 'LOG';
  if(ext==='json') return 'JSON';
  if(ext==='xml') return 'XML';
  if(['jpg','jpeg','png','gif','webp','bmp','svg'].includes(ext)) return 'IMG';
  return ext.toUpperCase();
}
let toastTimer;
function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}

/* ---------- Estado ---------- */
let files = [];              // metadatos + blob en memoria (id,name,ext,size,date,blob)
let current = null;          // archivo abierto actualmente
let searchMatches = [];      // elementos <mark> actuales
let searchIndex = -1;
let zoomScale = 1;           // nivel de zoom del documento abierto

/* ---------- Render de la biblioteca ---------- */
function renderLibrary(){
  const list = $('#cardList');
  const empty = $('#emptyState');
  list.innerHTML = '';
  if(files.length===0){ empty.style.display='flex'; return; }
  empty.style.display='none';
  files
    .slice()
    .sort((a,b)=>b.date-a.date)
    .forEach(f=>{
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="tag mono">${tag(f.ext)}</div>
        <div class="info">
          <div class="name">${f.name}</div>
          <div class="meta">${fmtSize(f.size)} · ${fmtDate(f.date)}</div>
        </div>
        <div class="del mono" data-id="${f.id}">✕</div>
      `;
      card.addEventListener('click',(e)=>{
        if(e.target.closest('.del')) return;
        openViewer(f);
      });
      card.querySelector('.del').addEventListener('click', async (e)=>{
        e.stopPropagation();
        await dbDelete(f.id);
        files = files.filter(x=>x.id!==f.id);
        renderLibrary();
        toast('Archivo eliminado del índice');
      });
      list.appendChild(card);
    });
}

/* ---------- Carga inicial ---------- */
(async function init(){
  files = await dbGetAll();
  renderLibrary();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  }

  // ¿La app se abrió porque compartieron un archivo desde otra app?
  if(location.search.includes('shared=1')){
    try{
      const incoming = await dbGetAllIncoming();
      for(const item of incoming){
        const rec = {
          id: crypto.randomUUID(),
          name: item.name,
          ext: extOf(item.name),
          size: item.blob.size,
          date: Date.now(),
          blob: item.blob
        };
        await dbPut(rec);
        files.push(rec);
      }
      await dbClearIncoming();
      if(incoming.length){
        renderLibrary();
        toast(incoming.length===1 ? 'Archivo recibido por Compartir' : incoming.length+' archivos recibidos por Compartir');
      }
    }catch(err){ console.error(err); }
    // Limpiar el ?shared=1 de la barra de direcciones
    history.replaceState(null, '', location.pathname);
  }
})();

/* ---------- Agregar archivos ---------- */
$('#fab').addEventListener('click', ()=> $('#fileInput').click());
$('#fileInput').addEventListener('change', async (e)=>{
  const list = Array.from(e.target.files || []);
  for(const file of list){
    const rec = {
      id: crypto.randomUUID(),
      name: file.name,
      ext: extOf(file.name),
      size: file.size,
      date: Date.now(),
      blob: file
    };
    await dbPut(rec);
    files.push(rec);
  }
  e.target.value = '';
  renderLibrary();
  if(list.length) toast(list.length+' archivo(s) agregado(s) al índice');
});

$('#btnClear').addEventListener('click', async ()=>{
  if(files.length===0) return;
  if(!confirm('¿Vaciar todo el índice? Esto borra los archivos guardados en este celular.')) return;
  await dbClear();
  files = [];
  renderLibrary();
  toast('Índice vaciado');
});

/* ---------- Visor ---------- */
$('#btnBack').addEventListener('click', closeViewer);
function closeViewer(){
  $('#viewer').classList.remove('open');
  $('#searchInput').value='';
  searchMatches=[]; searchIndex=-1; updateSearchCount();
  current = null;
}

/* ---------- Zoom ---------- */
function setZoom(scale){
  zoomScale = Math.min(4, Math.max(0.4, scale));
  $('#zoomLevel').textContent = Math.round(zoomScale*100)+'%';
  const content = document.getElementById('docContent');
  if(!content) return;
  const img = content.querySelector('img.zoomable-img');
  if(img && img.dataset.naturalWidth){
    img.style.maxWidth = 'none';
    img.style.width = (parseFloat(img.dataset.naturalWidth) * zoomScale) + 'px';
  } else {
    content.style.zoom = zoomScale;
  }
}
function resetZoom(){ zoomScale = 1; setZoom(1); }

$('#btnZoomIn').addEventListener('click', ()=> setZoom(zoomScale + 0.2));
$('#btnZoomOut').addEventListener('click', ()=> setZoom(zoomScale - 0.2));
$('#btnZoomFit').addEventListener('click', ()=>{
  const content = document.getElementById('docContent');
  const body = $('#viewBody');
  if(!content || !body) return;
  const available = body.clientWidth - 24; // margen visual
  const img = content.querySelector('img.zoomable-img');
  let naturalWidth;
  if(img && img.dataset.naturalWidth){
    naturalWidth = parseFloat(img.dataset.naturalWidth);
  } else {
    const prevZoom = content.style.zoom;
    content.style.zoom = 1; // medir tamaño natural
    naturalWidth = content.scrollWidth || content.offsetWidth;
    content.style.zoom = prevZoom || 1;
  }
  if(!naturalWidth) return;
  const fit = available / naturalWidth;
  setZoom(fit > 0 ? fit : 1);
});

/* Pellizco (pinch) con dos dedos sobre el visor */
(function enablePinchZoom(){
  const body = $('#viewBody');
  let pinching = false;
  let startDist = 0;
  let startZoom = 1;

  function dist(touches){
    const [a,b] = touches;
    return Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
  }
  body.addEventListener('touchstart', (e)=>{
    if(e.touches.length===2){
      pinching = true;
      startDist = dist(e.touches);
      startZoom = zoomScale;
    }
  }, {passive:true});
  body.addEventListener('touchmove', (e)=>{
    if(pinching && e.touches.length===2){
      e.preventDefault();
      const newDist = dist(e.touches);
      const factor = newDist / (startDist || 1);
      setZoom(startZoom * factor);
    }
  }, {passive:false});
  body.addEventListener('touchend', (e)=>{
    if(e.touches.length < 2) pinching = false;
  });
})();

async function openViewer(f){
  current = f;
  $('#viewer').classList.add('open');
  $('#vname').textContent = f.name;
  $('#searchInput').value = '';
  searchMatches = []; searchIndex = -1; updateSearchCount();
  resetZoom();
  const body = $('#viewBody');
  body.className = '';
  body.innerHTML = `<div class="loading"><div class="spin"></div><span>Cargando ${f.ext.toUpperCase()}…</span></div>`;

  try{
    if(f.ext==='pdf') await renderPDF(f);
    else if(f.ext==='docx') await renderDOCX(f);
    else if(['xlsx','xls'].includes(f.ext)) await renderSheet(f);
    else if(f.ext==='csv') await renderSheet(f);
    else if(f.ext==='tsv') await renderTSV(f);
    else if(['txt','md','markdown','log','json','xml'].includes(f.ext)) await renderTXT(f);
    else if(['jpg','jpeg','png','gif','webp','bmp','svg'].includes(f.ext)) await renderImage(f);
    else { body.innerHTML = `<div class="loading">Formato no compatible con el visor.</div>`; }
  }catch(err){
    console.error(err);
    body.innerHTML = `<div class="loading">No se pudo abrir el archivo.<br><span class="mono" style="font-size:11px">${(err&&err.message)||''}</span></div>`;
  }
}

/* ----- TXT / MD / LOG / JSON / XML (todos como texto plano) ----- */
async function renderTXT(f){
  let text = await f.blob.text();
  if(f.ext==='json'){
    try{ text = JSON.stringify(JSON.parse(text), null, 2); }catch(e){ /* si no es JSON válido, se muestra tal cual */ }
  }
  const body = $('#viewBody');
  body.innerHTML = `<pre class="txtview" id="docContent"></pre>`;
  $('#docContent').textContent = text;
}

/* ----- Imagen ----- */
async function renderImage(f){
  const url = URL.createObjectURL(f.blob);
  const body = $('#viewBody');
  body.innerHTML = `<div class="imgview" id="docContent"></div>`;
  const container = document.getElementById('docContent');
  const img = document.createElement('img');
  img.className = 'zoomable-img';
  img.alt = f.name;
  img.src = url;
  await new Promise((resolve)=>{
    img.onload = ()=>{
      img.dataset.naturalWidth = img.naturalWidth;
      resolve();
    };
    img.onerror = resolve;
  });
  container.appendChild(img);
}

/* ----- DOCX (mammoth) ----- */
async function renderDOCX(f){
  const arrayBuffer = await f.blob.arrayBuffer();
  const result = await mammoth.convertToHtml({arrayBuffer});
  const body = $('#viewBody');
  body.classList.add('pad');
  body.innerHTML = `<div class="docview" id="docContent">${result.value}</div>`;
}

/* ----- XLSX / XLS / CSV (SheetJS) ----- */
async function renderSheet(f){
  const arrayBuffer = await f.blob.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, {type:'array'});
  const body = $('#viewBody');
  const names = wb.SheetNames;
  let activeIdx = 0;

  function draw(){
    const sheet = wb.Sheets[names[activeIdx]];
    const html = XLSX.utils.sheet_to_html(sheet, {editable:false});
    const tabsHTML = names.length>1
      ? `<div class="sheettabs">${names.map((n,i)=>
          `<div class="sheettab ${i===activeIdx?'active':''}" data-i="${i}">${n}</div>`).join('')}</div>`
      : '';
    body.innerHTML = `${tabsHTML}<div class="sheetwrap" id="docContent">${html}</div>`;
    body.querySelectorAll('.sheettab').forEach(tabEl=>{
      tabEl.addEventListener('click', ()=>{
        activeIdx = parseInt(tabEl.dataset.i,10);
        draw();
      });
    });
    // SheetJS produce una <table>; le agregamos nuestra clase para estilo
    const t = body.querySelector('table');
    if(t) t.classList.add('sheet');
  }
  draw();
}

/* ----- TSV (tabla separada por tabulaciones) ----- */
async function renderTSV(f){
  const text = await f.blob.text();
  const body = $('#viewBody');
  const rows = text.replace(/\r/g,'').split('\n').filter(r=>r.length>0).map(r=>r.split('\t'));
  const rowsHTML = rows.map((cells,i)=>
    `<tr>${cells.map(c=>`<td>${escapeHTML(c)}</td>`).join('')}</tr>`
  ).join('');
  body.innerHTML = `<div class="sheetwrap"><table class="sheet" id="docContent">${rowsHTML}</table></div>`;
}
function escapeHTML(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ----- PDF (pdf.js) con capa de texto para búsqueda ----- */
async function renderPDF(f){
  const arrayBuffer = await f.blob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data:arrayBuffer}).promise;
  const body = $('#viewBody');
  body.classList.add('pad');
  body.innerHTML = '';
  const container = document.createElement('div');
  container.id = 'docContent';
  body.appendChild(container);

  for(let p=1; p<=pdf.numPages; p++){
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({scale: 1.3});

    const wrapper = document.createElement('div');
    wrapper.style.position='relative';
    wrapper.style.width = viewport.width+'px';
    wrapper.style.height = viewport.height+'px';
    wrapper.style.margin='0 auto 14px';

    const canvas = document.createElement('canvas');
    canvas.className='pdfpage';
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.position='absolute';
    canvas.style.top=0; canvas.style.left=0;
    const ctx = canvas.getContext('2d');
    await page.render({canvasContext:ctx, viewport}).promise;

    // capa de texto (transparente) para permitir búsqueda/selección
    const textContent = await page.getTextContent();
    const textLayer = document.createElement('div');
    textLayer.style.position='absolute';
    textLayer.style.top=0; textLayer.style.left=0;
    textLayer.style.width=viewport.width+'px';
    textLayer.style.height=viewport.height+'px';
    textLayer.style.color='transparent';
    textLayer.style.lineHeight='1';
    textLayer.className='pdf-textlayer';

    textContent.items.forEach(item=>{
      const tx = pdfjsLib.Util.transform(
        pdfjsLib.Util.transform(viewport.transform, item.transform),
        [1,0,0,1,0,0]
      );
      const fontHeight = Math.hypot(tx[2], tx[3]);
      const span = document.createElement('span');
      span.textContent = item.str;
      span.style.position='absolute';
      span.style.left = tx[4]+'px';
      span.style.top = (tx[5]-fontHeight)+'px';
      span.style.fontSize = fontHeight+'px';
      span.style.fontFamily='sans-serif';
      span.style.whiteSpace='pre';
      span.style.transformOrigin='0% 0%';
      textLayer.appendChild(span);
    });

    wrapper.appendChild(canvas);
    wrapper.appendChild(textLayer);
    container.appendChild(wrapper);
  }
}

/* ---------- Búsqueda de texto en el documento abierto ---------- */
const searchInput = $('#searchInput');
searchInput.addEventListener('input', debounce(doSearch, 250));
$('#searchPrev').addEventListener('click', ()=> jumpMatch(-1));
$('#searchNext').addEventListener('click', ()=> jumpMatch(1));

function debounce(fn, ms){
  let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };
}

function clearMarks(root){
  root.querySelectorAll('mark[data-hit]').forEach(m=>{
    const parent = m.parentNode;
    parent.replaceChild(document.createTextNode(m.textContent), m);
    parent.normalize();
  });
}

function walkAndHighlight(root, query){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node){
      if(!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if(node.parentNode && node.parentNode.tagName==='SCRIPT') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const q = query.toLowerCase();
  const nodes = [];
  let n;
  while((n = walker.nextNode())) nodes.push(n);

  nodes.forEach(textNode=>{
    const value = textNode.nodeValue;
    const lower = value.toLowerCase();
    if(!lower.includes(q)) return;
    const frag = document.createDocumentFragment();
    let idx = 0, pos;
    while((pos = lower.indexOf(q, idx)) !== -1){
      if(pos > idx) frag.appendChild(document.createTextNode(value.slice(idx,pos)));
      const mark = document.createElement('mark');
      mark.setAttribute('data-hit','1');
      mark.textContent = value.slice(pos, pos+q.length);
      frag.appendChild(mark);
      idx = pos + q.length;
    }
    if(idx < value.length) frag.appendChild(document.createTextNode(value.slice(idx)));
    textNode.parentNode.replaceChild(frag, textNode);
  });
}

function doSearch(){
  const root = document.getElementById('docContent');
  if(!root) return;
  clearMarks(root);
  const q = searchInput.value.trim();
  searchMatches = []; searchIndex = -1;
  if(q.length >= 1){
    walkAndHighlight(root, q);
    searchMatches = Array.from(root.querySelectorAll('mark[data-hit]'));
  }
  updateSearchCount();
  if(searchMatches.length){ searchIndex = 0; focusMatch(); }
}

function jumpMatch(dir){
  if(!searchMatches.length) return;
  searchIndex = (searchIndex + dir + searchMatches.length) % searchMatches.length;
  focusMatch();
}

function focusMatch(){
  searchMatches.forEach(m=>m.style.outline='none');
  const m = searchMatches[searchIndex];
  if(!m) return;
  m.style.outline = '2px solid #e8e6e1';
  m.scrollIntoView({block:'center', behavior:'smooth'});
  updateSearchCount();
}

function updateSearchCount(){
  const el = $('#searchCount');
  if(!searchMatches.length){ el.textContent = searchInput.value ? '0' : ''; return; }
  el.textContent = (searchIndex+1)+'/'+searchMatches.length;
}

/* ---------- Compartir ---------- */
$('#btnShare').addEventListener('click', async ()=>{
  if(!current) return;
  try{
    const file = new File([current.blob], current.name, {type: current.blob.type || 'application/octet-stream'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title: current.name});
    } else if(navigator.share){
      await navigator.share({title: current.name, text: 'Archivo: '+current.name});
    } else {
      // Fallback: descarga directa
      const url = URL.createObjectURL(current.blob);
      const a = document.createElement('a');
      a.href = url; a.download = current.name;
      document.body.appendChild(a); a.click(); a.remove();
      toast('Descargado (compartir no disponible en este navegador)');
    }
  }catch(err){
    if(err.name !== 'AbortError') toast('No se pudo compartir el archivo');
  }
});

/* ---------- Imprimir ----------
   El tamaño de papel lo elige el propio diálogo de impresión de Android
   (según la impresora/PDF que uses). El contenido se adapta automáticamente
   al ancho de la hoja gracias a las reglas @media print de más arriba. */
$('#btnPrint').addEventListener('click', ()=>{
  if(!current) return;
  window.print();
});
