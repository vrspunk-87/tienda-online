/**
 * @OnlyCurrentDoc
 * (Esta marca limita el script a ESTA hoja: aunque alguien lo modificara,
 *  no podría tocar otros documentos de la cuenta.)
 */

/**
 * RECEPTOR DE SOLICITUDES DE PRESUPUESTO — Máquinas de Coser Zafra
 *
 * Se pega en la hoja de Google de la tienda (Extensiones → Apps Script) y se publica como
 * aplicación web. Recibe las solicitudes de la web (functions/api/solicitud.js) y:
 *  - les da un número correlativo (S-2026-0001), sin repetirse aunque lleguen dos a la vez;
 *  - guarda una fila por solicitud en la pestaña «Solicitudes» (con un desplegable de estado)
 *    y una fila por producto en «Líneas»;
 *  - avisa a la tienda por correo (sin datos del cliente: número, productos, total y enlace);
 *  - manda el acuse de recibo al cliente (texto fijo de la web y productos del catálogo; NUNCA
 *    nada escrito por el cliente, para que nadie use el formulario para mandar correos a terceros).
 * Instrucciones: docs/solicitudes/CONFIGURAR.md
 *
 * Propiedades del script (Configuración del proyecto → Propiedades del script):
 *  - SECRETO     la clave compartida con la web (la crea crearSecreto(); en Cloudflare: SOLICITUDES_SECRETO)
 *  - AVISO_PARA  correo donde la tienda recibe el aviso de cada solicitud (si falta, no se avisa)
 *
 * Seguridad:
 *  - Solo acepta envíos con la clave secreta.
 *  - Todo se guarda como texto y se neutralizan las fórmulas (= + - @ al principio).
 *  - No acepta dos veces la misma verificación «No soy un robot».
 *  - Límite global de solicitudes por hora y topes diarios de avisos y acuses (la cuenta gratuita
 *    de Google manda unos 100 correos al día). Si se llega al tope de acuses, la solicitud se
 *    guarda igual y la web se lo dice al cliente.
 */

var PESTANA = 'Solicitudes';
var PESTANA_LINEAS = 'Líneas';
var ESTADOS = ['Nueva', 'En revisión', 'Contactado', 'Aceptada', 'Rechazada', 'Cancelada'];
var CABECERAS = ['Número', 'Fecha', 'Estado', 'Nombre', 'Teléfono', 'Correo', 'Prefiere', 'Productos',
  'Nº de productos', 'Total orientativo', 'Precio a consultar', 'Observaciones', 'Consentimiento',
  'Versión del consentimiento', 'Acuse enviado', 'Entorno', 'Notas de la tienda', 'Precio final'];
var CABECERAS_LINEAS = ['Número', 'Fecha', 'Producto', 'Versión', 'Fabricante', 'Modelo', 'Referencia',
  'Unidades', 'Precio por unidad', 'De oferta', 'Subtotal', 'Nota del cliente', 'Identificador', 'Enlace'];
// Topes absolutos (los del panel no pueden superarlos)
var MAX_POR_HORA = 300;
var MAX_AVISOS_DIA = 90;
var MAX_ACUSES_DIA = 90;
var PREFERENCIAS = { llamada: 'Llamada', whatsapp: 'WhatsApp', correo: 'Correo' };

