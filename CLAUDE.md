# Instrucciones para Claude Code — tienda online

Este fichero lo lee Claude Code al empezar. Resume el proyecto, en qué punto está y las normas de
trabajo. Cuando exista, la documentación completa estará en `README.md` y en `docs/`: **léela antes
de cambiar algo que no conozcas**.

## Norma principal: solo modificar ficheros, nunca Git

- **Nunca hagas commits, push, merge, rebase, checkout, reset, stash, tags ni ninguna otra
  operación que cambie el repositorio o las ramas.** Tampoco uses `gh`, la CLI de `vercel` ni
  despliegues con `wrangler` (`wrangler pages deploy`); `npm run funciones` (prueba local) sí.
- **Solo puedes modificar ficheros** en esta carpeta. La persona que te lo pide revisa los
  cambios (Sourcetree → File Status) y hace ella el commit y el push.
- Sí puedes usar Git **solo para leer**: `git status`, `git diff`, `git log`, `git branch`,
  `git show`.
- Al terminar, resume **qué ficheros has cambiado y por qué**, **qué hay que comprobar** después
  (en local, en el entorno de pruebas y en producción) y propón el **mensaje del commit**.

`.claude/settings.json` bloquea además esas órdenes de Git, por si acaso.

## Qué es el proyecto

Una **tienda online sin venta ni pago en la web**: un catálogo con **precios orientativos** en el
que el cliente va llenando y envía una **solicitud de
presupuesto**. La solicitud llega a una **hoja de Google** (como las propuestas de la web de la
plataforma), con aviso a la tienda y acuse de recibo al cliente. La tienda contacta al cliente y,
si se ponen de acuerdo, la venta se cierra fuera de la web.

- **Productos**, cada uno asociado a un **fabricante** y a una **categoría / subcategoría**.
- Las **categorías y subcategorías son las opciones del menú** de la web.
- **Páginas, fabricantes y productos editables desde el panel** de administración.

### Base: la web de la plataforma

Se parte del proyecto **`web-plataforma`** (repositorio `vrspunk-87/web-plataforma`; en el equipo de
Víctor, en `Downloads/plataforma-politica/web-plataforma`). **Se copia y se adapta aquí; nunca se
modifica `web-plataforma` desde este proyecto.** Lo que se reaprovecha:

- Generador estático propio (`scripts/build.js`, `scripts/layout.js`): páginas, listados con
  paginación, menú, imágenes WebP con `sharp`, sitemap, SEO, buscador Pagefind, 404.
- Panel **Decap CMS** (login con GitHub vía `api/auth.js` y `api/callback.js`, flujo editorial,
  vista previa con el estilo de la web). Ojo: desde Decap 3.10, `public_folder` sin barra
  (`"img"`) y el build normaliza a `/img/…` (ver el README de la plataforma).
- **Formulario** (`api/propuesta.js`, `api/_lib/formulario.js`, ALTCHA, Apps Script → hoja de
  Google, avisos por correo, diagnóstico): base para las **solicitudes de presupuesto**.
- Despliegue con GitHub Actions, entornos de prueba y gitflow, Dependabot (`cooldown` de 14 días),
  comprobación diaria, `scripts/actualizar-decap.js` y la hoja de tareas sincronizada con Trello
  (`scripts/trello-a-excel.js`).

## Estado

**Identidad (10-11-2026): logo con letra Courgette roja `#c1121f` y aguja con hilo (`public/img/logo.svg`, clase `.marca-texto` en layout.js), insignias gris claro (`--insignia-fondo`), `.titulo-marca` en los h1 de listados; ver docs/PLAN.md fase 6.**

**Datos legales (10-11-2026):** los textos legales (_paginas) y los de la solicitud usan marcadores {titular}, {nif}, {nombre_comercial}, {direccion}, {correo}, {telefono} que el build rellena con contacto.yml (`rellenarDatos`); si falta un dato sale «[NIF]»… y un aviso agrupado.

**URL_BASE (10-11-2026):** en los entornos de prueba de Cloudflare es `https://<rama>.maquinas-de-coser-zafra.pages.dev` (og:image, og:url, canónica y enlaces de compartir apuntan al propio entorno); `URL_PUBLICA` es la de Ajustes → Avanzado (enlace «Ir a la web pública»). Antes todo apuntaba a producción y al compartir desde develop WhatsApp no encontraba la página ni la imagen.

