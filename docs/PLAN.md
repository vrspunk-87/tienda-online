# Plan por fases — tienda online

Plan de trabajo acordado a partir de las respuestas de Víctor (5 de noviembre de 2026). Cada fase
termina con algo que se puede probar en local y con su documentación en `README.md` o en `docs/`.
Las fases se hacen en orden; dentro de cada una, los pasos también.

## Qué cambia respecto a lo previsto

Las respuestas a las preguntas abiertas cambian el enfoque inicial («tienda con pedidos»):

| Pregunta | Respuesta | Consecuencia en el diseño |
|---|---|---|
| Productos y precios | «Bastantes», cada uno con **varias imágenes** | Hace falta **carga y modificación en bloque** (Excel + carpeta de imágenes) además del panel, y vigilar el peso de las imágenes en el repositorio |
| Variantes o stock | No: sin stock ni variantes | Sin tallas, colores ni cantidades. Cada producto tiene un **estado**: **disponible**, **en oferta** (precio rebajado entre dos fechas fijadas en su ficha del panel) o **no disponible** (no se ve en la web) |
| ¿Precios o presupuesto? | **Precios orientativos**; el cliente **solicita presupuesto**, no compra | La «cesta» y el «pedido» pasan a ser la **solicitud de presupuesto** (el cliente la va llenando y la envía). Los precios se muestran siempre como orientativos |
| Correo al cliente | Sí | Correo de **acuse de recibo** («hemos recibido tu solicitud; la tienda te contactará en breve») |
| Gestión | Hoja de Google en Drive (como las propuestas) y aviso al correo de la tienda; la tienda gestiona con el cliente | Una fila por solicitud con **número** y **estado** editable en la hoja; la web no interviene después |

**Vocabulario** (en la web, el código y la documentación): *producto*, *fabricante*, *categoría* y
*subcategoría*; *solicitud de presupuesto* o *solicitud* (lo que el cliente va llenando y envía: no
«cesta», «pedido» ni «compra»); «Añadir a la solicitud»; *precio orientativo*.

## Fase 0 — Decisiones previas (sin código)

Lo que hay que cerrar antes de construir, porque cambia la estructura.

### Decidido (5-11-2026)

- **Catálogo**: unos **200 productos** al empezar, con **un máximo de 5 fotos** por producto.
- **Imágenes en el repositorio**, como en la plataforma. Cálculo: 5 fotos reducidas a 1600 px y
  ~250 KB cada una son ~1,25 MB por producto → 200 productos ≈ 250 MB, lejos de los límites de
  GitHub (recomienda repositorios de menos de 1 GB y bloquea ficheros de más de 100 MB; **comprobar
  los valores vigentes** en su documentación). Las fotos sustituidas siguen ocupando en el historial
  de Git, así que el build informa del tamaño de las imágenes y **avisa a partir de 700 MB**; si se
  llega ahí (unos 500-600 productos), se valora sacarlas a un servicio externo.
- **Ofertas por días**: empiezan a las 0:00 del día de inicio y acaban a las 23:59 del día de fin,
  hora de Madrid. Se muestran el **precio anterior tachado**, el **porcentaje de descuento** y la
  **fecha de fin** («Oferta hasta el 30 de noviembre»).
- **Nombre de la tienda: Máquinas de Coser Zafra** (Zafra, Badajoz).
- **Datos del producto**: además del fabricante, **modelo obligatorio** y **referencia opcional**. Como la
  referencia puede faltar, cada producto tiene un **identificador** interno (nombre del fichero).
- **Accesorios**: son **productos** como los demás; cada accesorio indica con qué productos es
  **compatible** y la web lo muestra en las dos fichas (fases 2 y 4).
- **No disponible = retirado de la web pública**: solo queda en el panel. Su antigua dirección da
  la página 404.
- **Alojamiento: Cloudflare Pages, plan gratuito** (Vercel Hobby no permite uso comercial y Vercel
  Pro es de pago). **Uso comercial permitido** en el plan gratuito (consultado el 5-11-2026: las
  condiciones de autoservicio no lo restringen). Única prohibición que nos toca: **no recoger
  datos de tarjetas** en la web; la tienda no cobra en la web, así que no aplica, y no debe
  añadirse nunca un formulario de pago propio. Sin garantía de disponibilidad (SLA) ni soporte
  directo: aceptable, porque si la web cae no se pierden solicitudes ya guardadas y el cliente
  puede contactar por teléfono o correo (se muestran en la web). Límites que afectan al diseño (documentación de Cloudflare, «Pages → Limits» y
  «Functions → Pricing»; comprobar los vigentes):
  - 500 despliegues al mes por cuenta, uno a la vez, 20 minutos como máximo: de sobra (commits,
    entornos de prueba y una reconstrucción diaria, con un build de segundos a un minuto);
  - **20.000 ficheros por despliegue** y 25 MiB por fichero: con 200 productos y 5 fotos en
    varios tamaños salen unos 5.000 ficheros. El build informa del total y **avisa a partir de
    15.000**;
  - funciones: 100.000 peticiones al día (compartidas con Workers) y **10 ms de CPU por
    petición**. Esperar la respuesta de Google o de GitHub no cuenta como CPU, pero las funciones
    deben ser ligeras: el build entrega `catalogo.json` y la definición del formulario **ya en
    JSON** (sin leer YAML en cada petición) y ALTCHA usa la criptografía nativa (Web Crypto).
  - Las funciones no se pueden fijar en una región de la UE: se ejecutan en el centro de datos
    más cercano a quien visita. Se indica en la política de privacidad (fase 7).
