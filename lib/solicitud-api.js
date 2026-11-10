/*
  Funciones del servidor de la solicitud de presupuesto (fase 5), sin nada propio de Cloudflare
  para poder probarlas en Node (lib/solicitud.test.mjs). Las llaman:
    functions/api/solicitud.js           POST: recibe la solicitud y la guarda en la hoja de Google
    functions/api/desafio.js             GET: desafío nuevo para la casilla «No soy un robot»
    functions/api/estado-solicitudes.js  GET ?clave=…: diagnóstico de la configuración

  Variables de Cloudflare (Settings → Variables and secrets; ver docs/solicitudes/CONFIGURAR.md):
    SOLICITUDES_URL      dirección de la aplicación web de Apps Script (termina en /exec)
    SOLICITUDES_SECRETO  clave compartida con el script (solo quien la tenga puede escribir en la hoja)
    ALTCHA_SECRETO       clave para firmar los desafíos «No soy un robot»
    DIAGNOSTICO_CLAVE    clave del diagnóstico (sin ella, el diagnóstico está desactivado)

  Seguridad y privacidad:
  - Solo acepta envíos desde la propia web (cabecera Origin o Referer).
  - Nombres, precios y total salen del catálogo publicado; nunca de lo que manda el navegador.
  - Antispam sin servicios externos: ALTCHA, campo trampa, tiempo mínimo, límite por conexión (la IP
    no se guarda en ningún sitio) y, en el script de Google, límite global por hora.
  - Productos que ya no están disponibles: no se guarda nada y se avisa al cliente.
  - El acuse al cliente y el aviso a la tienda no llevan nada escrito por el cliente.
*/
import { comprobarSolicitud, fechaHoraMadrid, hoyMadrid } from './solicitud.js';
import { comprobar as comprobarVerificacion, nuevoDesafio, verificacionConfigurada } from './verificacion.js';

const CABECERAS_JSON = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
const json = (codigo, cuerpo) => new Response(JSON.stringify(cuerpo), { status: codigo, headers: CABECERAS_JSON });

// Límite de envíos por conexión (en la memoria de cada instancia de Cloudflare: frena abusos sencillos)
const VENTANA_MS = 10 * 60 * 1000, MAX_ENVIOS = 5;
const envios = new Map();
export function permitido(ip, ahora = Date.now()) {
  const lista = (envios.get(ip) || []).filter(t => ahora - t < VENTANA_MS);
  if (lista.length >= MAX_ENVIOS) { envios.set(ip, lista); return false; }
  lista.push(ahora);
  envios.set(ip, lista);
  if (envios.size > 5000) envios.clear();
  return true;
}
export const reiniciarLimites = () => envios.clear();

function mismoSitio(request) {
  const host = new URL(request.url).host;
  const procedencia = request.headers.get('Origin') || request.headers.get('Referer') || '';
  try { return new URL(procedencia).host === host; } catch { return false; }
}

async function leerCuerpo(request) {
  const texto = await request.text();
  if (texto.length > 60000) return null;
  if ((request.headers.get('Content-Type') || '').includes('application/json')) {
    try { const d = JSON.parse(texto); return d && typeof d === 'object' ? d : {}; } catch { return {}; }
  }
  return Object.fromEntries(new URLSearchParams(texto));
}

// Llamada al script de Google (POST con JSON; Apps Script contesta con una redirección que se sigue)
async function llamarScript(url, cuerpo, fetchFn) {
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), 20000);
  try {
    const r = await fetchFn(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), redirect: 'follow', signal: control.signal });
    const texto = await r.text();
    let j = null;
    try { j = JSON.parse(texto); } catch { /* no es JSON */ }
    return { estado: r.status, j };
  } finally { clearTimeout(t); }
}

