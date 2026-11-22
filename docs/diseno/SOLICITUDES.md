# Diseño técnico: solicitud de presupuesto

Cómo funciona la solicitud de presupuesto de punta a punta: el navegador, la función de Cloudflare, el
script de Google y los correos. Configuración paso a paso en [`docs/solicitudes/CONFIGURAR.md`](../solicitudes/CONFIGURAR.md);
gestión diaria (para la tienda) en la guía en PDF de [`docs/manuales/`](../manuales/).

Vuelta a la [arquitectura](../ARQUITECTURA.md).

## 1. Piezas

| Pieza | Fichero | Responsabilidad |
|---|---|---|
| Página `/presupuesto/` | `scripts/build.js` (sección 9c) | HTML de la solicitud, formulario, ventana de condiciones; `productos.json` |
| Catálogo del servidor | `lib/generado/solicitud-datos.js` (lo genera el build, no está en Git) | Productos publicados con precio, oferta, fabricante, foto; textos, límites, versión del consentimiento, diseño de los correos |
| Navegador | `public/js/presupuesto.js` | Lista en `localStorage`, interfaz, validación previa, ALTCHA, envío |
| Funciones | `functions/api/solicitud.js`, `desafio.js`, `estado-solicitudes.js` | Envoltorios finos de Cloudflare |
| Lógica del servidor | `lib/solicitud-api.js` | Origen, antispam, límites, verificación, llamada al script, respuestas |
| Validación y precios | `lib/solicitud.js` | Reglas de los campos y cálculo con el catálogo publicado |
| «No soy un robot» | `lib/verificacion.js` (ALTCHA con Web Crypto) | Crear y comprobar desafíos (PBKDF2/SHA-256, firmados con `ALTCHA_SECRETO`) |
| Correos | `lib/correos.js` | Aviso a la tienda y acuse al cliente, en HTML y en texto |
| Hoja de Google | `docs/solicitudes/apps-script.gs` | Numerar, guardar, mandar los correos, topes |
| Pruebas | `lib/solicitud.test.mjs` | `npm test` |

## 2. Secuencia

