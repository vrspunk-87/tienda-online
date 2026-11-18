# Plan de pruebas · Web en el ordenador

Navegador: Chrome o Edge, ventana maximizada (también conviene una pasada con Firefox). Preparación y forma de
marcar: [README.md](README.md). Entorno habitual: **E** (dev-victor), donde se ven los productos «Solo para
pruebas».

## 1. Cabecera, menú y pie

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 1.1 | E | Abrir la portada | Arriba, la franja «Entorno de pruebas» (en producción no sale); logo con la aguja y el nombre en la letra del logo | |
| 1.2 | E | Mirar la primera fila del menú | Logo, caja de búsqueda, Sobre nosotros, Contacto y horario, Blog y la píldora «Mi solicitud» | |
| 1.3 | E | Segunda fila (barra del catálogo) | «Todo el catálogo», cada tipo de producto con su número y «Ofertas» (si hay); el color elegido en Ajustes | |
| 1.4 | E | Pasar el ratón por un tipo de producto | Panel con resumen a la izquierda (productos, descripción, «Ver los N productos») y categorías en columnas con hasta 5 subcategorías y «Ver las N» | |
| 1.5 | E | Bajar por una página larga | Si en Ajustes está «Fijo arriba», el menú se queda arriba | |
| 1.6 | E | Pie | Pespunte arriba; cuatro columnas (marca y redes · Catálogo con números · La tienda · Visítanos con dirección, «Cómo llegar», teléfono, WhatsApp, correo y «Abierto / Cerrado») y la línea final con «© …», el texto de los precios y los enlaces legales | |
| 1.7 🧪 | E | Ajustes → Franja de aviso: marcar, texto y «Hasta» = mañana; publicar | La franja sale arriba en todas las páginas con su color y su enlace | |
| 1.8 | E | Pestaña del navegador | Icono de la tienda (favicon) y título «Página · Máquinas de Coser Zafra» | |

## 2. Portada

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 2.1 | E | Bloque principal | Antetítulo, titular, texto y ventajas con icono; debajo, el último artículo del blog; a la derecha «Explora el catálogo» con los tipos y su número | |
| 2.2 | E | «Nuestros productos» | Productos al azar (cambian al recargar) con la barra de filtros (Fabricante, Segunda mano, En oferta, Precio, Ordenar) | |
| 2.3 | E | «Productos en oferta» y «Últimas entradas del blog» | Salen si hay ofertas y entradas; si no, no aparecen | |

## 3. Catálogo, categorías y ofertas

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 3.1 | E | Abrir /catalogo/ | Migas, título con la letra de la marca, descripción, recuadro con tijeras (primera frase destacada), compartir y tarjetas de los tipos con su número | |
| 3.2 | E | Entrar en un tipo, una categoría y una subcategoría | Cada una con sus migas, recuadro, tarjetas de lo que cuelga de ella y «Productos de …» con filtros | |
| 3.3 | E | Filtro «Fabricante» | Panel de logos en gris; al marcar uno se pone en color y filtra; etiqueta con «×» para quitarlo | |
| 3.4 | E | Filtro «Precio» | Deslizador doble; la casilla «Incluir "Precio a consultar"» quita o pone los que no tienen precio | |
| 3.5 | E | «Ordenar»: precio ↑ y ↓, nombre, modelo, novedades | Ordena; los «a consultar» al final | |
| 3.6 | E | Paginación | «Mostrando 1–12 de N», círculos con «…»; al cambiar de página sube al principio del listado | |
| 3.7 | E | Tarjeta de producto | Pespunte, logo del fabricante sobre la foto, nombre, modelo, precio (sin «,00» si es redondo, con punto de miles: 3.813 €) y botón «+» | |
| 3.8 | E | Producto en oferta | Precio de oferta, precio anterior tachado y porcentaje; etiqueta «Oferta −N %» en la foto | |
| 3.9 | E | /ofertas/ (si hay ofertas) | Tipos con su número de ofertas; dentro, solo las ofertas de esa selección; enlace «Ver … en el catálogo» | |
| 3.10 | E | Productos con etiqueta «Novedad» (si en Ajustes hay días) | Etiqueta verde en la tarjeta y en la ficha; desaparece pasados los días | |

## 4. Ficha de producto

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 4.1 | E | Abrir una ficha con varias fotos | Miniaturas a la izquierda, contador «1 / N», flechas; pulsar la foto la abre a pantalla completa, con ← → del teclado y Esc para cerrar | |
| 4.2 | E | Cabecera de la ficha | Logo del fabricante, píldora Nuevo / Segunda mano, título, «Modelo · Ref.» | |
| 4.3 | E | Caja de compra | Precio (u oferta con «Oferta hasta… · quedan N días»), unidades − / +, «Añadir a la solicitud», «Preguntar por WhatsApp» con el producto escrito, «Llamar» y frases de confianza | |
| 4.4 | E | Máquina industrial con dos precios | «Completa» y «Cabezal», cada uno con su precio | |
| 4.5 | E | Pestañas | Descripción, Características, Ficha técnica (con PDF si lo hay) y Accesorios / Modelos compatibles; las vacías no salen | |
| 4.6 | E | Final de la ficha | «Más en …» con tantos productos como diga Ajustes; compartir | |
| 4.7 | E | Producto de segunda mano | Estado y garantía en la ficha técnica | |
| 4.8 | E | Producto «No disponible» (dirección de su ficha) | Página 404 | |

