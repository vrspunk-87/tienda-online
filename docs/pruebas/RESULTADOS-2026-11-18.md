# Resultados de las pruebas · 18-11-2026

Ejecutadas por Claude de forma automática (navegador Playwright/Chromium, ventana 1440×900 y móvil emulado:
web a 375×812 y panel como Pixel 7), **en local**: copia exacta de la carpeta en el commit `61e82ef`, con `npm ci`, `npm run build`, la web
servida con `serve` (como `npm run web`) y el panel con `decap-server` (como `npm run panel`). No se ha tocado
dev-victor, ni GitHub, ni la carpeta de Víctor (salvo este fichero).

Marcas: ✅ bien · ❌ falla (con el motivo) · ⚠️ funciona con un matiz · ⏭️ no se ha podido probar (con el motivo).
Las pruebas «E» del plan se han hecho en local («L»); las «P» (producción) no se han hecho.

Pruebas automáticas: `npm test` → 39 correctas, 0 fallos. `npm run build` → 477 productos, **0 enlaces rotos**,
avisos ya conocidos (6 referencias repetidas, 29 productos sin fotos, falta el NIF).

## Resumen

| Plan | ✅ | ⚠️ | ❌ | ⏭️ | Notas |
|---|---|---|---|---|---|
| Web · ordenador | 41 | 5 | 3 | 4 | Las 🧪 de la web están en «Pruebas 🧪 hechas en la copia». |
| Web · móvil | 27 | 4 | 1 | 4 | Varias ⏭️ necesitan un móvil de verdad. |
| Panel · ordenador | 72 | 4 | 1 | 7 | Incluye las 🧪 hechas en la copia (web y panel). |
| Panel · móvil | 18 | 3 | 2 | 9 | Emulación de Pixel 7; las de cámara, galería y GitHub, en un móvil real. |

Quedan para dev-victor (cuando Víctor quiera): login y sesión de GitHub, flujo editorial, envío real de la
solicitud (ALTCHA, hoja y correos), icono de la pestaña, colores y zona horaria (8b.6, 8b.7, 9.2) y lo que
necesita un móvil de verdad (deslizar, teclado, cámara, compartir del sistema, pantalla de inicio).

## Fallos y matices para corregir (lista para trabajar)

**Fallos (❌)**

1. Web 3.6 · Al cambiar de página en un listado, la cabecera fija tapa la primera fila.
2. Web 6.4 · El buscador es demasiado permisivo: «xyzzyqwerty» da 13 resultados y «paraguas» 272.
3. Web 8.4 · Siguen los huecos en los textos legales: [NIF], [fecha], [6 meses], [2 días laborables]… (datos de la tienda y revisión legal pendientes).
4. Web móvil 6.6 · Con la letra al 150 %, el nombre de la cabecera se monta encima del icono de la solicitud y del menú.
5. Panel 1.3 · «Acceso rápido → Añadir → Entradas del blog» abre el listado del blog en vez de «Nueva entrada».
6. Panel móvil 1.5 · El menú «+» (Acceso rápido) se sale por la derecha de la pantalla.
7. Panel móvil 4.1 · En Medios la ✕ de cerrar queda casi fuera de la pantalla.

**Matices (⚠️)**

1. Web 1.4 · El panel de cada tipo se abre al pulsar, no al pasar el ratón (decidir: plan o comportamiento).
2. Web 1.8 · Título repetido en fichas («Bernina B790 · Bernina B790 | …», también en og:title).
3. Web · «Compartir» sale en la portada, aunque la decisión era no ponerlo.
4. Web 4.1 · La pantalla completa de la galería solo se abre con ⤢, no al pulsar la foto.
5. Web 7.2 · En la entrada del blog sale «Más del blog» en vez de «Más sobre Pruebas», y «Ver prensatelas» lleva a /catalogo/.
6. Web móvil 1.2 · «Mi solicitud» es un icono fuera del menú (revisar si es lo que se quiere).
7. Panel 5.1 · Píldoras y títulos del buscador repiten el número: «Tipos de producto (6) (5)».
8. Panel 6.2 · `logo.png` sale «Sin usar» (se puede borrar); los iconos no aparecen en General.
9. Panel 7.5 · En local, «Borrar» en una importación no borra las fotos de esa ficha aunque el informe lo diga (`leerMedios` con nombres en `importar()`, panel.js).
10. Panel 8.2 · Error en la consola (vista-previa.js:388, `widgetFor('texto')`) al pasar de «Sobre nosotros» a otra ficha sin recargar.
11. Panel 8b.1 · El primer guardado de Ajustes reordena todo `sitio.yml`; «Enlace (opcional) (opcional)» en la franja.
12. Panel · Textos de Decap sin traducir: «Replace with URL», «Copy», «Add fotos», «Insert from URL», «Toggle preview».
13. Panel móvil 2.5 / 5.2 · Con toque, los globos de ⚠ y ⓘ se abren encima del propio botón y se cierran solos (confirmar en un móvil real).
14. Panel móvil 3.2 · Los botones ojo y flechas tapan el borde derecho de los campos.
15. Build · Una foto de Sobre nosotros usada también en una entrada de prueba se publica con el nombre de la entrada.