Ver el diagrama de [ARQUITECTURA.md §4.2](../ARQUITECTURA.md#42-solicitud-de-presupuesto). En resumen:

1. El navegador guarda solo `{ id, cantidad, nota }` y pinta nombres y precios con `/presupuesto/productos.json`
   (si un producto ya no está publicado, lo quita y avisa).
2. Al enfocar el formulario, el widget ALTCHA pide un desafío a `GET /api/desafio` y lo resuelve.
3. `POST /api/solicitud` con los datos.
4. La función valida, recalcula y llama al script; el script guarda y manda los correos.
5. El navegador muestra el número y vacía la lista.

## 3. API

### `POST /api/solicitud`

Cuerpo (JSON; también se admite `application/x-www-form-urlencoded`, máximo 60.000 caracteres):

| Campo | Tipo | Notas |
|---|---|---|
| `nombre`, `telefono`, `correo` | texto | Obligatorios. Nombre: ≥ 2 letras, ≤ 120. Teléfono: 9-15 cifras, solo `0-9 + ( ) . -` y espacios. Correo: formato válido, ≤ 160 |
| `preferencia` | lista | Valores de `preferencia_contacto.opciones` (`llamada`, `whatsapp`, `correo`); al menos una |
| `observaciones` | texto | ≤ 2.000 caracteres y ≤ 2 enlaces |
| `productos` | lista `{ id, cantidad, nota }` | Máximo 200 líneas; cantidad 1-99; nota ≤ 300; `id` con `~cabezal` para el cabezal; los repetidos se suman |
| `altcha` | texto | Solución del desafío |
| `acepto` | `si` | Casilla de condiciones |
| `web` | texto | **Campo trampa**: oculto, debe llegar vacío |
| `_t` | número (ms) | Tiempo de rellenado |

Respuestas:

| Código | `error` | Cuándo |
|---|---|---|
| 200 | — | Guardada: `{ ok: true, numero: "S-2026-0001", acuse: true, mensaje }`. También 200 **falso** (sin guardar) si salta una trampa |
| 403 | `cerrado` / `origen` | Solicitud desactivada en el panel / la petición no viene de la propia web |
| 405 | — | Método distinto de POST |
| 409 | `no_disponibles` | Algún producto ya no está publicado (se devuelve la lista) |
| 413 | `tamano` | Cuerpo demasiado grande |
| 422 | `revisar` | Errores por campo (`errores: { campo: mensaje }`), verificación caducada o repetida |
| 429 | `limite` | Más de 5 envíos en 10 minutos desde la misma conexión, o tope global por hora del script |
| 502 | `guardar` | El script no contestó bien (tiempo agotado: 20 s) |
| 503 | `configuracion` | Faltan variables en Cloudflare |

### `GET /api/desafio`

Devuelve un desafío ALTCHA nuevo (503 si falta `ALTCHA_SECRETO`).

### `GET /api/estado-solicitudes?clave=…`

Diagnóstico protegido con `DIAGNOSTICO_CLAVE` (sin ella o con otra clave, 404). Dice si están las variables,
si la verificación funciona, si el script responde y acepta la clave, su versión, la cuota de correos que le
queda y la fecha del catálogo. **No escribe nada ni muestra secretos.** Lo usa la comprobación diaria.

## 4. Reglas del servidor

- **Los precios nunca vienen del navegador**: `comprobarSolicitud()` busca cada `id` en el catálogo generado y
  aplica `precioAplicado()`: precio de oferta si la fecha de envío (hora de Madrid) está entre `inicio` y `fin`
  y es menor que el normal; si no, el normal; sin precio, «a consultar».
- **Antispam sin servicios externos**: campo trampa, tiempo mínimo de 3 s, límite por conexión en memoria (la
  IP no se guarda), ALTCHA, máximo de enlaces y, en el script, límite global por hora y verificación de un solo
  uso (se recuerda una hora).
- **Origen**: `Origin` o `Referer` debe ser la propia web.
- **Consentimiento**: se guarda la versión (huella SHA-256 del texto de la casilla y de la información básica de
  protección de datos), no el texto.

## 5. Script de Google (`apps-script.gs`, versión 2)

Publicado como aplicación web («Cualquier usuario») en la cuenta de la tienda. Propiedades del script:
`SECRETO` (la misma que `SOLICITUDES_SECRETO`) y `AVISO_PARA` (correo de la tienda).

| Paso | Detalle |
|---|---|
| Autorización | Solo acepta peticiones con la clave correcta |
| Bloqueo | `LockService` para que dos solicitudes a la vez no reciban el mismo número |
| Verificación repetida | Si el identificador de ALTCHA ya se usó, `repetido` |
| Límite por hora | Global, ≤ `MAX_POR_HORA` (300) y el del panel |
| Número | `S-<año>-<NNNN>` con un contador por año en las propiedades (`contador-<año>`) |
| Hoja | Crea las pestañas y cabeceras si faltan; una fila en «Solicitudes» (estado `Nueva` con desplegable) y una por producto en «Líneas»; todo como texto y con fórmulas neutralizadas |
| Correos | Acuse al cliente y aviso a la tienda con los HTML que manda la función (`{{NUMERO}}`, `{{HOJA}}`, `{{ACUSE}}`, `{{CUOTA}}`); topes diarios (≤ 90 cada uno y los del panel); en la hoja, «Acuse enviado: Sí / No (tope diario)» |
| Respuesta | `{ ok, numero, acuse }` |

Columnas: ver [MODELO-DE-DATOS.md](MODELO-DE-DATOS.md) y la guía en PDF. No se deben renombrar pestañas ni
columnas: el script escribe por nombre de cabecera.

## 6. Correos (`lib/correos.js`)

- Los monta la función con los datos ya comprobados y el diseño del build (colores, cabecera PNG
  `/img/correo/cabecera.png`, miniaturas `-correo.jpg`, datos de contacto, textos del panel).
- **Acuse al cliente**: nunca lleva nada escrito por el cliente (ni nombre ni observaciones), para que el
  formulario no sirva para mandar textos a terceros.
- **Aviso a la tienda**: datos de contacto escapados, productos, observaciones y notas; botones Llamar,
  WhatsApp y Responder montados con los datos comprobados; enlace a la hoja (opcional).
- Estilos en línea, sin JavaScript ni formularios (Gmail y Outlook).
- La vista previa del panel usa el mismo fichero (el build lo copia a `/admin/correos.js`).

## 7. Variables

| Dónde | Nombre | Uso |
|---|---|---|
| Cloudflare (por entorno) | `SOLICITUDES_URL` | URL `/exec` del script |
| | `SOLICITUDES_SECRETO` | Clave compartida con el script |
| | `ALTCHA_SECRETO` | Firma de los desafíos (≥ 20 caracteres) |
| | `DIAGNOSTICO_CLAVE` | Clave del diagnóstico (≥ 16 caracteres) |
| GitHub (secreto) | `DIAGNOSTICO_CLAVE` | La misma que en Cloudflare producción, para la comprobación diaria |
| Script de Google | `SECRETO`, `AVISO_PARA` | Ver arriba |

## 8. Cómo probar

- `npm test`: validación, precios, ofertas por fecha, antispam y respuestas (con `fetch` simulado).
- En un entorno de pruebas con una hoja de pruebas: solicitud real y comprobar la fila, el aviso y el acuse.
- Diagnóstico: `https://<entorno>/api/estado-solicitudes?clave=…`.
