# Carga y cambios en bloque desde el panel

Guía para quien edita la tienda. Plan y decisiones: [PLAN.md](PLAN.md), fase 3.

En la lista de cada sección preparada del panel hay un **engranaje** a la izquierda de «Nuevo …».
Al pulsarlo:

| Grupo | Opción | Para qué |
|---|---|---|
| Excel | **Exportar a Excel…** | Descargar todas las fichas en un Excel (o un ZIP con el Excel y las imágenes) |
| Excel | **Importar Excel…** | Subir el Excel cambiado (y las imágenes nuevas) |
| Cambiar en bloque | **Quitar «Solo para pruebas»…** / **Marcar «Solo para pruebas»…** | Publicar o esconder de la web pública varias fichas a la vez |
| Cambiar en bloque (solo productos) | **Marcar como no disponible…** / **Marcar como disponible…** | Retirar de la web (sin borrar) o volver a mostrar varios productos |
| (aparte, en rojo) | **Eliminar…** | Borrar varias fichas a la vez, sin pasar por un Excel |

**Secciones con engranaje:** Fabricantes, Tipos de producto, Categorías, Subcategorías, Productos,
Entradas del blog y Páginas (18-11-2026); en Páginas, además, «Exportar a Word».

Todo pasa por un **informe** antes de guardar nada, y se guarda **en un único cambio** (commit) de
la rama que edita el panel: en la web pública, `main`; en los entornos de pruebas, la suya. La web
se actualiza en unos minutos. Si algo sale mal, se deshace ese commit en GitHub y vuelve todo,
imágenes incluidas. No pasa por «Flujo editorial»: es como «Publicar ahora».

Al **exportar** (y al descargar un informe), Chrome y Edge preguntan **dónde guardar** el fichero; en
otros navegadores va a la carpeta de descargas (en Firefox, según su ajuste «Preguntar dónde guardar»).

## Las listas del panel

En productos, fabricantes, tipos de producto, categorías y subcategorías, la lista del panel es una tabla
(en vez de la lista de Decap que carga más al bajar):

- **Productos:** plegados por clasificación, en el orden del menú (pulsa una para abrirla), o el icono de tabla con
  todos. Pulsar un producto abre su ficha.
- **Fabricantes y tipos de producto:** al pulsar una fila se despliega debajo la tabla de sus productos; el
  **lápiz** abre la ficha del fabricante o del tipo. **Categorías** (plegadas por tipo) y **subcategorías**
  (plegadas por «Tipo › Categoría»), igual.
- Columna **Pruebas**: «Sí» (solo en los entornos de pruebas) o «No» (se publica).
- En todas: **ordenar** pulsando una cabecera (otra vez, al revés), **filtrar** en la fila de debajo (texto,
  desplegables o números como `>0` o `<500`), buscador arriba y **12, 24 o 48 por página**.
- Al entrar en una sección empieza todo plegado. Al volver de una ficha (con «←» o el botón «Atrás» del
  navegador), la lista queda como estaba: grupos y filas abiertos, página, orden, filtros, búsqueda y la
  posición en la página; si guardaste cambios en la ficha, la lista se pone al día sola. Al cambiar de
  sección se empieza de cero. Las miniaturas salen de la web publicada: una foto recién subida puede
  tardar unos minutos en verse.
- Columna **Avisos** (productos): el icono ⚠ con un número indica algo que revisar en la ficha (sin foto, sin
  precio, oferta sin fechas o ya terminada, referencia repetida…). Pasa el ratón (o púlsalo en el móvil) para
  ver la lista; el filtro «Con avisos» deja solo esos. «La oferta terminó» tiene **Entendido**: deja de salir
  en ese navegador hasta que cambien las fechas de la oferta.
- En los grupos y en la columna «Productos» de fabricantes, tipos, categorías y subcategorías, **⚠ con un
  número que parpadea**: cuántos de esos productos tienen avisos. El botón ⚠ junto a las vistas deja solo
  los productos con avisos (y las filas que los tienen).
