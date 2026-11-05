# Instrucciones para Claude Code — tienda online

Este fichero lo lee Claude Code al empezar. Resume el proyecto, en qué punto está y las normas de
trabajo. Cuando exista, la documentación completa estará en `README.md` y en `docs/`: **léela antes
de cambiar algo que no conozcas**.

## Norma principal: solo modificar ficheros, nunca Git

- **Nunca hagas commits, push, merge, rebase, checkout, reset, stash, tags ni ninguna otra
  operación que cambie el repositorio o las ramas.** Tampoco uses `gh`, la CLI de `vercel` ni
  despliegues con `wrangler` (`wrangler pages deploy`); `npm run funciones` (prueba local) sí.
- **Solo puedes modificar ficheros** en esta carpeta. La persona que te lo pide revisa los
  cambios (Sourcetree → File Status) y hace ella el commit y el push.
- Sí puedes usar Git **solo para leer**: `git status`, `git diff`, `git log`, `git branch`,
  `git show`.
- Al terminar, resume **qué ficheros has cambiado y por qué**, **qué hay que comprobar** después
  (en local, en el entorno de pruebas y en producción) y propón el **mensaje del commit**.

`.claude/settings.json` bloquea además esas órdenes de Git, por si acaso.

## Qué es el proyecto

Una **tienda online sin venta ni pago en la web**: un catálogo con **precios orientativos** en el
que el cliente reúne productos en una **lista de presupuesto** y envía una **solicitud de
presupuesto**. La solicitud llega a una **hoja de Google** (como las propuestas de la web de la
plataforma), con aviso a la tienda y acuse de recibo al cliente. La tienda contacta al cliente y,
si se ponen de acuerdo, la venta se cierra fuera de la web.

- **Productos**, cada uno asociado a un **fabricante** y a una **categoría / subcategoría**.
- Las **categorías y subcategorías son las opciones del menú** de la web.
- **Páginas, fabricantes y productos editables desde el panel** de administración.

### Base: la web de la plataforma

Se parte del proyecto **`web-plataforma`** (repositorio `vrspunk-87/web-plataforma`; en el equipo de
Víctor, en `Downloads/plataforma-politica/web-plataforma`). **Se copia y se adapta aquí; nunca se
modifica `web-plataforma` desde este proyecto.** Lo que se reaprovecha:

- Generador estático propio (`scripts/build.js`, `scripts/layout.js`): páginas, listados con
  paginación, menú, imágenes WebP con `sharp`, sitemap, SEO, buscador Pagefind, 404.
- Panel **Decap CMS** (login con GitHub vía `api/auth.js` y `api/callback.js`, flujo editorial,
  vista previa con el estilo de la web). Ojo: desde Decap 3.10, `public_folder` sin barra
  (`"img"`) y el build normaliza a `/img/…` (ver el README de la plataforma).
- **Formulario** (`api/propuesta.js`, `api/_lib/formulario.js`, ALTCHA, Apps Script → hoja de
  Google, avisos por correo, diagnóstico): base para las **solicitudes de presupuesto**.
- Despliegue con GitHub Actions, entornos de prueba y gitflow, Dependabot (`cooldown` de 14 días),
  comprobación diaria, `scripts/actualizar-decap.js` y la hoja de tareas sincronizada con Trello
  (`scripts/trello-a-excel.js`).

## Estado

**Fase 0 cerrada; fase 1a (base en local) hecha; fase 2 (catálogo en el panel) y parte de la 4
(menú, portada, categorías, ficha básica) hechas; fase 1b (despliegue en Cloudflare) pendiente.**
Hay datos de catálogo «Solo para pruebas» (fabricantes «Marca Prueba…», categorías y 12 productos
con fotos provisionales `prueba-*.jpg`): se ven en local y en pruebas, nunca en producción; se
borran cuando haya datos reales.
Base copiada y adaptada de la plataforma: generador, panel, blog, tema provisional «Tienda»,
borradores legales y login del panel como funciones de Cloudflare (`functions/api/`,
`lib/origenes.js`). Logo, iconos y colores **provisionales**. Detalle en
[README.md](README.md); **plan por fases: [docs/PLAN.md](docs/PLAN.md)** (fases 0 a 8).

**Instalar y construir desde Linux (Claude Code):** en la carpeta conectada npm no puede renombrar
`node_modules`; se copia el proyecto a una carpeta de trabajo fuera de ella (sin `node_modules`,
`.git` ni `dist`), se hace `npm ci` / `npm run build` allí y solo se devuelve `package-lock.json`
si cambia.

## Decisiones (5-11-2026; detalle y motivos en docs/PLAN.md, fase 0)

- **Vocabulario**: «lista de presupuesto» y «solicitud de presupuesto», **no** «cesta», «pedido» ni
  «compra»; «precio orientativo».
- **Catálogo**: unos **200 productos**, sin variantes ni stock, **máximo 5 fotos** por producto,
  imágenes en el repositorio (el build avisa a partir de 700 MB). Carga y modificación **en
  bloque** con Excel + carpeta de imágenes (la hace Víctor; quizá la tienda más adelante), además
  del panel, donde editan Víctor y la tienda.
