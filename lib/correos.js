/*
  Correos de la solicitud de presupuesto en HTML corporativo y en texto (aprobado por Víctor el 18-11-2026).

  Los prepara la función de Cloudflare (lib/solicitud-api.js) con los datos ya comprobados y el diseño que
  deja el build en lib/generado/solicitud-datos.js («correo»: colores, cabecera, contacto, textos del panel).
  El script de Google (docs/solicitudes/apps-script.gs) solo los envía, cambiando los huecos que solo él
  conoce: {{NUMERO}} (S-2026-0004), {{HOJA}} (dirección de la hoja), {{ACUSE}} (si se mandó el acuse) y
  {{CUOTA}} (correos que quedan hoy). La vista previa del panel (Solicitud de presupuesto) usa este mismo
  fichero (el build lo copia a /admin/correos.js).

  Seguridad:
  - Al cliente (acuse) NUNCA va nada escrito por el cliente: ni su nombre ni sus observaciones, para que
    nadie use el formulario para mandar correos con su texto a terceros. Solo los textos de la web, los
    productos del catálogo y la forma de contacto elegida entre las opciones fijas.
  - A la tienda sí van sus datos, siempre escapados (nada se convierte en HTML) y sin enlaces salvo los
    que se montan aquí (llamar, WhatsApp y responder con los datos comprobados).
  - Sin JavaScript, sin formularios y con todos los estilos en línea (lo que entienden Gmail y Outlook).
*/

const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Texto de una sola línea (sin saltos ni caracteres de control)
const linea = (t, max = 200) => String(t ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const PREFERENCIAS = { llamada: 'llamada', whatsapp: 'WhatsApp', correo: 'correo' };

export function euros(v) {
  if (v == null || !Number.isFinite(Number(v))) return '';
  const n = Number(v);
  const redondo = Math.abs(n - Math.round(n)) < 0.005;
  const [e, d] = (redondo ? String(Math.round(n)) : n.toFixed(2)).split('.');
  return `${e.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${d ? `,${d}` : ''} €`;
}
const fechaCorta = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
const unirY = l => (l.length > 1 ? `${l.slice(0, -1).join(', ')} o ${l.at(-1)}` : l[0] || '');

/* ---------- Piezas HTML (tablas y estilos en línea) ---------- */
function marco(c, contenido, pie) {
  const acento = c.acento || '#c1121f';
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.tienda)}</title></head>
<body style="margin:0;padding:0;background:#f1efeb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1efeb;"><tr><td align="center" style="padding:18px 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:10px;font-family:Arial,Helvetica,sans-serif;color:${esc(c.tinta || '#1f2933')};font-size:14px;line-height:1.5;">
<tr><td align="center" style="padding:16px 22px 12px;border-bottom:2px dashed ${esc(acento)};">
${c.cabecera ? `<img src="${esc(c.cabecera)}" width="420" alt="${esc(c.tienda)}" style="display:block;width:100%;max-width:420px;height:auto;border:0;">` : `<div style="font-family:Georgia,serif;font-style:italic;font-size:24px;color:${esc(acento)};">${esc(c.tienda)}</div>`}
${c.lema ? `<div style="color:#6b7280;font-size:12px;padding-top:4px;">${esc(c.lema)}</div>` : ''}
</td></tr>
<tr><td style="padding:18px 22px;">${contenido}</td></tr>
${pie}
</table></td></tr></table></body></html>`;
}
const boton = (href, texto, fondo, color = '#ffffff', borde = fondo) => `<a href="${esc(href)}" style="display:inline-block;background:${esc(fondo)};color:${esc(color)};border:1px solid ${esc(borde)};text-decoration:none;border-radius:8px;padding:9px 16px;font-weight:bold;font-size:13px;margin:6px 6px 0 0;">${texto}</a>`;
const pildora = (texto, fondo, color) => `<span style="display:inline-block;background:${fondo};color:${color};border-radius:16px;padding:3px 12px;font-weight:bold;font-size:13px;">${texto}</span>`;
const caja = (contenido, acento) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0;border:1px solid #e3e3df;border-radius:10px;"><tr><td style="padding:4px 12px 10px;border-left:3px solid ${esc(acento)};border-radius:10px;">${contenido}</td></tr></table>`;

