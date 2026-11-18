# Plan de pruebas · Panel en el ordenador

El panel de edición (`/admin/`: Decap y lo propio de `public/admin/`) en Chrome o Edge con la ventana
maximizada. Preparación y forma de marcar: [README.md](README.md) (**haz la copia de seguridad antes de las
pruebas 🧪**). La versión del móvil: [PANEL-MOVIL.md](PANEL-MOVIL.md). Guía de uso del engranaje:
[../CARGA-EN-BLOQUE.md](../CARGA-EN-BLOQUE.md).

## 1. Entrar y cabecera

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 1.1 | E | Entrar en `/admin/` e iniciar sesión con GitHub | Entra; cabecera con el logo (aguja) y «Máquinas de Coser Zafra» en la letra del logo | |
| 1.2 | L, E | Mirar la cabecera | Pespunte rojo discontinuo debajo; «Contenido», «Flujo editorial», «Medios»; buscador en el centro; «Acceso rápido» en rojo; engranaje; avatar | |
| 1.3 | L, E | Abrir «Acceso rápido» | Grupo «Añadir» con los nombres del menú en plural y grupo «Editar»: Solicitud de presupuesto, Contacto y horario, Sobre nosotros. Cada opción abre lo suyo | |
| 1.4 | E | Con tu usuario (vrspunk-87): engranaje junto a «Acceso rápido» | Se ve y abre «Ajustes del sitio» | |
| 1.5 | E | Con otro usuario de GitHub con acceso al repositorio | **No** se ve el engranaje; si escribe `#/collections/ajustes/entries/sitio` en la dirección, vuelve al inicio | |
| 1.6 | L | Engranaje en local | Se ve siempre | |
| 1.7 | L, E | Pulsar el logo | Va al inicio del panel | |

## 2. Menú «Colecciones»

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 2.1 | L, E | Mirar el menú | Entradas del blog, Páginas, Tipos de producto, Categorías, Subcategorías, Productos, Fabricantes; una línea discontinua; Solicitud de presupuesto, Contacto y horario, Sobre nosotros. Sin «Ajustes del sitio» ni «Contacto y Sobre nosotros». Con número de elementos (tras desplegar) | |
| 2.2 | L, E | Pulsar «Contacto y horario», «Sobre nosotros» y «Solicitud de presupuesto» | Abre su ficha directamente (no una lista con una tarjeta) | |
| 2.3 | L, E | En esa ficha, pulsar «←» | Vuelve al inicio del panel (no se queda en bucle) | |
| 2.4 | L, E | Sección activa | Fondo rosado y texto rojo | |

## 3. Tablas de las listas (productos, fabricantes, tipos, categorías, subcategorías)

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 3.1 | L, E | Abrir Productos | Grupos plegados por clasificación, en el orden del menú, con «N productos» | |
| 3.2 | L, E | Abrir un grupo; icono de tabla | Tabla con miniatura, Producto, Fabricante, Modelo, Referencia, Precio, Estado, Pruebas y **Avisos** (última). En la vista de tabla, además «Clasificación» | |
| 3.3 | L, E | Pulsar un título de columna dos veces | Ordena ▲ y luego ▼; los vacíos al final | |
| 3.4 | L, E | Filtros de la segunda fila: texto, Fabricante, Precio `>500`, Estado, Pruebas «Sí», Avisos «Con avisos» | Filtra; «Mostrando 1–12 de N» cuadra | |
| 3.5 | L, E | Cambiar «Por página» a 24 y 48; pasar de página | Funciona; vuelve a la página 1 al filtrar | |
| 3.6 | L, E | Buscador de la lista (nombre, modelo, referencia, fabricante) | Filtra en todos los grupos | |
| 3.7 | L, E | Pulsar un producto | Abre su ficha | |
| 3.8 | L, E | Fabricantes: pulsar una fila | Se despliega la tabla de sus productos; el lápiz abre el fabricante | |
| 3.9 | L, E | Tipos, Categorías (por tipo) y Subcategorías (por «Tipo › Categoría»), y su vista de tabla con la columna del padre | Igual que fabricantes; «N categorías · M productos» en los grupos; Pruebas Sí/No | |
| 3.10 | L, E | Abrir un grupo, ir a la página 2, ordenar por precio, filtrar y bajar un poco; abrir un producto y volver con «←» y con «Atrás» del navegador | Todo sigue igual: grupo abierto, página, orden, filtro y posición | |
| 3.11 🧪 | E | Lo mismo, cambiando y guardando algo del producto | Al volver, todo igual y, en unos segundos, la fila con el dato nuevo | |
| 3.12 | L, E | Fabricantes: desplegar uno, ir a la página 2 de sus productos, abrir un producto y volver con «Atrás» | El fabricante sigue desplegado y en la página 2 | |
| 3.13 | L, E | Cambiar a otra sección y volver a Productos | Todo plegado otra vez (se empieza de cero) | |

