# Máquinas de Coser Zafra — tienda online

Web de la tienda: un **catálogo con precios orientativos** en el que el cliente va llenando una
**solicitud de presupuesto** (productos y unidades) y la envía (no se compra ni se paga en la web). Plan completo y decisiones: [docs/PLAN.md](docs/PLAN.md). Normas para Claude Code:
[CLAUDE.md](CLAUDE.md).

## Estado

- **Fase 0 (decisiones):** cerrada.
- **Fase 1a (base en local):** hecha. Generador, panel, tema provisional, blog, páginas legales
  (borradores) y funciones del login del panel en formato de Cloudflare, probadas en local.
- **Fase 2 (catálogo en el panel) y parte de la 4:** hechas. Fabricantes, categorías y productos en
  el panel; menú del catálogo; portada con resumen del catálogo y ofertas; páginas de categoría;
  ficha básica de producto; página de ofertas. Ver «Catálogo» más abajo.
- **Fase 5, parte visual:** hecha. «Añadir a la solicitud», contador, página «Mi solicitud de
  presupuesto» con unidades y formulario; activable desde el panel. **El envío real llega tras el
  despliegue.** Ver «Solicitud de presupuesto».
- **Fase 1b (despliegue):** pendiente. Crear el proyecto en Cloudflare Pages, la aplicación OAuth
  de GitHub, las variables, los entornos de prueba y la reconstrucción diaria.

## Cómo funciona

```
 Decap (/admin/) ──commit──▶ GitHub ──▶ Cloudflare Pages: npm run build ──▶ dist/ ──▶ web
                                          (scripts/build.js)       + functions/api/ (login del panel)
```

1. Quien edita escribe en el panel `/admin/`. Decap guarda los cambios como ficheros en GitHub.
2. Cada cambio en el repositorio lanza un despliegue en Cloudflare Pages, que ejecuta
   `npm run build`.
3. El build copia `public/` a `dist/` y genera las páginas finales. **Nunca hay que editar nada
   dentro de `dist/`** (se crea desde cero en cada build y no está en el repositorio).

Se parte de la web de la plataforma (`web-plataforma`), copiada y adaptada. Lo que **no** se ha
traído: propuestas, temas, actividades y calendario, formulario de propuestas (volverá adaptado
como solicitud de presupuesto en la fase 5), canales de WhatsApp/Telegram, estadísticas de Vercel,
el despliegue por GitHub Actions y la marca «Otra Zafra». Las noticias son ahora el **blog**.

## Estructura del proyecto

```
functions/api/auth.js, callback.js  Login del panel con GitHub (funciones de Cloudflare Pages)
lib/origenes.js                     Webs que pueden usar el login (lista exacta) y ramas con panel
scripts/build.js                    Generador: crea dist/ a partir de public/ (también el catálogo)
scripts/layout.js                   Cabecera y pie (a partir de los Ajustes del sitio)
scripts/temas/tienda.css            Tema «Tienda» (provisional y neutro)
scripts/comprimir-imagenes.js       Compresión de imágenes grandes (node scripts/comprimir-imagenes.js)
scripts/pruebas-carga.mjs           Entorno local de pruebas con carga (ver «Probar con volumen»)
docs/PRUEBA-DE-CARGA.md             Prueba de carga: hasta cuántos productos aguanta y por qué
plantillas/articulo.html            Plantilla de las entradas del blog y las páginas
docs/PLAN.md                        Plan por fases y decisiones
docs/BORRADORES-LEGALES.md          Guía de los textos legales y preguntas para quien los revise
docs/GUIA-EDICION.md                Guía para quien edita en el panel

public/                             ← LO QUE SE EDITA
  index.html                        Portada (el build rellena las secciones dinámicas)
  404.html, buscar/index.html       Página de error y buscador
  config.yml                        ← CONFIGURACIÓN DE DECAP (colecciones y campos)
  _datos/sitio.yml                  ← AJUSTES DEL SITIO: nombre, portada, tema, colores, menú, pie, redes
  _posts/blog/<año>/                Entradas del blog (las crea Decap)
  _paginas/                         Páginas de texto libre (las crea Decap): los borradores legales
  _datos/contacto.yml, sobre-nosotros.yml  Contacto y horario, y Sobre nosotros (páginas con datos)
  _productos/, _categorias/,        Catálogo (los crea Decap). Ahora, datos «Solo para pruebas»
  _fabricantes/
  js/catalogo.js                    Rejillas de productos: paginación, orden al azar y filtro
  _headers, _redirects              Cabeceras de seguridad y caché, y redirecciones (Cloudflare)
  css/estilos.css, js/              Estilos y scripts propios (sin scripts en línea: CSP)
  img/                              Imágenes; logo.png, compartir.jpg e iconos/ son PROVISIONALES
  admin/                            Panel de Decap (servido desde la propia web); campos.js: campos
                                    propios (categoría del producto con desplegables dependientes)
```