- **GitHub**: repositorio **privado en la cuenta personal de Víctor**. Quien edite en el panel
  necesita cuenta de GitHub e invitación como colaborador del repositorio. Más adelante se puede
  transferir a una cuenta de la tienda sin perder el historial (habría que reconectar Cloudflare y
  la aplicación OAuth). Con GitHub gratuito, los repositorios privados no admiten protección de
  ramas: se mantiene el flujo de la plataforma (solo Víctor hace commits en `main`).
- **Google**: la **cuenta gratuita (Gmail) de la tienda**; la hoja de solicitudes y el Apps Script
  están en su Drive. El cupo de
  correos de Apps Script en cuentas gratuitas es de **unos 100 destinatarios al día** (comprobar el
  vigente en «Cuotas de los servicios de Google»). Cada solicitud gasta 2 (aviso a la tienda y
  acuse al cliente), así que caben **unas 45 solicitudes al día** con margen. Por encima del tope,
  la solicitud se guarda igual y se dice en la página de gracias (fase 5). Si la tienda llegara
  a ese volumen, se pasa a Google Workspace sin cambiar el código.
- **Dominio: se compra al final** (fase 8). Mientras tanto, la web vive en las direcciones de
  Cloudflare (`<proyecto>.pages.dev` y `<rama>.<proyecto>.pages.dev`), con **`noindex`** y
  `robots.txt` que bloquea a los buscadores, para que Google no indexe direcciones provisionales.
  La URL del sitio es un ajuste (no está escrita en el código), y la lista de webs del login de
  Decap contiene esas direcciones exactas (sin comodín en `pages.dev`, que es un dominio
  compartido).

- **Cloudflare**: cuenta personal de Víctor.
- **Correo de la tienda**: es esa misma cuenta de Google. El Apps Script envía el acuse al cliente
  **desde el correo de la tienda** (con su nombre como remitente), así que el cliente responde
  directamente a la tienda, y el aviso de cada solicitud llega a ese mismo correo. La dirección de
  los avisos se guarda en la configuración del script (no en la web), para que nadie pueda
  desviarlos cambiando un ajuste.
- **Precio con IVA incluido**: junto al precio, el texto fijo «Precio orientativo, IVA incluido»
  (editable en Ajustes del sitio).
- **Quién edita**: Víctor y la tienda, desde el panel (la tienda necesita cuenta de GitHub e
  invitación). Las **cargas en bloque** las hace Víctor al principio; el importador se diseña para
  que pueda ejecutarlo también una acción de GitHub, por si algún día lo hace la tienda (fase 3).
- **Datos del cliente**: **nombre, correo y teléfono obligatorios**; **«Observaciones»** (texto
  libre), opcional. Nada más (minimización de datos).
- **Textos legales**: Claude prepara **borradores de partida** (`public/_paginas/` y
  [BORRADORES-LEGALES.md](BORRADORES-LEGALES.md)), que debe revisar alguien con conocimientos
  legales antes de publicar la web.

### Pendiente

1. **Revisión legal**: quién revisa los borradores (asesor o gestoría de la tienda, o un abogado con
   un encargo puntual) y los datos de la tienda que faltan en ellos (titular, NIF, dirección…).

Resultado: decisiones anotadas aquí y resumidas en `CLAUDE.md` (sección «Decisiones»); pasarán al
`README.md` cuando se cree en la fase 1.

## Fase 1 — Base copiada y adaptada de la plataforma

