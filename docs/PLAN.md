# Plan por fases — tienda online

Plan de trabajo acordado a partir de las respuestas de Víctor (5 de noviembre de 2026). Cada fase
termina con algo que se puede probar en local y con su documentación en `README.md` o en `docs/`.
Las fases se hacen en orden; dentro de cada una, los pasos también.

## Estado y pendientes (18-11-2026) — para retomar en otra sesión

**Hecho:** fases 0, 1 (1a local y 1b Cloudflare Pages), 2, 4, 5 (envío real; producción configurada con
la cuenta de Google de la tienda, pero la web pública sin productos hasta la salida real) e identidad
visual (logo, colores, imágenes al compartir, Sobre nosotros con fotos). GitHub Actions: reconstrucción
diaria, sincronizar ramas, Dependabot y comprobación diaria. Panel: vistas previas con el aspecto de la
web y productos agrupados por clasificación. Textos legales para un autónomo, con los datos de la
tienda en un solo sitio (Contacto). **Dominio conectado (17-11-2026):** producción en
https://www.maquinasdecoserzafra.es (DNS en Strato: CNAME `www` → `maquinas-de-coser-zafra.pages.dev`; el dominio sin
www redirige con 301 desde Strato, con su SSL incluido); los entornos siguen en `<rama>.maquinas-de-coser-zafra.pages.dev`;
login del panel probado; **sin indexar**. Categoría nueva «Planchado › Planchas» (18-11-2026). Todo subido a main
(último commit: `7a74770`, carga de 144 productos de Alfa, Janome, Husqvarna Viking, PFAFF y Singer).

**Para retomar (18-11-2026, fin de sesión):**
- **Pruebas automáticas en local (18-11-2026, noche)**: Claude pasó los cuatro planes de `docs/pruebas/` en una copia
  local (Playwright; web y panel, ordenador y móvil emulado). Resultados, fallos y matices en
  `docs/pruebas/RESULTADOS-2026-11-18.md`. Corregidos 5 de los 7 fallos (paginación bajo la cabecera, buscador
  sin coincidencias falsas, nombre de la cabecera del móvil con letra grande, menú «+» y ✕ de Medios del panel
  en el móvil); otro no era fallo y el de los textos legales espera los datos de la tienda. Correcciones subidas
  en `e868ec1`. Los **15 matices (⚠️)** de la lista siguen todos
  pendientes (`e868ec1` solo corrigió fallos ❌): **siguiente, decidir cuáles se corrigen**. Las pruebas en dev-victor de lo que no
  se pudo en local (login de GitHub, flujo editorial, solicitud real, móvil de verdad) las hará Víctor **al final, cuando
  esté todo cerrado** (19-11-2026). Foto del carro Trevil EX001 sacada del catálogo de planchas 2025 (input/, solo 184 × 294 px):
  `input/fotos-tarifa-03-2026/trevil-ex001-1.jpg`, sin cargar aún.
- Catálogo en la web (todo «Solo para pruebas»): **477 productos** (18 Bernina cargados el 18-11-2026). **29 sin foto** (27 recambios y accesorios Jack del autómata de bolsillos, la T1900G y la JK-2808, el apilador y la caldera Trevil EX001: no están en ninguna web, pedirlas al proveedor). El 18-11 se pusieron fotos a 16 (ver «Fotos añadidas el 18-11-2026» en el apartado B). Otros avisos del panel: **5 parejas con la misma referencia** (Comel Futura RA, Janome 5060QDC y su mesa, tres parejas Jack) y **3 sin precio** (Elna 790PRO y 850, autómata Jack): decidir con el proveedor. Herramienta: no lee las páginas antiguas de bernina.com («Título de ficha no reconocido»; se leyeron a mano desde el navegador); queda pendiente decidir si mejorarla (páginas antiguas, webs oficiales internacionales o API de imágenes).
- Revisar en develop las fichas nuevas; resolver avisos de las Excel (permisos de fotos/textos de tiendas, precios 2022/04-2026,
  «Emparejado por nombre») antes de quitar «Solo para pruebas».
- Fase 3 empezada (18-11-2026): engranaje hecho en Fabricantes, Tipos de producto, Categorías, Subcategorías y
  Productos, Blog y Páginas (exportar, importar, cambios en bloque y eliminar; en Páginas, también «Exportar a
  Word»; `public/admin/excel/`, guía en docs/CARGA-EN-BLOQUE.md). **Fase 3 terminada** a falta de las pruebas de
  Víctor en dev-victor. Tres entradas del blog de prueba («Solo para pruebas») para probarlo.
