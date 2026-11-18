# Plan de pruebas · Panel en el móvil

El panel de edición (`/admin/`) en un móvil de verdad (Android con Chrome y, si se puede, iPhone con Safari),
en vertical. En el móvil el panel se adapta por debajo de 800 px de ancho (public/admin/tema-panel.css).
Preparación y forma de marcar: [README.md](README.md) (**copia de seguridad antes de las pruebas 🧪**).
Lo que funciona igual que en el ordenador está en [PANEL-ORDENADOR.md](PANEL-ORDENADOR.md); aquí va lo
propio del móvil. Entorno: **E** (dev-victor), con tu usuario de GitHub.

## 1. Entrar, cabecera y menú

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 1.1 | E | Entrar en /admin/ e iniciar sesión con GitHub | Se abre la ventana de GitHub y vuelve al panel con la sesión iniciada | |
| 1.2 | E | Mirar la cabecera | En una línea: tres rayas, logo, lupa, «+», engranaje (solo tú) y avatar; nada se sale por los lados | |
| 1.3 | E | Tres rayas | Se abre «Colecciones» (y Contenido / Flujo editorial / Medios); al elegir una sección, se cierra | |
| 1.4 | E | Lupa | Sale el buscador a lo ancho; al escribir y pulsar «Ir» / Intro, busca | |
| 1.5 | E | «+» (Acceso rápido) | Menú con «Añadir» y «Editar» que cabe en la pantalla | |
| 1.6 | E | Engranaje | Abre «Ajustes del sitio» | |

## 2. Listas y tablas

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 2.1 | E | Productos | Cabecera de la sección (título, engranaje y «Nuevo producto») a lo ancho; grupos plegados con ⚠ y número | |
| 2.2 | E | Abrir un grupo | Productos como tarjetas: foto, nombre y datos con su título (Fabricante: …, Precio: …) | |
| 2.3 | E | «Ordenar…» y «Filtros» encima de la tabla | Ordenar cambia el orden; «Filtros» muestra los filtros en dos columnas y filtran | |
| 2.4 | E | Botón ⚠ junto a las vistas | Solo los productos con avisos | |
| 2.5 | E | Pulsar el ⚠ de una tarjeta | Sale el globo con los avisos; se cierra al pulsar fuera; «Entendido» (en una oferta terminada) funciona | |
| 2.6 | E | Fabricantes / Categorías: pulsar una fila | Se despliegan sus productos debajo; el lápiz abre la ficha | |
| 2.7 | E | Paginación y «Por página» | Caben y funcionan | |
| 2.8 | E | Buscador de la cabecera (lupa) | Resultados por secciones en tarjetas; píldoras de sección y botón ⚠ | |

## 3. Fichas (editor)

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 3.1 | E | Abrir un producto | Arriba «←» y el nombre; campos a lo ancho; Guardar / Publicar / Eliminar fijos abajo | |
| 3.2 | E | Bajar hasta el final | La vista previa sale debajo de los campos; los botones ojo y flechas a la derecha no tapan lo que escribes | |
| 3.3 | E | Botón ojo | Oculta o enseña la vista previa | |
| 3.4 | E | Campo Catálogo (tres desplegables) y Fabricante | Se abren y se eligen bien con el dedo | |
| 3.5 | E | Fotos del producto: añadir, ordenar, quitar | Se puede (subir una foto desde la galería o la cámara del móvil) | |
| 3.6 | E | Texto de la descripción | Se escribe y se ve la barra de formato | |
| 3.7 🧪 | E | Cambiar un dato de un producto de prueba y guardar / publicar | Se guarda; el cambio sale en la web tras el despliegue | |
| 3.8 | E | «←» para volver | Vuelve a la lista | |

## 4. Medios y engranaje

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 4.1 | E | Medios (menú de tres rayas) | Ventana a pantalla completa, pestañas que caben (se parten en dos líneas si hace falta), la ✕ arriba a la derecha | |
| 4.2 | E | Pestaña Productos → elegir un fabricante | Fotos en dos columnas; al pulsar una, su detalle con «Lo usa: …» | |
| 4.3 🧪 | E | «Subir…» una foto desde el móvil (Fabricantes) | Se sube reducida y sale en la lista | |
| 4.4 | E | Engranaje de una sección → Exportar a Excel | La ventana de filtros cabe y se puede usar; se descarga el Excel | |
| 4.5 | E | Engranaje → Importar | Se puede elegir el Excel desde el móvil; el informe se lee | |

## 5. Ajustes del sitio y Solicitud

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 5.1 | E | Ajustes del sitio | Pestañas y secciones plegables caben; al abrir una sección, sus campos a lo ancho | |
| 5.2 | E | Pulsar una ⓘ | Sale su explicación (dentro de la pantalla); al pulsar fuera se cierra; no se enfoca el campo | |
| 5.3 | E | Solicitud de presupuesto → vista previa (botón ojo) | Se ven los dos correos (se puede desplazar dentro de cada uno) | |

## 6. Comprobaciones generales

| # | Dónde | Qué hacer | Qué tiene que pasar | ✅/❌ |
|---|---|---|---|---|
| 6.1 | E | Girar el móvil a horizontal (lista y ficha) | Sigue usable | |
| 6.2 | E | Estética | Letra y colores de la web, pespuntes, insignias gris claro, botones rojos | |
| 6.3 | E | Cerrar el navegador y volver a entrar | Sigue con la sesión iniciada | |