## 5. Solicitud de presupuesto

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 5.1 | E | «Añadir a la solicitud» en dos fichas y «+» en una tarjeta | La píldora «Mi solicitud» del menú cuenta los productos | |
| 5.2 | E | Abrir /presupuesto/ | Pasos (Revisa · Tus datos · Te contestamos), productos con − / +, «Quitar» con «Deshacer», nota por producto, «Accesorios para tus máquinas», formulario en dos columnas y resumen fijo a la derecha con el total | |
| 5.3 | E | Cerrar el navegador y volver | La solicitud sigue ahí (se guarda en el navegador) | |
| 5.4 | E | Intentar marcar la casilla de aceptación sin abrir las condiciones | No se deja; al abrir la ventana con las dos pestañas y leer las dos, «He leído y acepto» la marca | |
| 5.5 | E | Enviar con nombre, teléfono o correo vacíos o mal escritos | Mensajes junto a cada campo; no se envía | |
| 5.6 🧪 | E | Enviar una solicitud de prueba completa (con «No soy un robot») | Mensaje con el número (S-2026-…); llegan los dos correos (ver 5.8 y 5.9); fila nueva en la hoja de Google | |
| 5.7 🧪 | E | Enviar con 3 enlaces en las observaciones | Pide quitarlos («no pueden llevar más de 2 enlaces») | |
| 5.8 🧪 | E | Correo al cliente (acuse) | Cabecera con el logo, número, «¡Gracias por tu solicitud!», pasos, productos con foto y precio, total, botones «Ver el catálogo» y WhatsApp, pie con dirección y horario. **No** lleva el nombre ni las observaciones del cliente | |
| 5.9 🧪 | E | Correo a la tienda (aviso) | Asunto «… S-2026-… · nombre · total»; aviso de seguridad bajo el título; datos del cliente con botones Llamar / WhatsApp / Responder; productos enlazados; observaciones; botón a la hoja. «Responder» contesta al cliente | |
| 5.10 🧪 | E | Ver los dos correos en modo texto (Gmail: ⋮ → «Mostrar original», o un programa sin HTML) | Marcos ligeros, nada se descuadra, líneas cortas | |
| 5.11 | E | Solicitud vacía | Mensaje de solicitud vacía con enlaces al catálogo, como el buscador sin resultados | |

## 6. Buscador

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 6.1 | E | Escribir «janome» en la caja de la cabecera (sin pulsar Intro) | Sugerencias: categorías, 4 productos con foto y precio, blog/páginas y «Ver los N resultados» | |
| 6.2 | E | Pulsar Intro | /buscar/?q=janome: píldoras de categorías, productos con filtros y «En el blog y otras páginas» | |
| 6.3 | E | Buscar por modelo («HD 100») y por referencia | Encuentra el producto | |
| 6.4 | E | Buscar algo que no existe | Consejos, «¿No lo encuentras? Pregúntanos» y los tipos de producto | |

## 7. Blog

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 7.1 | E | /blog/ | Recuadro con tijeras, temas como botones, la última entrada destacada en grande y las demás en tarjetas con fecha «calendario», tema y minutos | |
| 7.2 | E | Abrir una entrada | Migas Blog › Tema, píldoras, entradilla, compartir arriba y abajo, foto con pespunte, recuadro final con botón al catálogo y WhatsApp, «Más sobre <tema>» | |
| 7.3 | E | Pulsar un tema | /blog/tema/…/ con solo esas entradas | |
| 7.4 | E | /blog/feed.xml | Se abre el RSS con las entradas | |
| 7.5 | P | En producción | Las entradas «Solo para pruebas» no salen | |

## 8. Contacto, Sobre nosotros y páginas legales

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 8.1 | E | Contacto y horario | «Abierto ahora · cierra a las…» o «Cerrado · abre…» correcto para la hora actual; tarjetas Llamar / WhatsApp / Correo / Dirección; horario con hoy resaltado | |
| 8.2 | E | «Ver el mapa» | El mapa de Google no se carga hasta pulsarlo; después se ve | |
| 8.3 | E | Sobre nosotros | Presentación, foto, sello «desde», cifras, qué hacemos, por qué comprar, historia, galería (todas las fotos se ven) y logos de las marcas | |
| 8.4 | E | Aviso legal, privacidad, cookies y condiciones | Se abren desde el pie; los datos de la tienda rellenos (sin «[NIF]» u otros huecos cuando estén los datos) | |
| 8.5 | E | Una dirección que no existe (/no-existe/) | Página 404 de la tienda con el buscador y enlaces | |

## 9. Compartir, Google y antispam

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 9.1 | E | Botones de compartir de una ficha | WhatsApp, Facebook, Telegram y X abren con el enlace de esa página; «Copiar enlace» pone ✓ | |
| 9.2 | E | Pegar el enlace de una ficha en WhatsApp Web | Sale la foto, el título y la descripción del producto | |
| 9.3 | E | Ver el código (Ctrl+U) de Contacto y buscar el correo y el teléfono | No aparecen escritos tal cual (salvo el teléfono dentro de `application/ld+json`); en la página sí se ven y funcionan | |
| 9.4 | E | /robots.txt | En pruebas: «no indexar nada». En producción, solo cuando esté activado «Permitir que Google indexe la web» | |
| 9.5 | P | /sitemap.xml en producción | Lista de las páginas públicas (sin productos de prueba) | |

## 10. Rendimiento y accesibilidad (de vez en cuando)

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 10.1 | E | Chrome → F12 → Lighthouse → «Escritorio» en la portada y en una ficha | Rendimiento, Accesibilidad, Buenas prácticas y SEO en verde (90 o más; SEO baja en pruebas por el «noindex», es normal) | |
| 10.2 | E | Recorrer la portada solo con el teclado (Tab, Intro, Esc) | Se ve dónde está el foco; «Saltar al contenido» al primer Tab; los menús se abren y cierran | |
| 10.3 | E | F12 → Consola, navegando por varias páginas | Sin errores en rojo | |