- **Para corregir después de la fase 3** (pruebas de Víctor en dev-victor, 18-11-2026):
  - ~~En la lista de «Catálogo: fabricantes» del panel no sale cuántos productos tiene cada uno~~: resuelto con
    las tablas del panel (abajo).
  - **Listas del panel como tablas** (18-11-2026, prototipos aprobados por Víctor; `public/admin/excel/tablas.js`):
    sustituyen a la lista de Decap (y a su «cargar más», «Ordenar por» y agrupaciones) en productos, fabricantes,
    tipos, categorías y subcategorías. Productos: plegados por clasificación (orden del menú) o todos en una
    tabla. Fabricantes y tipos: una tabla; al pulsar una fila se despliega la tabla de sus productos; el lápiz
    abre su ficha. Categorías (plegadas por tipo) y subcategorías (por «Tipo › Categoría»): igual. Todas con
    miniatura, ordenar por cabecera, fila de filtros (texto, desplegables, números «>0») y paginación con
    selector 12/24/48. Empieza todo plegado; desde el 18-11-2026 (pedido por Víctor), al volver de una ficha queda
    todo como estaba (y se pone al día en segundo plano); al cambiar de sección se empieza de cero. Se quita
    de public/admin/campos.js el agrupado por «Clasificación» que pulsaba el «Group by» de Decap.
  - **Cabecera y menú del panel** (18-11-2026, prototipo aprobado por Víctor; `public/admin/excel/panel.js`,
    «Cabecera del panel»): «Añadir rápido» → «Acceso rápido» con los grupos «Añadir» y «Editar» (Solicitud de
    presupuesto, Contacto y horario, Sobre nosotros); engranaje al lado que abre «Ajustes del sitio» (oculto en
    «Colecciones» con `hide: true`); buscador en el centro de la cabecera (busca en todo; se quita el del menú
    de la izquierda). Mismos nombres, en plural, en «Colecciones» y en «Acceso rápido»: Entradas del blog,
    Páginas, Tipos de producto, Categorías, Subcategorías, Productos y Fabricantes (sin «Catálogo:»). El build
    pone el número de fichas a todas las secciones con carpeta (antes, solo a las «Catálogo: …»).
    Botón de cada lista con su género: «Nueva entrada del blog», «Nuevo producto» (Decap ponía «Nuevo Entrada del blog»).
  - **Panel: menú, avisos, Medios, buscador, estética y móvil** (18-11-2026, prototipos aprobados por Víctor):
    - «Colecciones» con las mismas opciones que «Acceso rápido»: la sección «Contacto y Sobre nosotros» se
      divide en «Contacto y horario» y «Sobre nosotros» (config.yml; los ficheros no cambian), con un separador
      antes de las secciones de una sola ficha, que abren su ficha directamente (panel.js).
    - El engranaje de «Ajustes del sitio» solo lo ve `vrspunk-87` (ADMINISTRADORES en panel.js; en local,
      siempre). Los demás tampoco pueden abrir esa ficha por su dirección. **No es una protección**: quien tiene
      permiso de escritura en el repositorio puede cambiar cualquier fichero.
    - Columna **Avisos** en todas las tablas de productos (tablas.js): sin foto, sin precio, oferta sin precio o
      fechas, oferta terminada, cabezal fuera de industriales, segunda mano en «Nuevo», clasificación,
      fabricante o «Compatible con» inexistentes y referencia repetida en el mismo fabricante. Icono con número,
      globo con la lista, filtro Con/Sin avisos y orden. «La oferta terminó» tiene «Entendido»: se recuerda en
      ese navegador para esa oferta (producto + fecha de fin).
    - **Medios** con pestañas por carpeta (medios.js): General (la de Decap), Fabricantes, Catálogo, Productos y
      Fichas PDF; «En uso» (qué ficha) o «Sin usar», buscar, filtrar, subir (fotos a 1600 px), descargar,
      reemplazar, copiar ruta y eliminar solo las que no usa ninguna ficha (un único cambio). En local la lista
      sale del último build (dist/admin/medios.json).
    - **Buscador** de la cabecera con tablas (tablas.js, «Buscador de la cabecera»): resultados por sección, con
      la tabla de cada una, píldoras para ver una sola y la palabra resaltada; sin la colección oculta «catalogo».
    - **Estética de la web** (public/admin/tema-panel.css + colores de la marca en dist/admin/datos-panel.json) y
      **panel adaptado al móvil** (menos de 800 px: tres rayas para «Colecciones», tablas como tarjetas con
      «Ordenar» y «Filtros», ficha a lo ancho con los botones abajo y la vista previa debajo). Tras actualizar
      Decap hay que repasarlo (docs/pruebas/).
    - Planes de prueba (18-11-2026): [docs/pruebas/](pruebas/README.md), con cuatro planes: web en el ordenador, web en
      el móvil, panel en el ordenador y panel en el móvil (sustituyen a docs/PRUEBAS-PANEL.md).
    - **Segunda tanda (18-11-2026, aprobada por Víctor):** ⚠ parpadeante (suave, quieto con «reducir
      movimiento») con cuántos productos tienen avisos en los grupos y en la columna Productos, y botón ⚠ para
      filtrar en todas las tablas y el buscador; Medios: pestañas bien desde la primera vez, «General» como las
      demás (con su número, «En uso» y lo que usa el propio código, que no se deja borrar) y barra fija;
      vistas previas con el estilo de la web para blog, tipos, categorías, subcategorías y fabricantes;
      «Ajustes del sitio» en pestañas Web / Panel / General con opciones nuevas (ver README → Ajustes del
      sitio) y antispam (correo y teléfono ocultos a los robots, máximo de enlaces en las observaciones).
    - **Ajustes del sitio como el prototipo** (18-11-2026, corrección pedida por Víctor): cada pestaña con sus
      secciones plegables («Identidad de la tienda · 8 opciones»…), empiezan plegadas; Panel en cinco secciones
      (los ajustes del panel pasan a campos sueltos `panel_…`) y General con «Datos de la tienda» y «Solicitud de
      presupuesto» como enlaces. Medios: la lista se lee con la API de árboles de GitHub (con las 1145 fotos de
      productos fallaba) y, en carpetas de más de 150 archivos, se elige antes qué ver (fabricante, buscar, «Sin
      usar» o «ver todos»).
    - **Burbujas ⓘ en «Ajustes del sitio»** (18-11-2026, aprobado por Víctor): en cada campo, desplegable y sección,
      con «Para qué sirve, Qué implica, Cómo usarlo, Cuándo se nota, Dónde se ve, Si lo dejas vacío, Ejemplo,
      Relación con otros campos, Cuidado y Para saber más» (solo los apartados que aportan). Textos en
      public/admin/ayuda-ajustes.yml; el texto gris de debajo de cada campo se mantiene.
    - **Documentación completa (al final de todo, pedido por Víctor el 18-11-2026):** funcionamiento completo de la
      web y del panel, y manuales de usuario independientes para la web (quien compra) y para el panel (quien
      edita). Las burbujas ⓘ de Ajustes del sitio enlazarán a esos documentos («Para saber más») cuando existan.
    - **Correos de la solicitud en HTML corporativo** (18-11-2026, prototipos aprobados por Víctor): `lib/correos.js`
      monta el acuse al cliente y el aviso a la tienda en HTML (cabecera PNG con logo y nombre que genera el build en
      /img/correo/cabecera.png, miniaturas JPG de 160 px en /img/opt/<base>-correo.jpg, pie con dirección, horario
      y contacto) y en texto (estilo «marcos ligeros», líneas de 50 caracteres). La función de Cloudflare los manda
      ya hechos al script (versión 2), que solo rellena {{NUMERO}}, {{HOJA}}, {{ACUSE}} y {{CUOTA}}. El acuse no
      lleva nada escrito por el cliente (tampoco su nombre). Nueva sección «Correo a la tienda» en «Solicitud de
      presupuesto» (asunto, cabecera, recordatorio, enlace a la hoja) y vista previa con los dos correos.
      **Hecho (19-11-2026):** Víctor pegó el script nuevo (versión 2) en las dos hojas
      (docs/solicitudes/CONFIGURAR.md, «Versión 2»).
  - **Ajustes de las tablas** (18-11-2026, prototipo aprobado): columna «Pruebas» con Sí (ámbar) / No (verde) en
    todas; la miniatura solo si alguna ficha de la lista tiene imagen (hoy, ni tipos ni categorías ni
    subcategorías); en los grupos de categorías y subcategorías, también el número de productos; iconos (árbol y
    tabla) en lugar de los botones de vista; en la vista tabla de categorías y subcategorías, la columna de qué
    cuelgan.
  - Pruebas hechas: exportar Fabricantes a Excel con ZIP en dev-victor, bien; exportaciones completas de tipos,
    categorías y subcategorías, bien. El resto, cuando esté todo subido.
  - Corregido el 18-11-2026: categorías y subcategorías no dejaban elegir qué exportar. Ahora, al exportar (y en
    las acciones en bloque), categorías se filtran por tipos de producto y subcategorías por tipos y categorías
    (desplegables dependientes, como en productos).

