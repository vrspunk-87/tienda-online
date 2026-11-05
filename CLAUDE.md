# Instrucciones para Claude Code — tienda online

Este fichero lo lee Claude Code al empezar. Resume el proyecto, en qué punto está y las normas de
trabajo. Cuando exista, la documentación completa estará en `README.md` y en `docs/`: **léela antes
de cambiar algo que no conozcas**.

## Norma principal: solo modificar ficheros, nunca Git

- **Nunca hagas commits, push, merge, rebase, checkout, reset, stash, tags ni ninguna otra
  operación que cambie el repositorio o las ramas.** Tampoco uses `gh` ni la CLI de `vercel`.
- **Solo puedes modificar ficheros** en esta carpeta. La persona que te lo pide revisa los
  cambios (Sourcetree → File Status) y hace ella el commit y el push.
- Sí puedes usar Git **solo para leer**: `git status`, `git diff`, `git log`, `git branch`,
  `git show`.
- Al terminar, resume **qué ficheros has cambiado y por qué**, **qué hay que comprobar** después
  (en local, en el entorno de pruebas y en producción) y propón el **mensaje del commit**.

`.claude/settings.json` bloquea además esas órdenes de Git, por si acaso.

## Qué es el proyecto

Una **tienda online sin pago en la web**: el cliente elige productos y envía un **pedido**, que
llega a una **hoja de Google** (como las propuestas de la web de la plataforma), con aviso por
correo. El cobro y la entrega se gestionan fuera de la web.

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
  Google, avisos por correo, diagnóstico): base para los **pedidos**.
- Despliegue con GitHub Actions, entornos de prueba y gitflow, Dependabot (`cooldown` de 14 días),
  comprobación diaria, `scripts/actualizar-decap.js` y la hoja de tareas sincronizada con Trello
  (`scripts/trello-a-excel.js`).

## Estado

**Vacío.** Lo siguiente es el **plan por fases** y la estructura base:

1. Catálogo: colecciones de Decap (fabricantes, categorías con subcategorías por relación,
   productos) y menú generado desde las categorías.
2. Fichas de producto y listados por categoría, subcategoría y fabricante (con datos
   estructurados de producto para Google y filtros en el buscador).
3. Cesta en el navegador y pedido: **el servidor recalcula los precios con el catálogo que genera
   el build; nunca se fía de los precios que envía el navegador**. Número de pedido y estado en la
   hoja; aviso a la tienda y, si se decide, confirmación al cliente.
4. Lo legal y la puesta en marcha.

### Decisiones pendientes (antes de construir)

- **Alojamiento**: el plan gratuito de Vercel (Hobby) es para uso **personal y no comercial**; una
  tienda es uso comercial. Opciones: Vercel Pro (de pago) u otro alojamiento cuyo plan gratuito
  permita uso comercial (p. ej. Cloudflare Pages). **Comprobar las condiciones vigentes.** El
  despliegue por GitHub Actions de la plataforma existe por una limitación de Vercel Hobby: puede no
  hacer falta.
- **Legal**: aunque no se pague en la web, venta a consumidores → información precontractual,
  condiciones de venta, desistimiento, aviso legal; los pedidos llevan **datos personales**
  (política de privacidad, plazo de conservación). Lo debe revisar alguien con conocimientos
  legales.
- **Tamaño del catálogo**: con decenas o pocos cientos de productos, todo como en la plataforma. Con
  miles o cambios de precio frecuentes: importación desde CSV/Excel (Decap no edita en bloque) e
  imágenes fuera del repositorio (p. ej. Cloudinary).

### Preguntas abiertas a Víctor

- ¿Cuántos productos, aproximadamente, y cada cuánto cambian los precios?
- ¿Variantes (talla, color…) o stock que controlar?
- ¿Se muestran precios o es una petición de presupuesto?
- ¿Correo de confirmación al cliente?
- ¿Quién gestiona los pedidos y cómo (estados, avisos)?

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
  (sin comodines en `*.vercel.app` u otros dominios compartidos).
- Todo el HTML generado pasa por `sanitize-html`. Política de seguridad de contenidos (CSP) en las
  páginas públicas: nada de scripts en línea (la cesta, en un fichero JS propio).
- Pedidos: validación en el servidor, CAPTCHA (ALTCHA), límites, **precios recalculados en el
  servidor** y avisos sin datos personales innecesarios. Las claves van en el alojamiento o en
  GitHub: **nunca en el código**.
- Si un cambio afecta a cualquiera de estos puntos, explícalo claramente en el resumen final.