**Fase 0 cerrada; fase 1a (base en local) hecha; fase 2 (catálogo en el panel) y parte de la 4
(menú, portada, categorías, ofertas, ficha básica) hechas; parte visual de la solicitud de presupuesto
(fase 5) hecha y envío real hecho en código el 10-11-2026 (falta configurarlo en Google/Cloudflare y
probarlo en `develop`: docs/solicitudes/CONFIGURAR.md); fase 1b (despliegue en Cloudflare Pages, proyecto `maquinas-de-coser-zafra`, login del panel probado) hecha el 9-11-2026.** Excel: exportación e
importación desde el panel en la fase 3, tras el despliegue.
Catálogo cargado (9-11-2026) desde la tarifa de J. Pujol 03/2026 (input/, ignorado por Git: lleva precios
netos): 96 productos y 35 accesorios, todos «Solo para pruebas» hasta revisarlos con el Excel
input/Tarifa_Domestico_03_2026_importacion.xlsx (columna Observaciones). Tipos nuevos «Planchado»
(Generadores de vapor, Mesas de planchar, Accesorios de planchado) y «Acolchado»; fabricantes nuevos
Juki, Donna, Comel, Trevil, Handi Quilter y «J. Pujol» (accesorios sin marca). Añadidos después desde la tarifa Jack 11/2025: 115 máquinas
industriales y 67 accesorios (también «Solo para pruebas»; Excel input/TARIFA_JACK_11_25_importacion.xlsx;
los 4 generadores de la pág. 35 ya venían de la doméstica). Máquinas industriales con dos precios
(9-11-2026): campos `precio` (= completa) y `precio_cabezal` (también en `oferta`), widget
`precio-producto` de public/admin/campos.js; el tipo sale de `tipo_dos_precios` en config.yml
(lo lee también build.js); en la solicitud el cabezal es «<slug>~cabezal». Sin entradas del blog. Para probar con volumen: `node scripts/pruebas-carga.mjs
pequena|media|grande|sin-blog|solo-blog|limpiar` (contenido `prueba-carga-*`, «Solo para pruebas»,
ignorado por Git). Informe de la prueba de carga: [docs/PRUEBA-DE-CARGA.md](docs/PRUEBA-DE-CARGA.md).
Base copiada y adaptada de la plataforma: generador, panel, blog, tema provisional «Tienda»,
borradores legales y login del panel como funciones de Cloudflare (`functions/api/`,
`lib/origenes.js`). Logo, iconos y colores **provisionales**. Detalle en
[README.md](README.md); **plan por fases: [docs/PLAN.md](docs/PLAN.md)** (fases 0 a 8).

**Instalar y construir desde Linux (Claude Code):** en la carpeta conectada npm no puede renombrar
`node_modules`; se copia el proyecto a una carpeta de trabajo fuera de ella (sin `node_modules`,
`.git` ni `dist`), se hace `npm ci` / `npm run build` allí y solo se devuelve `package-lock.json`
si cambia.

## Decisiones (5-11-2026; detalle y motivos en docs/PLAN.md, fase 0)

- **Vocabulario**: «solicitud de presupuesto» (lo que el cliente va llenando y envía; botón «Añadir a
  la solicitud», página «Mi solicitud de presupuesto»), **no** «cesta», «pedido» ni «compra»;
  «precio orientativo».
- **Catálogo**: unos **200 productos**, sin variantes ni stock, **máximo 5 fotos** por producto,
  imágenes en el repositorio (el build avisa a partir de 700 MB). Carga y modificación **en
  bloque** con Excel + carpeta de imágenes (la hace Víctor; quizá la tienda más adelante), además
  del panel, donde editan Víctor y la tienda.
- **Estados del producto**: **disponible**; **en oferta** (precio de oferta entre dos fechas, por
  días, hora de Madrid; se muestran precio anterior tachado, porcentaje y fecha de fin);
  **no disponible** (retirado de la web pública, 404; solo queda en el panel). **Solo se marca a
  mano en el panel**: nada lo cambia solo (ni las solicitudes, sin stock, ni el fin de una oferta).
- **Nombre**: **Máquinas de Coser Zafra** (Zafra, Badajoz); logo, iconos y colores siguen provisionales.
- **Producto**: fabricante, **modelo** (obligatorio) y **referencia** (opcional); clave interna =
  **identificador** (nombre del fichero, no cambia). **Accesorios** = productos con «compatible con»
  (relación guardada en el accesorio, se muestra en las dos fichas).
- **Condición**: nuevo o **segunda mano** (indicado en la ficha, con estado y garantía de al menos
  12 meses).