**Siguiente paso propuesto: fase 3** (decidida el 18-11-2026: botones «Exportar a Excel» e «Importar Excel» en cada
colección del panel; ver la fase 3). Empezar por Fabricantes. Sirve también para quitar en bloque la marca «Solo para pruebas».

**A. Lo decide o completa la tienda (no es código)**
1. NIF en Contacto (sale como «[NIF]» en el aviso legal).
2. Textos legales entre corchetes: plazo de respuesta, formas de pago, devoluciones en tienda,
   exclusiones del desistimiento, conservación sin venta («[6 meses]»), quién consulta las solicitudes,
   Sistema Arbitral de Consumo, Google Workspace o cuenta gratuita, fecha. Después, revisión legal.
3. Contacto → «Cómo llegar»: «[calle cercana]» y «[referencia conocida del centro de Zafra]».
4. Sobre nosotros: textos de ejemplo (año 1992, historia, servicios) por revisar; desmarcar «Textos de
   ejemplo»; permiso de las dos personas de la foto.
5. Color de las ofertas: dejarlas en rojo o darles uno propio.

**B. Catálogo: Excel de importación en `input/` (carpeta ignorada por Git; las tarifas llevan precios netos)**

Todas con las mismas columnas que el alta del panel, desplegables de catálogo (hoja oculta «Listas», ya con
«Planchas»), hoja «Notas» y columnas «Observaciones», «Revisar (avisos)» y «Modificaciones (desde la carga)».
Todo «Solo para pruebas». Las categorías dudosas ya las ha revisado Víctor (regla: lo que no corrige, está bien).