## 4. Avisos de los productos

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 4.1 | L, E | Filtro Avisos «Con avisos» | Solo productos con ⚠ y número | |
| 4.2 | L, E | Pasar el ratón por ⚠ | Globo con la lista: «Sin foto», «Sin precio…», «Misma referencia… del mismo fabricante», etc. Se cierra al salir o con Esc | |
| 4.3 | L, E | Ordenar por Avisos | Los que más tienen, arriba o abajo | |
| 4.4 🧪 | E | Producto de prueba «En oferta» con fecha «hasta» de ayer | Aviso «La oferta terminó el … y sigue marcado «En oferta»» con «Entendido» | |
| 4.5 🧪 | E | Pulsar «Entendido» y recargar | Ya no sale en ese navegador; en otro navegador sí | |
| 4.6 🧪 | E | Cambiar la fecha «hasta» a otro día pasado | Vuelve a salir | |
| 4.7 🧪 | E | Producto de prueba «En oferta» sin fechas; otro con «Compatible con» de un producto borrado; otro con datos de segunda mano y «Nuevo» | Sale su aviso en cada uno | |
| 4.8 | L, E | Grupos de Productos, Categorías y Subcategorías; columna Productos de Fabricantes, Tipos, Categorías y Subcategorías | ⚠ con cuántos productos tienen avisos, parpadeando suave (quieto si el sistema tiene «reducir movimiento») | |
| 4.9 | L, E | Botón ⚠ junto a las vistas (en todas las listas y en el buscador) | Solo los productos con avisos; en fabricantes y categorías, solo las filas que los tienen y, al desplegar, solo esos productos. Otra vez: todo | |
| 4.10 | E | Ajustes → Panel: desmarcar «Sin foto» en los avisos y desplegar | Ya no sale ni cuenta | |

## 5. Buscador de la cabecera

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 5.1 | L, E | Buscar «máquinas» (y «maquinas», sin tilde) | Mismo resultado; «N resultados en M secciones»; grupos abiertos con su tabla; palabra resaltada | |
| 5.2 | L, E | Píldoras «Productos (N)», «Categorías (N)»… | Solo esa sección; «Todo» vuelve | |
| 5.3 | L, E | Buscar «Next 100», una referencia y un fabricante | Salen los productos esperados | |
| 5.4 | L, E | Buscar «prueba» | Entradas del blog con su fecha, abren su ficha (también las de la carpeta del año) | |
| 5.5 | L, E | Buscar algo que no existe | «Ningún resultado…» | |
| 5.6 | L, E | Comprobar | No sale «Catálogo: todas las categorías» repetido | |

