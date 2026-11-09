/*
  Qué webs pueden usar el login del panel de Decap.

  El login (functions/api/auth.js → GitHub → functions/api/callback.js) se hace siempre en
  la dirección de producción, pero el panel puede estar abierto en la web pública o en un
  entorno de pruebas. El token de GitHub (que da acceso a todos los repositorios de quien
  edita) solo se entrega a una ventana cuya dirección esté EXACTAMENTE en esta lista; a
  cualquier otra web, nada.

  Lista exacta, sin comodines: pages.dev es un dominio compartido de Cloudflare, así que un
  comodín podría acabar aceptando una dirección creada por otra persona.

  RAMAS_CON_PANEL: entornos de prueba con panel (también lo usa scripts/build.js). Las
  demás ramas (feature/…, borradores cms/…) tienen vista previa, pero sin panel; para
  probar el panel con ellas, en local («npm run panel»).

  Se puede sustituir con la variable PANEL_ORIGENES de Cloudflare Pages (nombres exactos
  separados por comas; «*» vale por una parte del nombre, pero NO se recomienda usarlo en
  pages.dev).

  Lo usan las funciones de Cloudflare (functions/api/) y el build (Node): no depende de
  nada propio de ninguno de los dos.
*/
export const RAMAS_CON_PANEL = ['develop', 'staging', 'dev-victor'];

// Nombre del proyecto en Cloudflare Pages: da las direcciones <proyecto>.pages.dev y
// <rama>.<proyecto>.pages.dev. Comprobado al crear el proyecto (9-11-2026, fase 1b).
export const PROYECTO_PAGES = 'maquinas-de-coser-zafra';

const POR_DEFECTO = [
  `${PROYECTO_PAGES}.pages.dev`,
  ...RAMAS_CON_PANEL.map(r => `${r}.${PROYECTO_PAGES}.pages.dev`),
  // Al comprar el dominio (fase 8 de docs/PLAN.md), añadirlo aquí (con y sin www).
];

function patrones(lista) {
  const propios = String(lista || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return (propios.length ? propios : POR_DEFECTO).map(p =>
    new RegExp('^' + p.split('*').map(t => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[a-z0-9-]+') + '$'));
}

// ¿Puede esta web (nombre de host, p. ej. «develop.maquinas-de-coser-zafra.pages.dev») usar el panel?
// listaPropia: el valor de la variable PANEL_ORIGENES, si existe.
export function sitioPermitido(host, hostPropio, listaPropia = '') {
  const h = String(host || '').toLowerCase().trim();
  if (!/^[a-z0-9.-]+(:\d+)?$/.test(h)) return false;
  if (h === String(hostPropio || '').toLowerCase()) return true;
  return patrones(listaPropia).some(r => r.test(h));
}

// https siempre, salvo al probar en local
export const protocolo = host => (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host || '') ? 'http' : 'https');