- **Ficha**: fotos en **carrusel** que se amplía al pulsar (fase 4; ahora, ficha básica).
- **Fabricantes**: nombre e imagen, **sin página**; solo para asociar y filtrar.
- **Categorías**: árbol de **tres niveles**, **tipos de producto › categorías › subcategorías**,
  según los árboles de la guía de la herramienta de fabricantes (máquinas y accesorios). En el
  panel son **tres secciones separadas** (7-11-2026): «Catálogo: tipos de producto», «Catálogo:
  categorías» (eligen su tipo) y «Catálogo: subcategorías» (eligen su categoría). Todas viven en
  `public/_categorias/` y se distinguen por el campo oculto `nivel` (tipo/categoria/subcategoria);
  la colección oculta `catalogo` las reúne para los campos que eligen cualquier nivel (categoría
  del producto, orden del menú). El build avisa si `nivel` no cuadra con su padre. Un **producto**
  cuelga de cualquiera de los tres niveles: en su ficha del panel, tres desplegables dependientes
  (tipo obligatorio › categoría › subcategoría, opcionales; campo propio `categoria-catalogo` en
  `public/admin/campos.js`) que guardan en `categoria` el nivel más concreto elegido. El mismo
  campo elige el padre de categorías (1 desplegable) y subcategorías (tipo › categoría, ambos
  obligatorios). Sus opciones siguen el orden de Ajustes (como la web en todas partes) y se releen
  al abrir cada ficha y al volver a la pestaña: no hace falta recargar el panel. Las listas de las
  secciones del panel las ordena Decap (por nombre); no admiten un orden propio. El **orden** de todo el árbol se
  decide en Ajustes del sitio → «Orden del catálogo en el menú» (lo que no esté, al final y en
  alfabético, con aviso); las categorías no tienen campo «orden». Cada una es una página del panel.
- **Menú en dos filas** (8-11-2026; sustituye al acordeón). Primera fila: logo, caja de búsqueda
  (→ /buscar/?q=), Sobre nosotros, Contacto y horario, Blog y la píldora
  «Mi solicitud». Segunda fila, la **barra del catálogo** (la crea la opción del menú con
  «Desplegable del catálogo»): «Todo el catálogo», cada tipo con insignia de productos y su panel
  (resumen a la izquierda: productos, descripción breve, «Ver los N productos», «Ofertas de…»; a la
  derecha, categorías en columnas con hasta 5 subcategorías + «Ver las N», o en lista si ninguna
  tiene subcategorías) y «Ofertas» con su número. Color en Ajustes → Menú superior: diseño →
  Barra del catálogo (`navbar.barra_catalogo.color`: gris, blanco, marca, oscuro o personalizado
  con `color_personalizado`; el build pone el texto blanco u oscuro y avisa si no se lee).
  Móvil: el catálogo va arriba del menú en una caja con pespunte y se navega por niveles
  (`.cat-nivel`, `data-cat-nivel`, public/js/extras.js); se abre en el nivel de la página actual.
  Código: `barraCatalogo`, `panelTipo`, `catalogoMovil` en scripts/layout.js; `nodoMenu` en
  build.js añade `n`, `nOfertas`, `resumen`, `ofertas`; `SITIO.nOfertas`.