| Excel | Contenido | Fotos | Pendiente («Revisar») |
|---|---|---|---|
| `Tarifa_Domestico_03_2026_importacion.xlsx` (J. Pujol) | cargada en la web el 9-11 | `fotos-tarifa-03-2026` | precios/referencias por confirmar (FEL970, Juki F17, apilador, Creator Expres…; consultas a Jack y J. Pujol), repetir la búsqueda de Elna 782/770/780/920 |
| `TARIFA_JACK_11_25_importacion.xlsx` | cargada en la web el 9-11 | `fotos-tarifa-jack-11-25` | fotos de tiendas (permiso), sin foto |
| `TARIFA_ALFA_PROFESIONALES_2026_importacion.xlsx` | 28 productos + 5 accesorios, **completada con la web oficial de Alfa** (18-11) | `fotos-tarifa-alfa-2026` (156, 1200×1200, la 1.ª limpia) | «Foto con icono» (8709 Style, Style 8708 Plus), «Emparejado por nombre» (Essence), «Compatibilidad (universal)» (Funda Max) |
| `Tarifa_Janome_2022_importacion.xlsx` (RMT, PDF escaneado, págs. 5-27) | 26 máquinas + 11 accesorios; 22 completadas con janome.es y 21 con fotos de 3 tiendas (`Janome-tiendas`, 18-11) | `fotos-tarifa-janome-2022` (1.ª de janome.es, con logotipo; hasta 5 con las de tiendas) | «Precio 2022» en todas; «Fotos de tiendas» (pedir permiso o sustituir); sin foto: Roja, MC9400QCP, Ricoma SW-1010 y 9 accesorios; con una sola: Pink 12, Green 12, 72922S, Black 22S; «Web incoherente» (72922S, 1030MX, Skyline S3); «Emparejado por nombre» (MC550E ↔ 550E LE); «Datos» (erratas de la tarifa) |
| `TARIFA_HV_09_2026_importacion.xlsx` (Husqvarna Viking) | 17 máquinas; 16 completadas con europe.singer.com (18-11: descripción, características y ficha técnica) | `fotos-tarifa-hv-09-2026` (hasta 5, 1200×1200, la 1.ª limpia) | «Emparejado por nombre» (Topaz 55 ↔ TOPAZ 55Q, ONIX 30 ↔ ONYX 30); no está en la web: DESIGNER TOPAZ 25; Plan EVOLUCIÓN en Observaciones |
| `TARIFA_PFAFF_09_2026_importacion.xlsx` | 26 productos (Elevate 680 completa y máquina sola) + unidad de bordado; 22 completados con europe.singer.com (18-11) y la unidad con 2 fotos | `fotos-tarifa-pfaff-09-2026` (hasta 5, 1200×1200, la 1.ª limpia) | «Precio 04-2026» (págs. 2-4); «Emparejado por nombre» (Quilt expression 710 SP Edit ↔ expression 710 Edición Especial, Ambition 610 ↔ 610 Azul); no están en la web: Creative Expression 750, Performance Icon, Admire Air 5000 y Admire 1000 |
| `TARIFA_SINGER_09_2026_importacion.xlsx` | 29 máquinas + unidad de bordado 905E (solo HD9125); 20 completadas con europe.singer.com (18-11: textos, ficha técnica, accesorios incluidos y referencia si la web la da) | `fotos-tarifa-singer-09-2026` (hasta 5, 1200×1200, la 1.ª limpia) | «Emparejado por nombre» (6335 DENIM ↔ 6335M, 4432 BK ↔ Negra Edición Especial, S0105L ↔ S0105); no están en la web: EM9305, SE 9155, HD9125, Featherweight C240, HD500, M3305, 14T968DC, S060X, HD0465 y la 905E (siguen «Sin foto», «Sin textos»); no se copió el precio de distribuidor |
| `CATALOGO_BERNINA_importacion.xlsx` (catálogo sin fecha, PDF de 2017) | 18 máquinas (1 mecánica, 13 electrónicas, 3 remalladoras, 1 recubridora), **cargada en la web el 18-11** (`public/_productos/bernina-*.md`, 58 fotos, «Solo para pruebas»); 14 completadas con bernina.com (18-11): B720, B770 QE, L450 y L460 con la herramienta (`Bernina/`) y B330, B350, B380, B530, B560, B570 QE, B580, B790, B880 y L220 leyendo sus páginas antiguas desde el navegador | `fotos-tarifa-bernina` (de la web, hasta 5; las descargas originales en `input/_web-bernina`); solo 1008, B215, B820 y 1300 MDC con la foto del catálogo | «Tarifa sin fecha» (confirmar modelos y precios con el proveedor); «Descatalogado (página antigua)» en 12 y «(no está en la web)» en 4 (la página de la «820 QE» no coincide con la B820); «Datos distintos» (enhebrador, BSR en la B530, módulo de bordado en la B790, ojales/espacio en la B880); «Edición especial» (B350); «Sin descripción» (B720, B770 QE); «Sin textos» (1008, B215, B820, 1300 MDC) |

**Cargadas en la web el 18-11-2026** (todas «Solo para pruebas»): Alfa Profesionales 2026, Janome 2022, Husqvarna Viking,
PFAFF y Singer 09/2026: 144 productos y 602 fotos (`public/_productos/<fabricante>-<modelo>.md`, fotos en
`public/img/productos/<identificador>-N.jpg`, recomprimidas a calidad 82). Carga puntual con un script que no se guarda en el
repositorio (la fase 3 sigue pendiente): «Ficha técnica» «dato: valor» → `caracteristicas`, «Características» → `destacados`,
«Compatible con» por modelo de la misma Excel. Build en develop: 459 productos, 0 enlaces rotos; aviso nuevo: la referencia
«J7100014» se repite en la Janome 5060QDC y su mesa (viene así en la tarifa).