## 6. Medios

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 6.1 | L, E | Cabecera → «Medios» (la primera vez tras cargar) | Pestañas del tamaño normal: General, Catálogo, Productos, Fichas PDF, Fabricantes, cada una con su número | |
| 6.2 | L, E | «General» | Igual que las demás: los archivos sueltos de /img/; logo, iconos e imagen al compartir «En uso» (no se dejan borrar) | |
| 6.3 | L, E | «Productos» | Primero pide elegir qué ver (más de 150 archivos): fabricante, buscar, «Sin usar» o «ver todos» | |
| 6.3b | E | Elegir un fabricante | Sus fotos con miniatura, nombre, tamaño, «En uso» / «Sin usar», de 48 en 48 | |
| 6.4 | L, E | Pulsar una foto | Detalle con «Lo usa: <ficha>»; el enlace abre la ficha y cierra Medios | |
| 6.5 | L, E | Buscar por el nombre de una ficha; filtro «Sin usar» | Filtra | |
| 6.6 | E | Elegir 2 y «Descargar» | Un ZIP con las dos | |
| 6.7 🧪 | E | «Subir…» una foto grande en Fabricantes | Se sube reducida (≤1600 px), sale en la lista y hay un commit «Medios: subir…» | |
| 6.8 🧪 | E | Subir otra con el mismo nombre | Pregunta si reemplazar | |
| 6.9 🧪 | E | Elegir una en uso y otra sin usar → «Eliminar…» | Dice que la usada no se borra (y quién la usa); borra solo la otra, en un commit | |
| 6.10 | — | Abrir «Medios» al elegir una imagen dentro de una ficha | Ventana de Decap normal, sin pestañas | |
| 6.11 | L, E | Bajar por las fotos de Productos | La barra de buscar y botones se queda fija arriba | |

## 7. Engranaje de cada sección (Excel, en bloque, eliminar, Word)

Guía de uso: [../CARGA-EN-BLOQUE.md](../CARGA-EN-BLOQUE.md). Repetir en Fabricantes, Tipos, Categorías,
Subcategorías, Productos, Blog y Páginas.

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 7.1 | L, E | Engranaje → menú | Excel (Exportar, Importar), Cambiar en bloque, Eliminar en rojo; con iconos | |
| 7.2 | E | Exportar todo | Pregunta dónde guardar; Excel con Instrucciones, datos, Notas; ZIP con imágenes si se pide | |
| 7.3 | E | Exportar con filtros (productos: fabricantes, tipos, categorías, subcategorías; categorías por tipo; subcategorías por tipo y categoría) | Solo lo elegido; combos dependientes | |
| 7.4 | E | Importar el mismo Excel sin cambios | Informe «sin cambios», no se guarda nada | |
| 7.5 🧪 | E | Importar con una fila nueva, una editada y una «Borrar» | Informe correcto; un único commit; la borrada desaparece | |
| 7.6 🧪 | E | Editar una ficha en el panel después de exportar e importar el Excel viejo | Avisa de que la ficha cambió en el panel | |
| 7.7 🧪 | E | Cambiar en bloque: marcar / quitar «Solo para pruebas»; productos: no disponible / disponible | Lista premarcada, informe, un commit | |
| 7.8 🧪 | E | Eliminar… (escribir el número) | Borra; en máquinas, las quita de «Compatible con» de sus accesorios | |
| 7.9 | E | Páginas → Exportar a Word | Un .docx por página, con los datos de la tienda rellenos | |