- **Contacto y horario, y Sobre nosotros** (8-11-2026, opciones «C1» y «N1»): ya no son páginas
  de texto libre (se borraron public/_paginas/sobre-nosotros.md, contacto-y-horario.md y
  donde-estamos.md, que nunca se publicaron); salen de Decap → «Contacto y Sobre nosotros»
  (public/_datos/contacto.yml y sobre-nosotros.yml) en las mismas direcciones /paginas/…/.
  Contacto: cabecera con «Abierto ahora · cierra a las…» / «Cerrado · abre…» (calculado en el
  navegador con el horario por días y el aviso de cierre con fechas; public/js/extras.js),
  tarjetas Llamar/WhatsApp/Correo/Dirección, horario (hoy resaltado, nota, aviso), «Cómo llegar»
  con el mapa de Google que solo se carga al pulsar (CSP frame-src https://www.google.com) y
  frases con icono, y llamada a catálogo/solicitud. El teléfono, WhatsApp y correo de Contacto
  mandan en el pie y en las fichas (los de Redes quedan ocultos, como respaldo). La dirección y el
  horario van también en los datos de la tienda para Google (Store: address, telephone,
  openingHoursSpecification). Sobre nosotros: presentación, foto (o recuadro), sello «desde»,
  cifras ({años}, {marcas}), Qué hacemos, Por qué comprar con nosotros, historia, logos de los
  fabricantes y «Ven a conocernos». Ambas con «Textos de ejemplo» (aviso visible) hasta revisarlas.
  En el menú, «Sobre nosotros» y «Contacto y horario» son direcciones (no páginas de la colección).
- **Listados y detalles** (8-11-2026): productos por página siempre múltiplos de 12 (`multiplo`, `bloqueCfg`;
  Decap `step: 12`, de 12 a 48; filas completas con 4/3/2 por fila); bloques «Blog» de portada, catálogo,
  categorías y ofertas sin paginar: las N más recientes (de 3 en 3, hasta 12) con «Ver todo el blog»;
  /blog/ de 3 en 3. Precios sin «,00» si son redondos (`EUROS_REDONDO` en build.js y presupuesto.js).
  Tarjetas de categoría: descripción en 3 líneas en el móvil. Logos de Sobre nosotros:
  `columnasEquilibradas` elige las columnas (5-8 ordenador, 4-6 tableta, 3-4 móvil) con la última fila
  más llena (`--cols-pc/tab/mov` en el style de `.sobre-marcas`).
- **Precios** (8-11-2026): `Intl.NumberFormat` con `useGrouping: 'always'` (build.js, catalogo.js,
  presupuesto.js): en es-ES no separa los miles de 4 cifras (3813 € → 3.813 €). `.precio` sin saltos
  de línea y, en el móvil, tarjetas con precio y «+» algo menores.
- **Insignias** (8-11-2026): los desplegables de la barra (lista: `barra-lista-cat`; columnas:
  `barra-cat` y `barra-sub` con `insignia-mini`) y todos los niveles del menú del móvil llevan el
  número de productos. Ajustes → «Número de productos en insignias» (`insignias_productos`,
  `SITIO.insignias`): con «no», `<body class="sin-insignias">` y estilos.css oculta `.insignia-menu`,
  `.pie-insignia`, `.tarjeta-categoria-n` y `.hero-insignia` (también las que pintan buscar.js y
  extras.js); no afecta a las de las pestañas de la ficha ni a los contadores de los filtros.
- **Migas y blog** (8-11-2026): `migas(trozos)` añade siempre Inicio (casita) y un enlace
  `.migas-volver` a la página anterior; CSS «Migas de pan»: «›» finos, una línea con «…» (título
  completo en `title`) y en el móvil solo «← anterior». Migas en catálogo, categorías, fichas,
  ofertas, blog, temas, entradas, páginas, Contacto, Sobre nosotros y /presupuesto/. **El listado
  del blog lo genera build.js (sección 7b, `publicarListadoBlog`)**; ya no existe
  public/blog/index.html: /blog/, /blog/pagina/N/ y /blog/tema/<slug>/ (+ /pagina/N/), con
  `introPagina(cfgBlog.texto)`, compartir, `barraBlog` (temas como `filtros-boton` y formulario a
  /buscar/), `entradaDestacada` (la última, solo en la página 1; `pagina_blog.destacada`) y
  `navPaginacion` en círculos (también la usa `rellenarDinamico` si alguna plantilla lleva
  data-paginar). Entrada: migas Blog › Tema, píldoras (tema enlaza a su página), entradilla =
  `description`, compartir arriba (`compartir-arriba`) y abajo, `.entrada-foto` con pespunte,
  `ctaEntrada` (campo `cta` de la entrada: mostrar, categoria —relación a la colección oculta
  «catalogo»—, texto, boton; sin categoría, al catálogo; WhatsApp o llamar) y
  `bloqueRelacionado` a 3 columnas, primero del mismo tema («Más sobre <tema>»).
- **Mejoras de la prueba de carga** (8-11-2026, docs/PRUEBA-DE-CARGA.md):
  1) **No se publican las fotos originales**: build.js, sección «13b», borra de dist los originales
  optimizados que nada generado usa (busca sus rutas en HTML/JSON/CSS/JS/XML, sin pagefind); la
  `<img>` de los `<picture>`, la ventana de la galería y el JSON-LD usan la WebP de 1600
  (`webpGrande`); og:image, imagen de las entradas para Google y RSS usan un JPG de 1200 px solo de
  la foto principal (`prepararCompartir` / `compartible`, en /img/opt/<base>-1200.jpg); el buscador,
  la WebP pequeña (`webpPequena`). 3) **Listas largas ligeras**: con más de `TARJETAS_EN_HTML` (48)
  productos o entradas, `rejillaProductos` / `rejillaNoticias` solo meten en el HTML la primera
  página y ponen `data-tarjetas` (/catalogo/tarjetas-<huella>.json o /blog/entradas-<huella>.json,
  un array con el HTML de cada tarjeta) y `data-tarjetas-resto` (índices); catalogo.js las añade
  antes de iniciar (`cargarResto`, también `window.cargarTarjetasRejilla` para buscar.js) y lanza
  `tarjetas:nuevas` (presupuesto.js activa ahí el «+», `activarRapido`). 4) Fotos: Decap no deja
  subir más de 8 MB (`media_library: { config: { max_file_size } }` en cada campo de imagen o fichero: en Decap 3.3 un `media_library` general rompe el panel); Compresión de imágenes por defecto a
  1600 px y 400 KB; el build da una nota con las fotos que pesan más (se reducen con
  `node scripts/comprimir-imagenes.js`). **Para la instalación real** (docs/PLAN.md, fase 8):
  caché de imágenes entre despliegues (GitHub Actions + `wrangler pages deploy`), compresión
  automática al publicar y listado del panel por tipo cuando haya cientos de productos.
