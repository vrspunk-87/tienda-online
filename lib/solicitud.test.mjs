// Pruebas de la solicitud de presupuesto (fase 5): npm test
// El script de Google se simula; ALTCHA se resuelve de verdad (como lo haría el navegador).
import test from 'node:test';
import assert from 'node:assert/strict';
import { solveChallenge } from 'altcha-lib';
import { comprobarSolicitud, precioAplicado, hoyMadrid, euros } from './solicitud.js';
import { manejarSolicitud, manejarDesafio, manejarEstado, reiniciarLimites } from './solicitud-api.js';
import { deriveKey } from './verificacion.js';

const CATALOGO = {
  generado: '2026-11-10T00:00:00Z', entorno: 'develop', activa: true, tienda: 'Máquinas de Coser Zafra', web: 'https://ejemplo.pages.dev',
  preferencias: ['llamada', 'whatsapp', 'correo'], notas: true, consentimiento: { version: 'abc123' },
  mensajeExito: 'Enviada.', acuse: { asunto: 'Recibida', texto: 'Gracias.' },
  limites: { porHora: 30, avisosDia: 40, acusesDia: 45, maxProductos: 3 },
  productos: {
    'necchi-k121d': { nombre: 'Máquina K121D', modelo: 'K121D', referencia: 'K121D', fabricante: 'Necchi', url: 'https://x/p/1/', precio: 199 },
    'jack-a2': { nombre: 'Jack A2', version: 'Completa', modelo: 'A2', referencia: 'FJK-A2', fabricante: 'Jack', url: 'https://x/p/2/', precio: 1000,
      oferta: { precio: 900, inicio: '2026-11-10', fin: '2026-11-15' } },
    'jack-a2~cabezal': { nombre: 'Jack A2', version: 'Cabezal', modelo: 'A2', referencia: 'FJK-A2', fabricante: 'Jack', url: 'https://x/p/2/', precio: 800 },
    'consultar': { nombre: 'Bordadora', modelo: 'B1', referencia: '', fabricante: 'Elna', url: 'https://x/p/3/', precio: null },
  },
};
const ENV = { ALTCHA_SECRETO: 'clave-de-pruebas-larga-1234567890', SOLICITUDES_URL: 'https://script.google.com/macros/s/x/exec', SOLICITUDES_SECRETO: 's3cr3t', DIAGNOSTICO_CLAVE: 'diagnostico-123456789' };
const BIEN = { nombre: 'Ana López', telefono: '600 123 456', correo: 'ana@ejemplo.es', preferencia: 'whatsapp', observaciones: '=HYPERLINK("x")', acepto: 'si' };

async function altchaResuelto() {
  const r = await manejarDesafio({ request: new Request('https://ejemplo.pages.dev/api/desafio'), env: ENV });
  const desafio = await r.json();
  const solucion = await solveChallenge({ challenge: desafio, deriveKey });
  return btoa(JSON.stringify({ challenge: desafio, solution: solucion }));
}
function peticion(cuerpo, { origen = 'https://ejemplo.pages.dev', ip = '1.2.3.4' } = {}) {
  return new Request('https://ejemplo.pages.dev/api/solicitud', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origen, 'CF-Connecting-IP': ip }, body: JSON.stringify(cuerpo) });
}
function scriptSimulado(respuesta = { ok: true, numero: 'S-2026-0001', acuse: true }) {
  const llamadas = [];
  const fetchFn = async (url, op) => { llamadas.push({ url, cuerpo: JSON.parse(op.body) }); return new Response(JSON.stringify(respuesta)); };
  return { llamadas, fetchFn };
}

test('precio aplicado: oferta solo dentro de sus fechas', () => {
  const p = CATALOGO.productos['jack-a2'];
  assert.equal(precioAplicado(p, '2026-11-09').precio, 1000);
  assert.deepEqual([precioAplicado(p, '2026-11-10').precio, precioAplicado(p, '2026-11-10').oferta], [900, true]);
  assert.equal(precioAplicado(p, '2026-11-15').precio, 900);
  assert.equal(precioAplicado(p, '2026-11-16').precio, 1000);
  assert.equal(precioAplicado(CATALOGO.productos.consultar, '2026-11-10').precio, null);
});