## Trabajar en local

Requisitos: Node.js 22.

| Orden | Para qué |
|---|---|
| `npm ci` | Instala las dependencias exactas de `package-lock.json` |
| `npm run build` | Genera `dist/` (entorno «local»: aviso de pruebas, no indexable) |
| `npm run web` | Genera y sirve la web en http://localhost:3000 |
| `npm run panel` | Servidor local de Decap: con `npm run web` en otra ventana, el panel en http://localhost:3000/admin/ edita tus ficheros sin iniciar sesión |
| `npm run funciones` | Genera y sirve la web **con las funciones** de Cloudflare en http://localhost:8788 (para probar `/api/auth` y `/api/callback`) |

Para `npm run funciones` hace falta un fichero `.dev.vars` (no se sube: está en `.gitignore`):

```
OAUTH_CLIENT_ID=prueba
OAUTH_CLIENT_SECRET=prueba
```

Con valores de prueba se comprueba que `/api/auth` rechaza webs no permitidas (403) y redirige
a GitHub desde las permitidas (302); el login completo solo funciona desplegado (fase 1b).

**Prueba realizada (fase 1a):** build en local, producción, `develop` y una rama sin panel;
`npm audit` sin vulnerabilidades; 0 enlaces rotos; capturas en escritorio y móvil; con
`npm run funciones`: portada 200, login desde una web ajena 403, desde la propia 302 con cookie
`HttpOnly`, vuelta sin `state` 400, cabeceras de `_headers` aplicadas.

**Imágenes automáticas para compartir:** el título se dibuja letra a letra con un trazado propio,
porque `toPathData()` de opentype.js escribe a veces `NaN` en una coordenada (según la posición) y
la letra y el resto de la línea desaparecían (se veía con «MÁQUINAS DE COSER»). La web de la
plataforma tiene el mismo fallo.

## Entornos

El build deduce el entorno de la rama que le pasa Cloudflare (`CF_PAGES_BRANCH`) o de la variable
`ENTORNO_WEB`:

| Rama | Entorno | Indexable | Panel |
|---|---|---|---|
| `main` | producción | solo si «Permitir que Google indexe la web» está activado (Ajustes → Avanzado). **Desactivado hasta tener el dominio** | sí |
| `develop`, `staging`, `dev-victor` | pruebas (aviso amarillo) | no | sí, edita su rama |
| otras (`feature/…`, borradores `cms/…`) | pruebas | no | no |
| (en tu equipo) | local | no | con `npm run panel` |

El contenido marcado como «Solo para pruebas» se ve en local y en los entornos de prueba, nunca
en producción. Los productos y la entrada del blog de prueba se borraron el 8-11-2026.

## Catálogo

| Qué | Dónde se edita | Dirección |
|---|---|---|
| Catálogo en tres niveles: tipos de producto › categorías › subcategorías (campo oculto `nivel`; el orden, en Ajustes del sitio) | Catálogo: tipos de producto, Catálogo: categorías y Catálogo: subcategorías | `/catalogo/<categoria>/`, `/catalogo/<categoria>/<subcategoria>/` y `/catalogo/<categoria>/<subcategoria>/<sub-subcategoria>/` |
| Productos (fabricante, modelo, referencia opcional, categoría, precio, estado, oferta, condición, hasta 5 fotos, características, «Compatible con») | Catálogo: productos | `/productos/<identificador>/` |
| Fabricantes (nombre e imagen) | Catálogo: fabricantes | sin página: filtro y fichas |
| Todo el catálogo: categorías y ofertas (o productos al azar) | — | `/catalogo/` |
| Todas las ofertas vigentes, con filtros (enlace «Ver todas las ofertas» en la portada y en `/catalogo/`) | — | `/ofertas/` |

