/*
  Solicitud de presupuesto: comprobación de los datos y cálculo de los precios (fase 5).
  Lo usan la función de Cloudflare (functions/api/solicitud.js, vía lib/solicitud-api.js) y las
  pruebas (lib/solicitud.test.mjs). No depende de nada propio de Cloudflare ni de Node.

  Regla de oro: los nombres, precios y total se calculan SIEMPRE con el catálogo publicado
  (lib/generado/solicitud-datos.js, que genera scripts/build.js), nunca con lo que envía el
  navegador. El precio de oferta se aplica según la fecha del envío (hora de Madrid), así que es
  correcto aunque la reconstrucción diaria de la web se retrase.
*/
export const MAX_UNIDADES = 99;
export const MAX_NOTA = 300;
export const MAX_OBSERVACIONES = 2000;

// Día de hoy en Madrid, como «AAAA-MM-DD» (el mismo formato que las fechas de las ofertas)
export function hoyMadrid(fecha = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);
}

// Fecha y hora en Madrid para la hoja («10/11/2026, 18:05:12»)
export function fechaHoraMadrid(fecha = new Date()) {
  return fecha.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
}

// Importe en euros como texto («1.234,56 €»; sin céntimos si es redondo)
export function euros(v) {
  if (v == null || !Number.isFinite(v)) return '';
  const redondo = Math.abs(v - Math.round(v)) < 0.005;
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always', minimumFractionDigits: redondo ? 0 : 2, maximumFractionDigits: redondo ? 0 : 2 }).format(v);
}

// Precio que se aplica a un producto del catálogo en un día: el de oferta si está en fechas
// (y es menor que el normal); null = «precio a consultar»
export function precioAplicado(prod, hoy) {
  if (!prod || prod.precio == null) return { precio: null, oferta: false };
  const o = prod.oferta;
  if (o && o.precio != null && o.inicio && o.fin && o.inicio <= hoy && hoy <= o.fin && o.precio < prod.precio) {
    return { precio: o.precio, oferta: true, ofertaHasta: o.fin, precioNormal: prod.precio };
  }
  return { precio: prod.precio, oferta: false };
}

const limpiar = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const esSi = v => v === true || v === 'si' || v === 'on' || v === 'true';

// Las mismas reglas que el navegador (public/js/presupuesto.js); aquí son las que cuentan
const REGLAS = {
  nombre: v => (!v ? 'Escribe tu nombre.' : v.length > 120 ? 'El nombre es demasiado largo.' : /\p{L}.*\p{L}/u.test(v) ? '' : 'Escribe tu nombre (al menos dos letras).'),
  telefono: (v) => {
    if (!v) return 'Escribe tu teléfono.';
    if (v.length > 20 || !/^[0-9+()\s.\-]+$/.test(v)) return 'El teléfono solo puede tener cifras, espacios y los signos + ( ) . -';
    const cifras = v.replace(/\D/g, '').length;
    return cifras >= 9 && cifras <= 15 ? '' : 'Escribe un teléfono con 9 cifras como mínimo.';
  },
  correo: v => (!v ? 'Escribe tu correo electrónico.' : v.length <= 160 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i.test(v) ? '' : 'Escribe un correo válido, p. ej. nombre@ejemplo.es.'),
};

// Lista de productos que envía el navegador: [{ id, cantidad, nota? }] (también admite el texto JSON)
function leerProductos(valor) {
  let lista = valor;
  if (typeof lista === 'string') { try { lista = JSON.parse(lista); } catch { lista = []; } }
  if (!Array.isArray(lista)) return [];
  const porId = new Map();
  for (const x of lista.slice(0, 200)) {
    if (!x || typeof x.id !== 'string' || !x.id || x.id.length > 200) continue;
    const cantidad = Math.min(MAX_UNIDADES, Math.max(1, parseInt(x.cantidad ?? x.unidades, 10) || 1));
    const nota = typeof x.nota === 'string' ? x.nota.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTA) : '';
    const previo = porId.get(x.id);
    if (previo) { previo.cantidad = Math.min(MAX_UNIDADES, previo.cantidad + cantidad); if (nota && !previo.nota) previo.nota = nota; }
    else porId.set(x.id, { id: x.id, cantidad, nota });
  }
  return [...porId.values()];
}