**1a (en local): hecha el 5-11-2026** (puntos 1 a 7 salvo el despliegue; ver README). Quitado de la
plataforma: propuestas, temas, actividades, formulario, canales y estadísticas de Vercel; las
noticias son ahora el **blog** (`/blog/`). **1b (desplegado): hecha el 9-11-2026** — proyecto de Cloudflare
Pages **`maquinas-de-coser-zafra`** (conectado a GitHub, «Build system» versión 3): producción
https://maquinas-de-coser-zafra.pages.dev desde `main` y pruebas https://develop.maquinas-de-coser-zafra.pages.dev
(«Preview branch» = ramas personalizadas: `develop` y `dev-victor`, en https://dev-victor.maquinas-de-coser-zafra.pages.dev; `staging` no se usa). Build `npm run build`, salida `dist`, `NODE_VERSION=22`
en Production y Preview. Ajustados `lib/origenes.js`, `base_url` y la dirección del sitio. Aplicación
OAuth de GitHub «Panel Máquinas de Coser Zafra» (Redirect URI exacta
`https://maquinas-de-coser-zafra.pages.dev/api/callback`, sin comodines ni caducidad de tokens, porque
Decap no los renueva); `OAUTH_CLIENT_ID` y `OAUTH_CLIENT_SECRET` (secreto) solo en Production.
**Login del panel probado en producción y en `develop`.** Ojo: Cloudflare ofrece crear un *Worker*
por defecto; esta web necesita **Pages** (carpeta `functions/` y `CF_PAGES_BRANCH`).

Se copia de `web-plataforma` lo reaprovechable y se adapta aquí (`web-plataforma` solo se
consulta):

1. **Generador** (`scripts/build.js`, `scripts/layout.js`, `plantillas/`): páginas, menú,
   paginación, WebP con `sharp` y caché entre despliegues (renombrar la carpeta de caché
   `otra-zafra`), sitemap, SEO, Pagefind, 404, avisos del build.
2. **Funciones en formato de Cloudflare** (`functions/api/…`, con `onRequest` en lugar de las
   funciones de Vercel). Se reescribe la entrada y la salida de cada función y se conserva la lógica
   (validación, ALTCHA, envío a Google). Se comprueba que `sharp` y Pagefind funcionan en el build
   de Cloudflare con la versión de Node fijada; si no, se construye en GitHub Actions y se sube
   `dist/` con la herramienta de Cloudflare, como ahora con Vercel. Cabeceras de seguridad y CSP en
   `public/_headers` y redirecciones en `public/_redirects` (sustituyen a `vercel.json`).
3. **Panel Decap** con login de GitHub (`functions/api/auth.js`, `functions/api/callback.js`): **aplicación OAuth
   nueva** de la tienda y **lista exacta de webs** permitidas (sin comodines), flujo editorial,
   vista previa con el estilo de la tienda, Decap servido desde la propia web.
4. **Se quita** lo propio de la plataforma: noticias (salvo que se quieran), propuestas, temas,
   actividades, RSS, canales de WhatsApp/Telegram y textos y marca de «Otra Zafra».
5. **Tema** propio de la tienda (`scripts/temas/`), con colores y logo de la tienda (provisionales
   hasta tenerlos).
6. `package.json` con versiones exactas, `npm audit` limpio, `.claude/settings.json`, `.gitignore`,
   cabeceras de seguridad y CSP (sin scripts en línea).
7. `README.md` inicial (cómo funciona, estructura, trabajar en local) y `docs/GUIA-EDICION.md`.

Prueba: `npm run build` y `npm run web` en local; el panel en local (`npm run panel`) con una
página de ejemplo.

## Fase 2 — Catálogo en el panel

**Hecha el 5-11-2026 junto con parte de la fase 4** (ver «Adelantado de la fase 4» al final de esta
fase). Pendiente de la fase 2: la prueba de volumen (punto 8).

Colecciones de Decap (`public/config.yml`) y lectura en el build:

1. **Fabricantes** (`public/_fabricantes/`): nombre e imagen (logotipo). **Sin página propia**: solo
   sirven para asociar y filtrar los productos; su nombre e imagen salen en tarjetas y fichas.
2. **Categorías** (`public/_categorias/`): nombre, descripción, imagen y **categoría padre**
   (relación opcional con otra categoría). **Hasta tres niveles** (tipos de producto › categorías ›
   subcategorías); el build avisa de ciclos y de un cuarto nivel. En el panel, una sección por
   nivel (7-11-2026), según el campo oculto `nivel`. Orden: Ajustes del sitio →
   «Orden del catálogo en el menú» (7-11-2026; sin campo «orden» en las categorías). Menú del
   catálogo en acordeón con los tres niveles, abierto por la rama de la página actual.
3. **Productos** (`public/_productos/`):
   - **identificador** único, interno: es el nombre del fichero, la dirección de la ficha y la
     carpeta de imágenes. Decap lo crea al dar de alta el producto a partir del fabricante y el
     modelo (p. ej. `singer-heavy-duty-4432`) y **no cambia** aunque se edite el producto;
   - nombre, fabricante (relación), **modelo** (obligatorio), **referencia** (opcional: la del
     fabricante o la de la tienda; se muestra en la ficha y se busca en el buscador),
     **subcategoría o categoría** (relación);
   - **compatible con** (solo en los accesorios, opcional): lista de productos (relación con la
     misma colección) con los que sirve el accesorio. Los **accesorios son productos** como los
     demás (su propia categoría, precio, estado, fotos, oferta, solicitud de presupuesto); la relación
     se guarda **en el accesorio** (un prensatelas sirve para muchas máquinas: se edita una sola
     vez) y el build la muestra en los dos sentidos;
   - **precio orientativo** (número) y, opcional, texto «a consultar» en lugar de precio;
   - **estado**: disponible / en oferta / no disponible;
   - **oferta** (se muestra en el panel solo con estado «en oferta»): precio de oferta, fecha de
     inicio y fecha de fin, obligatorios. Fuera de esas fechas el producto se muestra con su precio
     normal;
   - **condición**: nuevo (por defecto) o **segunda mano**; con segunda mano aparecen «estado del
     producto» (texto breve, p. ej. «Muy buen estado, pequeño arañazo en el lateral») y «garantía»
     (en meses, 12 como mínimo: el build avisa si es menor);
   - **galería**: de 1 a **5 imágenes** (límite en el panel), cada una con texto alternativo; la
     primera es la principal;
   - descripción (Markdown), características (lista nombre-valor: medidas, material, año…);
   - destacado (portada), «solo para pruebas» (como en la plataforma).
4. **Menú generado** desde las categorías (con sus subcategorías como desplegable), ordenado por el
   campo de orden; las páginas fijas (quiénes somos, contacto…) siguen en Ajustes del sitio.
5. **Validación en el build** con `console.warn('Aviso: …')`: identificadores repetidos, referencias
   repetidas (aviso, no error), producto sin modelo, «compatible con» que apunta a sí mismo o a un
   producto que no existe, relaciones a
   fabricantes o categorías que no existen, precio no numérico, producto sin imágenes o sin texto
   alternativo, oferta sin precio o sin fechas, precio de oferta igual o mayor que el normal, fin
   antes del inicio. Las **ofertas terminadas** no son un aviso: el producto pasa solo a mostrarse como
   disponible, con su precio normal (en el panel sigue «En oferta» hasta que se cambie o se pongan
   fechas nuevas); el build lo anota como información.
6. **Productos no disponibles**: el build no genera su ficha ni los incluye en listados, menú (una
   subcategoría sin productos visibles no sale), sitemap, buscador ni `catalogo.json`, y **no
   publica sus imágenes**. Siguen en el panel para volver a activarlos. Su antigua dirección da la
   página 404 (con enlaces a las categorías y al buscador).
7. **Ofertas y reconstrucción diaria**: la web es estática, así que el precio que se ve cambia al
   reconstruirla. Se reaprovecha la **reconstrucción diaria** de la plataforma, programada justo
   después de medianoche (hora de Madrid), para que las ofertas empiecen y terminen el día
   indicado. El servidor no depende de eso (fase 5).
8. **Prueba de volumen**: generar un catálogo ficticio del triple de lo previsto (600 productos
   con 5 imágenes) y medir el build, el tamaño publicado y la velocidad del panel. Si el panel va
   lento con una carpeta tan grande, repartir los productos en subcarpetas (como las noticias por
   año en la plataforma).

## Fase 3 — Carga y modificación en bloque

**Decidido (6-11-2026):** la **exportación** a Excel se hará **desde el panel** (descargar el Excel
con todo el catálogo para trabajarlo) y la **importación**, también desde el panel, después del
despliegue (fase 1b). Las órdenes `npm run exportar` / `npm run importar` siguen siendo la base
técnica (las ejecutará una acción de GitHub).

El panel sirve para el día a día (un producto, un precio, una oferta, retirar un producto). Para altas y
cambios masivos, un circuito con Excel que **no necesita saber de Git ni de Markdown**:

```
npm run exportar  → catalogo/productos.xlsx (estado actual del catálogo)
                    editar en Excel: altas, precios, estados, textos
                    fotos nuevas en catalogo/imagenes/
npm run importar -- --prueba   → informe de lo que cambiaría, sin tocar nada
npm run importar               → escribe public/_productos/ y public/img/productos/
                    revisar en Sourcetree, commit y push
```

1. **Plantilla Excel** `catalogo/productos.xlsx` (fuera de `public/`): una fila por producto y una
   columna por campo (identificador, nombre, fabricante, modelo, referencia, categoría,
   subcategoría, compatible con (identificadores separados por comas), precio orientativo
   (en las máquinas industriales, el de la completa), **precio cabezal**, estado, precio de oferta,
   **precio de oferta cabezal**, inicio y fin de la oferta, condición (nuevo / segunda mano), estado del
   producto y garantía, destacado, descripción, características, **imágenes**). Pestañas de ayuda con las
   listas válidas de fabricantes, categorías y estados (desplegables en las celdas).
   En las filas nuevas el identificador puede ir vacío: el importador lo crea a partir del
   fabricante y el modelo (y lo escribe en el Excel en la siguiente exportación).
2. **Imágenes por convención de nombre**: `catalogo/imagenes/<identificador>-1.jpg`,
   `<identificador>-2.jpg`… (el número fija el orden; la 1 es la principal). La columna «imágenes» es
   opcional: si está vacía, se usan las que sigan la convención. Texto alternativo: columna propia
   o, si falta, el nombre del producto (con aviso).
3. **`scripts/importar-catalogo.js`** (`exceljs` y `sharp`, ya usados en la plataforma):
   - valida todo antes de escribir nada (identificadores únicos, «compatible con» válido, fabricantes existentes,
     precios, imágenes que existen, **5 como máximo**, formato) y para con un informe claro si hay errores;
   - **tipos, categorías y subcategorías nuevos** (decidido 9-11-2026): en el Excel son desplegables
     con los de la web, pero se puede escribir uno nuevo (Excel solo avisa). El importador los da de
     alta (el tipo; la categoría dentro del tipo de su fila; la subcategoría dentro de su categoría),
     con su identificador a partir del nombre, y los lista en el informe para revisarlos (descripción,
     foto y lugar en «Orden del catálogo en el menú»);
   - **crea o actualiza** solo los campos que vienen en el Excel; no borra productos que no estén
     en él (los lista como aviso; para retirar uno, estado «no disponible» o borrarlo en el panel);
   - **reduce y comprime** las imágenes al importarlas (ancho y calidad máximos de Ajustes) y las
     guarda en `public/img/productos/<identificador>/`; si una imagen no ha cambiado, no la reescribe;
   - informe final: nuevos, modificados (con el campo y el valor anterior), sin cambios, avisos.
4. **`scripts/exportar-catalogo.js`**: genera el Excel desde los ficheros actuales, para que los
   cambios hechos en el panel no se pierdan. **Regla: exportar siempre antes de editar el Excel.**
   El importador avisa si un producto se cambió en el panel después de la última exportación.
5. **Cambio de precios y ofertas en bloque**: además de editar las columnas, opciones para
   subidas o bajadas porcentuales (`--subir 5% --categoria muebles`, o por fabricante) y para
   poner en oferta un grupo de productos (`--oferta 20% --desde 2026-11-27 --hasta 2026-11-30
   --fabricante X`), con el mismo informe previo de `--prueba`.
6. Si algún día se sacan las imágenes del repositorio (aviso del build a partir de 700 MB), el
   importador las sube al servicio elegido en lugar de copiarlas a `public/img/`.
7. **Para más adelante (si las cargas las hace la tienda)**: el importador no depende del equipo de
   Víctor y puede ejecutarlo una acción de GitHub cuando se suben el Excel y las fotos a una carpeta
   del repositorio (desde la web de GitHub o el panel), dejando el informe y los cambios en una rama
   para revisarlos antes de publicar. No se construye ahora.
8. Documentación: `docs/CARGA-EN-BLOQUE.md`, sin tecnicismos y con capturas del Excel.

Prueba: importar el catálogo ficticio de la fase 2, cambiar precios y estados, volver a importar y
comprobar el informe y el `git diff`.

**Adelantado de la fase 4 (5-11-2026), a petición de Víctor:**
- **Menú**: «Catálogo» primera opción, con desplegable automático de categorías y subcategorías; «Sobre
  nosotros» con desplegable («Dónde estamos»); «Contacto y horario»; «Blog». En las opciones con
  página y desplegable, el texto lleva a la página y la flecha abre el desplegable.
- **Portada**: botones «Ver el catálogo» y «Ver el blog»; bajo el bloque principal, **resumen del
  catálogo** (foto, fabricante, modelo y precio), **8 por página** (ajustable) en dos filas,
  **barajado en cada visita**; debajo, si hay ofertas, **Ofertas** (precio de oferta, anterior
  tachado y porcentaje), 8 por página (ajustable), primero las que **empezaron más recientemente**.
- **`/catalogo/`**: tarjetas de las categorías y, debajo, las ofertas o, si no hay, el resumen
  barajado como en la portada.
- **Páginas de categoría y subcategoría** con su texto del panel, sus subcategorías y sus productos
  (paginados en el navegador, con filtro por fabricante).
- **Ficha básica**: fotos (principal y miniaturas enlazadas, sin carrusel todavía), fabricante con
  su imagen, modelo, referencia, condición, precio u oferta, características, descripción,
  «Compatible con», «Accesorios para esta máquina» y «Más en la categoría». Botón provisional
  «Pedir información» (a Contacto) hasta la solicitud de presupuesto de la fase 5 (ya hecha: ver la fase 5).
- Paginación, orden al azar y filtro en `public/js/catalogo.js` (sin JavaScript se ven los N
  primeros en un orden que cambia cada día, o la lista completa en las categorías).

## Fase 4 — Fichas, listados, portada y buscador

1. **Ficha de producto** `/productos/<identificador>/`:
   - **carrusel** con las fotos (hasta 5): flechas, puntos o miniaturas, deslizar con el dedo en el
     móvil y flechas del teclado. Al **pulsar una foto se amplía** a pantalla completa, con el
     mismo carrusel, y se cierra con la X, la tecla Esc o tocando fuera. JS propio en un fichero
     (`public/js/carrusel.js`, sin CDN ni scripts en línea). Accesible (botones con nombre, foco,
     texto alternativo) y sin JavaScript se ven todas las fotos seguidas, cada una enlazada a su
     versión grande. Solo la primera foto se carga de entrada; el resto, al acercarse;
   - precio con «orientativo» y, en oferta, el **precio de oferta destacado**, el anterior
     **tachado**, el **porcentaje de descuento** y «Oferta hasta el …»;
   - etiqueta **«Segunda mano»** con el estado del producto y su garantía, si es el caso;
   - **fabricante, modelo y referencia** (si la tiene) junto al nombre;
   - en una máquina, bloque **«Accesorios para esta máquina»** (los accesorios disponibles que la
     incluyen en «compatible con»), cada uno con su botón «Añadir a la solicitud»; en un
     accesorio, **«Compatible con»** con enlaces a esas máquinas (solo las visibles);
   - fabricante y categoría enlazados, características, botones «Añadir a la solicitud» y «Solicitar presupuesto de este
   producto», productos relacionados (misma subcategoría o fabricante).
2. **Listados con paginación**: `/categorias/<categoria>/`, `/categorias/<categoria>/<subcategoria>/`
   (las direcciones son `/catalogo/<categoria>/` y `/catalogo/<categoria>/<subcategoria>/`; los
   fabricantes no tienen página, se filtran en cada listado). Etiqueta «Oferta» en las tarjetas de los productos en oferta.
3. **Ofertas**: en la portada y en `/catalogo/` (hecho). Página propia `/ofertas/`, solo si se pide.
4. **Portada**: hecha (resumen del catálogo y ofertas); «destacados» queda para más adelante si se pide.
5. **Buscador Pagefind** con filtros por categoría, fabricante, «en oferta» y «segunda mano»; se
   puede buscar por modelo y por referencia.
6. **SEO y datos estructurados** `Product` (nombre, imágenes, marca, modelo, referencia como `sku`,
   condición nueva o usada y, en los accesorios, `isAccessoryOrSparePartFor`). Con precios
   orientativos, en principio **sin `offers`** (no enviar a Google un precio que no es firme):
   comprobar los requisitos vigentes de Google antes de decidir.
7. Accesibilidad como en la plataforma (contraste, teclado, textos alternativos).

## Fase 5 — Solicitud de presupuesto

**Envío real hecho en código (10-11-2026); falta configurarlo y probarlo en `develop` con una cuenta de
Google de pruebas de Víctor** (guía: [solicitudes/CONFIGURAR.md](solicitudes/CONFIGURAR.md)). Cuando
exista la cuenta de la tienda se repiten los pasos de Google y se ponen las variables en Producción; el
código no cambia.
- Servidor (Pages Functions): `functions/api/solicitud.js` (envío), `functions/api/desafio.js`
  (ALTCHA) y `functions/api/estado-solicitudes.js` (diagnóstico con `DIAGNOSTICO_CLAVE`). La lógica
  está en `lib/solicitud.js` (validación y recálculo), `lib/verificacion.js` (ALTCHA con Web Crypto)
  y `lib/solicitud-api.js`; pruebas en `lib/solicitud.test.mjs` (`npm test`).
- El catálogo del servidor es `lib/generado/solicitud-datos.js` (lo genera el build, no va a Git) en
  vez del `catalogo.json` previsto en el punto 4; productos de dos precios como `<id>~cabezal`.
- Google: `docs/solicitudes/apps-script.gs` (numeración, «Solicitudes» y «Líneas», aviso, acuse,
  topes, diagnóstico, `crearSecreto`, `generarClavesCloudflare`, `probarCorreo`).
- Variables de Cloudflare: `SOLICITUDES_URL`, `SOLICITUDES_SECRETO`, `ALTCHA_SECRETO`,
  `DIAGNOSTICO_CLAVE` (de momento solo en Preview).
- Panel: «Mensaje tras enviar», «Correo de acuse al cliente» y «Límites contra abusos».
- Probado: pruebas unitarias, `wrangler pages dev` con el script simulado (diagnóstico, envío correcto
  con precios recalculados, ALTCHA falso rechazado) y navegador (Playwright) en `/presupuesto/` hasta
  «Solicitud S-2026-… enviada». En esa prueba salió y se corrigió un fallo: si el cliente pulsaba
  «No soy un robot» después de que se hubiera verificado sola, la desmarcaba; ahora al enviar se
  verifica de nuevo sin pedir nada.
- Punto 3 (envío sin JavaScript): **descartado por decisión de Víctor (10-11-2026)**. «No soy un robot» necesita
  JavaScript y un formulario sin él sería más fácil de usar para spam; sin JavaScript, las fichas muestran
  «Pedir información» y `/presupuesto/` enlaza a Contacto y horario (teléfono, WhatsApp, correo).
- Producción configurada con la cuenta de la tienda (10-11-2026): diagnóstico «Todo correcto». La solicitud
  sigue oculta en producción porque todos los productos están «Solo para pruebas».

**Parte visual hecha (6-11-2026), a petición de Víctor; el envío real, tras el despliegue (fase 1b):**
- Ficha: «Añadir a la solicitud» (otra pulsación suma una unidad) y «Ver mi solicitud»; contador en
  el menú (en el móvil, junto al botón del menú).
- `/presupuesto/` («Mi solicitud de presupuesto»): productos con **número de unidades** (1-99),
  precio por unidad y subtotal, quitar, total orientativo («a consultar» aparte), aviso si un
  producto ya no está disponible (solo pasa si en el panel se marcó «No disponible» o se borró); formulario (nombre, correo, teléfono, observaciones, aceptación) y
  botón «Enviar solicitud». **Al enviar se comprueban los campos y se avisa de que el envío todavía
  no está activo.**
- Panel → **Solicitud de presupuesto**: activarla o desactivarla (desactivada no salen el botón, el
  contador ni la página; en la ficha queda «Pedir información» a Contacto) y sus textos.
- Datos de los productos para la página: `/presupuesto/productos.json` (lo genera el build).
- **Cambio sobre lo previsto**: hay **cantidades** (para accesorios, agujas…). El servidor las tendrá
  que validar (1-99) y la hoja guardará las unidades de cada producto.
- **Dos precios (9-11-2026)**: las máquinas industriales con «Precio Cabezal» se piden como completa
  (su identificador) o cabezal («<identificador>~cabezal»; en `productos.json` lleva `version`). El
  servidor tendrá que aceptar ese sufijo y la hoja/correo indicar «Completa» o «Cabezal».

Basada en el formulario de propuestas (`api/propuesta.js`, `api/_lib/formulario.js`, ALTCHA, Apps
Script). Configuración: `docs/solicitudes/CONFIGURAR.md`.

**En el navegador**

1. **Solicitud** guardada en el navegador (`localStorage`), en un fichero propio
   `public/js/presupuesto.js` (la CSP prohíbe scripts en línea). Guarda identificadores y unidades.
   Contador en la cabecera. *(Hecho.)*
2. Página **`/presupuesto/`**: productos de la lista (nombre, foto, precio orientativo y total
   orientativo calculados con los datos publicados), quitar productos y formulario: **nombre, correo
   y teléfono obligatorios**; «Observaciones» opcional; casilla de aceptación de las condiciones y
   de la información de privacidad (textos en [BORRADORES-LEGALES.md](BORRADORES-LEGALES.md)) y
   «No soy un robot».
   Campos y textos editables en el panel (como el formulario de la plataforma).
3. **Sin JavaScript**: el botón «Solicitar presupuesto de este producto» de cada ficha abre el
   formulario con ese único producto y funciona igual (como `/participa/` en la plataforma).

**En el servidor** (`functions/api/solicitud.js`)

4. El build genera `catalogo.json` (identificador, nombre, modelo, referencia, precio y, si la hay, oferta con su precio y
   fechas) solo con los productos disponibles o en oferta, y la función lo lleva incorporado
   (se importa al empaquetarla; en la plataforma, `api/propuesta.js` leía `formulario.yml`). **El servidor recalcula nombres, precios y total con
   ese catálogo; nunca usa los que envía el navegador.** El precio de oferta se aplica según la
   **fecha del momento del envío** (hora de Madrid) —la tienda respeta el precio de oferta en las
   solicitudes recibidas dentro de las fechas—, así que es correcto aunque la reconstrucción
   diaria se retrase.
5. Rechaza identificadores inexistentes o **no disponibles** (se informa al cliente y no se guardan).
   La página `/presupuesto/` también marca y quita de la lista los productos que hayan dejado de
   estar disponibles desde que se añadieron, y actualiza los precios si ha empezado o terminado una
   oferta.
6. Validación, campo trampa, tiempo mínimo, límite por conexión, ALTCHA, solo desde la propia web,
   máximo de productos por solicitud. La IP no se guarda.

**En Google (Apps Script pegado en la hoja de la tienda)**

7. **Número de solicitud** correlativo (`S-2026-0001`), generado en el script con bloqueo
   (`LockService`) para que no se repita con dos envíos simultáneos.
8. **Hoja «Solicitudes»**: una fila por solicitud con número, fecha, **estado** (desplegable:
   Nueva, En revisión, Contactado, Aceptada, Rechazada, Cancelada), datos del cliente,
   nombre, modelo y referencia de cada producto y precio aplicado a cada uno (indicando si era de oferta), total orientativo, observaciones, consentimiento y versión del texto, y
   columnas libres para la tienda (notas, precio final). Todo como texto (sin fórmulas), como en la
   plataforma. Opcional: pestaña «Líneas» con una fila por producto, para filtrar por producto.
9. **Aviso a la tienda** (al correo de la tienda, guardado en el script): **solicitud completa**
   (decisión de Víctor, 10-11-2026): datos de contacto, preferencia, productos con precio, nota y
   enlace, total, observaciones y enlace a la hoja; en texto plano y con «Responder» al correo del
   cliente. Solo va a la tienda; el acuse al cliente sigue sin incluir nada escrito por él.
10. **Acuse de recibo al cliente**: texto fijo editable en el panel («Hemos recibido tu solicitud
    S-2026-0001; la tienda se pondrá en contacto contigo en breve»), lista de productos con precio
    orientativo **tomada del catálogo**, marcando los de **precio de oferta** (que se respeta), y aviso de que los precios no son firmes. **No incluye nada
    escrito por el cliente** (evita usar el formulario para enviar correos con texto ajeno a
    terceros). Sale desde el correo de la tienda, con su nombre como remitente.
11. Límites: solicitudes por hora en total, tope diario de avisos y de acuses (por debajo del cupo
    de Google: con la cuenta gratuita, unos 90 correos al día en total, configurable en el panel); si se alcanza el tope de acuses, la solicitud se guarda igual y la página de gracias
    lo dice.
12. **Diagnóstico** protegido (como `api/estado-formulario.js`) y guía
    `docs/solicitudes/CONFIGURAR.md` con `apps-script.gs`.

Prueba (con el script de Google simulado, como en la plataforma): solicitud correcta con fila,
aviso y acuse; precios manipulados en el navegador → se ignoran; producto no disponible; oferta que empieza o termina
entre la reconstrucción y el envío; identificador
inventada; robot; límites; números correlativos con envíos simultáneos; texto que empieza por
`=` guardado como texto.

## Fase 6 — Ajustes, guías y pruebas completas

1. Ajustes del sitio en el panel: datos de la tienda, textos del precio orientativo, de la página de
   gracias y del acuse, límites, compresión de imágenes, cómo se muestran las ofertas.
2. Guías: `docs/GUIA-EDICION.md` (panel), `docs/CARGA-EN-BLOQUE.md` (Excel) y
   `docs/GESTION-SOLICITUDES.md` (la hoja: estados, qué hacer cuando se vende un producto —
   pasarlo a «no disponible» en el panel o en el Excel —, cuánto tiempo se guardan los datos).
3. Prueba completa con el catálogo ficticio: carga, navegación en móvil, buscador, solicitud,
   correo recibido, hoja.
4. **Pendiente (más adelante)**: escribir la descripción (texto alternativo) de cada foto de
   producto («Vista frontal», «Detalle del panel», «Con la mesa de extensión»…), empezando por las
   máquinas, y pasarla también a las columnas «Foto N: descripción» de las Excel de importación.
   Hoy casi ninguna la tiene y la web usa el nombre del producto; el build lo resume en una sola
   línea («N productos tienen alguna foto sin descripción») en vez de un aviso por producto (9-11-2026).
   Igual con «N productos no tienen fotos» (con tres ejemplos) y con las descripciones para Google
   acortadas automáticamente (solo el número de páginas).

## Fase 7 — Legal y privacidad

Aunque no se pague en la web, se ofrecen productos a consumidores y se recogen datos personales.
**Lo debe revisar alguien con conocimientos legales**; aquí solo se preparan los huecos:

- aviso legal (datos de la empresa), política de privacidad (finalidad: responder a la solicitud de
  presupuesto; base legal; **plazo de conservación** de las filas de la hoja; derechos; encargados:
  alojamiento y Google), condiciones de la solicitud de presupuesto (precios orientativos, no
  vinculantes, la venta se acuerda después) y, si la venta se cierra a distancia (teléfono o
  correo), información precontractual y **desistimiento**;
- cookies y almacenamiento: la lista de presupuesto en `localStorage` es funcional; confirmar si
  hace falta aviso;
- texto de consentimiento del formulario con su versión guardada en cada fila;
- datos mínimos: nombre, correo y teléfono obligatorios, «Observaciones» opcional; la IP no se
  guarda. La tienda fija cuánto tiempo conserva las filas (p. ej. borrar las solicitudes que no
  acaban en venta pasados unos meses) y se indica en la política de privacidad.

**Borradores de partida ya preparados** (5-11-2026), con los datos de la tienda entre [corchetes] y
marcados como «pendiente de revisar»: aviso legal, política de privacidad, condiciones de la
solicitud de presupuesto (con información sobre desistimiento y garantía) y política de cookies,
en `public/_paginas/`; textos del formulario y del acuse, y **preguntas para quien revise**, en
[BORRADORES-LEGALES.md](BORRADORES-LEGALES.md). Opciones para la revisión: el asesor o la gestoría
de la tienda, o un abogado con un encargo puntual.

## Fase 8 — Despliegue y puesta en marcha

1. Cloudflare Pages conectado al repositorio: **producción** desde `main` y **entornos de prueba por
   rama** (`develop` y `dev-victor`, cada uno con su dirección; `staging` no se usa), gitflow adaptado de la plataforma,
   variables de entorno por entorno (claves **nunca en el código**). La **reconstrucción diaria**
   (ofertas) la lanza una tarea programada de GitHub Actions poco después de medianoche, hora de
   Madrid, con un enlace de despliegue (*deploy hook*) de Cloudflare guardado como secreto.
   **Hecho el 9-11-2026** (adelantado): `.github/workflows/reconstruccion-diaria.yml` (dos horarios en UTC,
   cada uno solo actúa en su época del año), `sincronizar-ramas.yml` (`main` → `develop` y
   `dev-victor`) y `.github/dependabot.yml`; configuración en el README.
   **Probado el 9-11-2026**: reconstrucción diaria lanzada a mano (despliegue de producción); una
   publicación desde el panel (rama `cms/…`, Pull Request fusionado en `main`) llegó sola a `develop` y
   `dev-victor` y Cloudflare desplegó las tres. Build: ~15 s en producción (sin los productos «Solo para
   pruebas») y 3-4 min en las ramas de pruebas con las ~2.000 versiones de las fotos sin caché (punto 6).
2. **Dominio** (se compra ahora): conectarlo en Cloudflare, HTTPS, cambiar la URL del sitio en los
   ajustes y en la lista de webs del login, **quitar el `noindex`** y el bloqueo de `robots.txt`,
   redirigir la dirección `pages.dev` de producción al dominio, dar de alta la web en Google Search
   Console y, si se quiere, correo con el dominio (cambiar el remitente y la dirección de los
   avisos en el script de Google).
3. Dependabot (`cooldown` 14 días; **hecho el 9-11-2026**), comprobación diaria (**hecha el 10-11-2026**:
   `.github/workflows/comprobacion-diaria.yml`; web, solicitudes y que la reconstrucción diaria funcione;
   abre una incidencia y menciona a `avanzado.avisos_github`; secreto `DIAGNOSTICO_CLAVE` en GitHub), `scripts/actualizar-decap.js` y hoja de tareas con Trello si se usa.
4. Carga del catálogo real con el importador, revisión, publicación.
5. Solicitud real de prueba de principio a fin y entrega a la tienda (guías y accesos).
6. **Volumen** (de la prueba de carga, [PRUEBA-DE-CARGA.md](PRUEBA-DE-CARGA.md), mejoras 2 y 5):
   - **Conservar la caché de imágenes entre despliegues**: compilar en GitHub Actions guardando
     `node_modules/.cache/tienda` (actions/cache) y publicar con `wrangler pages deploy`, o al menos
     comprobar que Cloudflare la conserva. Sin ella, cada despliegue rehace todas las imágenes
     (unos 15 min con 500 productos; el límite de Cloudflare es 20 min).
   - **Compresión automática de las fotos al publicar**: una acción de GitHub que ejecute
     `scripts/comprimir-imagenes.js` cuando cambie `public/img/` y guarde el resultado (el panel
     ya limita los ficheros a 8 MB y el build avisa de las fotos pesadas).
   - **Panel con muchos productos**: cuando pasen de unos cientos, agrupar o filtrar el listado de
     «Catálogo: productos» por tipo (`view_groups` / `view_filters` en `public/config.yml`) y
     comprobar que sigue siendo ágil.

## Riesgos y cómo se cubren

| Riesgo | Medida |
|---|---|
| Repositorio enorme por las fotos | Compresión al importar; decisión de la fase 0 con el volumen real; prueba de volumen en la fase 2 |
| Panel lento con muchos productos | Prueba de volumen; subcarpetas; el Excel para los cambios masivos |
| Cambios del panel pisados por el Excel | Exportar antes de editar; aviso del importador |
| Precios manipulados | Recalculados en el servidor con el catálogo del build |
| Solicitar un producto que ya no está disponible | Solo entran en `catalogo.json` los disponibles; la tienda lo pasa a «no disponible» al venderlo |
| Oferta que no empieza o no acaba a tiempo en la web | Reconstrucción diaria a medianoche; el servidor aplica el precio por fecha; nota del build con las ofertas terminadas |
| Formulario usado para enviar correos a terceros | ALTCHA, límites, tope diario y acuse sin texto del cliente |
| Cupo de correo de Google | Tope configurable por debajo del cupo; la solicitud se guarda aunque no salga el acuse |
| Uso comercial en un plan gratuito que no lo permite | Cloudflare Pages lo permite; nunca recoger datos de tarjetas en la web |
| Caída de Cloudflare sin soporte ni SLA | Teléfono y correo de la tienda visibles; comprobación diaria con aviso |
| Límites del plan gratuito (ficheros, CPU de las funciones) | Avisos del build; funciones ligeras con datos ya en JSON |
