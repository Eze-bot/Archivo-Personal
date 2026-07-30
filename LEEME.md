# Archivo Personal — Guía de instalación

App propia para ver PDF, Word (.docx), Excel (.xlsx/.xls), CSV, TXT e imágenes,
con búsqueda de texto, compartir e imprimir. Sin publicidad: el código es tuyo.

Los archivos que abrís **quedan guardados dentro del celular** (no se suben a
ningún servidor). Cada celular tiene su propio índice, independiente de los
otros dos.

---

## Paso 1 — Publicar los archivos (gratis, 10 minutos, sin programar)

Para que la app se pueda "instalar" de verdad (ícono propio, funciona sin
depender de una PC), necesita estar alojada en una dirección web. La forma
más simple y gratuita es **GitHub Pages**.

1. Entrá a https://github.com y creá una cuenta gratuita (si no tenés).
2. Tocá el botón **"New repository"** (Nuevo repositorio).
   - Nombre: `archivo-personal`
   - Marcalo como **Public**
   - Creá el repositorio.
3. Dentro del repositorio, tocá **"Add file" → "Upload files"**.
4. Arrastrá estos 5 archivos (los que te compartí):
   - `index.html`
   - `app.js`
   - `manifest.json`
   - `service-worker.js`
   - `icon.png`
5. Tocá **"Commit changes"** para guardarlos.
6. Andá a **Settings → Pages** (en el menú de la izquierda).
7. En "Branch" elegí `main` y carpeta `/root`, guardá.
8. GitHub te va a dar una dirección tipo:
   `https://TU-USUARIO.github.io/archivo-personal/`
   (puede tardar 1–2 minutos en activarse la primera vez)

Esa dirección es tu app, publicada, sin ningún tercero metido en el medio.

---

## Paso 2 — Instalarla en cada uno de los 3 celulares

1. Abrí **Chrome** en el celular.
2. Entrá a la dirección del Paso 1.
3. Tocá el menú (⋮ arriba a la derecha) → **"Instalar app"** o
   **"Agregar a pantalla de inicio"**.
4. Confirmá. Va a aparecer un ícono propio ("Archivo Personal") en el celular,
   igual que cualquier otra app — se abre en pantalla completa, sin barra de
   navegador.

Repetir en los 3 celulares (cada uno queda con su propio índice de archivos).

---

## Cómo se usa

**En la pantalla principal:**
- **🔎 Buscar por nombre**: filtra la lista mientras escribís.
- **Ordenar**: Más reciente / Nombre A-Z / Tipo.
- **Etiquetas**: tocá el "+ etiqueta" de una tarjeta para ponerle una categoría
  (ej. "CHABOUX", "Trámites"). Las etiquetas usadas aparecen como chips arriba
  de la lista para filtrar con un toque.
- **✎ Renombrar**: cambia el nombre del archivo dentro del índice.
- **✕ Eliminar**: ahora pide confirmación antes de borrar.
- **Exportar**: descarga un .zip con todos los archivos guardados en ese
  celular — es tu respaldo manual (no hay sincronización automática entre
  los 3 celus, como se definió desde el principio).
- Debajo del título vas a ver cuántos archivos tenés y cuánto espacio están
  usando en el celular.

**Dentro de un documento:**
- **Buscar**: palabra resaltada + flechas ▲▼ para saltar entre coincidencias.
- **Zoom**: botones −/+, "Ajustar" al ancho, o pellizco con los dedos.
- El documento se reacomoda solo al girar el celular (vertical ⇄ horizontal).
- **Compartir** / **Imprimir**: como siempre.

---

## Qué formatos abre

PDF · Word (.docx) · Excel (.xlsx / .xls) · CSV · TSV · TXT · Markdown (.md) ·
LOG · JSON · XML · imágenes (.jpg, .png, .gif, .webp, .bmp, .svg)

**No incluye** (quedaron fuera a propósito, por ser formatos viejos o
propietarios difíciles de soportar bien): .doc antiguo, .rtf, .wps, .pages.
Si te llega un archivo en esos formatos, se puede convertir una vez a PDF o
DOCX con una herramienta online antes de agregarlo al índice.

**No incluye edición del contenido de los archivos** — es un visor con
búsqueda, zoom, etiquetas y renombrado, para mantenerlo liviano y confiable.

---

## Si más adelante querés cambiar algo

Todo el código está en `index.html` y `app.js`, comentado en español. No hace
falta reinstalar nada: basta con subir la versión nueva de esos archivos al
mismo repositorio de GitHub (Paso 1) y la app se actualiza sola la próxima
vez que se abra (por el `service-worker.js`, que refresca el contenido).
