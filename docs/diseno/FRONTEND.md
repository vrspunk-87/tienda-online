# Diseño técnico: la web en el navegador

La web publicada es HTML estático que genera [el generador](GENERADOR.md), con estilos y unos pocos scripts
propios que añaden lo interactivo (filtros, solicitud, buscador, galería). Sin *frameworks* en el navegador
y sin nada servido desde otros dominios.

Vuelta a la [arquitectura](../ARQUITECTURA.md).

## 1. Piezas

| Pieza | Fichero | Notas |
|---|---|---|
| Bootstrap 5.3 (CSS + `bootstrap.bundle.min.js`) | `dist/vendor/` (copiado de `node_modules` por el build) | Rejilla, desplegables, pestañas, ventanas |
| Iconos | `dist/vendor/bootstrap-icons/` | Bootstrap Icons |
| Letras | `dist/vendor/fonts/` (`@fontsource`) | Courgette (marca), Nunito; Google Fonts solo si se activa en Ajustes (desactivado) |
| Tema | `scripts/temas/tienda.css` → `dist/vendor/tema.css` | Variables de la marca; colores de Ajustes en `css/tema.css` y `css/personalizado.css` (generados) |
| Estilos propios | `public/css/estilos.css` | Componentes de la tienda: tarjetas con pespunte, barra del catálogo, ficha, solicitud, pie… |
| Scripts propios | `public/js/*.js` | Ver tabla siguiente |
| Buscador | `dist/pagefind/` | Índice y motor de Pagefind (WebAssembly) |
| «No soy un robot» | `dist/vendor/altcha/` | Widget ALTCHA, solo en `/presupuesto/` |

## 2. Scripts propios

| Script | Dónde se carga | Responsabilidad |
|---|---|---|
| `extras.js` | Todas las páginas | Menú del móvil y catálogo por niveles; sugerencias del buscador de la cabecera; galería de la ficha (carril, miniaturas, ventana a pantalla completa); días que quedan de oferta; Contacto (abierto/cerrado con el horario y la zona horaria, mapa al pulsar); compartir; contacto antispam (vuelve a poner teléfono, correo y WhatsApp) |
| `catalogo.js` | Páginas con rejillas | Paginación, orden aleatorio («Recomendados»), filtros (fabricante, precio, segunda mano, oferta, orden), carga de las tarjetas de listas largas |
| `buscar.js` | `/buscar/` | Resultados de Pagefind: categorías, productos (con los filtros del catálogo) y blog/páginas; filtro de resultados poco fiables (`resultadoFiable`) |
| `presupuesto.js` | Si la solicitud está activa | Contador del menú, botones «Añadir», `/presupuesto/` completa (lista, notas, accesorios, resumen, formulario, condiciones, ALTCHA, envío) |

### Atributos y eventos que conectan el HTML con los scripts

| Atributo / evento | Lo pone | Lo usa | Para qué |
|---|---|---|---|
| `data-rejilla`, `data-por-pagina`, `data-aleatorio`, `data-unidad` | build | catalogo.js | Rejilla paginada |
| `data-rejilla-filtro` y `data-filtro-*`, `data-precio-*` | build | catalogo.js, buscar.js | Barra de filtros |
| `data-producto` (en cada tarjeta, con fabricante, precio, oferta, segunda mano, fecha…) | build | catalogo.js | Filtrar y ordenar sin pedir nada al servidor |
| `data-tarjetas` + `data-tarjetas-resto` | build (más de 48 elementos) | catalogo.js | El HTML trae la primera página; el resto llega en un JSON |
| `data-esperar` + evento `rejilla:lista` | build / buscar.js | catalogo.js | La rejilla del buscador espera a tener resultados |
| evento `tarjetas:nuevas` | catalogo.js | presupuesto.js | Activar el «+» de tarjetas añadidas después |
| `data-anadir-solicitud`, `data-version`, `data-anadir-rapido` | build | presupuesto.js | Añadir a la solicitud (versión Completa/Cabezal) |
| `data-solicitud`, `data-datos="/presupuesto/productos.json"` | build | presupuesto.js | Página de la solicitud y datos de los productos |
| `data-galeria-*` | build | extras.js | Galería de la ficha |
| `data-oferta-fin`, `data-oferta-quedan` | build | extras.js | «Quedan N días» |
| `data-abierto`, `data-aviso-cierre`, `data-zona` | build | extras.js | «Abierto ahora / Cerrado · abre…» |
| `data-mapa`, `data-mapa-cargar` | build | extras.js | El mapa de Google solo se carga al pulsar |
| `data-cto`, `data-cto-t` | build (`ocultarContacto`) | extras.js | Teléfono y correo codificados (antispam) |

## 3. Estado en el navegador

| Clave | Dónde | Contenido |
|---|---|---|
| `solicitud-presupuesto` | `localStorage` | Lista de `{ id, cantidad, nota }` (id = identificador del producto o `<id>~cabezal`; cantidad 1-99; nota ≤ 300 caracteres). Sin datos personales |
| Avisos «Entendido» del panel | `localStorage` (solo en `/admin/`) | Ofertas terminadas ya vistas |

No hay cookies en la web pública.

## 4. Política de seguridad de contenidos (CSP)

La pone el build en cada página (`<meta http-equiv="Content-Security-Policy">`):

```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline';
font-src 'self' data:; img-src 'self' data: https:; connect-src 'self'; worker-src 'self' blob:;
frame-src https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self'
```

Consecuencias para quien programa:

- **Nada de `<script>` en línea ni `onclick=""`**: todo en ficheros de `public/js/`.
- `wasm-unsafe-eval` solo por Pagefind.
- Peticiones solo a la propia web (`connect-src 'self'`): `/api/…`, `/presupuesto/productos.json`, `/pagefind/`.
- El único marco permitido es el mapa de Google, que no se carga hasta que se pulsa.

Además, `public/_headers` añade `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
`Permissions-Policy`, caché de una semana para `/img/*` y `/vendor/*`, una CSP estricta para los SVG y
`noindex` para `/admin/`.

## 5. Adaptación al móvil

- Menos de 992 px: el menú pasa a las tres rayas; el catálogo va arriba del menú y se navega por niveles
  (`data-cat-nivel`).
- Ficha: fotos con deslizamiento y puntos; barra fija abajo con precio y «Añadir a la solicitud» al pasar la
  caja de compra.
- Solicitud: barra fija abajo con el total.
- Filtros de precio: «Desde / Hasta» y rangos rápidos en vez del deslizador.

## 6. Accesibilidad y SEO en el HTML

- Texto alternativo en todas las fotos (automático si falta), `aria-*` en menús, pestañas y ventanas,
  enlace «Saltar al contenido», contraste de los colores de la marca comprobado por el build.
- Cada página: título, descripción, canónica, Open Graph, datos estructurados (Store, Product sin precio,
  BreadcrumbList, BlogPosting, CollectionPage…). Ver [GENERADOR.md](GENERADOR.md).
- Sin JavaScript se ve el contenido: las rejillas muestran los primeros productos y las fichas, todo.