- **Sin datos de prueba** (8-11-2026): se borraron los 17 productos «Solo para pruebas», sus fotos
  (public/img/productos/prueba-*) y la entrada del blog de prueba; quedan .gitkeep en _productos y
  _posts/blog. Ajustes → «Tipos y categorías sin productos» (`catalogo_vacias`: mostrar u ocultar):
  con «ocultar», build.js quita de `categorias`, `categoriasPrincipales` y los `hijos` las que no
  tienen productos (con descendientes) justo tras `enCategoria`, así desaparecen de menús, barra,
  inicio, pie, tarjetas, ofertas, buscador y sitemap, y no se publica su página.
  Además, si no queda ningún tipo (`SIN_CATALOGO`) no se publican /catalogo/, /ofertas/ ni
  /presupuesto/ (la solicitud se desactiva: sin «Mi solicitud» en la cabecera, el móvil ni el pie) y
  desaparecen la barra del catálogo, su caja en el móvil y su columna del pie; sin ofertas
  (`SIN_OFERTAS`) desaparecen /ofertas/ y sus enlaces, y con ofertas solo se navega por lo que
  tiene alguna. Sin entradas (`SIN_BLOG`): no se publica /blog/ (ni su RSS) y se quita «Blog» del
  menú, del pie y el icono RSS. `enlaceVisible` quita los enlaces del panel a partes no publicadas.
  En plantillas, `data-si-blog` / `data-si-catalogo` se quitan si no hay blog o catálogo (p. ej. 404).
- **Pie** (8-11-2026, opción «P1»): pespunte claro arriba y cuatro columnas: marca, descripción y
  redes (Facebook, Instagram, WhatsApp, RSS; solo las rellenas) · Catálogo (tipos con su número y
  Ofertas, de `sitio.catalogo`) · La tienda (opciones del menú sin el catálogo, Mi solicitud y
  Buscar) · Visítanos (dirección, «Cómo llegar», teléfono, WhatsApp, correo y «Abierto / Cerrado»,
  de `sitio.contacto`, que rellena build.js desde Contacto). Línea final con «Precios orientativos,
  IVA incluido» y los legales, que pasan de línea si no caben.
- **Compartir** (8-11-2026): `botonesCompartir(titulo, ruta, { clase })` solo con iconos redondos
  (WhatsApp, Facebook, Telegram, X, copiar enlace con ✓ y, en el móvil, el menú del sistema). Sale
  en fichas, entradas del blog y páginas (al final, `compartir-pie`), /catalogo/, tipos, categorías,
  subcategorías y ofertas (bajo la introducción), Contacto y Sobre nosotros. No en las páginas
  legales (noindex), la portada, el buscador ni la solicitud.
- **Ficha de producto** (8-11-2026, opción «F1»): galería en carril con scroll-snap (miniaturas a
  la izquierda en el ordenador, puntos y deslizar en el móvil, contador, etiqueta de oferta o
  segunda mano, pantalla completa en un modal con flechas y ← →; public/js/extras.js); logo del
  fabricante + píldora Nuevo/Segunda mano, título, «Modelo · Ref.»; caja de compra con pespunte
  (precio, «Oferta hasta… · quedan N días» calculado en el navegador, unidades − / + y «Añadir a
  la solicitud», WhatsApp con el producto escrito y Llamar si están en Ajustes → Redes
  (`redes.whatsapp`, `redes.telefono`), frases de confianza de la solicitud); compartir solo con
  iconos (`botonesCompartir(..., { iconos: true })`). Pestañas (Bootstrap tabs; las vacías no
  salen): Descripción (cuerpo), Características (campo nuevo `destacados`, puntos clave), Ficha
  técnica (datos del producto + campo `caracteristicas`, ahora «Ficha técnica» en el panel, + PDF
  opcional `ficha_pdf` en /img/fichas), Accesorios (máquina) o Modelos compatibles (accesorio).
  «Más en…» con título de bloque. Móvil: barra fija con precio y «Añadir a la solicitud» al pasar
  el botón de la caja de compra.