---

## Web · ordenador (WEB-ORDENADOR.md)

| # | Resultado | Notas |
|---|---|---|
| 1.1 | ✅ | Franja «Entorno de pruebas: local» arriba; logo con la aguja y el nombre en Courgette. |
| 1.2 | ✅ | Logo, búsqueda, Sobre nosotros, Contacto y horario, Blog y «Mi solicitud». |
| 1.3 | ✅ | «Todo el catálogo» y los 6 tipos con su número, barra gris. No sale «Ofertas» porque no hay ninguna. |
| 1.4 | ⚠️ | El panel del tipo (resumen, «Ver los 177 productos», categorías en columnas) está bien, pero **se abre al pulsar, no al pasar el ratón** como dice el plan: corregir el plan o el comportamiento. |
| 1.5 | ✅ | Menú fijo arriba (`sticky`) al bajar. |
| 1.6 | ✅ | Pespunte, cuatro columnas con todo lo indicado, «Cerrado · abre mañana a las 10:00» (eran las 20:12 del miércoles en Madrid) y línea final con «©», precios y legales. |
| 1.7 🧪 | | Ver el apartado «Pruebas con datos (🧪)» más abajo. |
| 1.8 | ⚠️ | Favicon bien. El título usa «Página \| Máquinas de Coser Zafra» (con «\|», no «·» como dice el plan). En las fichas cuyo título ya es «Fabricante Modelo» sale repetido: **«Bernina B790 · Bernina B790 \| Máquinas de Coser Zafra»** (también en `og:title`). |
| 2.1 | ✅ | Antetítulo, titular, texto, 4 ventajas con icono, último artículo y «Explora el catálogo» con los 6 tipos y su número. |
| 2.2 | ✅ | Cambian al recargar. Filtros: Fabricante, Precio y Ordenar (no salen Segunda mano ni En oferta porque no hay productos así). |
| 2.3 | ✅ | Sin ofertas no sale su bloque; sale «Últimas entradas del blog». |
| — | ⚠️ | La portada lleva botones de **Compartir**; según lo decidido (CLAUDE.md, «Compartir») no deberían salir en la portada. |
| 3.1 | ✅ | Migas, título en Courgette, recuadro con tijeras y la primera frase destacada, compartir y 6 tarjetas con su número. |
| 3.2 | ✅ | Probado con Máquinas Industriales, Accesorios › Accesorios especiales para costura › Mesa extraíble: migas, recuadro, tarjetas y «Productos de …» con filtros. |
| 3.3 | ✅ | Logos en gris; al marcar Janome pasa a color, filtra (18 de 177) y sale la etiqueta «Janome ×» con «Quitar filtros». El logo de Bernina se ve muy pequeño y pálido. |
| 3.4 | ✅ | Deslizador doble; quitar «Incluir "Precio a consultar"» pasa de 184 a 183 productos en Industriales. |
| 3.5 | ✅ | Precio ↑ (185 €…), precio ↓ (7.199 €…), nombre, modelo y novedades ordenan. |
| 3.6 | ❌ | «Mostrando 1–12 de 177», círculos y «…» bien, pero **al cambiar de página la primera fila de productos queda tapada por el menú fijo**: sube hasta el listado sin descontar la altura de la cabecera (se ve desde la mitad de las fotos). |
| 3.7 | ✅ | Pespunte, logo sobre la foto, nombre, modelo, «1.421 €» (punto de miles, sin «,00») y «+». |
| 3.8 | | Sin productos en oferta: ver «Pruebas con datos (🧪)». |
| 3.9 | | Ídem (sin ofertas no se publica /ofertas/, que da 404: correcto). |
| 3.10 | | «Novedad» está a 0 días en Ajustes: ver «Pruebas con datos (🧪)». |
| 4.1 | ⚠️ | 5 miniaturas, «1 / 5», al pulsar una miniatura cambia la foto (3 / 5). La pantalla completa se abre con el botón ⤢, **no al pulsar la foto** como dice el plan; dentro, ← → y Esc funcionan. |
| 4.2 | ✅ | Logo del fabricante, «Nuevo», título y «Modelo JK-A2C-C · Ref. FJK-A2C-C». |
| 4.3 | ✅ | Precio, − / +, «Añadir a la solicitud», WhatsApp con el producto escrito, «Llamar» (tel:924553713) y las dos frases de confianza. |
| 4.4 | ✅ | Jack JK-A2C-C: «Completa 726 €» y «Cabezal 514,25 €», cada uno con «Añadir». |
| 4.5 | ✅ | Descripción, Características y Ficha técnica; «Modelos compatibles 3» en un accesorio y «Accesorios 1» en una máquina. Ningún producto tiene PDF. |
| 4.6 | ✅ | «Más en Electrónicas» con 4 productos (Ajustes: 4) y compartir. |
| 4.7 | | Ningún producto de segunda mano: ver «Pruebas con datos (🧪)». |
| 4.8 | | Ningún producto «No disponible»: ver «Pruebas con datos (🧪)». |
| 5.1 | ✅ | Dos fichas y el «+» de una tarjeta: la píldora pasa a 1, 2 y 3; aviso «Añadido a tu solicitud». |
| 5.2 | ✅ | Pasos, productos con − / +, «Quitar» con «Deshacer», «Añadir una nota», «Accesorios para tus máquinas» (la mesa de la Skyline), formulario en dos columnas y resumen a la derecha (8.192,90 €). |
| 5.3 | ✅ | Al abrir otra pestaña sigue la solicitud (se guarda en el navegador). |
| 5.4 | ✅ | Al pulsar la casilla se abre la ventana; «He leído y acepto» está desactivado hasta leer las dos pestañas y luego marca la casilla. |
| 5.5 | ✅ | Vacíos: «Escribe tu nombre / teléfono / correo»; mal escritos: «…9 cifras como mínimo», «Escribe un correo válido…». No se envía. |
| 5.6–5.10 🧪 | ⏭️ | En local no hay funciones (`npm run web` no las arranca) ni hoja de Google: ALTCHA dice «Falló la verificación» (404 en `/api/desafio`, esperado en local). Además, Claude no resuelve verificaciones «No soy un robot». El límite de 2 enlaces sí lo comprueban las pruebas automáticas (`lib/solicitud.test.mjs`). **Pendiente de Víctor en dev-victor.** |
| 5.11 | ✅ | «Tu solicitud está vacía», ayuda, «¿Prefieres hablar con nosotros?» y los tipos del catálogo. |
| 6.1 | ✅ | Con «janome»: 4 productos con precio y «Ver los 34 resultados». No hay categorías ni entradas con esa palabra. |
| 6.2 | ✅ | /buscar/?q=janome: 34 productos con filtros. |
| 6.3 | ✅ | Encuentra por modelo («B790») y por referencia («FJK-A2C-C», «0A7976A»). |
| 6.4 | ❌ | Con una palabra rara («zzqqww») sale bien la página sin resultados. Pero **el buscador encuentra cosas que no tienen que ver**: «xyzzyqwerty» da 13 máquinas Jack programables y «paraguas» da 272 resultados (265 productos). Parece que busca por partes de la palabra («xy», «para»): revisar `buscar.js` / opciones de Pagefind. |
| 7.1 | ✅ | Recuadro con tijeras, entrada destacada y tarjetas con fecha, tema y minutos. No salen botones de temas porque solo hay uno («Pruebas»). |
| 7.2 | ⚠️ | Migas Blog › Pruebas, píldoras, entradilla, compartir arriba y abajo, foto con pespunte (entrada dos) y recuadro final con WhatsApp. Matices: el bloque final se titula «Más del blog» aunque hay otra entrada del mismo tema (el plan espera «Más sobre Pruebas»), y el botón «Ver prensatelas» lleva a /catalogo/ (la categoría de prensatelas no tiene productos y está oculta). |
| 7.3 | ✅ | /blog/tema/pruebas/ con solo esas entradas. |
| 7.4 | ✅ | /blog/feed.xml se abre (RSS 2.0). |
| 7.5 | ⏭️ | Es de producción: no se ha probado. |
| 8.1 | ✅ | «Cerrado · abre mañana a las 10:00» correcto (20:12 del miércoles; cierra a las 20:00), tarjetas y horario con «Hoy» resaltado. Sale el aviso «Datos de ejemplo». |
| 8.2 | ✅ | Sin mapa al cargar; al pulsar «Ver el mapa» se carga el de Google. |
| 8.3 | ✅ | Todo lo indicado; las 27 imágenes se ven. Sale el aviso «Textos de ejemplo». |
| 8.4 | ❌ | Se abren las cuatro desde el pie, pero quedan huecos (datos de la tienda pendientes, ya conocido): Aviso legal «[NIF]», «[fecha]»; Privacidad «[6 meses]», «[fecha]»; Cookies «[fecha]»; Condiciones «[2 días laborables]», «[nombre, fabricante y modelo del producto]», «[fecha]». |
| 8.5 | ✅ | /no-existe/ da 404 con el buscador y los enlaces. |
| 9.1 | ✅ | WhatsApp, Facebook, Telegram y X con la dirección de la página; «Copiar enlace» copia la dirección. (En local las direcciones son las de producción, como debe ser.) |
| 9.2 | ⏭️ | No se puede probar WhatsApp Web. Las etiquetas `og:` están bien (foto, título, descripción), salvo el título repetido de 1.8. |
| 9.3 | ✅ | El correo y los teléfonos no están en el código de Contacto; en la página se ven y los enlaces funcionan. |
| 9.4 | ✅ | robots.txt: «Entorno de pruebas (local): no indexar nada». |
| 9.5 | ⏭️ | Es de producción. |
| 10.1 | ✅ | Lighthouse escritorio, portada y ficha: rendimiento 99, accesibilidad 100, buenas prácticas 100, SEO 66 (por el «noindex» de pruebas, normal). |
| 10.2 | ✅ | El primer Tab muestra «Saltar al contenido»; el foco se ve (contorno de 2 px); los menús se abren con Intro y se cierran con Esc. |
| 10.3 | ✅ | Sin errores en la consola, salvo los 404 esperados en local (ALTCHA y la página /no-existe/). |