function doPost(e) {
  var bloqueo = LockService.getScriptLock();
  try {
    var datos = JSON.parse(e && e.postData ? e.postData.contents : '{}');
    var props = PropertiesService.getScriptProperties();
    var secreto = props.getProperty('SECRETO');
    if (!secreto || datos.secreto !== secreto) return responder({ ok: false, error: 'no autorizado' });

    // Comprobación desde /api/estado-solicitudes: la clave es correcta; no se escribe nada
    if (datos.accion === 'comprobar') {
      return responder({ ok: true, version: 1, aviso: Boolean(props.getProperty('AVISO_PARA')), cuota: MailApp.getRemainingDailyQuota() });
    }
    if (datos.accion !== 'guardar' || !datos.cliente || !Array.isArray(datos.lineas) || !datos.lineas.length) {
      return responder({ ok: false, error: 'datos no válidos' });
    }

    bloqueo.waitLock(20000); // evita que dos envíos simultáneos se pisen (y que se repita el número)
    var cache = CacheService.getScriptCache();

    // Una verificación «No soy un robot» solo vale para un envío
    if (datos.verificacion) {
      var claveVerif = 'verif-' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(datos.verificacion)));
      if (cache.get(claveVerif)) return responder({ ok: false, error: 'repetido' });
      cache.put(claveVerif, '1', 3600);
    }

    // Límite global por hora
    var limites = datos.limites || {};
    var porHora = Math.min(Number(limites.porHora) || 30, MAX_POR_HORA);
    var claveHora = 'hora-' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMddHH');
    var enEstaHora = Number(cache.get(claveHora) || 0);
    if (enEstaHora >= porHora) return responder({ ok: false, error: 'limite' });
    cache.put(claveHora, String(enEstaHora + 1), 3700);

    var numero = siguienteNumero(props);
    var c = datos.cliente;
    var lineas = datos.lineas;
    var productosTexto = lineas.map(function (l) { return l.unidades + ' × ' + nombreLinea(l) + ' — ' + precioLinea(l); }).join('\n');

    var hoja = pestana(PESTANA, CABECERAS);
    var fila = [numero, datos.fecha, 'Nueva', c.nombre, c.telefono, c.correo, PREFERENCIAS[c.preferencia] || c.preferencia || '',
      productosTexto, String(lineas.length), euros(datos.total), datos.aConsultar ? String(datos.aConsultar) : '',
      c.observaciones || '', 'Sí', datos.consentimiento || '', '', datos.entorno || '', '', ''];
    hoja.appendRow(fila.map(comoTexto));
    var filaNueva = hoja.getLastRow();
    hoja.getRange(filaNueva, CABECERAS.indexOf('Estado') + 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(false).build());

    var hojaLineas = pestana(PESTANA_LINEAS, CABECERAS_LINEAS);
    lineas.forEach(function (l) {
      hojaLineas.appendRow([numero, datos.fecha, l.nombre, l.version || '', l.fabricante || '', l.modelo || '', l.referencia || '',
        String(l.unidades), l.precio == null ? 'A consultar' : euros(l.precio), l.oferta ? 'Sí (hasta el ' + fechaCorta(l.ofertaHasta) + ')' : '',
        l.subtotal == null ? '' : euros(l.subtotal), l.nota || '', l.id, l.url || ''].map(comoTexto));
    });

    var pruebas = datos.entorno && datos.entorno !== 'produccion';
    enviarAviso(props, datos, numero, Math.min(Number(limites.avisosDia) || 40, MAX_AVISOS_DIA), pruebas);
    var acuse = enviarAcuse(props, datos, numero, Math.min(Number(limites.acusesDia) || 45, MAX_ACUSES_DIA), pruebas);
    hoja.getRange(filaNueva, CABECERAS.indexOf('Acuse enviado') + 1).setValue(acuse ? 'Sí' : 'No (tope diario)');

    return responder({ ok: true, numero: numero, acuse: acuse });
  } catch (error) {
    console.error(error);
    return responder({ ok: false, error: String(error && error.message || error) });
  } finally {
    try { bloqueo.releaseLock(); } catch (x) {}
  }
}

// Número correlativo por año: S-2026-0001 (se llama con el bloqueo puesto)
function siguienteNumero(props) {
  var anio = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy');
  var clave = 'contador-' + anio;
  var n = Number(props.getProperty(clave) || 0) + 1;
  props.setProperty(clave, String(n));
  return 'S-' + anio + '-' + ('000' + n).slice(-Math.max(4, String(n).length));
}

