# Fuentes de los manuales en PDF

De aquí salen los tres PDF de [`docs/manuales/`](../) (que también se ven en el panel: Medios → Manuales):

| PDF | Fuente |
|---|---|
| Manual de la web - Maquinas de Coser Zafra.pdf | `manual-web.html` |
| Manual del panel - Maquinas de Coser Zafra.pdf | `manual-panel.html` |
| Guia de solicitudes de presupuesto (borrador) - Maquinas de Coser Zafra.pdf | `guia-solicitudes.html` |

Cada manual es una página HTML con estilos comunes (`estilo.css`), las letras de la web (`fuentes/`) y capturas
(`img/`). El PDF se genera con Chromium (Playwright). No forman parte de la web: no se publican ni los usa el build.

## Estructura

```
docs/manuales/fuentes/
  manual-web.html, manual-panel.html, guia-solicitudes.html   Textos (HTML sencillo)
  estilo.css                                                 Diseño: portada, pasos numerados, leyendas, avisos
  fuentes/                                                   Nunito y Courgette (woff2)
  img/                                                       Capturas (JPG) y logo
  pdf.js                                                     HTML → PDF (A4, pie con número de página)
  capturas/                                                  Scripts que hacen las capturas
    comun.js                                                 Marcas azules numeradas y guardado en ../img/
    web.js, web2.js                                          Web: portada, catálogo, ficha, solicitud, móvil
    panel-comun.js, panel1.js, panel2.js, panel3.js,
    panel5.js, panel6.js                                     Panel: inicio, productos, ficha, publicar, contacto…
    correos.js                                               Correos de aviso y acuse (vista previa del panel)
    medios-man.js                                            Medios → Manuales
    hoja/                                                    Hoja de Google de ejemplo (ver abajo)
```

## Cambiar solo el texto

1. Editar el `.html` del manual. Componentes de `estilo.css`:
   - `<div class="paso"><span class="n">1</span><div><h3>Título</h3><p>…</p></div></div>`: paso numerado (rojo).
   - `<figure><img src="img/x.jpg"><figcaption>…</figcaption></figure>`: captura (`class="media"` o
     `class="estrecha"` para hacerla más pequeña; `<div class="fila">` pone varias en fila).
   - `<ol class="leyenda"><li>…</li></ol>`: explica las marcas azules 1, 2, 3… de la captura anterior.
   - `<div class="consejo">`, `<div class="ojo">`, `<div class="importante">`: avisos (verde, naranja, rojo).
   - `<section class="cap">`: capítulo (empieza en una página nueva).
2. Generar el PDF (siguiente apartado).

## Generar los PDF

Hacen falta Node 22 y Playwright con Chromium. **No se añade al `package.json` del proyecto**: se instala en una
carpeta aparte (por ejemplo, `C:\herramientas\manuales`), con la versión usada en los PDF del 21-11-2026:

```powershell
mkdir C:\herramientas\manuales; cd C:\herramientas\manuales
npm init -y
npm install playwright@1.63.0
npx playwright install chromium
```

Y desde esta carpeta, con `NODE_PATH` apuntando a esa instalación:

```powershell
cd C:\Users\victor.ruanosantana\Downloads\tienda-online\docs\manuales\fuentes
$env:NODE_PATH = "C:\herramientas\manuales\node_modules"
node pdf.js manual-web.html "..\Manual de la web - Maquinas de Coser Zafra.pdf" "Máquinas de Coser Zafra · Manual de la web"
node pdf.js manual-panel.html "..\Manual del panel - Maquinas de Coser Zafra.pdf" "Máquinas de Coser Zafra · Manual del panel"
node pdf.js guia-solicitudes.html "..\Guia de solicitudes de presupuesto (borrador) - Maquinas de Coser Zafra.pdf" "Máquinas de Coser Zafra · Guía de solicitudes de presupuesto (borrador)"
```

El tercer argumento es el texto del pie de página. Revisar el PDF antes de subirlo: que no haya páginas casi
vacías ni capturas partidas (las capturas miden como mucho 88 mm de alto: `figure img` en `estilo.css`).

## Rehacer las capturas

Hacen falta la web y el panel funcionando en local, **en una copia del proyecto fuera de la carpeta de trabajo**
(el `dist/` de la carpeta de trabajo lo usa el panel local), y esa copia tiene que ser un repositorio Git (el
panel guarda los borradores en ramas):

```bash
# 1. Copia del proyecto (sin node_modules, dist, input ni .git) en otra carpeta; dentro de ella:
git init -b main && git add -A && git commit -m base
npm ci && npm run build                      # la primera vez tarda (imágenes)
npx serve@14.2.6 dist -l 3000                # en una ventana
MODE=git npx decap-server@3.11.5             # en otra (panel en local, sin login)

# 2. Desde docs/manuales/fuentes de esa copia (con NODE_PATH como arriba):
node capturas/web.js           # portada, desplegable, catálogo, buscador, ficha, contacto, móvil
node capturas/web2.js          # solicitud: lista, formulario, condiciones, envío
node capturas/panel1.js        # entrar, productos, búsqueda, grupos
node capturas/panel2.js        # ficha: precio, oferta, fotos, guardar, estados, flujo editorial
node capturas/panel3.js        # publicar, acceso rápido, buscador, nuevo producto
node capturas/panel5.js        # contacto, sobre nosotros, solicitud, blog, fabricantes, medios
node capturas/panel6.js        # resumen, ficha técnica, descripción, «Compatible con»
node capturas/correos.js       # correos de aviso y acuse
node capturas/medios-man.js    # Medios → Manuales
```

Las capturas se guardan en `img/` de la copia: después, copiarlas a `docs/manuales/fuentes/img/` de la carpeta de
trabajo (o generar allí los PDF directamente).

Notas:

- `web.js` acepta una lista de partes para repetir solo esas: `node capturas/web.js ficha,solicitud`
  (`portada`, `desplegable`, `categoria`, `buscar`, `ficha`, `industrial`, `contacto`, `movil`).
- La franja «Entorno de pruebas» y el engranaje de Ajustes (que la tienda no ve) se ocultan solos en las capturas.
- `web2.js` simula la casilla «No soy un robot» y el envío: no manda nada a Google. Usa `lib/verificacion.js`
  del proyecto (variable `TIENDA` = raíz del proyecto si no se ejecuta dentro de él).
- `panel2.js` guarda un cambio de precio de prueba y `panel3.js` lo publica: **siempre en la copia**, nunca en la
  carpeta de trabajo. Para repetirlo, borrar antes las ramas `cms/…` de la copia (`git branch -D …`).
- Las capturas de la ficha del panel dependen de la posición de los campos: si se añade un campo, revisarlas.

### Hoja de Google (guía de solicitudes)

No se puede capturar la hoja real con un script: se dibuja a partir de la hoja de pruebas.

1. En Google Drive, abrir la hoja de pruebas → Archivo → Descargar → Microsoft Excel (.xlsx).
2. `python3 capturas/hoja/generar_hoja.py Pedidos.xlsx` (necesita `openpyxl`): crea `hoja.html` y `lineas.html`
   **con los nombres, teléfonos y correos cambiados** por otros inventados (estilos en `estilo-hoja.html`).
3. `node capturas/hoja/foto.js`: guarda `img/hoja-*.jpg`.

**No subir a Git el Excel descargado**: lleva datos personales.

## Después de regenerar

1. Los PDF quedan en `docs/manuales/` (los comandos de arriba ya los dejan ahí).
2. Comprobar en el panel (Medios → Manuales) que se abren.
3. Commit de `docs/manuales/`.
