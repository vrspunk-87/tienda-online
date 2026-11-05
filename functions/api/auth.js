/*
  Inicio del login de Decap con GitHub (paso 1 de 2). Función de Cloudflare Pages
  (adaptada de api/auth.js de la plataforma, que era una función de Vercel).
  - Genera un valor aleatorio («state»), lo guarda en una cookie privada y manda a
    GitHub. Al volver, functions/api/callback.js comprueba que el «state» coincide: así
    nadie puede colar un login ajeno (ataque CSRF).
  - Decap indica desde qué web se abre el panel (parámetro site_id). Solo se aceptan
    las webs permitidas (producción y entornos de prueba del proyecto: ver
    lib/origenes.js); se guarda en la misma cookie para entregar después el
    token SOLO a esa web.
  Variables de Cloudflare: OAUTH_CLIENT_ID (y PANEL_ORIGENES, opcional).
*/
import { sitioPermitido, protocolo } from '../../lib/origenes.js';

export function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const hostPropio = url.host;
  const sitio = String(url.searchParams.get('site_id') || hostPropio || '').toLowerCase();

  if (!sitioPermitido(sitio, hostPropio, env.PANEL_ORIGENES)) {
    return new Response('<!doctype html><meta charset="utf-8"><p>Esta web no está autorizada para usar el panel de edición.</p>', {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const state = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  const params = new URLSearchParams({
    client_id: env.OAUTH_CLIENT_ID || '',
    redirect_uri: `${protocolo(hostPropio)}://${hostPropio}/api/callback`,
    // «repo» es el permiso mínimo que necesita Decap para editar un repositorio privado
    scope: 'repo',
    state,
  });
  const seguro = protocolo(hostPropio) === 'https' ? 'Secure; ' : '';
  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params}`,
      // Cookie: «state.sitio» (el state es hexadecimal, sin puntos)
      'Set-Cookie': `tienda_oauth_state=${state}.${sitio}; Path=/api; HttpOnly; ${seguro}SameSite=Lax; Max-Age=600`,
      'Cache-Control': 'no-store',
    },
  });
}
