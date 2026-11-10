# Configurar el envío de solicitudes de presupuesto (fase 5)

Cuando un cliente envía su solicitud desde `/presupuesto/`, la web (Cloudflare Pages Functions):

1. comprueba la casilla «No soy un robot» (ALTCHA, sin cookies ni servicios de terceros) y los datos;
2. recalcula precios y ofertas con el catálogo publicado (no se fía de lo que manda el navegador);
3. se lo pasa a un **script de Google** pegado en una **hoja de Google**, que le da número
   (`S-2026-0001`), lo guarda, avisa a la tienda y manda el acuse de recibo al cliente.

El código es el mismo para pruebas y para la tienda: solo cambia **qué hoja** y **qué variables** hay en
Cloudflare. Mientras no exista la cuenta de Google de la tienda se usa una cuenta de pruebas y solo el
entorno **Preview** (ramas `develop` y `dev-victor`).

Tiempo: unos 20 minutos.

---

## 1. Hoja de Google y script

1. Entra en Google con la cuenta que va a recibir las solicitudes (ahora, la de pruebas).
2. Crea una hoja nueva en <https://sheets.new> y llámala, por ejemplo, «Solicitudes de presupuesto (pruebas)».
   No hace falta crear pestañas ni cabeceras: el script crea «Solicitudes» y «Líneas» con la primera solicitud.
3. Menú **Extensiones → Apps Script**. Se abre el editor con un fichero `Código.gs`.
4. Borra todo lo que tenga y pega el contenido completo de [`apps-script.gs`](apps-script.gs). Guarda (icono del disquete).
5. Ponle nombre al proyecto (arriba a la izquierda), p. ej. «Solicitudes Zafra».

## 2. Claves y correo de aviso

1. En el desplegable de funciones (barra superior, junto a «Ejecutar») elige **`crearSecreto`** y pulsa **Ejecutar**.
   - La primera vez Google pide permisos: **Revisar permisos** → elige la cuenta → «Google no ha verificado
     esta aplicación» → **Configuración avanzada** → **Ir a Solicitudes Zafra (no seguro)** → **Permitir**.
     Es normal: el script es tuyo y solo puede tocar esta hoja y mandar correos desde esta cuenta.
   - En el **registro de ejecución** (abajo) sale la clave. Cópiala: será `SOLICITUDES_SECRETO` en Cloudflare.
2. Elige **`generarClavesCloudflare`** y ejecuta. Copia las dos claves que salen: `ALTCHA_SECRETO` y
   `DIAGNOSTICO_CLAVE` (solo van en Cloudflare; el script no las guarda).
3. Icono del engranaje (**Configuración del proyecto**) → **Propiedades del script** → **Añadir propiedad**:
   - Propiedad `AVISO_PARA`, valor: el correo donde quieres recibir el aviso de cada solicitud. Guarda.
   - Verás también `SECRETO` (la creó el paso 1). No la toques.
4. Vuelve al editor, elige **`probarCorreo`** y ejecuta: debe llegarte un correo de prueba a `AVISO_PARA`.

## 3. Publicar el script como aplicación web

1. Botón azul **Implementar → Nueva implementación**.
2. Rueda junto a «Seleccionar tipo» → **Aplicación web**.
3. Descripción: «v1». **Ejecutar como: Yo**. **Quién tiene acceso: Cualquier usuario**.
   (Hace falta para que la web pueda llamarlo; sin la clave secreta el script no acepta nada.)
4. **Implementar**. Copia la **URL de la aplicación web** (acaba en `/exec`): será `SOLICITUDES_URL`.

> Si más adelante cambias el código del script: **Implementar → Gestionar implementaciones** → lápiz →
> Versión: **Nueva versión** → Implementar. Así la URL no cambia y no hay que tocar Cloudflare.

## 4. Variables en Cloudflare

Cloudflare → **Workers y Pages** → `maquinas-de-coser-zafra` → **Configuración** → **Variables y secretos**.

Elige el entorno **Vista previa (Preview)** (para pruebas; **no** Producción hasta tener la cuenta de la
tienda) y añade:

| Nombre | Tipo | Valor |
|---|---|---|
| `SOLICITUDES_URL` | Texto | la URL `/exec` del paso 3 |
| `SOLICITUDES_SECRETO` | Secreto | la clave de `crearSecreto` |
| `ALTCHA_SECRETO` | Secreto | la primera clave de `generarClavesCloudflare` |
| `DIAGNOSTICO_CLAVE` | Secreto | la segunda clave de `generarClavesCloudflare` |