## Web · móvil (WEB-MOVIL.md)

Emulación de un Pixel 7 (Chrome Android, 412×915, táctil). Un móvil de verdad (Safari en iPhone, teclado, datos
móviles, compartir del sistema) no se puede emular del todo: lo que depende de eso queda ⏭️.

| # | Resultado | Notas |
|---|---|---|
| 1.1 | ✅ | Sin desplazamiento horizontal en 13 páginas (portada, catálogo, tipo, dos fichas, solicitud, buscador, blog, entrada, Contacto, Sobre nosotros y dos legales). Logo y botón del menú visibles. |
| 1.2 | ⚠️ | El catálogo arriba en la caja con pespunte y debajo Sobre nosotros, Contacto y horario, Blog y Buscar. «Mi solicitud» no está dentro del menú: está fuera, como icono junto al botón del menú (siempre a la vista). Si eso es lo buscado, corregir el plan. |
| 1.3 | ✅ | Al pulsar «Máquinas domésticas» entra en su nivel con las categorías y su número; «← Catálogo» vuelve; «Ver los 177 productos» lleva a su página. |
| 1.4 | ✅ | Desde «Accesorios especiales para costura» el menú se abre ya en ese nivel. |
| 1.5 | ✅ | «Contacto y horario» lleva a la página y el menú queda cerrado. |
| 1.6 | ✅ | La franja (aquí la de «Entorno de pruebas») se parte en dos líneas y el enlace se puede pulsar. |
| 1.7 | ✅ | Columnas una debajo de otra; enlaces tel:, wa.me y mailto: en el pie. |
| 1.8 | ✅ | Solo «← Electrónicas», que lleva a /catalogo/maquinas-domesticas/electronicas/. |
| 2.1 | ✅ | Textos y ventajas, «Explora el catálogo», último artículo y después los bloques. |
| 2.2 | ✅ | 2 tarjetas por fila; precio y «+» sin partirse; descripción de las tarjetas de categoría en 3 líneas. |
| 2.3 | ✅ | La barra cabe; «Precio» con «Desde / Hasta» y rangos rápidos (Hasta 450 €, 450–700 €…); el panel de fabricantes se abre y se cierra. |
| 2.4 | ✅ | Los círculos caben; al pasar a la página 2 la primera fila queda a la vista (en el móvil el menú no tapa). |
| 2.5 | ✅ | El «+» añade sin salir del listado (la solicitud pasa a 1). |
| 3.1 | ⚠️ | Puntos debajo (5), contador, el carril se desplaza (2 / 5) y ⤢ abre la pantalla completa, que se cierra bien. El gesto real de deslizar con el dedo no se puede simular con fiabilidad: confirmarlo en un móvil. |
| 3.2 | ✅ | La barra fija («Precio orientativo 6.897 € · Añadir a la solicitud») aparece al bajar y desaparece al volver arriba. |
| 3.3 | ✅ | wa.me/34609157208 con «Hola, quería preguntar por: Bernina B790 (enlace)». |
| 3.4 | ✅ | tel:924553713. |
| 3.5 | ✅ | Las pestañas se desplazan de lado (no caben las cuatro) y la ficha técnica no se sale. |
| 3.6 | ⏭️ | «Más opciones para compartir» solo sale si el navegador tiene el menú de compartir del sistema; el navegador de pruebas no lo tiene. Probar en un móvil. |
| 4.1 | ✅ | Barra fija abajo con «Total orientativo · 1 producto 6.897 € · Continuar»; todo a lo ancho. |
| 4.2 | ⚠️ | Teléfono `type=tel` (teclado numérico), correo `type=email` y autocompletado (name, tel, email): bien. Que el teclado no tape el campo solo se ve en un móvil. |
| 4.3 | ✅ | La ventana cabe en la pantalla, se cambia de pestaña, se cierra y luego se marca la casilla. |
| 4.4 | ⏭️ | ALTCHA no funciona en local (sin funciones) y Claude no resuelve «No soy un robot». |
| 4.5–4.6 🧪 | ⏭️ | Envío y correos: no en local. Pendiente en dev-victor. |
| 5.1 | ✅ | «Buscar» del menú lleva a /buscar/ con el cursor ya en la caja; los filtros caben. |
| 5.2 | ✅ | Tarjetas del blog una debajo de otra; foto y recuadro final caben; botones de 38 px de alto. |
| 5.3 | ✅ | «Cerrado» correcto; tarjetas Llamar / WhatsApp / Correo / Dirección grandes (más de 170 px); el mapa se carga al pulsar y ocupa el ancho. Moverlo con el dedo: comprobar en un móvil. |
| 5.4 | ⚠️ | «Cómo llegar» enlaza a maps.app.goo.gl (en el móvil abre la aplicación de mapas; no se puede comprobar aquí). |
| 5.5 | ✅ | Logos de las marcas 4 por fila; ninguna foto rota. |
| 5.6 | ✅ | Las páginas legales no se salen de la pantalla. |
| 6.1 | ✅ | En horizontal (915×412) portada, ficha y solicitud caben sin desplazamiento lateral. |
| 6.2 | ⏭️ | Datos móviles: no se puede. (Las fotos llevan carga diferida y Lighthouse móvil da rendimiento 95–100.) |
| 6.3 | ✅ | El manifiesto tiene el icono de 192 y 512 px y «Nombre corto» = «Coser Zafra» (el de Ajustes). Añadirlo de verdad a la pantalla de inicio: en un móvil. |
| 6.4 | ✅ | `theme-color` = #1f2933, el de Ajustes («color_barra_movil»). |
| 6.5 | ✅ | Lighthouse móvil: portada 95 / 100 / 100, ficha 100 / 100 / 100 (rendimiento / accesibilidad / buenas prácticas); SEO 66 por el «noindex». |
| 6.6 | ❌ | Con la letra al 150 % no hay desplazamiento lateral, pero **en la cabecera el nombre «Máquinas de Coser Zafra» se monta encima del icono de la solicitud y del botón del menú** (captura `m-letra.png`). Habría que dejar que el nombre se parta o reducirlo cuando no quepa. |