**Fotos añadidas el 18-11-2026 a productos que no tenían** (descargas en `input/_web-sinfoto`): 16 productos. De web oficial: xTool AP2 (JK-F17), Artistic Digitizer Jr y Digitizer MBX (janome.es), base Juki AJF (jukiquilting.com, foto de la «Wide Table» de las HZL: comprobar que es la misma). Del distribuidor maquinandocoser.com: Sewmaq SW-100B, SW-200 y SW-400 (la 200 y la 400 tienen la misma foto), Ricoma SW-1010 (allí «EM-1010»), mesas Janome 0A7976A y 0A7987A (la misma foto genérica, 278 px) y mesa y bancada MC6700P. De tiendas: Janome MC9400QCP (Sewing Parts Online), Janome Roja (Mercería Barcelona) y Husqvarna DESIGNER TOPAZ 25 (Seoane Textil y Máquinas de Coser Duch). Todas, salvo las oficiales, son «Fotos de tiendas»: pedir permiso o sustituir antes de publicar. Las overlock Jack JK-C7-3-32R/233 y JK-E4S-3-32R2/233 llevan la foto del modelo base (JK-C7-3-02/233 y JK-E4S-3-02/233; lo dice el texto alternativo). Siguen sin foto 29: los 27 recambios y accesorios Jack (galgas, bases y prensatelas T1900G, casquillos, dientes de goma, apilador) y la caldera Trevil EX001: pedirlas al proveedor.

Además, de antes: referencias repetidas que avisa el build (FFUTURA RA, FEL970, varias de Jack); 43 productos
cargados sin foto; fotos tomadas de otras tiendas (permiso o sustituir); textos alternativos (fase 6, punto 4).

**Completar con la web de los fabricantes** (herramienta `..\herramienta-consulta-fabricantes`, otro repositorio, con
su propio CLAUDE.md): la de las tiendas con Janome (`Janome-tiendas`) ya se ha usado en la Excel de Janome; las de Singer, PFAFF y Husqvarna Viking ya se han usado en sus Excel (18-11). Con `Singer-tiendas` y `PFAFF-tiendas` se han completado
hasta 5 fotos y, en los modelos que no están en la web oficial, textos de tiendas (avisos «Fotos de tiendas» y «Textos de tiendas»:
pedir permiso o reescribir antes de publicar).
Scripts usados: emparejan por modelo y no se guardan en el repositorio. Pendiente en todas: revisar las fichas
técnicas (la web de SVP mezcla datos y traduce mal algunos términos) y los modelos que no están en la web.

**C. Desarrollo**
10. Fase 3: exportar e importar con Excel desde cada colección del panel (ver la fase 3).
11. Fase 6: guías (panel, carga en bloque, gestión de solicitudes: estados, conservación, borrar también
    los correos) y prueba completa.
12. Fase 8: conservar la caché de imágenes entre despliegues.

**D. Salida a producción**
13. Dominio hecho (fase 8, punto 2). Queda: revisar la cookie `__cf_bm`; quitar de la app OAuth de GitHub la URL
    de vuelta de `pages.dev` cuando ya no haga falta; SPF si se usa el correo de Strato con el dominio.
14. Quitar «Solo para pruebas» a lo revisado, activar «indexable», redirigir la `pages.dev` de producción al
    dominio, Google Search Console, quitar los avisos de borrador, solicitud real de prueba (y borrar después la fila
    y la propiedad `contador-2026`), volver a generar `public/img/compartir.jpg` si cambia el nombre o el logo.

**Forma de trabajar:** Víctor hace los commits; se le dan los comandos de PowerShell listos para copiar
(carpeta `C:\Users\victor.ruanosantana\Downloads\tienda-online`, rama main salvo que se diga otra). No inventar
datos: lo dudoso, en Observaciones y en «Revisar (avisos)». Mostrar opciones antes de cambios visuales.

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

## Fase 3 — Exportar e importar con Excel desde el panel

**Decidido (18-11-2026, sustituye al planteamiento anterior con `npm run exportar` / `npm run importar`):**
cada colección del panel tiene sus propios botones **«Exportar a Excel»** e **«Importar Excel»**, junto a
«Nuevo…», dentro de un botón con icono de engranaje que los despliega (decidido por Víctor,
18-11-2026). Todo se hace en el navegador, con el login de GitHub del panel: no hay funciones nuevas en
Cloudflare (10 ms de CPU por petición no bastan para un Excel con fotos) ni claves nuevas.

**Orden (decidido por Víctor):** Fabricantes → Tipos de producto → Categorías → Subcategorías →
Productos → Blog. Además, **Páginas**: Excel y, aparte, **un documento de Word por página** con su
contenido. Las colecciones de un solo fichero (Ajustes, Contacto y Sobre nosotros, Solicitud) quedan
fuera: son una sola ficha y se editan mejor en el panel.

1. **Botones en el panel** (`public/admin/`, script propio como `campos.js`): Decap no tiene un punto de
   extensión oficial para la lista de una colección, así que se añaden al detectar la vista
   `#/collections/<nombre>`. Comprobar que siguen apareciendo al actualizar Decap
   (`scripts/actualizar-decap.js`).