- **Buscador** de la cabecera: los resultados salen con estas mismas tablas, agrupados por sección.
- **Medios** (cabecera): pestañas por carpeta (Fabricantes, Catálogo, Productos, Fichas PDF) para ver qué
  archivos usa cada ficha, subir, descargar, reemplazar y eliminar los que no se usan.
- En el **móvil**, las filas son tarjetas: «Ordenar» y «Filtros» están encima de cada tabla.

## El Excel

- **Instrucciones** (la primera hoja): lo esencial de esta guía.
- **La hoja de datos** (p. ej. «Fabricantes»): una fila por ficha y una columna por campo, con los
  mismos nombres que en el panel. Los obligatorios llevan «*».
  - **Identificador**: el nombre interno de la ficha. **No se cambia**: otras fichas lo usan (los
    productos, su fabricante…). Cambiarlo crea una ficha nueva.
  - **Acción**: «Crear/Editar» (ya puesta) o «Borrar».
  - Las columnas en **gris** («… (solo lectura)», p. ej. cuántos productos tiene cada fabricante)
    son informativas: están bloqueadas y se ignoran al importar. Son una foto del momento de exportar.
- **Notas**: qué es cada columna.
- Hay dos hojas ocultas: «Listas» (las opciones de los desplegables) y «Control» (de qué sección es
  el Excel y cómo estaba cada ficha al exportar).

### Reglas

| Quiero… | En el Excel |
|---|---|
| Cambiar un dato | Cambia la celda |
| No tocar un dato | Déjala como está, o **vacía** (una celda vacía no cambia nada) |
| Borrar un dato | Escribe `(vacío)` |
| Dar de alta | Usa una fila vacía del final (o añade filas) con «Identificador» **en blanco** |
| Borrar una ficha | «Acción» = «Borrar». Que una fila **falte** en el Excel no borra nada |
| Poner o cambiar una imagen | Escribe el nombre del fichero (p. ej. `brother.png`) y súbelo junto al Excel o dentro del ZIP. Si la imagen ya está en la web, basta con el nombre |

- Las filas vacías (solo con «Acción») se ignoran: están preparadas para las altas.
- **Qué exportar en categorías y subcategorías:** al pulsar «Descargar…» se puede elegir «Todo» o filtrar:
  categorías, por tipos de producto; subcategorías, por tipos y por categorías de esos tipos. Los mismos
  filtros salen en «Cambiar en bloque» y «Eliminar».
- **Categorías y subcategorías:** la columna «Tipo de producto» o «Categoría» es un desplegable con la
  ruta completa («Bordadoras › Industriales»), porque hay nombres que se repiten en varios tipos. Al dar
  de alta una o cambiarla de sitio, el informe recuerda ponerle su lugar en Ajustes del sitio → «Orden
  del catálogo en el menú» (si no, sale al final, en orden alfabético). Tipos, categorías y
  subcategorías comparten los identificadores: no puede haber dos iguales aunque sean de distinto nivel.
- Una fila con datos pero sin los obligatorios da error.
- Las columnas de trabajo de las tarifas («Observaciones», «Revisar (avisos)», «Modificaciones
  (desde la carga)») se ignoran.
- **Exporta siempre antes de trabajar.** Si alguien cambia una ficha en el panel después de exportar,
  la importación no la toca y lo avisa.

## Productos

- **Qué exportar:** al pulsar «Descargar…» se eligen **fabricantes, tipos, categorías y subcategorías**
  (varios en cada uno; cada lista solo ofrece lo que cuelga de lo elegido y cada opción lleva su número
  de productos). Entre listas, «y»; dentro de una lista, «o»; en cada tipo manda lo más concreto. Con
  «Incluir los accesorios compatibles» van también los accesorios de esas máquinas. Abajo, siempre, cuántos
  productos y accesorios saldrán. Exportar una parte no tiene riesgo: lo que no está en el Excel no se toca.
- **Dos hojas:** «Productos» (con «Accesorios asociados (solo lectura)») y «Accesorios» (los del tipo
  Accesorios o con «Compatible con», con «Productos compatibles (solo lectura)»). La hoja no decide nada
  al importar: manda la categoría.