- **Identificador** de un producto: lo crea el panel a partir del fabricante y el modelo y no cambia.
- **Estados**: «Disponible»; «En oferta» (precio de oferta entre dos fechas, ambas incluidas, hora de
  Madrid; fuera de ellas, precio normal); «No disponible» (no se publica, ni sus fotos).
- **Accesorios**: son productos; en «Compatible con» se eligen las máquinas. La ficha de la máquina
  muestra «Accesorios para esta máquina» y la del accesorio, «Compatible con».
- **Menú**: dos filas en el ordenador. La opción con «Desplegable del catálogo» (Ajustes → Menú)
  crea la barra del catálogo (segunda fila): «Todo el catálogo», cada tipo de producto con su número
  de productos y un panel con sus categorías y subcategorías (en el orden de Ajustes del sitio →
  «Orden del catálogo en el menú»; lo que no esté ahí sale al final de su nivel, en alfabético, y el
  build avisa) y «Ofertas». Su color se elige en Ajustes → Menú superior: diseño → Barra del
  catálogo. En el móvil, el catálogo va arriba del menú y se navega por niveles.
  Las categorías actuales siguen los árboles de máquinas y accesorios de la guía de la herramienta
  de fabricantes.
- **Buscador** (Pagefind, índice creado en cada despliegue): productos, categorías, entradas del
  blog y páginas. /buscar/ muestra las categorías que coinciden, los productos con las tarjetas y
  filtros del catálogo y el bloque del blog y las páginas; la caja de la cabecera da sugerencias
  mientras se escribe (public/js/buscar.js y public/js/extras.js).
- **Imágenes**: el build avisa de formatos que los navegadores no muestran (JXL, HEIC, TIFF…).
- **Portada, `/catalogo/` y `/ofertas/`**: bloques configurables en Ajustes del sitio → Ajustes
  generales → «Portada», «Página Catálogo», «Página Ofertas» y «Página Blog»: cada bloque
  (productos barajados en cada visita, ofertas con las más recientes primero, entradas del blog)
  se puede ocultar y tiene su número por página (paginación en el navegador, `public/js/catalogo.js`).
  Lo de Página Catálogo vale también para cada tipo, categoría y subcategoría (sus productos y sus
  ofertas). Filtros en «Nuestros productos» y «Productos en oferta» del catálogo y en /ofertas/:
  barra compacta: «Fabricante (N)» despliega un panel con los logos (en gris hasta pasar el ratón
  o marcarlos; varios = cualquiera de ellos), «Segunda mano», «En oferta (N)», «Precio» (deslizador en el ordenador; «Desde / Hasta» y
  rangos rápidos en el móvil), «Ordenar» (recomendados, precio, nombre, modelo, novedades),
  etiquetas con «×» de lo marcado,
  «Quitar filtros» y cuántos productos se ven (salen solo si hay más de un fabricante o productos
  nuevos y de segunda mano; se combinan). Las tarjetas de producto llevan pespunte, el logo del
  fabricante sobre la foto y un botón «+» que añade el producto a la solicitud sin entrar en la ficha.
  Paginación: «Mostrando 1–12 de 40 productos» y páginas en círculos, con «…» si hay muchas. Las ofertas se navegan como el catálogo:
  /ofertas/ muestra las tarjetas de los tipos de producto y cada una lleva a
  /ofertas/<tipo>/…/ con solo sus ofertas (y sus tarjetas, con cuántas ofertas tiene cada una).
- **Ficha**: el **nombre** es el título y el modelo va debajo (también en las tarjetas); «Más en …»
  lleva el botón «Ver todo en …» a su categoría o subcategoría. Las **características** pueden
  ir sin nombre: entonces el valor ocupa la fila entera.
- **«Compatible con»** (panel): se busca por nombre, modelo, referencia, fabricante o categoría.
- **Panel**: la lista de productos se puede filtrar (fabricante, categoría, ofertas, no
  disponibles, segunda mano; los filtros se combinan), agrupar y ordenar, y el buscador del panel
  encuentra por modelo, referencia, fabricante o nombre (están en el «summary» de la colección). Los
  filtros de fabricante y categoría los añade el build a `dist/config.yml` con los que existen.
- **Avisos del build**: falta de modelo, fabricante o categoría; producto sin fotos; referencias
  repetidas; garantía de segunda mano menor de 12 meses; ofertas incompletas o mal escritas;
  «Compatible con» a productos que no existen. Una **oferta terminada** no es un aviso: el producto
  se muestra solo como disponible, con su precio normal (el build lo anota como información).
