# Planes de prueba

Pruebas a mano de la web y del panel, cada una en dos versiones (ordenador y móvil):

| Plan | Para qué |
|---|---|
| [WEB-ORDENADOR.md](WEB-ORDENADOR.md) | La web pública en un ordenador (Chrome o Edge, ventana grande) |
| [WEB-MOVIL.md](WEB-MOVIL.md) | La web pública en un móvil de verdad (Android con Chrome e iPhone con Safari) |
| [PANEL-ORDENADOR.md](PANEL-ORDENADOR.md) | El panel de edición (`/admin/`) en un ordenador |
| [PANEL-MOVIL.md](PANEL-MOVIL.md) | El panel de edición en un móvil |

Sirven para dar por buena una versión antes de llevarla a producción, para repasar el panel **después de
actualizar Decap** (`scripts/actualizar-decap.js`; ver el apartado «Después de actualizar Decap» de
PANEL-ORDENADOR.md) y antes de la salida real (docs/PLAN.md, fase 8).

## Cómo se usan

- Cada prueba dice **dónde** hacerla:
  - **L** = local: `npm run web` (y `npm run panel` para el panel). En local la solicitud de presupuesto no
    se envía (para probar el envío en local: `npm run funciones`).
  - **E** = entorno de pruebas `dev-victor` (https://dev-victor.maquinas-de-coser-zafra.pages.dev), con GitHub.
  - **P** = producción (https://www.maquinasdecoserzafra.es): solo mirar, sin crear nada.
- Marca la última columna con ✅ o ❌ y apunta al lado lo que falle (qué pantalla, qué hiciste, qué salió).
  Una captura de pantalla ayuda mucho.
- Las pruebas con **🧪** crean, cambian o borran datos o mandan correos.

## Antes de empezar

1. **Copia de seguridad (obligatoria antes de cualquier prueba 🧪):** en el panel del entorno donde vayas a
   probar, engranaje → «Exportar a Excel…» → «Todo» (con ZIP de imágenes) en Fabricantes, Tipos de producto,
   Categorías, Subcategorías, Productos, Blog y Páginas; y Páginas → «Exportar a Word…». Guarda los ficheros
   fuera del repositorio.
2. Lo que crees para probar: siempre con «Solo para pruebas» marcado y con un nombre que empiece por
   «Prueba». Al terminar, bórralo (último apartado de PANEL-ORDENADOR.md).
3. Pruebas automáticas, en el ordenador: `npm test` (todas en verde) y `npm run build` (acaba con
   «0 enlaces rotos» y sin líneas «Aviso:» nuevas).
4. En el móvil, prueba con el móvil de verdad (no solo con el modo móvil del navegador del ordenador) y con
   la conexión de datos alguna vez (no solo wifi).
5. Si una prueba falla, sigue con las demás y apúntalo: luego se corrige todo junto.

## Resumen de resultados

| Plan | Fecha | Entorno | ✅ | ❌ | Notas |
|---|---|---|---|---|---|
| Web · ordenador | | | | | |
| Web · móvil | | | | | |
| Panel · ordenador | | | | | |
| Panel · móvil | | | | | |