## 8. Fichas (editor)

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 8.1 | L, E | Abrir una ficha y pulsar en un campo | Etiqueta del campo en rojo, borde rojo; letra de la web | |
| 8.2 | L, E | Vista previa (ojo) | Producto, Páginas, Contacto, Sobre nosotros y Solicitud con el aspecto de la web | |
| 8.3 🧪 | E | Crear un producto «Prueba…» con «Solo para pruebas», guardar y publicar (flujo editorial) | Pasa por Borrador → En revisión → Listo → Publicado | |
| 8.4 | L, E | Botón «Nuevo …» de cada lista | «Nueva entrada del blog», «Nuevo producto»… | |
| 8.5 | L, E | Campo Catálogo del producto | Tres desplegables dependientes en el orden del menú | |
| 8.6 | E | Vista previa de una entrada del blog | Migas, píldoras (tema, fecha, minutos), entradilla, compartir, foto con pespunte, texto y recuadro final | |
| 8.7 | E | Vista previa de un tipo, una categoría y una subcategoría | Como su página: título con la letra de la marca, recuadro con tijeras, tarjetas de sus hijas con su número | |
| 8.8 | E | Vista previa de un fabricante | Su logo en una tarjeta, en la ficha, en el filtro y en Sobre nosotros | |
| 8.9 | E | Solicitud de presupuesto → vista previa | Debajo, los dos correos (al cliente y a la tienda) con los textos que escribes, y su versión de texto | |

## 8b. Ajustes del sitio

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 8b.1 | L, E | Abrir Ajustes del sitio | Pestañas Web / Panel / General con su explicación; en cada una, sus secciones plegadas con «N opciones»; al abrir una salen sus campos enmarcados; «Guardar» guarda todo | |
| 8b.1b | L, E | General → «Datos de la tienda» y «Solicitud de presupuesto» | Al abrirlas, un enlace que lleva a «Contacto y horario» y a «Solicitud de presupuesto» | |
| 8b.2 🧪 | E | Web → Franja de aviso: marcar, texto, «Hasta» = mañana; desplegar | Franja arriba en todas las páginas; pasado «Hasta» (tras la reconstrucción diaria) desaparece | |
| 8b.3 🧪 | E | Textos de los precios, «Más en…» = 2, «Novedad» = 30 días, texto final del pie | Se ven en el pie, en las categorías, en «Precio a consultar», en la ficha y en las tarjetas | |
| 8b.4 🧪 | E | Icono de la pestaña: subir un PNG cuadrado | Tras desplegar, el icono nuevo en la pestaña del navegador y al añadir al móvil | |
| 8b.5 🧪 | E | Panel → productos por página 24, vista inicial «Tabla» | Las listas empiezan así | |
| 8b.6 🧪 | E | Panel → desmarcar «Usar los colores y letras de la web» | El panel vuelve al aspecto de Decap (y al marcarlo, al de la web) | |
| 8b.7 🧪 | E | General → zona horaria «Canarias» | Las ofertas cambian de día a la medianoche de Canarias; «Abierto ahora» con la hora de Canarias. Volver a Madrid al terminar | |
| 8b.8 | L, E | Pasar el ratón por las ⓘ de Ajustes (también dentro de los desplegables) | Sale la explicación del campo; ningún campo sin ⓘ (en la consola del navegador no sale «Ayuda: el campo … no tiene texto») | |

## 9. Estética

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 9.1 | L, E | Recorrer listas, ventanas del engranaje y Medios | Rojo de la marca en botones y elementos activos, fondo crema, tarjetas con pespunte, insignias gris claro | |
| 9.2 | E | Cambiar el color «Acento» en Ajustes → Apariencia y desplegar | El panel toma el nuevo color tras el despliegue | |

## 11. Después de actualizar Decap

Repetir 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 5.1, 6.1–6.3, 8.1, 8.2, 9.1 y todo [PANEL-MOVIL.md](PANEL-MOVIL.md). Si algo de lo propio
no aparece, mirar en el navegador (F12) el nombre de la pieza de Decap (p. ej. `AppHeaderQuickNewButton`,
`SidebarNavLink`, `StyledModal`, `ToolbarSectionMain`) y ajustarlo en `public/admin/tema-panel.css` o en
`public/admin/excel/panel.js`.

## 12. Al terminar

- Borrar lo creado para las pruebas (engranaje → Eliminar…, filtrando «Pruebas: Sí» y por nombre «Prueba»).
- Medios → «Sin usar»: borrar las fotos de prueba.
- Si algo se estropeó, volver a importar los Excel y ZIP de la copia de seguridad (README.md).