2. **Columnas = campos del alta/edición**, sacadas de `config.yml` (si se añade un campo, el Excel lo
   incluye solo). Primera columna «Identificador» (nombre del fichero; vacía en las filas nuevas: se
   crea como en el panel). **Reglas del identificador** (en todas las colecciones):
   - con identificador que existe → se **modifica** esa ficha;
   - vacío → ficha **nueva**; el identificador se genera con la misma regla del panel en esa
     colección (fabricantes: nombre; productos: fabricante + modelo; blog: título…) y, si ya existe,
     se añade «-2», «-3»… (con aviso);
   - escrito pero no existe → ficha **nueva** con ese identificador; si otra ficha tiene el mismo
     nombre (o fabricante + modelo), aviso «¿querías decir…?» por si es una errata;
   - **no se puede cambiar**: otras fichas lo usan (productos → fabricante y categoría, accesorios →
     «compatible con»…) y se rompería la relación; cambiarlo en el Excel crea otra ficha y el informe
     lo avisa.
   **Columna «Acción»** (segunda columna, desplegable): «Crear/Editar» (ya puesto en todas las filas
   exportadas y en las filas vacías preparadas para altas; si se deja vacía, cuenta igual) o «Borrar».
   Las filas sin ningún dato (aparte de «Acción») se ignoran: solo están preparadas para altas. Una fila
   con algún dato pero sin los obligatorios da error en el informe.
   Que una fila falte en el Excel nunca borra nada. Borrados: el informe los muestra aparte, en rojo,
   y hay que marcar «Entiendo que se borrarán N fichas»; se borran también las fotos que no use otra
   ficha. No se borra un fabricante con productos, ni un tipo/categoría/subcategoría con hijas o
   productos (al borrarlos, se quitan de «Orden del catálogo en el menú»), ni una página que esté en
   el menú o el pie. En productos, la hoja «Instrucciones» recomienda Estado «no disponible» en vez de
   borrar. Al borrar una máquina que está en «Compatible con» de algún accesorio, se quita de esos
   accesorios en el mismo commit y el informe los lista (decidido por Víctor, 18-11-2026).
   **Columnas informativas (solo lectura)** (decidido por Víctor, 18-11-2026): en Fabricantes, Tipos,
   Categorías y Subcategorías, «Productos (solo lectura)» con el número de productos enlazados al
   exportar (en tipos y categorías, con los de sus descendientes, como en el panel; cuenta todos, también
   los «Solo para pruebas»). Celdas en gris, bloqueadas con la protección de la hoja (que deja editar el
   resto, añadir filas y filtrar) y la importación las ignora.
   **Productos**: dos hojas, como las Excel de `input/`: «Productos» (máquinas y demás) y «Accesorios»
   (los del tipo «Accesorios»), con las mismas columnas; la hoja no decide nada al importar (manda la
   categoría) y se leen las dos. En «Productos», «Accesorios asociados (solo lectura)»: cuántos
   accesorios la tienen en «Compatible con». En «Accesorios», «Productos compatibles (solo lectura)»:
   cuántos productos tiene en «Compatible con» (solo los que existen) (decidido por Víctor, 18-11-2026).
   **Filtros al exportar productos** (decidido por Víctor, 18-11-2026): ventana con «Todo» o una selección
   por fabricantes, tipos, categorías y subcategorías (varios en cada uno; desplegables dependientes:
   categorías de los tipos elegidos, subcategorías de las categorías elegidas; cada opción con su número
   de productos según lo ya elegido y sin las que se quedan en 0). Entre grupos, «y»; dentro de un grupo,
   «o»; en cada rama manda lo más concreto (tipo A con su categoría A1 y tipo B sin categoría → A1 y
   todo B). Casilla «Incluir los accesorios compatibles con estos productos». Siempre visible: «Se
   exportarán N productos y M accesorios». El ZIP de fotos sigue el mismo filtro. Exportar una parte no
   es peligroso: lo que no está en el Excel no se borra al importar.
   Traducción por tipo de campo:
   - texto, número, fecha, sí/no → una columna;
   - desplegables y relaciones (fabricante, «compatible con»…) → columna con desplegable (hoja oculta
     «Listas»);
   - lista de imágenes → «Foto 1», «Foto 1: descripción»… hasta el máximo del campo;
   - lista de textos (p. ej. características) → una celda, un punto por línea;
   - grupos (oferta, segunda mano) → una columna por subcampo («Oferta: desde»…);
   - cuerpo (descripción, texto de la entrada) → una celda (límite de Excel: unos 32.000 caracteres;
     el exportador avisa si alguno no cabe);
   - campos propios (`precio-producto`, `categoria-catalogo`) → columnas concretas, como en las Excel
     de `input/`.
3. **Hoja «Instrucciones»** en todos los Excel exportados (decidido por Víctor): cómo dar de alta,
   modificar, borrar un dato con `(vacío)`, poner las fotos, qué columnas se ignoran y qué hace la
   importación. Además, la hoja «Notas» con la explicación de cada columna y una hoja oculta con la
   versión de cada ficha al exportar.
4. **Exportar**: lee la rama que edita el panel (incluye lo no desplegado). Dos opciones: **solo
   Excel** o **Excel + fotos en un ZIP**.