- **Mi solicitud (/presupuesto/)** (8-11-2026, opción «T1»): cabecera gris con pasos (Revisa ·
  Tus datos · Te contestamos); productos en caja con pespunte (− / +, «Quitar» con «Deshacer»,
  nota por producto guardada en localStorage), «Accesorios para tus máquinas» (los «Compatible
  con» de las máquinas de la solicitud; `accesorios` en productos.json), formulario en dos
  columnas con «¿Cómo prefieres que te contestemos?» (radios como píldoras) y resumen fijo a la
  derecha con frases de confianza; en el móvil, barra fija abajo con el total. Vacía: como el
  buscador sin resultados. Condiciones y protección de datos en una ventana (modal de Bootstrap
  con dos pestañas, contenido de las páginas legales): la casilla no se marca hasta haber abierto
  las dos; «He leído y acepto» la marca. Configurable en Decap → Solicitud de presupuesto:
  `ventajas`, `preferencia_contacto` (mostrar, pregunta, opciones), `accesorios`, `notas`.
  Envío real (10-11-2026): `functions/api/{solicitud,desafio,estado-solicitudes}.js` + `lib/solicitud*.js`,
  `lib/verificacion.js` (ALTCHA con Web Crypto: altcha-lib usa node:crypto) y el catálogo generado
  `lib/generado/solicitud-datos.js` (gitignored). Script de Google: docs/solicitudes/apps-script.gs.
  La casilla interna del widget ALTCHA es «required»: presupuesto.js la excluye de la validación y,
  si no está verificada al enviar, llama a `verify()`.
- **Buscador** (8-11-2026, Pagefind con su API, sin la interfaz por defecto). Índice: productos
  (filtros tipo/fabricante/categoría/oferta/condición; meta image (miniatura), precio, fabricante),
  entradas del blog (meta fecha), páginas y, ahora, tipos/categorías/subcategorías (tipo
  «Categoría»; meta productos y ruta; solo título, descripción y texto: los bloques llevan
  data-pagefind-ignore). /buscar/?q= (public/buscar/index.html + public/js/buscar.js): cabecera con
  caja grande y resumen; píldoras de categorías (las que tienen la palabra en el nombre, con
  productos primero, 6 + «+ N más»); productos con las tarjetas y la barra de filtros del catálogo
  (el build mete todas las tarjetas en `[data-buscador]` con `data-esperar`; buscar.js deja las
  encontradas por relevancia, ajusta fabricantes/oferta/segunda mano/precio y lanza
  «rejilla:lista» para catalogo.js); «En el blog y otras páginas» (filas con extracto resaltado);
  sin resultados o sin texto: consejos, «¿No lo encuentras? Pregúntanos» y los tipos
  (`heroCatalogo`). Sugerencias al escribir en la caja de la cabecera (public/js/extras.js):
  categorías, 4 productos con foto y precio, 2 del blog/páginas y «Ver los N resultados».
