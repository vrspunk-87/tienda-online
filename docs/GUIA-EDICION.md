# Guía para editar la web

El panel está en **/admin/** de la web. Se entra con la cuenta de GitHub (hace falta una
invitación al repositorio). Los cambios se ven en la web 1-2 minutos después de publicarlos.

> Guía inicial (fase 1a). Se completará con el catálogo (fases 2 y 3) y las solicitudes de
> presupuesto (fase 5).

## Secciones del panel

- **Catálogo: tipos de producto, categorías y subcategorías**: son los tres niveles del catálogo,
  cada uno en su sección del panel (p. ej. Bordadoras › Industriales › 1 Cabezal). Una categoría
  elige su «Tipo de producto» y una subcategoría su «Categoría» (primero su tipo y luego la
  categoría). Los desplegables del panel salen en el orden de Ajustes y se actualizan solos: lo
  que acabas de publicar aparece al abrir otra ficha o al volver a la pestaña (con el flujo de
  borradores, una categoría nueva aparece cuando está publicada). El orden se decide en **Ajustes del sitio →
  «Orden del catálogo en el menú»**: arrastra los tipos de producto, dentro de cada uno sus
  categorías y dentro de cada categoría sus subcategorías. Al crear uno nuevo, añádelo
  allí en su sitio (si no, sale al final de su nivel). Cada una tiene su página con su texto. El nombre del fichero (y la dirección) se crea con el primer nombre y no
  cambia si luego lo renombras: si cambia mucho, mejor crear una nueva y pasar a ella
  los productos.
- **Catálogo: productos**: rellena fabricante, **modelo** (obligatorio), referencia (si la hay),
  su sitio en el catálogo con tres desplegables: tipo de producto (obligatorio) y, si quieres,
  categoría y subcategoría (cada uno solo ofrece lo que cuelga del anterior; el producto sale en
  la página de lo que elijas y en las de arriba), precio, estado y de 1 a 5 fotos (la primera es la de las
  tarjetas; cada foto, de 8 MB como mucho: la web las publica a 1600 px como máximo, así que con
  fotos de móvil normales basta). Para poner una oferta: estado «En oferta» y, en «Oferta», el precio y las fechas. Al terminar la
  oferta no hace falta tocar nada: la web vuelve sola al precio normal (para la siguiente oferta,
  basta con cambiar el precio y las fechas).
  **Máquinas industriales: dos precios.** Al elegir el tipo «Máquinas Industriales», el precio pasa
  a llamarse «Precio Completa» y aparece «Precio Cabezal» (lo mismo en la oferta: «Precio de oferta
  Completa» y «Precio de oferta Cabezal»; se puede rebajar uno o los dos). Si el cabezal se deja
  vacío, la máquina se vende solo completa, como cualquier otro producto. En la web las tarjetas
  muestran la completa y debajo «Cabezal: …»; la ficha, los dos precios, cada uno con su botón
  «Añadir», y en la solicitud de presupuesto van como dos líneas («Completa» y «Cabezal»).
  Cuando se venda o se retire, estado «No disponible». Si es un accesorio, elige en «Compatible
  con» las máquinas para las que sirve (escribe el nombre, el modelo, la referencia, el fabricante
  o la categoría para encontrarlas). En «Características», si dejas vacía la característica, el
  valor sale en una fila entera (p. ej. «Incluye maleta de transporte»).
- **Catálogo: fabricantes**: nombre e imagen (logotipo). No tienen página.
- **Solicitud de presupuesto**: activar o desactivar que los clientes preparen y envíen solicitudes
  desde la web, y sus textos. Desactivada, en las fichas sale «Pedir información» (a Contacto).
  También: las frases bajo el resumen (pon solo lo que la tienda pueda cumplir, p. ej. el plazo de
  respuesta), si se pregunta cómo prefiere el cliente que le contestéis (llamada, WhatsApp, correo),
  si se sugieren accesorios compatibles y si se puede añadir una nota a cada producto.
- **Tipos y categorías sin productos** (Ajustes del sitio): «Ocultarlos de toda la web» quita de
  menús, inicio, pie, tarjetas y ofertas los tipos, categorías y subcategorías que aún no tienen
  productos; vuelven a salir solos en cuanto les asignas uno.
- **Contacto y Sobre nosotros**: dirección, teléfono, WhatsApp, correo, horario por días (con él
  se calcula «Abierto ahora»), aviso de cierre con fechas y «Cómo llegar»; y la presentación de la
  tienda (texto, foto, año de apertura, cifras, servicios, razones, historia y marcas). Los textos
  de ejemplo llevan un aviso en la página: desmarca «Textos de ejemplo» cuando estén revisados.
- **Ficha de cada producto**: «Descripción» es el texto largo; «Características (puntos clave)»,
  frases cortas con lo más importante; «Ficha técnica», la tabla de datos técnicos (y, si quieres,
  el PDF del fabricante). En un accesorio, «Compatible con» crea la pestaña «Modelos compatibles» y
  en esas máquinas sale en «Accesorios». Los botones «Preguntar por WhatsApp» y «Llamar» salen si
  rellenas el WhatsApp y el teléfono en Ajustes del sitio → Redes sociales y contacto.

### Encontrar productos en el panel

- **Filtrar** (botón «Filter by» encima de la lista de productos): por fabricante, por categoría
  (una categoría principal incluye sus subcategorías), «En oferta», «No disponibles» y «Segunda
  mano». Se pueden marcar varios a la vez: salen los productos que cumplen **todos** (p. ej. un
  fabricante y una categoría). Un fabricante o una categoría nuevos aparecen en los filtros
  1-2 minutos después de publicarlos.
- **Agrupar** («Group by»): por fabricante, categoría o estado.
- **Ordenar** («Ordenar por»): por fecha de alta, nombre o modelo.
- **Buscar** (cuadro «Buscar todas», arriba a la izquierda): por **modelo**, referencia, fabricante
  o nombre, p. ej. «HD 100» o «MP1-HD100». La búsqueda es aproximada: lo que coincide sale primero,
  y pueden aparecer debajo otros parecidos.

(«Filter by» y «Group by» salen en inglés: la traducción al español del panel no los incluye.)

- **Blog**: entradas con título, fecha, tema, resumen, imagen y texto. Se publican en `/blog/`: la
  más reciente sale en grande arriba y debajo las demás, con botones por tema (cada tema tiene su
  página) y una caja para buscar. El «Resumen» sale bajo el título de la entrada. Al final de cada
  entrada hay un recuadro que lleva al catálogo y a WhatsApp; en «Recuadro final» puedes elegir la
  categoría a la que lleva (p. ej. Prensatelas en una entrada sobre prensatelas), el texto y el del
  botón, u ocultarlo. Título, descripción, texto del recuadro de /blog/ y si se destaca la última
  entrada: Ajustes del sitio → Página Blog.
- **Páginas**: páginas sueltas (quiénes somos, contacto, textos legales…). Para que salgan en el
  menú o en el pie, añádelas en **Ajustes del sitio**.
- **Ajustes del sitio**: nombre, logo, **portada** (en «Ajustes generales, apariencia y menú» →
  «Portada»: antetítulo, titular, texto, las **ventajas** con su icono y si se muestra el **último
  artículo del blog**; a la derecha salen solos los tipos de producto, «Explora el catálogo», en el
  orden del menú y con su número de productos), colores, menú (en «Menú superior: diseño» →
  «Barra del catálogo» eliges el color de la segunda fila del menú: gris, blanco, color de la
  marca, oscuro o uno personalizado), enlaces legales, redes y
  opciones avanzadas.
- **Bloques de las páginas** (Ajustes del sitio → Ajustes generales): en «Portada», además del
  bloque principal, los bloques Catálogo, Ofertas y Blog; en «Página Catálogo», el listado de
  productos (al azar, con filtros), Ofertas y Blog; en «Página Ofertas», el listado de ofertas y
  Blog; en «Página Blog», las entradas por página. En cada bloque eliges si se muestra y cuántos
  elementos: productos de 12 en 12 (12, 24, 36 o 48; si hay más, salen botones de página) y
  entradas del blog de 3 en 3 (las más recientes, con «Ver todo el blog»). Lo de «Página Catálogo» vale también
  para cada tipo, categoría y subcategoría: allí «Nuestros productos» y «Productos en oferta»
  muestran solo los de esa selección (con lo que cuelga de ella). La página Ofertas se navega
  igual: sus tarjetas llevan a las ofertas de cada tipo, categoría y subcategoría.
- **Texto de las páginas del catálogo y de ofertas**: sale en un recuadro con pespunte; la
  primera frase (hasta los primeros dos puntos o el primer punto) se destaca sola en color. Si
  prefieres destacar otra parte, empieza el texto con ella en negrita.
- **Número de productos en insignias** (Ajustes del sitio, junto a «Secciones sin contenido»): las
  bolitas con el número de productos junto a cada tipo, categoría y subcategoría (barra y
  desplegables del catálogo, menú del móvil, inicio, tarjetas, pie y buscador). Desmárcalo para
  ocultarlas en toda la web.
- **Blog: tema de la entrada**: campo opcional «Tema» (p. ej. «Consejos», «Mantenimiento»); sale
  en una píldora en la tarjeta. Escríbelo siempre igual en las entradas del mismo tema. El tiempo
  de lectura se calcula solo.
- **Números del panel**: en el menú de la izquierda, cada sección del catálogo muestra cuántos
  elementos tiene, y en las listas de tipos, categorías y subcategorías sale cuántos productos
  tiene cada una (contando los de las que cuelgan de ella). Se actualizan con cada despliegue
  (1-2 minutos después de publicar); en local, al volver a lanzar `npm run web`.

## Flujo de publicación

Cada cambio pasa por **Borrador → En revisión → Listo** (pestaña «Flujo editorial»). Al pulsar
«Publicar» llega a la web.

## Consejos

- Títulos en minúsculas normales (no todo en MAYÚSCULAS) y con las palabras que buscaría la gente.
- Rellena siempre la **descripción de las imágenes** (texto alternativo): qué se ve en ella.
- Para probar algo sin que salga en la web pública, marca **«Solo para pruebas»**.
- Las páginas legales son **borradores pendientes de revisión**: no las des por buenas sin la
  revisión legal (ver `docs/BORRADORES-LEGALES.md`).