5. **Importar**: admite el Excel solo, un ZIP con el Excel y las fotos, o el Excel y las fotos
   arrastradas a la vez (se enlazan por el nombre escrito en «Foto N»).
   - **Primero, informe** en una ventana: nuevos, modificados (campo, antes → después), sin cambios,
     avisos y errores (cada uno con su fila). Con un error no se escribe nada.
   - Al confirmar: el navegador reduce las fotos (1600 px; las que no han cambiado no se tocan) y
     **guarda todo en un único commit directamente en la rama del panel**, como «Publicar ahora»
     (decidido por Víctor; el flujo editorial de Decap va ficha a ficha y no sirve para cargas en
     bloque). En productos, «Solo para pruebas» sirve de red de seguridad.
   - **Celda vacía = no tocar el campo**; para borrar un dato se escribe `(vacío)` (decidido por Víctor).
   - No borra fichas: las que no están en el Excel solo se listan.
   - Se ignoran «Observaciones», «Revisar (avisos)» y «Modificaciones (desde la carga)», así que sirven
     las Excel de tarifas de `input/` (sin «Identificador», se emparejan por fabricante + modelo, con
     aviso).
   - Si una ficha se cambió en el panel después de exportar, no se pisa: sale en el informe.
   - Categorías nuevas escritas en el Excel: se dan de alta (decidido el 9-11-2026) y se listan para
     revisarlas.
   - Informe descargable en Excel.
5b. **«Eliminar…» en el menú del engranaje** (decidido por Víctor, 18-11-2026), separado y en rojo, sin
   pasar por un Excel: 1) elegir: en Productos, los filtros de la exportación más «Solo para pruebas» y
   «Estado»; en las demás colecciones, lista con casillas y buscador; 2) revisar la lista exacta (se
   pueden desmarcar) con lo que arrastra cada una; las que no se pueden borrar (fabricante con productos,
   categoría con hijas o productos, página en el menú o el pie) salen sin casilla y con el motivo;
   3) confirmar escribiendo el número de fichas. Mismas reglas que los borrados del Excel (fotos que no
   usa otra ficha, «Compatible con» de los accesorios, «Orden del catálogo en el menú») y un único commit.
   En Productos recuerda que, para quitarlos solo de la web, es mejor «Estado: no disponible».
5c. **«Cambiar en bloque» en el menú del engranaje** (decidido por Víctor, 18-11-2026). El menú queda en
   tres grupos: «Excel» (Exportar, Importar), «Cambiar en bloque» y, aparte y en rojo, «Eliminar…».
   Acciones por parejas, para deshacer una con la otra: «Marcar como no disponible» / «Marcar como
   disponible» (solo Productos) y «Quitar "Solo para pruebas"» / «Marcar "Solo para pruebas"» (todas las
   colecciones). Misma ventana de filtros que al exportar (más el filtro «Sin avisos») y lista exacta con el
   cambio («Solo para pruebas: sí → no»); las que ya están así no se tocan. Al quitar «Solo para pruebas»,
   los productos sin foto o sin precio salen con aviso y desmarcados de entrada. Confirmación con un
   botón (son reversibles) y un único commit por acción. Más adelante, en este grupo: precios y ofertas
   en bloque (punto 8).
6. **Páginas a Word**: además del Excel, «Exportar a Word» descarga un ZIP con un `.docx` por página
   (título, descripción y el texto con sus encabezados, listas, negritas y enlaces). **Solo se exportan**
   (decidido por Víctor, 18-11-2026): son para pasárselos a la asesoría; cuando los devuelva, se verá qué hacer.
7. **Dependencias**: `exceljs` (ya en el proyecto), y para el ZIP y el Word, librerías servidas desde
   la propia web (sin CDN), con versión exacta publicada hace al menos dos semanas.
8. **Más adelante**: subidas de precio y ofertas en bloque (de momento, en el propio Excel).
9. **Documentación**: `docs/CARGA-EN-BLOQUE.md`, sin tecnicismos.

**Hecho (18-11-2026): Páginas y Word** — Excel como el resto; no se borran las que enlaza la web (menú, pie,
privacidad y condiciones). «Exportar a Word…»: un .docx por página (o un ZIP), escrito a mano con JSZip y
`marked` (el build copia `marked.esm.js` a /admin/vendor/), con los marcadores legales rellenos con los datos de
/admin/datos-panel.json (último despliegue) y los huecos «[…]» resaltados en amarillo (public/admin/excel/word.js).

**Hecho (18-11-2026): Blog** — identificador con la fecha (`2026-11-18-titulo`) y alta en la carpeta del año,
como el panel; fecha de publicación tal cual o «18/11/2026 10:30» (hora de Madrid); «Recuadro final» en
columnas (con desplegable del catálogo). Tres entradas de prueba en `public/_posts/blog/2026/`.

**Hecho (18-11-2026): Productos** — dos hojas (Productos / Accesorios) con sus columnas de solo lectura,
columnas iguales que las Excel de tarifas (que también se importan: sin «Identificador», se emparejan por
fabricante y modelo), catálogo en tres columnas con desplegables dependientes (nombres de rango e INDIRECT),
filtros dependientes al exportar y en las acciones en bloque, «Marcar como no disponible / disponible»,
fotos reducidas a 1600 px al subirlas y, al borrar una máquina, se quita de «Compatible con» de sus accesorios.
Cada campo del panel es un «grupo» de una o varias columnas (nucleo.js: `grupoDe`). Al reescribir una ficha se
conserva su formato (listas con o sin sangría, líneas partidas o no). Prueba: los 459 productos reales salen y
vuelven sin cambios.