- **Portada, /catalogo/ y /ofertas/** (8-11-2026): en Ajustes del sitio → Ajustes generales,
  junto a «Portada» (bloque principal + bloques Catálogo, Ofertas y Blog), están «Página Catálogo»
  (listado de productos al azar con filtros, Ofertas, Blog), «Página Ofertas» (listado de
  ofertas, Blog) y «Página Blog» (entradas por página). Cada bloque: «Mostrar» (salvo los
  listados de las páginas Ofertas y Blog) y «por página»; desactivado o vacío, no sale. El
  configuración de Página Catálogo vale para /catalogo/ y para cada tipo, categoría y
  subcategoría, con la misma estructura (`bloquesCatalogo`): «Nuestros productos» (en /catalogo/
  todos al azar; en una categoría, los suyos y los de sus descendientes), «Productos en oferta»
  (las ofertas de esa misma selección) y Blog. Productos y ofertas llevan los mismos filtros:
  barra compacta «Fabricante (N)» con panel de logos en gris (color al pasar/marcar), «Segunda
  mano», «En oferta (N)» (permite desactivar el bloque Ofertas del catálogo), «Precio» (deslizador
  doble en el ordenador; «Desde/Hasta» + rangos rápidos por cuartiles en el móvil; precio que se
  paga; casilla «Incluir "Precio a consultar"»), «Ordenar» (Recomendados, precio ↑/↓, nombre,
  modelo, novedades; los «a consultar» al final), etiquetas con «×» y nº de productos visibles, cuando tienen sentido; tarjetas de
  producto con pespunte, logo del fabricante sobre la foto, línea, precio y botón «+» que añade a
  la solicitud (`data-anadir-rapido`, presupuesto.js); paginación «Mostrando 1–12 de N» con
  círculos y «…» (catalogo.js);
  las ofertas se navegan aparte, como el catálogo: /ofertas/<tipo>/<categoria>/<subcategoria>/
  (tarjetas del nivel siguiente con su número de ofertas, migas Catálogo › Ofertas › …, las
  ofertas de esa selección con filtros y enlace «Ver … en el catálogo»; sin ofertas, noindex y
  fuera del sitemap); el bloque de ofertas de una categoría del catálogo enlaza a su página de ofertas y el número de productos junto al título y en cada tarjeta de tipo/categoría/subcategoría
  (también en la portada y /ofertas/). Ya no existe «Listados» (`BLOQUES` en build.js).
  «Página Catálogo» y «Página Ofertas» tienen también «Descripción breve» (entradilla y Google) y
  «Texto» (introducción). Los 60 tipos/categorías/subcategorías tienen descripción y texto
  comerciales (8-11-2026), pendientes de revisión por la tienda. El «Texto» sale en un recuadro
  blanco con sombra, doble pespunte del color de la marca y tijeras en la esquina (`introPagina`
  en build.js, `.intro-pagina` en estilos.css); la primera frase (hasta «:» o «.») se destaca sola.
  Las tarjetas de tipos/categorías/subcategorías (catálogo y ofertas) llevan el mismo pespunte,
  el número de productos u ofertas en una insignia y «Ver productos/ofertas →»
  (`tarjetaCategoria`, `.tarjeta-categoria`).
  Los bloques de /catalogo/, /ofertas/ y las categorías llevan título concreto sin antetítulo
  («Todos los productos» / «Productos de X», «Productos en oferta» / «Ofertas de X» en franja gris,
  «Últimas entradas del blog») con un pespunte del color de la marca de lado a lado; el número va
  en la barra de filtros (junto al título solo si no hay barra). `seccionBloque`, `TEXTOS_BLOQUE`,
  `.titulo-bloque`. La portada usa el mismo estilo (bloques generados en build.js desde
  `[data-bloques-portada]` de public/index.html): «Nuestros productos» con la barra de filtros
  (incl. «En oferta»), «Productos en oferta» (con filtros) y «Últimas entradas del blog».
- **Tarjetas del blog** (8-11-2026): pespunte, foto con margen (la propia o la imagen automática
  de compartir), fecha en «calendario» que asoma arriba, píldoras con el tema (campo opcional
  «Tema» de las entradas, texto libre) y los minutos de lectura (~200 palabras/min), línea y
  «Leer más →» (`tarjetaNoticia`, `.tarjeta-entrada`).
- **Bloque principal de la portada** (8-11-2026, opción «R1T»): sin botones. Izquierda: antetítulo,
  titular, texto y ventajas (`hero.ventajas`, lista texto + icono, `ICONOS_VENTAJA`); debajo, el
  último artículo del blog con la fecha «calendario» y las píldoras tema/lectura de las tarjetas X1
  (`hero.ultimo_articulo`, por defecto sí). Derecha: «Explora el catálogo» con tijeras y los tipos
  (`categoriasPrincipales`) con pespunte e insignia redonda con su número de productos (gris si 0).
  Móvil: textos, catálogo, artículo (CSS grid `.hero-rejilla`). `heroVentajas`, `heroCatalogo`,
  `heroBlog` en build.js, llamados desde `aplicarPortada` (huecos `data-hero-*` de index.html).
  Ya no existen `boton1`/`boton2` ni `data-portada-boton`. Los textos de la
  portada están en Ajustes del sitio → Ajustes generales → «Portada» (`portada` en `sitio.yml`;
  ya no hay `portada.yml` ni colección «Portada», 8-11-2026).
- **Números del panel** (8-11-2026): el build añade a las secciones «Catálogo: …» del menú del
  panel su número de elementos y deja `dist/admin/conteos.json` con los productos de cada
  categoría (con los de sus descendientes), que `public/admin/campos.js` pinta en las listas.
  Cuentan todos los ficheros, como los ve el panel; se actualizan en cada despliegue.
- **Precios**: «Precio orientativo, IVA incluido». El precio de oferta **se respeta** si la
  solicitud llega dentro de las fechas.
- **Solicitud**: **nombre, correo y teléfono obligatorios**; «Observaciones», opcional. Número
  correlativo y estado en la hoja; aviso a la tienda y acuse al cliente.
- **Cuentas**: GitHub (repositorio privado) y Cloudflare en las cuentas personales de Víctor; la
  hoja y los correos, en la **cuenta gratuita de Google (Gmail) de la tienda** (cupo de unos 100
  correos al día → topes); la dirección de los avisos se guarda en el script, no en la web.
- **Alojamiento**: **Cloudflare Pages, plan gratuito** (uso comercial permitido; Vercel Hobby no lo
  permite). Las funciones van en `functions/api/` (formato de Cloudflare) y deben ser ligeras
  (10 ms de CPU por petición); límite de 20.000 ficheros por despliegue.
- **Dominio**: se compra **al final**; hasta entonces, direcciones `pages.dev` con `noindex`.
- **Legal**: borradores de partida en `public/_paginas/` y
  [docs/BORRADORES-LEGALES.md](docs/BORRADORES-LEGALES.md) (con preguntas para quien revise).
  En el desistimiento, devolución a cargo del cliente y revisión del producto antes de reembolsar
  (descontando la pérdida de valor, no negando el reembolso). **Pendiente: quién los revisa** y
  los datos de la tienda (titular, NIF, dirección…).

## Herramienta de consulta de fabricantes (otro repositorio)

- Desde el 9-11-2026 vive en su propio repositorio, en la carpeta hermana
  `..\herramienta-consulta-fabricantes` (sus `scripts/`, pruebas, `LEEME.md` y la guía de contexto).
  Para clasificar lee las categorías de esta web (`public/_categorias` y `public/_datos/sitio.yml`):
  la busca en `TIENDA_WEB`, en la carpeta actual o en `..\tienda-online`.
- En esta web solo quedan, sin subir a Git (`.gitignore`), los resultados que se generaron aquí:
  `resultados-completos-*.json/.xlsx`, `img-completo/` y las carpetas `consulta-*`.
- `package.json` vuelve a estar sin `cheerio` y con `exceljs` en `4.4.0` exacta (como en el commit anterior).

## Normas del proyecto

- **Trabaja sobre los ficheros tal como están ahora**: no sustituyas un fichero entero por una
  versión propia; haz cambios concretos encima de lo que hay.
- **El contenido es de quien edita** (lo que se gestione desde el panel): no cambies textos de
  contenido salvo que se pida expresamente; si un cambio de código lo necesita, dilo antes.
- **Todo en español**: textos de la web, comentarios del código, mensajes del build y
  documentación. Tipografía: comillas «», apóstrofo ’ en los textos visibles.
- **Documenta cada cambio** en `README.md` o en el documento de `docs/` que corresponda.
- **Dependencias**: versiones exactas en `package.json` (sin `^`), `package-lock.json` actualizado
  y versiones publicadas hace **al menos dos semanas**. Lo mismo para las acciones de GitHub.
  `npm audit` sin vulnerabilidades. Nada servido desde CDN externos: todo desde la propia web.
- **Avisos del build**: `console.warn('Aviso: …')` para lo que alguien deba corregir.
- **Finales de línea**: en el equipo de Víctor los ficheros de trabajo usan CRLF (Git en Windows
  con `core.autocrlf`); mantenlos al editar. Al leer `git status` desde Linux pueden salir ficheros
  «modificados» solo por eso: comprueba con `git diff --ignore-cr-at-eol`.
- **Hojas de cálculo (.xlsx)**: pide cerrarlas en Excel antes de escribirlas (si están abiertas,
  Excel puede guardar encima una versión antigua) y comprueba el fichero en la carpeta después de
  guardarlo.

## Seguridad (no romper)

- Login del panel: verificación del `state` y entrega del token **solo** a una lista exacta de webs
  (sin comodines en `*.pages.dev` u otros dominios compartidos).
- Todo el HTML generado pasa por `sanitize-html`. Política de seguridad de contenidos (CSP) en las
  páginas públicas: nada de scripts en línea (la solicitud de presupuesto y el carrusel, en ficheros JS
  propios).
- Solicitudes de presupuesto: validación en el servidor, CAPTCHA (ALTCHA), límites, **precios recalculados en el
  servidor** y avisos sin datos personales innecesarios. Las claves van en el alojamiento o en
  GitHub: **nunca en el código**.
- **Nunca** un formulario que pida datos de tarjeta u otros medios de pago: el plan gratuito de
  Cloudflare lo prohíbe y la tienda no cobra en la web.
- Si un cambio afecta a cualquiera de estos puntos, explícalo claramente en el resumen final.