/*
  Comprueba una solicitud con el catálogo publicado.
  datos: lo que envía el navegador. catalogo: lib/generado/solicitud-datos.js. hoy: «AAAA-MM-DD».
  Devuelve { errores, valores, lineas, total, aConsultar, noDisponibles }:
  - errores: { campo: mensaje } (vacío si todo está bien);
  - noDisponibles: identificadores que ya no están en el catálogo (no se guardan: se avisa al cliente);
  - lineas: cada producto con los datos y el precio DEL CATÁLOGO.
*/
export function comprobarSolicitud(datos, catalogo, hoy = hoyMadrid()) {
  const errores = {};
  const valores = {
    nombre: limpiar(datos.nombre),
    telefono: limpiar(datos.telefono),
    correo: String(datos.correo ?? '').replace(/\s+/g, ''),
  };
  for (const [campo, regla] of Object.entries(REGLAS)) {
    const error = regla(valores[campo]);
    if (error) errores[campo] = error;
  }

  const preferencias = Array.isArray(catalogo.preferencias) ? catalogo.preferencias : [];
  const pref = limpiar(datos.preferencia);
  if (preferencias.length > 1) {
    if (pref && !preferencias.includes(pref)) errores.preferencia = 'Elige una de las opciones.';
    valores.preferencia = preferencias.includes(pref) ? pref : preferencias[0];
  } else valores.preferencia = preferencias[0] || '';

  const obs = String(datos.observaciones ?? '').replace(/\r\n?/g, '\n').trim();
  if (obs.length > MAX_OBSERVACIONES) errores.observaciones = `Las observaciones no pueden pasar de ${MAX_OBSERVACIONES} caracteres.`;
  valores.observaciones = obs.slice(0, MAX_OBSERVACIONES);

  if (!esSi(datos.acepto)) errores.acepto = 'Tienes que aceptar las condiciones y la información de protección de datos para enviar la solicitud.';

  const pedidos = leerProductos(datos.productos);
  const productos = catalogo.productos || {};
  const noDisponibles = pedidos.filter(x => !Object.prototype.hasOwnProperty.call(productos, x.id)).map(x => x.id);
  const validos = pedidos.filter(x => Object.prototype.hasOwnProperty.call(productos, x.id));
  const maximo = Number(catalogo.limites?.maxProductos) || 30;
  if (!pedidos.length) errores.productos = 'Tu solicitud no tiene productos.';
  else if (validos.length > maximo) errores.productos = `Puedes pedir presupuesto de ${maximo} productos distintos como máximo en cada solicitud.`;

  const lineas = validos.map((x) => {
    const p = productos[x.id];
    const a = precioAplicado(p, hoy);
    return {
      id: x.id,
      nombre: p.nombre,
      version: p.version || '',
      modelo: p.modelo || '',
      referencia: p.referencia || '',
      fabricante: p.fabricante || '',
      url: p.url || '',
      unidades: x.cantidad,
      precio: a.precio,
      oferta: a.oferta,
      ofertaHasta: a.ofertaHasta || '',
      subtotal: a.precio == null ? null : Math.round(a.precio * x.cantidad * 100) / 100,
      nota: catalogo.notas === false ? '' : x.nota,
    };
  });
  const total = Math.round(lineas.reduce((s, l) => s + (l.subtotal ?? 0), 0) * 100) / 100;
  const aConsultar = lineas.filter(l => l.precio == null).length;
  return { errores, valores, lineas, total, aConsultar, noDisponibles };
}