// Pestaña con su fila de cabeceras (se crea si no existe; añade al final las cabeceras nuevas)
function pestana(nombre, cabeceras) {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getSheetByName(nombre) || libro.insertSheet(nombre);
  var ultima = hoja.getLastColumn();
  var actuales = ultima > 0 ? hoja.getRange(1, 1, 1, ultima).getValues()[0].map(String) : [];
  var cambia = false;
  cabeceras.forEach(function (c) { if (actuales.indexOf(c) === -1) { actuales.push(c); cambia = true; } });
  if (cambia) {
    hoja.getRange(1, 1, 1, actuales.length).setValues([actuales]).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

// Guarda siempre como texto y neutraliza fórmulas
function comoTexto(valor) {
  var t = valor === null || valor === undefined ? '' : String(valor);
  return /^[=+\-@\t\r]/.test(t) ? "'" + t : t;
}

function euros(v) {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) return '';
  var n = Number(v);
  var redondo = Math.abs(n - Math.round(n)) < 0.005;
  var partes = (redondo ? Math.round(n).toString() : n.toFixed(2)).split('.');
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return partes.join(',') + ' €';
}

function fechaCorta(aaaammdd) {
  var m = String(aaaammdd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : String(aaaammdd || '');
}

function nombreLinea(l) {
  var extra = [l.version, l.modelo ? 'modelo ' + l.modelo : '', l.referencia ? 'ref. ' + l.referencia : ''].filter(String);
  return l.nombre + (extra.length ? ' (' + extra.join(', ') + ')' : '');
}

function precioLinea(l) {
  if (l.precio === null || l.precio === undefined) return 'precio a consultar';
  return euros(l.precio) + (l.unidades > 1 ? ' por unidad' : '') + (l.oferta ? ' (precio de oferta hasta el ' + fechaCorta(l.ofertaHasta) + ')' : '');
}

// Cuenta los correos de cada día (y borra los contadores de días anteriores)
function contar(props, tipo, maximo) {
  var hoy = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyyMMdd');
  var clave = tipo + '-' + hoy;
  props.getKeys().forEach(function (k) { if (k.indexOf(tipo + '-') === 0 && k !== clave) props.deleteProperty(k); });
  var n = Number(props.getProperty(clave) || 0);
  props.setProperty(clave, String(n + 1));
  return { n: n, queda: n < maximo };
}

// Aviso a la tienda SIN datos del cliente: número, productos, total y enlace a la hoja.
// Al llegar al tope diario manda un único aviso de que se ha alcanzado.
function enviarAviso(props, datos, numero, maximo, pruebas) {
  var para = props.getProperty('AVISO_PARA');
  if (!para || !maximo) return;
  var cuenta = contar(props, 'avisos', maximo);
  if (cuenta.n > maximo) return;
  var url = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  var prefijo = pruebas ? '[Pruebas: ' + datos.entorno + '] ' : '';
  if (cuenta.n === maximo) {
    MailApp.sendEmail({ to: para, subject: prefijo + 'Solicitudes: límite diario de avisos alcanzado',
      body: 'Hoy se han recibido muchas solicitudes. No se mandarán más avisos hasta mañana, pero las solicitudes se siguen guardando en la hoja:\n' + url +
        '\n\nSi no es normal, puede ser un envío masivo: se puede desactivar la solicitud de presupuesto desde el panel de la web.' });
    return;
  }
  MailApp.sendEmail({
    to: para,
    subject: prefijo + 'Nueva solicitud de presupuesto ' + numero,
    body: 'Se ha recibido la solicitud de presupuesto ' + numero + ' desde la web.\n\n' +
      'Productos: ' + datos.lineas.length + '\n' +
      'Total orientativo: ' + (euros(datos.total) || '—') + (datos.aConsultar ? ' (+ ' + datos.aConsultar + ' con precio a consultar)' : '') + '\n\n' +
      'Los datos del cliente están en la hoja de solicitudes:\n' + url +
      '\n\n(Por seguridad, este aviso no incluye los datos del cliente ni lo que haya escrito.)',
  });
}

// Acuse de recibo al cliente: texto fijo de la web y productos del catálogo (nada escrito por el cliente)
function enviarAcuse(props, datos, numero, maximo, pruebas) {
  var correo = datos.cliente && datos.cliente.correo;
  if (!correo || !maximo) return false;
  if (MailApp.getRemainingDailyQuota() < 2) return false;
  var cuenta = contar(props, 'acuses', maximo);
  if (!cuenta.queda) return false;
  var acuse = datos.acuse || {};
  var lista = datos.lineas.map(function (l) { return '- ' + l.unidades + ' × ' + nombreLinea(l) + ': ' + precioLinea(l); }).join('\n');
  var oferta = datos.lineas.some(function (l) { return l.oferta; });
  var cuerpo = String(acuse.texto || 'Gracias por tu solicitud de presupuesto. La tienda se pondrá en contacto contigo en breve.') + '\n\n' +
    'Número de solicitud: ' + numero + '\n\n' +
    'Productos:\n' + lista + '\n\n' +
    'Total orientativo: ' + (euros(datos.total) || '—') + (datos.aConsultar ? ' (más ' + datos.aConsultar + (datos.aConsultar === 1 ? ' producto' : ' productos') + ' con precio a consultar)' : '') + '\n\n' +
    'Precios orientativos con IVA incluido; no son un precio firme: la tienda te confirmará la disponibilidad y el precio final.' +
    (oferta ? ' Los precios de oferta se respetan en las solicitudes recibidas dentro de sus fechas.' : '') + '\n\n' +
    (datos.tienda || '') + (datos.web ? '\n' + datos.web : '');
  var opciones = { to: correo, subject: (pruebas ? '[Pruebas] ' : '') + String(acuse.asunto || 'Hemos recibido tu solicitud de presupuesto').slice(0, 120) + ' (' + numero + ')', body: cuerpo, name: datos.tienda || 'Tienda' };
  var avisoPara = props.getProperty('AVISO_PARA');
  if (avisoPara) opciones.replyTo = avisoPara;
  MailApp.sendEmail(opciones);
  return true;
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Ejecuta esta función UNA VEZ desde el editor (botón ▶ Ejecutar) para crear la clave secreta y
 * las pestañas. Copia la clave que aparece en el registro y ponla en Cloudflare como
 * SOLICITUDES_SECRETO. Si la vuelves a ejecutar, la clave cambia (y hay que cambiarla también en
 * Cloudflare).
 */
function crearSecreto() {
  var clave = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('SECRETO', clave);
  pestana(PESTANA, CABECERAS);
  pestana(PESTANA_LINEAS, CABECERAS_LINEAS);
  console.log('Clave secreta (cópiala en Cloudflare como SOLICITUDES_SECRETO):\n' + clave);
}

/**
 * Muestra dos claves aleatorias: una para ALTCHA_SECRETO (casilla «No soy un robot») y otra para
 * DIAGNOSTICO_CLAVE (el diagnóstico /api/estado-solicitudes). Solo las muestra: no guarda nada.
 */
function generarClavesCloudflare() {
  var nueva = function () { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); };
  console.log('ALTCHA_SECRETO (solo en Cloudflare):\n' + nueva() + '\n\nDIAGNOSTICO_CLAVE (solo en Cloudflare):\n' + nueva());
}

/**
 * Pide los permisos de correo una vez (ejecútala desde el editor si al publicar no te los pidió):
 * manda un correo de prueba a AVISO_PARA.
 */
function probarCorreo() {
  var para = PropertiesService.getScriptProperties().getProperty('AVISO_PARA');
  if (!para) throw new Error('Falta la propiedad AVISO_PARA (Configuración del proyecto → Propiedades del script).');
  MailApp.sendEmail({ to: para, subject: 'Prueba del script de solicitudes', body: 'El script de solicitudes de presupuesto puede mandar correos. Correos que quedan hoy: ' + MailApp.getRemainingDailyQuota() });
  console.log('Correo de prueba enviado a ' + para);
}