test('día en Madrid alrededor de medianoche', () => {
  assert.equal(hoyMadrid(new Date('2026-11-09T23:30:00Z')), '2026-11-10'); // 00:30 en Madrid (invierno)
  assert.equal(hoyMadrid(new Date('2026-07-09T22:30:00Z')), '2026-07-10'); // 00:30 en Madrid (verano)
  assert.equal(euros(1234.5), '1234,50 €'.replace('1234', '1.234'));
});

test('comprobar: precios del catálogo, nunca los del navegador', () => {
  const r = comprobarSolicitud({ ...BIEN, productos: [{ id: 'jack-a2', cantidad: 2, precio: 1 }, { id: 'jack-a2~cabezal', cantidad: 1 }, { id: 'consultar', cantidad: 1 }] }, CATALOGO, '2026-11-12');
  assert.deepEqual(r.errores, {});
  assert.deepEqual(r.lineas.map(l => [l.id, l.precio, l.subtotal, l.oferta]), [['jack-a2', 900, 1800, true], ['jack-a2~cabezal', 800, 800, false], ['consultar', null, null, false]]);
  assert.equal(r.total, 2600);
  assert.equal(r.aConsultar, 1);
});

test('comprobar: errores de los campos, unidades y productos', () => {
  const r = comprobarSolicitud({ nombre: 'A', telefono: '12', correo: 'x@', preferencia: 'paloma', acepto: '', productos: [] }, CATALOGO);
  assert.deepEqual(Object.keys(r.errores).sort(), ['acepto', 'correo', 'nombre', 'preferencia', 'productos', 'telefono']);
  const u = comprobarSolicitud({ ...BIEN, productos: [{ id: 'necchi-k121d', cantidad: 500 }, { id: 'necchi-k121d', cantidad: 3 }, { id: 'inventado', cantidad: 1 }] }, CATALOGO);
  assert.equal(u.lineas[0].unidades, 99);
  assert.deepEqual(u.noDisponibles, ['inventado']);
  const m = comprobarSolicitud({ ...BIEN, productos: Object.keys(CATALOGO.productos).map(id => ({ id, cantidad: 1 })) }, CATALOGO);
  assert.match(m.errores.productos, /3 productos/);
});

test('envío correcto: llega al script con los precios recalculados', async () => {
  reiniciarLimites();
  const s = scriptSimulado();
  const r = await manejarSolicitud({ request: peticion({ ...BIEN, altcha: await altchaResuelto(), _t: 9000, productos: [{ id: 'jack-a2', cantidad: 1, nota: 'con mueble' }] }), env: ENV }, CATALOGO, { fetchFn: s.fetchFn, ahora: new Date('2026-11-12T10:00:00Z') });
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.deepEqual([j.ok, j.numero, j.acuse], [true, 'S-2026-0001', true]);
  const c = s.llamadas[0].cuerpo;
  assert.equal(c.secreto, 's3cr3t');
  assert.equal(c.lineas[0].precio, 900);
  assert.equal(c.lineas[0].nota, 'con mueble');
  assert.equal(c.cliente.observaciones, '=HYPERLINK("x")'); // se neutraliza en el script (texto)
  assert.equal(c.consentimiento, 'abc123');
  assert.ok(c.verificacion);
});

test('robots y trampas: no llegan al script', async () => {
  reiniciarLimites();
  const s = scriptSimulado();
  const base = { ...BIEN, productos: [{ id: 'necchi-k121d', cantidad: 1 }] };
  let r = await manejarSolicitud({ request: peticion({ ...base, web: 'spam', _t: 9000 }), env: ENV }, CATALOGO, { fetchFn: s.fetchFn });
  assert.equal(r.status, 200);
  r = await manejarSolicitud({ request: peticion({ ...base, _t: 500 }), env: ENV }, CATALOGO, { fetchFn: s.fetchFn });
  assert.equal(r.status, 200);
  r = await manejarSolicitud({ request: peticion({ ...base, _t: 9000, altcha: 'falso' }), env: ENV }, CATALOGO, { fetchFn: s.fetchFn });
  assert.equal(r.status, 422);
  assert.ok((await r.json()).errores.verificacion);
  r = await manejarSolicitud({ request: peticion({ ...base, _t: 9000 }, { origen: 'https://otra-web.example' }), env: ENV }, CATALOGO, { fetchFn: s.fetchFn });
  assert.equal(r.status, 403);
  assert.equal(s.llamadas.length, 0);
});