/* ---------------------------------------------------------------- POST /api/solicitud */
export async function manejarSolicitud({ request, env }, datos, { fetchFn = fetch, ahora = new Date() } = {}) {
  if (request.method !== 'POST') return new Response('{}', { status: 405, headers: { ...CABECERAS_JSON, Allow: 'POST' } });
  const mensajeError = 'No se ha podido enviar la solicitud. Vuelve a intentarlo en unos minutos o llámanos.';
  if (!datos?.activa) return json(403, { ok: false, error: 'cerrado', mensaje: 'Ahora mismo no se pueden enviar solicitudes desde la web. Llámanos o escríbenos.' });
  if (!mismoSitio(request)) return json(403, { ok: false, error: 'origen' });

  const d = await leerCuerpo(request);
  if (d === null) return json(413, { ok: false, error: 'tamano', mensaje: 'La solicitud es demasiado grande.' });

  // Antispam: si salta una trampa se contesta como si todo fuera bien, pero no se guarda nada
  // (queda anotado en los registros de Cloudflare, sin datos personales)
  const exitoFalso = () => json(200, { ok: true, mensaje: datos.mensajeExito });
  if (d.web) { console.warn('Solicitud: descartada por el antispam (campo trampa relleno).'); return exitoFalso(); }
  const tardo = Number(d._t);
  if (d._t !== undefined && d._t !== '' && Number.isFinite(tardo) && tardo < 3000) {
    console.warn(`Solicitud: descartada por el antispam (rellenada en ${Math.round(tardo)} ms).`);
    return exitoFalso();
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'desconocida';
  if (!permitido(ip, ahora.getTime())) return json(429, { ok: false, error: 'limite', mensaje: 'Has enviado varias solicitudes seguidas. Espera unos minutos y vuelve a intentarlo.' });

  const hoy = hoyMadrid(ahora);
  const r = comprobarSolicitud(d, datos, hoy);
  if (r.noDisponibles.length) {
    return json(409, { ok: false, error: 'no_disponibles', noDisponibles: r.noDisponibles,
      mensaje: r.noDisponibles.length === 1 ? 'Un producto de tu solicitud ya no está disponible: lo hemos quitado. Revisa la solicitud y vuelve a enviarla.' : 'Algunos productos de tu solicitud ya no están disponibles: los hemos quitado. Revisa la solicitud y vuelve a enviarla.' });
  }

  let idVerificacion = '';
  if (!verificacionConfigurada(env)) {
    console.error('Solicitud: falta ALTCHA_SECRETO en Cloudflare.');
    return json(503, { ok: false, error: 'configuracion', mensaje: mensajeError });
  }
  const v = await comprobarVerificacion(env, d.altcha);
  if (!v.ok) r.errores.verificacion = v.caducado ? 'La verificación ha caducado. Vuelve a marcar «No soy un robot».' : 'Marca la casilla «No soy un robot».';
  else idVerificacion = v.id;
  if (Object.keys(r.errores).length) return json(422, { ok: false, error: 'revisar', errores: r.errores });

  if (!env.SOLICITUDES_URL || !env.SOLICITUDES_SECRETO) {
    console.error('Solicitud: faltan SOLICITUDES_URL o SOLICITUDES_SECRETO en Cloudflare.');
    return json(503, { ok: false, error: 'configuracion', mensaje: mensajeError });
  }

  const envio = {
    accion: 'guardar',
    secreto: env.SOLICITUDES_SECRETO,
    verificacion: idVerificacion,
    entorno: datos.entorno,
    tienda: datos.tienda,
    web: datos.web,
    fecha: fechaHoraMadrid(ahora),
    limites: datos.limites,
    cliente: r.valores,
    lineas: r.lineas,
    total: r.total,
    aConsultar: r.aConsultar,
    consentimiento: datos.consentimiento?.version || '',
    acuse: datos.acuse,
  };
  try {
    const resp = await llamarScript(env.SOLICITUDES_URL, envio, fetchFn);
    const j = resp.j || {};
    if (j.error === 'limite') {
      console.warn('Solicitud: límite global por hora alcanzado.');
      return json(429, { ok: false, error: 'limite', mensaje: 'Estamos recibiendo muchas solicitudes en este momento. Inténtalo de nuevo dentro de un rato o llámanos.' });
    }
    if (j.error === 'repetido') return json(422, { ok: false, error: 'revisar', errores: { verificacion: 'Vuelve a marcar la casilla «No soy un robot».' } });
    if (!j.ok || !j.numero) throw new Error(j.error || `HTTP ${resp.estado}`);
    console.log(`Solicitud ${j.numero} guardada (${r.lineas.length} productos).`);
    return json(200, { ok: true, numero: j.numero, acuse: j.acuse === true, mensaje: datos.mensajeExito });
  } catch (e) {
    console.error(`Solicitud: no se pudo guardar en la hoja: ${e.name === 'AbortError' ? 'tiempo agotado' : e.message}`);
    return json(502, { ok: false, error: 'guardar', mensaje: mensajeError });
  }
}

/* ---------------------------------------------------------------- GET /api/desafio */
export async function manejarDesafio({ request, env }) {
  if (request.method !== 'GET') return new Response('{}', { status: 405, headers: { ...CABECERAS_JSON, Allow: 'GET' } });
  if (!verificacionConfigurada(env)) {
    console.error('Verificación: falta ALTCHA_SECRETO en Cloudflare.');
    return json(503, { error: 'no configurado', ayuda: 'Falta ALTCHA_SECRETO en Cloudflare (o no se ha vuelto a desplegar). Ver docs/solicitudes/CONFIGURAR.md' });
  }
  try { return json(200, await nuevoDesafio(env)); } catch (e) {
    console.error(`Verificación: no se pudo crear el desafío: ${e.message}`);
    return json(500, { error: 'no se pudo crear el desafío' });
  }
}

/* ---------------------------------------------------------------- GET /api/estado-solicitudes?clave=… */
async function claveCorrecta(env, recibida) {
  const esperada = env?.DIAGNOSTICO_CLAVE || '';
  if (esperada.length < 16 || typeof recibida !== 'string') return false;
  const h = async t => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)));
  const [a, b] = await Promise.all([h(recibida), h(esperada)]);
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a[i] ^ b[i];
  return dif === 0;
}