- **Las columnas son las de las Excel de tarifas** (`input/`): catálogo en tres columnas con
  desplegables dependientes, dos precios (Completa y Cabezal), oferta, segunda mano, «Foto 1» a «Foto 5»
  con su descripción, «Características (puntos clave)» una por línea, «Ficha técnica» un dato por línea
  («Característica: valor») y «Ficha técnica en PDF». Por eso **también se pueden importar esas Excel**:
  sin «Identificador», cada fila se empareja por fabricante y modelo (el informe lo avisa) o se da de alta.
- **«Compatible con»:** identificadores separados por comas (p. ej. `singer-4432, singer-hd9125`); también
  vale «Fabricante Modelo» o el modelo si no hay otro igual, y los productos que se dan de alta en el mismo Excel.
- **Fotos:** se reducen a 1600 píxeles y se recomprimen al subirlas. «(vacío)» en «Foto 2» quita esa foto.
- **Avisos que no impiden guardar:** «En oferta» sin precio o fechas de oferta, precio de cabezal en algo
  que no es máquina industrial, datos de segunda mano en un producto nuevo.
- **Cambiar en bloque y Eliminar:** primero los mismos filtros (más «Solo para pruebas» y «Estado») y después
  la lista con todos los filtrados ya marcados, para desmarcar los que no. Al **quitar «Solo para pruebas»**,
  los que no tienen foto o precio salen desmarcados y con el aviso. Al **borrar** una máquina, se quita del
  «Compatible con» de sus accesorios (el informe dice de cuáles).

## Blog

- El **identificador** de una entrada es su fecha y su título (`2026-11-18-titulo`), como en el panel, y se
  guarda en la carpeta de su año (`public/_posts/blog/2026/`). Cambiar después la fecha o el título no cambia
  el identificador.
- **Fecha de publicación:** sale como la guarda el panel (`2026-11-18T09:00:00.000Z`); para escribir una nueva
  vale `18/11/2026 10:30` (hora de Madrid) o `18/11/2026`.
- **Recuadro final:** una columna por cada dato («Recuadro final: Mostrar», «…: Tipo, categoría o
  subcategoría del catálogo» —desplegable con la ruta—, «…: Texto», «…: Texto del botón»).
- **Entradas de prueba** (18-11-2026): `public/_posts/blog/2026/2026-11-16…18-entrada-de-prueba-*.md`, todas
  «Solo para pruebas» (se ven en los entornos de pruebas, nunca en la web pública). Se pueden borrar con
  «Eliminar…» cuando terminen las pruebas.

## Páginas y Word

- Excel como en las demás secciones. No se borra una página que enlaza la web: las del menú o el pie
  (Ajustes del sitio) y la política de privacidad y las condiciones (las enlaza la solicitud de presupuesto).
- **Exportar a Word…** (engranaje → grupo «Excel y Word»): eliges las páginas y se descarga un `.docx` (o un
  ZIP con uno por página). Llevan el título, la descripción breve y el texto con sus apartados, listas,
  negritas, enlaces y tablas, con los **datos de la tienda puestos** en los textos legales, como en la web
  (los del último despliegue). Lo que falta sale entre corchetes y **resaltado en amarillo** (p. ej. «[NIF]»).
  Al final, una nota con la fecha y la dirección de la página.
- **Solo se exportan** (decidido por Víctor, 18-11-2026): son para la asesoría. No se importan desde Word.

## Importar

1. Engranaje → **Importar Excel…**
2. Arrastra el Excel (y las imágenes nuevas), o un ZIP con todo, o elígelos con el botón.
3. **Revisar cambios**: el informe dice qué es nuevo, qué cambia (campo, antes → después), qué se
   borra (en rojo) y los avisos. Con un solo **error** no se guarda nada: corrígelo en el Excel (el
   informe dice la fila) y vuelve a importarlo. El informe se puede descargar en Excel.
4. Si se borra algo, marca «Entiendo que se borrarán N fichas».
5. **Importar** y, al terminar, **Recargar el panel** para ver la lista al día.

## Borrar

Tanto con el Excel como con **Eliminar…**:

- No se borra lo que usan otras fichas: un **fabricante con productos** sale sin casilla y con el
  motivo. Primero hay que borrar sus productos o cambiarlos de fabricante.
- Con la ficha se borran sus imágenes, salvo las que use otra ficha.
- En **Eliminar…** hay que escribir el número de fichas para confirmar.
- **Tipos, categorías y subcategorías:** no se borra uno que tenga categorías o subcategorías debajo
  (bórralas antes en su sección) ni productos (cámbialos de categoría o bórralos antes). Al borrarlo,
  se quita también de Ajustes del sitio → «Orden del catálogo en el menú».
- Para quitar un producto de la web sin perderlo, es mejor «Estado: no disponible» (cuando llegue
  Productos) o «Marcar "Solo para pruebas"».

### «Eliminar entrada» dentro de una ficha (19-11-2026)

El botón rojo de Decap dentro de una ficha («Eliminar entrada publicada» o, en local, «Eliminar entrada»)
ya no borra directamente en Productos, Fabricantes, Tipos de producto, Categorías, Subcategorías, Blog y
Páginas (`public/admin/excel/eliminar.js`, prototipo aprobado por Víctor). Antes mira qué depende de la ficha,
con las mismas reglas que **Eliminar…**:

- **No se puede eliminar** un fabricante con productos, un tipo o categoría con productos (también los de lo
  que cuelga de él) o con categorías/subcategorías debajo, ni una página enlazada desde el menú, el pie o la
  solicitud. La ventana dice qué hay que mover antes, lista los productos (cada uno abre su ficha) y
  «Ver los N productos en la lista» abre la lista de la sección con esa fila desplegada.
- **Un producto que está en «Compatible con» de accesorios**: se lista cada accesorio con las máquinas que le
  quedan; si alguno se queda sin ninguna, sale un aviso en naranja (el accesorio no se borra: se decide
  después). Hay que marcar la casilla «Entiendo que…» y el botón es «Eliminar y quitar de los accesorios».
- Se dice qué fotos y ficheros se borran y cuáles se quedan porque los usa otra ficha, y, en tipos y
  categorías, si se quita de «Orden del catálogo en el menú».
- Todo se guarda en **un único cambio** (en local, en los ficheros; en GitHub, un commit) y «Volver a la lista»
  recarga el panel.
- «Eliminar cambios no publicados» y «Eliminar entrada no publicada» (flujo editorial) siguen siendo los de
  Decap: no borran nada publicado.
- Al actualizar Decap, comprobar que los botones siguen llamándose así (si no, el panel volvería a borrar sin
  avisar). El build ya avisa si un «Compatible con» apunta a un producto que no existe.

## Para quien mantiene la web

- Código: `public/admin/excel/` — `nucleo.js` (reglas: columnas, informe, qué se escribe y borra),
  `libro.js` (el Excel), `almacen.js` (leer y guardar) y `panel.js` (engranaje y ventanas). Pruebas:
  `lib/excel-panel.test.mjs` (`npm test`).
- **Cada sección** se activa con su «perfil» en `PERFILES` (`nucleo.js`): nombre de la hoja, cómo se
  calcula el identificador, columnas de solo lectura y cuándo no se puede borrar. Las columnas salen
  de los campos de `public/config.yml`.
- **Guardar:** en local (`npm run panel`), el servidor local de Decap escribe en tu copia (revísalo en
  Sourcetree). En la web, la API de GitHub con la sesión del panel (el token que guarda Decap al
  iniciar sesión): lee cada carpeta con una consulta y guarda todo en un commit (Git Data API: blobs,
  árbol, commit y mover la rama; si otra persona guarda a la vez, se reintenta). No hay funciones en
  Cloudflare ni claves nuevas.
- **Librerías:** ExcelJS, JSZip y YAML, de `node_modules`, que el build copia a `/admin/vendor/`
  (sin CDN). Se cargan solo al usar el engranaje.
- **Al actualizar Decap:** comprobar que el engranaje sigue saliendo junto a «Nuevo …» (`panel.js`
  lo coloca delante del enlace `#/collections/<nombre>/new`; Decap no tiene un sitio oficial para
  añadir botones a la lista).