test('producto no disponible: no se guarda y se avisa', async () => {
  reiniciarLimites();
  const s = scriptSimulado();
  const r = await manejarSolicitud({ request: peticion({ ...BIEN, _t: 9000, altcha: await altchaResuelto(), productos: [{ id: 'necchi-k121d', cantidad: 1 }, { id: 'retirado', cantidad: 1 }] }), env: ENV }, CATALOGO, { fetchFn: s.fetchFn });
  assert.equal(r.status, 409);
  assert.deepEqual((await r.json()).noDisponibles, ['retirado']);
  assert.equal(s.llamadas.length, 0);
});

test('límite por conexión, límite del script, verificación repetida y fallo de Google', async () => {
  reiniciarLimites();
  const base = { ...BIEN, _t: 9000, productos: [{ id: 'necchi-k121d', cantidad: 1 }] };
  const s = scriptSimulado();
  for (let i = 0; i < 5; i++) await manejarSolicitud({ request: peticion({ ...base, web: 'x' }, { ip: '9.9.9.9' }), env: ENV }, CATALOGO, { fetchFn: s.fetchFn });
  // las trampas no cuentan para el límite (se descartan antes): 5 envíos reales sí
  for (let i = 0; i < 5; i++) await manejarSolicitud({ request: peticion({ ...base, altcha: 'x' }, { ip: '8.8.8.8' }), env: ENV }, CATALOGO, { fetchFn: s.fetchFn });
  let r = await manejarSolicitud({ request: peticion({ ...base, altcha: 'x' }, { ip: '8.8.8.8' }), env: ENV }, CATALOGO, { fetchFn: s.fetchFn });
  assert.equal(r.status, 429);
  for (const [respuesta, codigo] of [[{ ok: false, error: 'limite' }, 429], [{ ok: false, error: 'repetido' }, 422], [{ ok: false, error: 'boom' }, 502]]) {
    reiniciarLimites();
    r = await manejarSolicitud({ request: peticion({ ...base, altcha: await altchaResuelto() }), env: ENV }, CATALOGO, { fetchFn: scriptSimulado(respuesta).fetchFn });
    assert.equal(r.status, codigo);
  }
});

test('sin configurar o desactivada: no se envía nada', async () => {
  reiniciarLimites();
  const base = { ...BIEN, _t: 9000, productos: [{ id: 'necchi-k121d', cantidad: 1 }] };
  let r = await manejarSolicitud({ request: peticion(base), env: {} }, CATALOGO, { fetchFn: scriptSimulado().fetchFn });
  assert.equal(r.status, 503);
  r = await manejarSolicitud({ request: peticion(base), env: ENV }, { ...CATALOGO, activa: false }, { fetchFn: scriptSimulado().fetchFn });
  assert.equal(r.status, 403);
  r = await manejarSolicitud({ request: new Request('https://ejemplo.pages.dev/api/solicitud'), env: ENV }, CATALOGO);
  assert.equal(r.status, 405);
});

test('diagnóstico: protegido con clave y sin escribir en la hoja', async () => {
  let r = await manejarEstado({ request: new Request('https://ejemplo.pages.dev/api/estado-solicitudes?clave=mala'), env: ENV }, CATALOGO);
  assert.equal(r.status, 404);
  const s = scriptSimulado({ ok: true, version: 1, aviso: true, cuota: 98 });
  r = await manejarEstado({ request: new Request(`https://ejemplo.pages.dev/api/estado-solicitudes?clave=${ENV.DIAGNOSTICO_CLAVE}`), env: ENV }, CATALOGO, { fetchFn: s.fetchFn });
  const j = await r.json();
  assert.equal(j.hoja_de_google, 'ok');
  assert.equal(j.verificacion_robot, 'ok');
  assert.equal(s.llamadas[0].cuerpo.accion, 'comprobar');
});