function filasProductos(lineas, c, { enlaces = false } = {}) {
  const filas = lineas.map((l, i) => {
    const datos = [l.version, l.fabricante, l.modelo ? `modelo ${l.modelo}` : '', l.referencia && enlaces ? `ref. ${l.referencia}` : ''].filter(Boolean).map(v => linea(v)).join(' · ');
    const precio = l.precio == null ? esc(c.sinPrecio || 'Precio a consultar')
      : `${esc(euros(l.precio))}${l.unidades > 1 ? ' / ud.' : ''}${l.oferta ? `<br><span style="color:${esc(c.acento || '#c1121f')};font-size:11px;font-weight:normal;">Oferta hasta el ${esc(fechaCorta(l.ofertaHasta))}</span>` : ''}`;
    const nombre = enlaces && l.url ? `<a href="${esc(l.url)}" style="color:inherit;">${esc(linea(l.nombre))}</a>` : esc(linea(l.nombre));
    return `<tr><td width="62" style="padding:10px 10px 10px 0;${i ? 'border-top:1px solid #eeeeee;' : ''}vertical-align:top;">${l.foto ? `<img src="${esc(l.foto)}" width="54" height="54" alt="" style="display:block;border-radius:8px;border:0;">` : '<div style="width:54px;height:54px;border-radius:8px;background:#f1f1ef;"></div>'}</td>
<td style="padding:10px 6px 10px 0;${i ? 'border-top:1px solid #eeeeee;' : ''}font-size:13px;vertical-align:top;"><b>${nombre}</b><br><span style="color:#6b7280;">${esc(datos)}${datos ? ' · ' : ''}${l.unidades} ${l.unidades === 1 ? 'unidad' : 'unidades'}</span>${enlaces && l.nota ? `<br><span style="color:#6b4300;">Nota del cliente: ${esc(linea(l.nota, 300))}</span>` : ''}</td>
<td align="right" style="padding:10px 0;${i ? 'border-top:1px solid #eeeeee;' : ''}font-weight:bold;white-space:nowrap;vertical-align:top;">${precio}</td></tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${filas}</table>`;
}
function filaTotal(total, aConsultar, c) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid ${esc(c.tinta || '#1f2933')};margin-top:4px;"><tr>
<td style="padding-top:8px;font-size:16px;font-weight:bold;">Total orientativo</td><td align="right" style="padding-top:8px;font-size:16px;font-weight:bold;white-space:nowrap;">${esc(euros(total) || '—')}</td></tr>
${aConsultar ? `<tr><td colspan="2" style="color:#6b7280;font-size:12px;">Más ${aConsultar} ${aConsultar === 1 ? 'producto' : 'productos'} con «${esc(c.sinPrecio || 'Precio a consultar')}».</td></tr>` : ''}</table>`;
}
function pieTienda(c) {
  const datos = [
    c.direccion ? esc(c.direccion) : '',
    ...(c.horario || []).map(esc),
    [c.telefono ? `Tel. ${esc(c.telefono)}` : '', c.whatsappTexto ? `WhatsApp ${esc(c.whatsappTexto)}` : ''].filter(Boolean).join(' · '),
    c.web ? `<a href="${esc(c.web)}" style="color:#ffffff;">${esc(c.web.replace(/^https?:\/\//, ''))}</a>` : '',
  ].filter(Boolean).join('<br>');
  return `<tr><td style="background:${esc(c.tinta || '#1f2933')};color:#d1d5db;padding:16px 22px;font-size:12px;line-height:1.6;border-radius:0 0 10px 10px;">
<b style="color:#ffffff;">${esc(c.tienda)}</b><br>${datos}
<div style="opacity:.8;padding-top:8px;">${esc(c.textoPrecios || 'Precios orientativos, IVA incluido')}. Has recibido este correo porque has enviado una solicitud de presupuesto desde nuestra web.${c.privacidad ? ` <a href="${esc(c.privacidad)}" style="color:#ffffff;">Política de privacidad</a>` : ''}</div></td></tr>`;
}

/* ---------- Piezas de texto (estilo «marcos ligeros», líneas de 50 caracteres como mucho) ---------- */
const RAYA = '══════════════════════════════════════════';
const FINA = '────────────────────────────────────────';
const partir = (texto, ancho = 46) => {
  const out = [];
  for (const parrafo of String(texto || '').split('\n')) {
    let l = '';
    for (const p of parrafo.split(/\s+/).filter(Boolean)) {
      if (l && (l + ' ' + p).length > ancho) { out.push(l); l = p; } else l = l ? `${l} ${p}` : p;
    }
    out.push(l);
  }
  return out;
};
const seccion = (titulo, lineasTexto) => [`┌─ ${titulo} ${'─'.repeat(Math.max(4, 36 - titulo.length))}`, ...lineasTexto.map(x => (x ? `│ ${x}` : '│')), `└${FINA}`].join('\n');
function textoProductos(lineas, c, { enlaces = false } = {}) {
  const l = [];
  lineas.forEach((x, i) => {
    if (i) l.push('');
    l.push(...partir(`${x.unidades} × ${linea(x.nombre)}`, 44));
    const datos = [x.version, x.fabricante, x.modelo ? `modelo ${x.modelo}` : '', enlaces && x.referencia ? `ref. ${x.referencia}` : ''].filter(Boolean).map(v => linea(v)).join(' · ');
    if (datos) l.push(...partir(datos, 42).map(s => `    ${s}`));
    l.push(`    ${x.precio == null ? (c.sinPrecio || 'Precio a consultar') : `${euros(x.precio)}${x.unidades > 1 ? ' por unidad' : ''}${x.oferta ? ` (oferta hasta el ${fechaCorta(x.ofertaHasta)})` : ''}`}`);
    if (enlaces && x.url) l.push(`    ${x.url}`);
    if (enlaces && x.nota) l.push(...partir(`Nota del cliente: ${linea(x.nota, 300)}`, 42).map(s => `    ${s}`));
  });
  return l;
}
function textoPie(c) {
  return [FINA, c.tienda, c.direccion, ...(c.horario || []),
    [c.telefono ? `Tel. ${c.telefono}` : '', c.whatsappTexto ? `WhatsApp ${c.whatsappTexto}` : ''].filter(Boolean).join(' · '),
    c.web, c.privacidad ? `Política de privacidad:\n${c.privacidad}` : ''].filter(Boolean).join('\n');
}

/* ---------- Al cliente (acuse de recibo) ---------- */
export function correoCliente({ lineas, total, aConsultar, cliente = {} }, c) {
  const acento = c.acento || '#c1121f';
  const acuse = c.acuse || {};
  const texto = String(acuse.texto || 'Gracias por tu solicitud de presupuesto. La tienda la revisará y se pondrá en contacto contigo en breve para confirmarte la disponibilidad y el precio final.').trim();
  // Forma de contacto: solo de las opciones fijas (llamada, WhatsApp, correo)
  const formas = (Array.isArray(cliente.preferencia) ? cliente.preferencia : []).map(p => PREFERENCIAS[p]).filter(Boolean);
  const paso3 = formas.length ? `Te contestamos por ${unirY(formas)}` : 'Te contestamos';
  const oferta = lineas.some(l => l.oferta);
  const wa = String(c.whatsapp || '').replace(/\D/g, '');
  const pasos = ['Recibida', 'La revisamos', paso3];
  const html = marco(c, `
${pildora('Solicitud {{NUMERO}}', '#fbe9ea', esc(acento))}
<h1 style="margin:12px 0 6px;font-size:20px;">¡Gracias por tu solicitud!</h1>
<p style="margin:0;">${esc(texto).replace(/\n/g, '<br>')}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="6" border="0" style="margin:10px 0;"><tr>${pasos.map((p, i) => `<td width="33%" align="center" style="background:#f6f5f2;border-radius:8px;padding:6px;font-size:12px;"><b style="color:${esc(acento)};">${i + 1}${i ? '' : ' ✓'}</b><br>${esc(p)}</td>`).join('')}</tr></table>
${caja(filasProductos(lineas, c) + filaTotal(total, aConsultar, c), acento)}
<p style="color:#6b7280;font-size:12px;margin:0;">${esc(c.textoPrecios || 'Precios orientativos, IVA incluido')}; no son un precio firme: la tienda te confirmará la disponibilidad y el precio final.${oferta ? ' Los precios de oferta se respetan en las solicitudes recibidas dentro de sus fechas.' : ''}</p>
<p style="margin:10px 0 0;">${c.catalogo ? boton(c.catalogo, 'Ver el catálogo', acento) : ''}${wa ? boton(`https://wa.me/${wa}`, 'Escribirnos por WhatsApp', '#1e7a3a') : ''}</p>
<p style="color:#6b7280;font-size:12px;margin:12px 0 0;">¿Algo que añadir? Responde a este correo y le llegará a la tienda.</p>`, pieTienda(c));
  const textoPlano = [RAYA, `  ${String(c.tienda || '').toUpperCase()}`, c.lema ? `  ${c.lema}` : '', RAYA, '',
    'Solicitud {{NUMERO}}', '', '¡Gracias por tu solicitud!', '', ...partir(texto), '',
    `[✓] ${pasos[0]}`, `[ ] ${pasos[1]}`, `[ ] ${pasos[2]}`, '',
    seccion('TU SOLICITUD', [...textoProductos(lineas, c), '', `TOTAL ORIENTATIVO: ${euros(total) || '—'}`, ...(aConsultar ? [`(más ${aConsultar} con «${c.sinPrecio || 'Precio a consultar'}»)`] : [])]),
    ...partir(`${c.textoPrecios || 'Precios orientativos, IVA incluido'}; no son un precio firme.${oferta ? ' Los precios de oferta se respetan dentro de sus fechas.' : ''}`), '',
    ...(c.catalogo ? ['→ Ver el catálogo:', `  ${c.catalogo}`] : []), ...(wa ? ['→ Escribirnos por WhatsApp:', `  https://wa.me/${wa}`] : []), '',
    ...partir('¿Algo que añadir? Responde a este correo y le llegará a la tienda.'), '', textoPie(c)]
    .filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n');
  return { asunto: `${linea(acuse.asunto || 'Hemos recibido tu solicitud de presupuesto', 120)} ({{NUMERO}})`, html, texto: textoPlano };
}

/* ---------- A la tienda (aviso de cada solicitud) ---------- */
export function correoTienda({ lineas, total, aConsultar, cliente = {}, fecha = '' }, c) {
  const acento = c.acento || '#c1121f';
  const av = c.aviso || {};
  const nombre = linea(cliente.nombre, 80);
  const telefono = linea(cliente.telefono, 40);
  const correo = linea(cliente.correo, 120);
  const formas = (Array.isArray(cliente.preferencia) ? cliente.preferencia : []).map(p => PREFERENCIAS[p]).filter(Boolean);
  const prefiere = formas.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ');
  const obs = String(cliente.observaciones || '').replace(/\r\n?/g, '\n').trim().slice(0, 2000);
  const telLimpio = telefono.replace(/[^\d+]/g, '');
  const waCliente = (() => { const d = telefono.replace(/\D/g, ''); return d.length === 9 ? `34${d}` : d.length >= 10 ? d : ''; })();
  const cabecera = linea(av.cabecera || 'Ha llegado una solicitud desde la web', 150);
  const aviso = 'El correo y el teléfono los ha escrito el cliente y no están comprobados; no abras enlaces de las observaciones si no te fías.';
  const recordatorio = String(av.recordatorio || '').trim();
  const conHoja = av.hoja !== false;
  const html = marco(c, `
${pildora('{{NUMERO}}', '#fbe9ea', esc(acento))} ${pildora('Nueva', '#e8eefb', '#1f4e9c')} <span style="color:#6b7280;font-size:12px;">${esc(linea(fecha, 40))}</span>
<h1 style="margin:12px 0 8px;font-size:20px;">${esc(cabecera)}</h1>
<div style="background:#fdf1dc;color:#6b4300;border-radius:8px;padding:8px 10px;font-size:12px;">⚠ ${esc(aviso)}</div>
${caja(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;font-size:13px;">
<tr><td style="color:#6b7280;padding:3px 12px 3px 0;">Cliente</td><td><b>${esc(nombre)}</b></td></tr>
<tr><td style="color:#6b7280;padding:3px 12px 3px 0;">Teléfono</td><td>${esc(telefono)}</td></tr>
<tr><td style="color:#6b7280;padding:3px 12px 3px 0;">Correo</td><td>${esc(correo)}</td></tr>
${prefiere ? `<tr><td style="color:#6b7280;padding:3px 12px 3px 0;">Prefiere</td><td>${esc(prefiere)}</td></tr>` : ''}</table>
<p style="margin:6px 0 0;">${telLimpio ? boton(`tel:${telLimpio}`, 'Llamar', acento) : ''}${waCliente ? boton(`https://wa.me/${waCliente}`, 'WhatsApp', '#1e7a3a') : ''}${correo ? boton(`mailto:${encodeURIComponent(correo).replace(/%40/g, '@')}`, 'Responder', '#ffffff', '#1f2933', '#c9ced6') : ''}</p>`, acento)}
${caja(`<div style="font-weight:bold;padding-top:8px;">Productos (${lineas.length})</div>${filasProductos(lineas, c, { enlaces: true })}${filaTotal(total, aConsultar, c)}`, acento)}
<div style="font-weight:bold;">Observaciones</div>
<div style="color:${obs ? 'inherit' : '#6b7280'};font-size:13px;background:#f6f5f2;border-radius:8px;padding:8px 10px;margin-top:4px;">${obs ? esc(obs).replace(/\n/g, '<br>') : '(ninguna)'}</div>
${conHoja ? `<p style="margin:14px 0 0;">${boton('{{HOJA}}', 'Abrir la hoja de solicitudes (estado, notas y precio final)', '#ffffff', '#1f2933', '#c9ced6')}</p>` : ''}
${recordatorio ? `<p style="margin:12px 0 0;font-size:13px;">${esc(recordatorio).replace(/\n/g, '<br>')}</p>` : ''}
<p style="color:#6b7280;font-size:12px;margin:12px 0 0;">Para contestar al cliente basta con «Responder».</p>`,
  `<tr><td style="background:#f6f5f2;color:#6b7280;padding:10px 22px;font-size:11px;border-radius:0 0 10px 10px;">Aviso automático de la web · Acuse al cliente: {{ACUSE}} · Quedan {{CUOTA}} correos hoy</td></tr>`);
  const textoPlano = [RAYA, `  NUEVA SOLICITUD  {{NUMERO}}`, fecha ? `  ${linea(fecha, 40)}` : '', RAYA,
    ...partir(`⚠ ${aviso}`).map((s, i) => (i ? `  ${s}` : s)), '',
    seccion('CLIENTE', [nombre, telefono ? `Tel. ${telefono}` : '', correo, prefiere ? `Prefiere: ${prefiere}` : ''].filter(Boolean)), '',
    seccion(`PRODUCTOS (${lineas.length})`, [...textoProductos(lineas, c, { enlaces: true }), '', `TOTAL ORIENTATIVO: ${euros(total) || '—'}`, ...(aConsultar ? [`(más ${aConsultar} con «${c.sinPrecio || 'Precio a consultar'}»)`] : [])]), '',
    seccion('OBSERVACIONES', obs ? partir(obs) : ['(ninguna)']), '',
    ...(conHoja ? ['→ Hoja de solicitudes (estado, notas y', '  precio final):', '  {{HOJA}}', ''] : []),
    ...(recordatorio ? [...partir(recordatorio), ''] : []),
    'Para contestar al cliente basta con', '«Responder».', '', FINA, 'Aviso automático de la web · Acuse al', 'cliente: {{ACUSE}} · Quedan {{CUOTA}} correos hoy']
    .filter(x => x !== null).join('\n');
  const asunto = [linea(av.asunto || 'Nueva solicitud de presupuesto', 80) + ' {{NUMERO}}', linea(nombre, 40), euros(total) || (aConsultar ? 'precio a consultar' : '')].filter(Boolean).join(' · ');
  return { asunto, html, texto: textoPlano };
}

// Los dos a la vez (lo que manda la función de Cloudflare al script)
export function prepararCorreos(datos, c) {
  return { cliente: correoCliente(datos, c), tienda: correoTienda(datos, c) };
}