**Hecho (18-11-2026): Tipos de producto, Categorías y Subcategorías** — perfiles en `PERFILES` (nucleo.js):
filtro por «nivel», identificadores únicos en toda la carpeta, padre por su ruta («Tipo › Categoría»), «nivel»
puesto en las altas, no se borra lo que tiene hijas o productos y al borrar se quita de «Orden del catálogo en el
menú» (solo esas líneas de sitio.yml). Las fichas se escriben como Decap (líneas partidas a 80) salvo que el
fichero ya las tenga largas.

**Hecho (18-11-2026): Fabricantes** — `public/admin/excel/` (nucleo.js, libro.js, almacen.js, panel.js),
pruebas en `lib/excel-panel.test.mjs`, guía en [CARGA-EN-BLOQUE.md](CARGA-EN-BLOQUE.md). `exceljs` pasa a
`dependencies` y se añade `jszip` 3.10.2 (ya venía con exceljs); el build los copia a `/admin/vendor/` con `yaml`.

Prueba en cada colección: exportar y volver a importar sin cambios da 0 cambios; cambiar varias filas,
añadir una y comprobar el informe y el commit.

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

**Identidad visual (10-11-2026, elegida por Víctor a partir del logo de la antigua web):** letra Courgette
en rojo `#c1121f` (Ajustes del sitio → Apariencia → acento), nombre en dos líneas en el ordenador y en una
en el móvil (dos en móviles de menos de 400 px), dibujo de aguja con hilo y pespunte en lugar de la foto
del prensatelas (`public/img/logo.svg`; iconos en `public/img/iconos/`), insignias de número de productos
en gris claro (el rojo queda para «Mi solicitud»), títulos de catálogo, categorías, ofertas, blog, páginas
y «Mi solicitud» con la letra del logo (no los nombres de producto ni las entradas). Barra del catálogo
más compacta: cabe con todos los tipos y «Ofertas» desde 1200 px y, si no, pasa a dos líneas (antes se
salía de la pantalla en portátiles de 1366 px). Pendiente: decidir si las ofertas llevan un color propio.
Titular de la portada en la letra del logo (rojo) y títulos de sección («Nuestros productos»…) en la
misma letra en gris oscuro. Imágenes para compartir con la nueva identidad: la de por defecto
(`public/img/compartir.jpg`, se regenera con `node scripts/generar-imagen-compartir.js`, todo en el cuadrado
central porque WhatsApp recorta en cuadrado) y las automáticas de categorías y páginas (fondo blanco, logo
y pespunte). «Sobre nosotros»: fotos de la antigua web mejoradas (ampliadas ×4 sin inventar detalles):
la de los dueños, ovalada, como foto principal sin marco (`foto_marco: false`) y la galería «Nuestra
tienda» (campo `galeria`, editable en el panel). Pendiente: confirmar que ambos dan permiso para salir en
la web y, si se quiere, pies de foto.

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
2. **Dominio**: `maquinasdecoserzafra.es`, **comprado en Strato el 17-11-2026**. Los DNS se quedan
   en Strato: en los `.es` Strato solo deja cambiar los servidores de nombres de los subdominios
   (FAQ #2877), así que no se pueden delegar en Cloudflare y Pages no puede servir el dominio sin
   `www`. Producción en **`www.maquinasdecoserzafra.es`** (Strato redirige el dominio sin www).
   Los entornos siguen en `<rama>.maquinas-de-coser-zafra.pages.dev`: se probó `develop.` con un
   CNAME a la rama y Pages servía producción (con DNS externos asocia los dominios propios solo a
   producción).
   - **Hecho en el código (17-11-2026)**: `avanzado.url` en `public/_datos/sitio.yml`, `base_url` en
     `public/config.yml`, `DOMINIO_PROPIO` en `lib/origenes.js` (lista del login: dominio y `www`;
     siguen las `pages.dev`) y `WEB_POR_DEFECTO` de la comprobación diaria. **Sin indexar**:
     `indexable: false`, así que `noindex` y `robots.txt` bloqueando también en el dominio.
   - **Fuera del código, antes de subir el cambio a `main`**: (1) Cloudflare: quitar la zona
     `maquinasdecoserzafra.es` que se creó al intentar delegar los DNS (quedó «pendiente»).
     (2) Strato → Dominios → (rueda) → DNS → Registros TXT y CNAME: CNAME `www` →
     `maquinas-de-coser-zafra.pages.dev.` (3) Pages → `maquinas-de-coser-zafra` → Dominios
     personalizados → `www.maquinasdecoserzafra.es` → «My DNS provider» (CNAME) hasta que salga
     «Activo» (certificado incluido). (4) Strato → Servidor web → Configurar redirección → Externo:
     `https://www.maquinasdecoserzafra.es` (para `https://` sin www hace falta el SSL de Strato).
     (5) App OAuth de GitHub: página `https://www.maquinasdecoserzafra.es` y URL de vuelta
     `https://www.maquinasdecoserzafra.es/api/callback`. Correo de Strato: los registros MX, SPF,
     DKIM y DMARC no se tocan.
   - **Pendiente para la salida real**: **quitar el `noindex`** («Permitir que Google indexe la
     web»), redirigir la dirección `pages.dev` de producción al dominio, Google Search Console y,
     si se quiere, correo con el dominio (cambiar el remitente y la dirección de los avisos en el
     script de Google).
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
