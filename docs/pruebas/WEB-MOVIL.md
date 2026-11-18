# Plan de pruebas · Web en el móvil

Con un móvil de verdad: Android con Chrome y, si se puede, un iPhone con Safari. Hazlo en vertical y repite
alguna prueba en horizontal. Preparación y forma de marcar: [README.md](README.md). Entorno habitual: **E**
(dev-victor).

Lo que funciona igual que en el ordenador (textos, precios, correos…) está en
[WEB-ORDENADOR.md](WEB-ORDENADOR.md); aquí va lo que cambia en el móvil y lo que suele fallar en él.

## 1. Cabecera, menú y pie

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 1.1 | E | Abrir la portada | Nada se sale por los lados (no hay desplazamiento horizontal); logo y botón del menú visibles | |
| 1.2 | E | Abrir el menú | Arriba, el catálogo en una caja con pespunte; debajo, las demás opciones y «Mi solicitud» | |
| 1.3 | E | Pulsar un tipo de producto dentro de la caja | Entra en su nivel (categorías, con su número); «←» vuelve atrás; «Ver todo …» lleva a su página | |
| 1.4 | E | Abrir el menú estando dentro de una categoría | Se abre ya en el nivel de esa categoría | |
| 1.5 | E | Pulsar una opción del menú | Va a la página y el menú se cierra | |
| 1.6 | E | Franja de aviso (si está activa) | Cabe en la pantalla (se parte en dos líneas si hace falta) y el enlace se puede pulsar | |
| 1.7 | E | Pie | Las columnas una debajo de otra; teléfono, WhatsApp y correo se pueden pulsar | |
| 1.8 | E | Migas de pan | Solo «← <página anterior>», que lleva a ella | |

## 2. Portada y catálogo

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 2.1 | E | Portada | Orden: textos y ventajas, «Explora el catálogo», último artículo; después los bloques | |
| 2.2 | E | Listado de productos | 2 tarjetas por fila; precio y «+» caben sin partirse; descripción de las tarjetas de categoría en 3 líneas | |
| 2.3 | E | Filtros | La barra de filtros cabe; «Precio» con «Desde / Hasta» y rangos rápidos; el panel de fabricantes se abre y se cierra bien | |
| 2.4 | E | Paginación | Los círculos caben; al cambiar de página sube al principio del listado | |
| 2.5 | E | Pulsar «+» en una tarjeta | Se añade a la solicitud (cambia el número de «Mi solicitud») sin abrir la ficha | |

## 3. Ficha de producto

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 3.1 | E | Fotos | Se pasan deslizando con el dedo; puntos debajo; contador; al pulsar, pantalla completa que se cierra bien | |
| 3.2 | E | Bajar por la ficha hasta pasar el botón «Añadir a la solicitud» | Aparece abajo una barra fija con el precio y «Añadir a la solicitud»; al volver arriba, desaparece | |
| 3.3 | E | «Preguntar por WhatsApp» | Abre WhatsApp con el mensaje y el nombre del producto | |
| 3.4 | E | «Llamar» | Abre el teléfono con el número de la tienda | |
| 3.5 | E | Pestañas (Descripción, Características, Ficha técnica…) | Caben o se pueden desplazar; la tabla técnica no se sale de la pantalla | |
| 3.6 | E | Compartir | Además de los iconos, el botón «Más opciones» abre el menú de compartir del móvil | |

## 4. Solicitud de presupuesto

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 4.1 | E | Abrir /presupuesto/ con productos | Barra fija abajo con el total; productos y formulario a lo ancho | |
| 4.2 | E | Escribir en el formulario | El teclado no tapa el campo en el que escribes; el de teléfono abre el teclado numérico y el de correo el de correo | |
| 4.3 | E | Ventana de condiciones y protección de datos | Se lee entera, se cambia de pestaña y se cierra; luego se puede marcar la casilla | |
| 4.4 | E | «No soy un robot» | Se marca y se verifica sin problemas | |
| 4.5 🧪 | E | Enviar una solicitud de prueba desde el móvil | Mensaje con el número; llegan los dos correos | |
| 4.6 🧪 | E | Abrir los dos correos en el móvil (Gmail) | Se leen sin hacer zoom: cabecera, productos con foto, total, botones grandes; en el de la tienda, «Llamar» y «WhatsApp» abren el teléfono y WhatsApp | |

## 5. Buscador, blog y páginas

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 5.1 | E | Buscar desde el menú | Lleva a /buscar/ con los resultados; los filtros caben | |
| 5.2 | E | Blog y una entrada | Tarjetas una debajo de otra; la foto y el recuadro final caben; los botones se pueden pulsar | |
| 5.3 | E | Contacto y horario | «Abierto / Cerrado» correcto; las tarjetas Llamar / WhatsApp / Correo / Dirección se pulsan; el mapa se carga al pulsar y se puede mover | |
| 5.4 | E | «Cómo llegar» / «Abrir en Google Maps» | Abre la aplicación de mapas | |
| 5.5 | E | Sobre nosotros | Fotos de la galería y logos de las marcas bien colocados (3-4 por fila) | |
| 5.6 | E | Páginas legales | Se leen sin salirse de la pantalla | |

## 6. Comprobaciones generales

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 6.1 | E | Girar el móvil a horizontal en la portada, una ficha y la solicitud | Todo sigue cabiendo y funcionando | |
| 6.2 | E | Con datos móviles (sin wifi), abrir la portada y una ficha | Cargan en pocos segundos; las fotos aparecen al bajar | |
| 6.3 | E | Chrome (Android) → ⋮ → «Añadir a pantalla de inicio» | Icono de la tienda y «Nombre corto» de Ajustes | |
| 6.4 | E | Color de la barra del navegador (Android) | El de Ajustes → Apariencia | |
| 6.5 | E | Lighthouse en modo «Móvil» (desde el ordenador: F12 → Lighthouse) | Rendimiento y Accesibilidad en verde o naranja alto (85 o más) | |
| 6.6 | E | Letra grande del sistema (Ajustes del móvil → tamaño de fuente grande) | Los textos crecen y no se montan unos sobre otros | |