- **Estados del producto**: **disponible**; **en oferta** (precio de oferta entre dos fechas, por
  días, hora de Madrid; se muestran precio anterior tachado, porcentaje y fecha de fin);
  **no disponible** (retirado de la web pública, 404; solo queda en el panel).
- **Nombre**: **Máquinas de Coser Zafra** (Zafra, Badajoz); logo, iconos y colores siguen provisionales.
- **Producto**: fabricante, **modelo** (obligatorio) y **referencia** (opcional); clave interna =
  **identificador** (nombre del fichero, no cambia). **Accesorios** = productos con «compatible con»
  (relación guardada en el accesorio, se muestra en las dos fichas).
- **Condición**: nuevo o **segunda mano** (indicado en la ficha, con estado y garantía de al menos
  12 meses).
- **Ficha**: fotos en **carrusel** que se amplía al pulsar (fase 4; ahora, ficha básica).
- **Fabricantes**: nombre e imagen, **sin página**; solo para asociar y filtrar.
- **Menú**: Catálogo (primera opción, desplegable automático de categorías y subcategorías, que son
  páginas del panel), Sobre nosotros (→ Dónde estamos), Contacto y horario, Blog.
- **Portada y /catalogo/**: resumen del catálogo barajado en cada visita y Ofertas (primero las que
  empezaron más recientemente), 8 por página, ajustable en Ajustes → Listados.
- **Precios**: «Precio orientativo, IVA incluido». El precio de oferta **se respeta** si la
  solicitud llega dentro de las fechas.
- **Solicitud**: **nombre, correo y teléfono obligatorios**; «Observaciones», opcional. Número
  correlativo y estado en la hoja; aviso a la tienda y acuse al cliente.
- **Cuentas**: GitHub (repositorio privado) y Cloudflare en las cuentas personales de Víctor; la
  hoja y los correos, en la **cuenta gratuita de Google (Gmail) de la tienda** (cupo de unos 100
  correos al día → topes); la dirección de los avisos se guarda en el script, no en la web.
- **Alojamiento**: **Cloudflare Pages, plan gratuito** (uso comercial permitido; Vercel Hobby no lo
  permite). Las funciones van en `functions/api/` (formato de Cloudflare) y deben ser ligeras
  (10 ms de CPU por petición); límite de 20.000 ficheros por despliegue.
- **Dominio**: se compra **al final**; hasta entonces, direcciones `pages.dev` con `noindex`.
- **Legal**: borradores de partida en `public/_paginas/` y
  [docs/BORRADORES-LEGALES.md](docs/BORRADORES-LEGALES.md) (con preguntas para quien revise).
  En el desistimiento, devolución a cargo del cliente y revisión del producto antes de reembolsar
  (descontando la pérdida de valor, no negando el reembolso). **Pendiente: quién los revisa** y
  los datos de la tienda (titular, NIF, dirección…).

## Normas del proyecto

- **Trabaja sobre los ficheros tal como están ahora**: no sustituyas un fichero entero por una
  versión propia; haz cambios concretos encima de lo que hay.
- **El contenido es de quien edita** (lo que se gestione desde el panel): no cambies textos de
  contenido salvo que se pida expresamente; si un cambio de código lo necesita, dilo antes.
- **Todo en español**: textos de la web, comentarios del código, mensajes del build y
  documentación. Tipografía: comillas «», apóstrofo ’ en los textos visibles.
- **Documenta cada cambio** en `README.md` o en el documento de `docs/` que corresponda.
- **Dependencias**: versiones exactas en `package.json` (sin `^`), `package-lock.json` actualizado
  y versiones publicadas hace **al menos dos semanas**. Lo mismo para las acciones de GitHub.
  `npm audit` sin vulnerabilidades. Nada servido desde CDN externos: todo desde la propia web.
- **Avisos del build**: `console.warn('Aviso: …')` para lo que alguien deba corregir.
- **Finales de línea**: en el equipo de Víctor los ficheros de trabajo usan CRLF (Git en Windows
  con `core.autocrlf`); mantenlos al editar. Al leer `git status` desde Linux pueden salir ficheros
  «modificados» solo por eso: comprueba con `git diff --ignore-cr-at-eol`.
- **Hojas de cálculo (.xlsx)**: pide cerrarlas en Excel antes de escribirlas (si están abiertas,
  Excel puede guardar encima una versión antigua) y comprueba el fichero en la carpeta después de
  guardarlo.

## Seguridad (no romper)

- Login del panel: verificación del `state` y entrega del token **solo** a una lista exacta de webs
  (sin comodines en `*.pages.dev` u otros dominios compartidos).
- Todo el HTML generado pasa por `sanitize-html`. Política de seguridad de contenidos (CSP) en las
  páginas públicas: nada de scripts en línea (la lista de presupuesto y el carrusel, en ficheros JS
  propios).
- Solicitudes de presupuesto: validación en el servidor, CAPTCHA (ALTCHA), límites, **precios recalculados en el
  servidor** y avisos sin datos personales innecesarios. Las claves van en el alojamiento o en
  GitHub: **nunca en el código**.
- **Nunca** un formulario que pida datos de tarjeta u otros medios de pago: el plan gratuito de
  Cloudflare lo prohíbe y la tienda no cobra en la web.
- Si un cambio afecta a cualquiera de estos puntos, explícalo claramente en el resumen final.