## Panel · ordenador (PANEL-ORDENADOR.md)

Copia local del panel (decap-server, `local_fs`, modo de publicación simple: no hay flujo editorial). Navegador Chromium a 1440×900.

| Caso | Resultado | Notas |
|---|---|---|
| 1.1 | ⏭️ | Login con GitHub: solo en un entorno desplegado (dev-victor no se toca). |
| 1.2 | ✅ | Cabecera con logo, Contenido, Medios, buscador, Acceso rápido, engranaje y avatar. «Flujo editorial» no existe en local (modo simple). |
| 1.3 | ❌ | Los grupos de «Acceso rápido» están bien, pero **«Añadir → Entradas del blog» lleva al listado (#/collections/blog) y no a «nueva»**; las demás entradas sí abren el alta. El botón «Nueva entrada del blog» del listado funciona. |
| 1.4–1.5 | ⏭️ | Permisos y cierre de sesión de GitHub: solo en un entorno desplegado. |
| 1.6 | ✅ | El engranaje se ve en local y abre Ajustes. |
| 1.7 | ✅ | El logo vuelve al inicio del panel. |
| 2.1 | ✅ | Menú con número de elementos y separador. |
| 2.2 | ✅ | Las secciones de una sola ficha la abren directamente. |
| 2.3 | ✅ | «←» vuelve al inicio. |
| 2.4 | ✅ | La sección activa sale con fondo rosado y texto rojo. |
| 3.1 | ✅ | Grupos en el orden del menú, con su número y ⚠. |
| 3.2 | ✅ | Columnas como dice el plan; la vista tabla añade «Clasificación». Detalle: el desplegable del filtro «Avisos» sale cortado. |
| 3.3 | ✅ | Orden ▲▼; los vacíos al final. |
| 3.4 | ✅ | Filtros: janome → 2, Bernina → 13, precio > 2000 → 17, Avisos → 2. |
| 3.5 | ✅ | 24 / 48 por página; al filtrar vuelve a la página 1. |
| 3.6 | ✅ | La búsqueda mira en todos los grupos (A2C, Bernina). |
| 3.7 | ✅ | |
| 3.8 | ✅ | Fabricantes se despliegan y el lápiz abre el fabricante. |
| 3.9 | ✅ | Tipos, Categorías (por tipo, «N categorías · M productos») y Subcategorías, con sus columnas en la vista tabla. |
| 3.10 | ✅ | «Atrás» y «←» conservan grupo, página, orden, filtro y posición. |
| 3.11 | ⏭️ | Necesita GitHub. |
| 3.12 | ✅ | Jack desplegado en la página 2 → abrir un producto → «Atrás» lo conserva. |
| 3.13 | ✅ | Al cambiar de sección se reinicia. |
| 4.1 | ✅ | |
| 4.2 | ✅ | Globo «Misma referencia…»; se cierra con Esc. |
| 4.3 | ✅ | |
| 4.4–4.7 🧪 | ver más abajo | Se prueban con productos «Prueba» en la copia. |
| 4.8 | ✅ | El contador parpadea (1,6 s); con «reducir movimiento», no. |
| 4.9 | ✅ | «Solo con avisos» deja solo esas filas, también desplegadas; total 42. |
| 5.1 | ⚠️ | «426 resultados en 4 secciones», igual sin tilde, palabra resaltada. **Las píldoras y los títulos repiten el número**: «Tipos de producto (6) (5)». |
| 5.2 | ✅ | |
| 5.3 | ✅ | |
| 5.4 | ✅ | Con fechas; abre la entrada en la carpeta del año. |
| 5.5 | ✅ | «Ningún resultado». |
| 5.6 | ✅ | |
| 6.1 | ✅ | Pestañas con su número: General 7, Catálogo 0, Productos 1248, Fichas PDF 0, Fabricantes 25. |
| 6.2 | ⚠️ | `logo.png` sale «Sin usar» (se usa `logo.svg`: correcto, pero se podría borrar); los iconos no aparecen en General. |
| 6.3 | ✅ | Productos pide elegir antes (fabricante / buscar / ver todos); «Sin usar» 0. |
| 6.3b | ⏭️ | Necesita GitHub. |
| 6.4 | ✅ | «Lo usa: Bernina 1008» abre la ficha y cierra Medios. |
| 6.5 | ✅ | «bernina b790» → 5. |
| 6.7 | ✅ | Una foto de 3000 px se guarda a 1600×1067. |
| 6.8 | ✅ | Si el nombre existe, pregunta si sustituir. |
| 6.9 | ✅ | «No se eliminará 1 porque la usa… 6.jpg → Comel»; borra solo la que no se usa (en la copia). |
| 6.11 | ✅ | La barra de botones queda fija. |
| 6.6 | ✅ | Dos logos elegidos → «Descargar» → `fabricantes.zip` con los dos. |
| 6.10 | ✅ | «Elige una imagen diferente» dentro de una ficha abre la ventana normal de Decap, sin pestañas. Detalle: textos de Decap sin traducir («Replace with URL», «Copy», «Add fotos», «Insert from URL», «Toggle preview»). |
| 7.1 | ✅ | Engranaje: Exportar a Excel…, Importar Excel…, Quitar / Marcar «Solo para pruebas»…, (productos) Marcar como no disponible / disponible…, Eliminar… en rojo; todos con icono. |
| 7.2 | ✅ | Fabricantes: «Solo Excel» o «Excel + imágenes (ZIP)». Excel con hojas Instrucciones, Fabricantes, Listas, Notas y Control (23 fabricantes); ZIP con el Excel y las 24 imágenes en `imagenes/`. En local se descarga (la ventana «Guardar como» del navegador no se puede probar de forma automática). |
| 7.3 | ✅ | Productos: «360 productos y 117 accesorios»; Bernina → 18; tipos solo los que tienen Bernina (Máquinas domésticas 18); categorías de ese tipo con su número; subcategorías «—» si no hay; Electrónicas → 13. Subcategorías: tipo → solo sus categorías (Accesorios › …). |
| 7.4 | ✅ | Importar el mismo Excel de fabricantes: «Sin cambios 23 · No hay nada que guardar». |
| 7.5 🧪 | ⚠️ | Informe correcto (Nuevos 1, Modificados 1 «999 → 1009», Se borran 1 con casilla «Entiendo que se borrará 1 ficha») y un único cambio. **Pero en local las fotos de la ficha borrada no se borran** aunque el informe diga «se borra bernina-b330-1.jpg…»: en `importar()` (panel.js) `leerMedios` solo mira en local los nombres que trae el Excel, así que `existe()` descarta las fotos de las filas «Borrar». Con GitHub se lista la carpeta entera y no debería pasar. «Eliminar…» (7.8) sí las borra. |
| 7.6 🧪 | ✅ | Ficha cambiada después de exportar → «“Bernina B215” se cambió en el panel después de exportar el Excel: no se toca. Exporta de nuevo…»; el resto sí se importa. |
| 7.7 🧪 | ✅ | Productos → no disponible: filtros, lista con los 18 de Bernina marcados, se desmarca uno → «Modificados 17 · Disponible → No disponible» → un cambio. «Marcar como disponible» los devuelve (el que no se tocó sale desactivado, «ya está disponible») y los ficheros quedan exactamente como estaban. Fabricantes → «Solo para pruebas» a Trevil: `prueba: false → true`. |
| 7.8 🧪 | ✅ | Eliminar «comel-pratika»: pide escribir «1» (sin él: «Escribe 1 para confirmar»); borra la ficha y su foto y la quita de «Compatible con» del «Carro con ruedas para caldera Pratika». |
| 7.9 | ✅ | Páginas → Word: `paginas-word-…zip` con 4 .docx; datos de la tienda puestos; lo que falta, entre corchetes y resaltado ([NIF], [fecha], [6 meses], [2 días laborables]). |
| 8.1 | ✅ | Campo con foco: etiqueta roja, borde `#c1121f`, letra Nunito Sans. |
| 8.2 | ✅ | Vista previa de Producto, Páginas (con los marcadores rellenos), Contacto, Sobre nosotros y Solicitud con el aspecto de la web. ⚠️ Al pasar de «Sobre nosotros» a otra ficha sin recargar sale en la consola `TypeError … widgetFor` (vista-previa.js:388, `p.widgetFor('texto')`); no se ve nada roto. |
| 8.3 🧪 | ⏭️ | Flujo editorial: no existe en local (modo simple). |
| 8.4 | ✅ | «Nueva entrada del blog», «Nueva página», «Nuevo tipo de producto», «Nueva categoría», «Nueva subcategoría», «Nuevo producto», «Nuevo fabricante». |
| 8.5 | ✅ | Tres desplegables en el orden del menú; el tercero «— No tiene —» si la categoría no tiene subcategorías. |
| 8.6 | ✅ | Entrada del blog: píldoras (tema, fecha, minutos), entradilla, compartir, texto. |
| 8.7 | ✅ | Tipo, categoría y subcategoría con su texto y número. Detalle: en una subcategoría sin productos dice «Todavía no se ha publicado» aunque sí existe (se oculta por no tener productos). |
| 8.8 | ✅ | Fabricante: logo en la tarjeta, en la ficha, en el filtro y en Sobre nosotros. |
| 8.9 | ✅ | Solicitud: debajo, correo al cliente y a la tienda con su asunto y «Versión de solo texto». |
| 8b.1 | ✅ | Pestañas Web / Panel / General con su explicación; secciones plegadas con «N opciones»; campos enmarcados; «Publicar» guarda. ⚠️ El primer guardado reordena todo `sitio.yml` (Decap lo escribe en el orden de los campos): diff grande la primera vez. Detalle: «Enlace (opcional) (opcional)» en la franja. |
| 8b.1b | ✅ | «Datos de la tienda» → enlace a «Contacto y horario»; «Solicitud de presupuesto» → enlace a su ficha. |
| 8b.8 | ✅ | 255 ⓘ con todas las secciones abiertas; el globo explica «Para qué sirve / Cuándo se nota / Dónde se ve»; ningún «Ayuda: el campo … no tiene texto» en la consola. |
| 8b.2 🧪 | ✅ | Franja marcada desde el panel (texto y «Hasta» = 19/11/2026) → tras reconstruir sale arriba en la portada y en /catalogo/. Que desaparezca pasado «Hasta»: solo con la reconstrucción diaria. |
| 8b.3 🧪 | ✅ | Texto de precios «Precios orientativos (prueba), IVA incluido» en el pie y bajo las listas; «Más en…» = 2 → «Más en Electrónicas» con 2; «Novedad» = 30 días → etiqueta verde (#1e7a3a) en tarjetas y ficha. |
| 8b.4 🧪 | ⏭️ | Icono de la pestaña: necesita desplegar y mirarlo en un navegador y un móvil reales. |
| 8b.5 🧪 | ✅ | Productos por página 24 y vista «Tabla» guardadas desde el panel; tras reconstruir, las listas empiezan en tabla con 24. |
| 8b.6, 8b.7, 9.2 🧪 | ⏭️ | No hechas: cambian el aspecto o la hora de todo el entorno; mejor en dev-victor con calma. |
| 9.1 | ✅ | Rojo de la marca en botones y elementos activos, fondo crema, pespuntes, insignias gris claro (listas, engranaje, informes, Medios). |

### Pruebas 🧪 hechas en la copia (productos «Prueba …» creados solo para esto)

| Caso | Resultado | Notas |
|---|---|---|
| Web 1.7 | ✅ | Franja arriba en todas las páginas (ver 8b.2). |
| Web 3.8 | ✅ | «Prueba oferta»: 799 € y 999 € tachado, «−20 %», etiqueta «Oferta −20 %» en la foto, «Oferta hasta el 25 de noviembre · quedan 7 días». |
| Web 3.9 | ✅ | /ofertas/: «Máquinas domésticas (1 oferta)»; dentro, solo esa oferta y «Ver Máquinas domésticas en el catálogo». El menú dice «Ofertas 1». |
| Web 3.10 | ✅ | Etiqueta «Novedad» verde en tarjeta y ficha con «Novedad» = 30 días. Que desaparezca pasados los días: no comprobable hoy. |
| Web 4.7 | ✅ | Ficha técnica: «Condición: Segunda mano · Muy buen estado, revisada en taller · garantía de 12 meses» y píldora «Segunda mano». |
| Web 4.8 | ✅ | /productos/prueba-no-disponible/ → 404; no está en el sitemap. |
| Panel 4.4 | ✅ | Oferta con «hasta» = ayer: «La oferta terminó el 17/11/2026 y sigue marcado «En oferta» (en la web ya sale con su precio normal).» con «Entendido». |
| Panel 4.5 | ✅ | Tras «Entendido» y recargar, ya no sale; en otro navegador (otra sesión) sí. |
| Panel 4.6 | ✅ | Al cambiar «hasta» a otro día pasado vuelve a salir (y al volver a la fecha ya vista, no). |
| Panel 4.7 | ✅ | «En oferta» sin fechas → «le falta el precio de oferta o las fechas»; «Compatible con» de un producto que no existe → «tiene productos que no existen: …»; datos de segunda mano con «Nuevo» → «Tiene datos de segunda mano pero su condición es «Nuevo»». |
| Build | ⚠️ | 0 enlaces rotos. Nota curiosa: «Imagen publicada con nombre descriptivo: /img/sobre-nosotros-tienda-1.jpg → /img/entrada-de-prueba-dos-con-imagen-no-se-publica.jpg»: una foto de Sobre nosotros, al usarla también una entrada de prueba del blog, se publica con el nombre de la entrada. |

## Panel · móvil (PANEL-MOVIL.md)

Emulación de Pixel 7 (412×839, táctil) en la copia local.

| Caso | Resultado | Notas |
|---|---|---|
| 1.1 | ⏭️ | Necesita GitHub. |
| 1.2 | ✅ | Tres rayas, logo, lupa, «+», engranaje y avatar en una línea; nada se sale. |
| 1.3 | ✅ | Contenido / Medios y «Colecciones» con números; al elegir una sección se cierra (no hay flujo editorial en local). |
| 1.4 | ✅ | Buscador a lo ancho (396 px); Intro busca: «26 resultados en 2 secciones», píldoras y botón ⚠. Se repite aquí «Productos (480) (25)». |
| 1.5 | ❌ | **El menú «+» se sale por la derecha de la pantalla**: se corta («Entradas del blog (3», «Solicitud de presupu…») y la página pasa a medir 508 px de ancho (captura `m-p-mas.png`). |
| 1.6 | ✅ | Abre «Ajustes del sitio». |
| 2.1 | ✅ | Cabecera de la sección a lo ancho; grupos con ⚠ y número. |
| 2.2 | ✅ | Tarjetas con foto, nombre y «Fabricante: …», «Precio: …». |
| 2.3 | ✅ | «Ordenar…» y «Filtros» (dos columnas); filtran. |
| 2.4 | ✅ | «Con avisos (46)». |
| 2.5 | ⚠️ | Con toque emulado el globo del ⚠ (y el de las ⓘ, 5.2) no se queda abierto: se abre al «pasar» y el globo cae encima del propio botón, así que el toque llega al globo y se cierra a los 250 ms. Con clic sí funciona. Confirmar en un móvil real; si pasa también, colocar el globo debajo del botón en pantallas estrechas. |
| 2.6 | ✅ | Bernina se despliega con sus productos; lápiz a la derecha. |
| 2.7 | ✅ | «Mostrando 1–24 de 74» y círculos caben (9–403 px). |
| 2.8 | ✅ | Ver 1.4. |
| 3.1 | ✅ | «←» y el nombre arriba; campos a lo ancho; «Publicado» y «Eliminar entrada» fijos abajo. |
| 3.2 | ⚠️ | La vista previa sale debajo de los campos. Los botones ojo y flechas quedan encima del borde derecho de los campos (p. ej. «Referencia»): tapan un poco si el texto es largo. |
| 3.3 | ⏭️ | No se ha podido pulsar el ojo de forma automática en el móvil (en el ordenador funciona). |
| 3.4 | ✅ | Tres desplegables nativos y Fabricante. Elegir con el dedo: móvil real. |
| 3.5, 3.6 | ⏭️ | Subir desde galería / cámara y escribir con el teclado del móvil: en un móvil real. |
| 3.7 🧪 | ⏭️ | Despliegue: en dev-victor. |
| 3.8 | ✅ | «←» vuelve a la lista. |
| 4.1 | ❌ | Medios a pantalla completa, pestañas en dos líneas, pero **la ✕ queda casi fuera** (botón de 404 a 444 px en una pantalla de 412): solo se ve un trocito. Detalle: si se navega a otra ficha con Medios abierto, la ventana sigue abierta. |
| 4.2 | ✅ | Productos → «Hay 1248 archivos…», elegir fabricante; fotos en dos columnas. |
| 4.3 🧪 | ⏭️ | Subir desde el móvil: real. |
| 4.4 | ✅ | Ventana de filtros cabe (412 px) y se descarga el Excel. |
| 4.5 | ⏭️ | Elegir un fichero desde el móvil: real. |
| 5.1 | ✅ | Pestañas y secciones caben; campos a lo ancho. |
| 5.2 | ⚠️ | Ver 2.5 (con clic sale y no enfoca el campo). |
| 5.3 | ⏭️ | No hecha en el móvil (en el ordenador, ✅ 8.9). |
| 6.1 | ⏭️ | No hecha. |
| 6.2 | ✅ | Letra y colores de la web, pespuntes, insignias, botones rojos. |
| 6.3 | ⏭️ | Sesión de GitHub: en dev-victor. |