export async function manejarEstado({ request, env }, datos, { fetchFn = fetch } = {}) {
  const clave = new URL(request.url).searchParams.get('clave');
  if (!(await claveCorrecta(env, clave))) return json(404, { error: 'No encontrado' });
  const estado = {
    entorno: datos?.entorno || 'desconocido',
    solicitud_activa: Boolean(datos?.activa),
    catalogo: datos ? `${Object.keys(datos.productos || {}).length} productos (generado ${datos.generado})` : 'sin catálogo',
    catalogo_generado: datos?.generado || null, // lo usa la comprobación diaria (.github/workflows/comprobacion-diaria.yml)
    variables: {
      SOLICITUDES_URL: Boolean(env.SOLICITUDES_URL),
      SOLICITUDES_SECRETO: Boolean(env.SOLICITUDES_SECRETO),
      ALTCHA_SECRETO: verificacionConfigurada(env),
    },
    verificacion_robot: 'sin comprobar',
    hoja_de_google: 'sin comprobar',
  };
  if (!estado.variables.ALTCHA_SECRETO) estado.verificacion_robot = 'falta ALTCHA_SECRETO (o tiene menos de 20 caracteres)';
  else { try { await nuevoDesafio(env); estado.verificacion_robot = 'ok'; } catch (e) { estado.verificacion_robot = `error: ${e.message}`; } }
  if (!estado.variables.SOLICITUDES_URL || !estado.variables.SOLICITUDES_SECRETO) estado.hoja_de_google = 'faltan SOLICITUDES_URL o SOLICITUDES_SECRETO';
  else {
    try {
      const { estado: codigo, j } = await llamarScript(env.SOLICITUDES_URL, { accion: 'comprobar', secreto: env.SOLICITUDES_SECRETO }, fetchFn);
      if (j?.ok) {
        estado.hoja_de_google = 'ok';
        estado.aviso_a_la_tienda = j.aviso ? 'configurado' : 'sin configurar: falta la propiedad AVISO_PARA en el script';
        if (j.cuota != null) estado.correos_que_quedan_hoy = j.cuota;
      } else if (j?.error === 'no autorizado') estado.hoja_de_google = 'el script rechaza la clave: SOLICITUDES_SECRETO no coincide con la del script';
      else if (j?.error) estado.hoja_de_google = `el script responde con error: ${j.error} (¿has pegado la última versión y creado una «Nueva versión» de la implementación?)`;
      else estado.hoja_de_google = `respuesta inesperada (HTTP ${codigo}): revisa que SOLICITUDES_URL termina en /exec y que la aplicación web tiene acceso «Cualquier usuario»`;
    } catch (e) {
      estado.hoja_de_google = `no se pudo conectar: ${e.name === 'AbortError' ? 'tiempo agotado' : e.message}`;
    }
  }
  estado.resumen = estado.verificacion_robot === 'ok' && estado.hoja_de_google === 'ok'
    ? 'Todo correcto: las solicitudes deberían funcionar.'
    : 'Hay algo que configurar: revisa los apartados que no dicen «ok» (ver docs/solicitudes/CONFIGURAR.md).';
  return new Response(JSON.stringify(estado, null, 2), { status: 200, headers: CABECERAS_JSON });
}