- **Datos de prueba**: borrados el 8-11-2026 (17 productos, sus fotos y la entrada del blog). Para
  probar cambios con datos, crea productos con «Solo para pruebas» marcado: no salen en producción.
- Ficha: «Añadir a la solicitud»; si ya está, «Añadir otra unidad» y «Ver mi solicitud».
- Menú: icono con el número de productos (en el móvil, junto al botón del menú).
- `/presupuesto/`: productos con unidades (1-99), subtotales y total orientativo, quitar, aviso si
  alguno ya no está disponible (se quita de la solicitud guardada en el navegador del cliente),
  formulario y «Enviar solicitud».
- **Un producto solo deja de estar disponible cuando se marca «No disponible» en el panel** (o se
  borra). Nada lo cambia solo: ni enviar solicitudes (no hay stock), ni que termine una oferta
  (vuelve a su precio normal).
- Se guarda en el navegador de quien la prepara (`localStorage`: identificadores y unidades). Los
  datos que se pintan salen de `/presupuesto/productos.json`, que genera el build.
- **PROVISIONAL**: «Enviar solicitud» comprueba los campos y avisa de que el envío no está activo.
  La función del servidor, la hoja de Google y los correos llegan tras el despliegue (fase 5).

**Prueba realizada (solicitud):** con Playwright en escritorio y móvil: añadir dos veces el mismo
producto (2 ud.), añadir otros dos, un identificador inexistente se quita con aviso, totales
correctos (249 € × 2 + 12,50 € = 510,50 €; con 3 prensatelas, 535,50 €; un producto «a consultar»
aparte), cambiar unidades, quitar, enviar vacío (marca los campos) y completo (aviso de envío no
activo), solicitud vacía; build con la solicitud desactivada: sin botón, contador ni página y sin
enlaces rotos; sin errores en la consola.

**Prueba realizada (catálogo):** build en local y en producción (sin los datos de prueba: el
catálogo sale vacío y las secciones de la portada no aparecen, sin fotos de prueba publicadas);
0 enlaces rotos; con Playwright: 8 productos por página y 2 páginas en la portada, orden distinto
al recargar, filtro por fabricante en una categoría, clic en «Sobre nosotros» lleva a su página y la
flecha abre el desplegable, sin errores en la consola; capturas en escritorio y móvil. Panel con
`decap-server`: filtros «Fabricante: Marca Prueba Dos» + «Categoría: Máquinas de coser» dejan sus 3
máquinas; la búsqueda «HD 100» y la de la referencia «PRE-002» encuentran su producto.

## Ajustes del sitio y tema

Desde Decap → Ajustes del sitio: nombre, descripción, logo, imagen para compartir, colores de la
marca (texto, fondo y acento; el build avisa si no se leen bien), menú, enlaces legales del pie,
redes y dirección pública. El logo, los iconos y los colores son **provisionales** hasta tener
los definitivos (el tema se llama «Tienda» internamente).

## Seguridad

- Login del panel: `state` en cookie `HttpOnly` y el token **solo** para las webs de la lista
  exacta de `lib/origenes.js` (sin comodines en `pages.dev`, que es un dominio compartido).
- Todo el HTML del contenido pasa por `sanitize-html`; política de seguridad de contenidos (CSP)
  en todas las páginas: solo scripts de la propia web y sin scripts en línea.
- Nada se sirve desde CDN externos. Las claves van en Cloudflare: **nunca en el código**.
- Nunca un formulario que pida datos de tarjeta (lo prohíbe el plan gratuito de Cloudflare y la
  tienda no cobra en la web).

## Probar con volumen

Para ver la web llena sin tocar el catálogo real:

```
node scripts/pruebas-carga.mjs media     # 150 productos y 40 entradas
npm run web                              # http://localhost:3000
node scripts/pruebas-carga.mjs limpiar   # quitarlo
```

Escenarios: `pequena` (40 y 10), `media` (150 y 40), `grande` (500 y 120), `sin-blog` (150
productos, ninguna entrada) y `solo-blog` (ningún producto, 20 entradas), estos dos para ver qué
desaparece con «Secciones sin contenido: ocultar». Usa las categorías y fabricantes reales y mezcla
ofertas, precio a consultar, no disponibles, segunda mano, accesorios con compatibles y de 0 a 5
fotos. Va marcado «Solo para pruebas» (producción no lo publica) y Git lo ignora.
