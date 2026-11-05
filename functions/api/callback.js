/*
  Fin del login de Decap con GitHub (paso 2 de 2). Función de Cloudflare Pages
  (adaptada de api/callback.js de la plataforma, que era una función de Vercel).
  Medidas de seguridad:
  - Comprueba el «state» de la cookie (evita logins forzados, CSRF).
  - Solo entrega el token a la web desde la que se abrió el panel, y solo si es una de
    las permitidas (producción y entornos de prueba del proyecto: lib/origenes.js).
    Una web ajena que abra esta ventana no recibe nada.
  - La respuesta no se guarda en caché.
  Variables de Cloudflare: OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET (y PANEL_ORIGENES, opcional).
*/
import { sitioPermitido, protocolo } from '../../lib/origenes.js';

const html = cuerpo => `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Iniciando sesión…</title></head><body>${cuerpo}</body></html>`;
const jsSeguro = v => JSON.stringify(v).replace(/</g, '\\u003c');

function leerCookie(request, nombre) {
  const c = request.headers.get('Cookie') || '';
  const m = c.match(new RegExp(`(?:^|;\\s*)${nombre}=([^;]+)`));
  return m ? m[1] : null;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const host = url.host;
  const cabeceras = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    // Borrar la cookie del «state»: solo sirve una vez
    'Set-Cookie': `tienda_oauth_state=; Path=/api; HttpOnly; ${protocolo(host) === 'https' ? 'Secure; ' : ''}SameSite=Lax; Max-Age=0`,
  };

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  // La cookie guarda «state.sitio» (ver functions/api/auth.js)
  const cookie = leerCookie(request, 'tienda_oauth_state') || '';
  const punto = cookie.indexOf('.');
  const esperado = punto > 0 ? cookie.slice(0, punto) : cookie;
  const sitio = punto > 0 ? cookie.slice(punto + 1) : host;
  if (!code || !state || !esperado || state !== esperado || !sitioPermitido(sitio, host, env.PANEL_ORIGENES)) {
    return new Response(html('<p>No se pudo iniciar sesión (solicitud no válida o caducada). Cierra esta ventana y vuelve a intentarlo desde el panel.</p>'),
      { status: 400, headers: cabeceras });
  }

  let data;
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'tienda-online-panel' },
      body: JSON.stringify({ client_id: env.OAUTH_CLIENT_ID, client_secret: env.OAUTH_CLIENT_SECRET, code }),
    });
    data = await r.json();
  } catch {
    data = { error: 'No se pudo contactar con GitHub' };
  }

  const status = data.access_token ? 'success' : 'error';
  const content = data.access_token
    ? { token: data.access_token, provider: 'github' }
    : { error: data.error_description || data.error || 'Error desconocido' };
  const mensaje = `authorization:github:${status}:${JSON.stringify(content)}`;
  // Único destino permitido: la web (permitida) desde la que se abrió el panel
  const origen = `${protocolo(sitio)}://${sitio}`;

  return new Response(html(`<p>Iniciando sesión…</p><script>
    (function () {
      var ORIGEN = ${jsSeguro(origen)};
      var MENSAJE = ${jsSeguro(mensaje)};
      if (!window.opener) { document.body.textContent = 'Abre el panel desde ' + ORIGEN + '/admin/'; return; }
      function recibir(e) {
        // Solo responde al panel de este mismo dominio, nunca a otra web
        if (e.origin !== ORIGEN || e.source !== window.opener) return;
        window.removeEventListener('message', recibir, false);
        window.opener.postMessage(MENSAJE, ORIGEN);
        window.close();
      }
      window.addEventListener('message', recibir, false);
      // Saludo inicial: si la ventana que abrió el login es de otro dominio, el navegador no lo entrega
      window.opener.postMessage('authorizing:github', ORIGEN);
    })();
  </script>`), { status: 200, headers: cabeceras });
}