Guarda. Las variables solo se aplican en los despliegues nuevos: en **Implementaciones**, abre el último
de `develop` → **Reintentar implementación** (o sube cualquier cambio a `develop`).

## 5. Comprobar

1. Diagnóstico (cambia `CLAVE` por tu `DIAGNOSTICO_CLAVE`):
   `https://develop.maquinas-de-coser-zafra.pages.dev/api/estado-solicitudes?clave=CLAVE`
   Debe terminar en `"resumen": "Todo correcto: las solicitudes deberían funcionar."`. Si no, dice qué falta.
   Sin la clave correcta responde «404»: es a propósito.
2. Solicitud real: en `https://develop.maquinas-de-coser-zafra.pages.dev/` añade un par de productos,
   ve a **Mi solicitud**, rellena tus datos con un correo tuyo y envía. Debes ver «Solicitud S-2026-0001 enviada».
3. Comprueba:
   - la hoja tiene la fila en «Solicitudes» (Estado «Nueva», Entorno «develop») y una fila por producto en «Líneas»;
   - te llega el aviso a `AVISO_PARA` con el asunto empezando por «[Pruebas: develop]» y la solicitud
     completa (datos de contacto, productos y observaciones; «Responder» contesta al cliente);
   - te llega el acuse al correo que pusiste en el formulario.

Las solicitudes de prueba se pueden borrar de la hoja sin problema. El contador sigue (la siguiente será
`S-2026-0002`); para reiniciarlo, borra la propiedad `contador-2026` en las Propiedades del script.

## 6. Cuando exista la cuenta de la tienda (producción)

1. Repite los pasos 1 a 3 con la cuenta de la tienda (hoja nueva, script, `crearSecreto`,
   `generarClavesCloudflare`, `AVISO_PARA` con el correo de la tienda, implementar).
2. En Cloudflare, entorno **Producción**, añade las cuatro variables con los valores nuevos.
3. Reintenta el último despliegue de `main` y comprueba con
   `https://maquinas-de-coser-zafra.pages.dev/api/estado-solicitudes?clave=...`.
4. Antes de abrirlo al público: revisión legal de los textos (docs/BORRADORES-LEGALES.md) y de
   «Información básica de protección de datos» en el panel (Solicitud de presupuesto).

## Comprobación diaria

Cada mañana (06:41 UTC) la acción de GitHub «Comprobación diaria» mira que la web responde, que este
diagnóstico dice «Todo correcto» en producción y que la web se ha regenerado en las últimas 30 horas.
Si algo falla abre una incidencia en GitHub y menciona a los usuarios de Ajustes del sitio → Avanzado →
«Avisos de la comprobación diaria». Necesita el secreto `DIAGNOSTICO_CLAVE` en GitHub (Settings →
Secrets and variables → Actions) con **el mismo valor que en Cloudflare Producción**. Si cambias esa
clave en Cloudflare, cámbiala también en GitHub.

## Qué se puede cambiar desde el panel

Panel → **Solicitud de presupuesto**: «Mensaje tras enviar», «Correo de acuse al cliente» (asunto y texto)
y «Límites contra abusos» (solicitudes por hora, avisos y acuses al día, productos por solicitud).
Una cuenta gratuita de Google manda unos 100 correos al día: avisos + acuses deben sumar menos de 95.
Si se llega a un tope, la solicitud se guarda igualmente en la hoja.

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| Diagnóstico: falta alguna variable | No está en el entorno correcto (Preview/Producción) o no se ha vuelto a desplegar. |
| Diagnóstico: «el script rechaza la clave» | `SOLICITUDES_SECRETO` distinto de la propiedad `SECRETO` del script. |
| Diagnóstico: «respuesta inesperada» o «no se pudo conectar» | La implementación no es «Cualquier usuario», o la URL no es la `/exec`. |
| No llega el aviso | Falta `AVISO_PARA`, o se llegó al tope diario. Mira la carpeta de spam. |
| «Hoy no hemos podido mandarte el correo con el resumen» | Tope diario de acuses o cuota de Google agotada. La solicitud está guardada. |
| Cambié el script y no se nota | Falta «Gestionar implementaciones → Nueva versión». |
