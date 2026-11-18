/*
  Exportar, importar y cambiar en bloque desde el panel (docs/PLAN.md, fase 3): lo que se ve.

  En la lista de cada colección preparada (PERFILES en nucleo.js; de momento, Fabricantes) se añade,
  a la izquierda de «Nuevo …», un botón con un engranaje que despliega:
    Excel:              Exportar a Excel… · Importar Excel…
    Cambiar en bloque:  Quitar «Solo para pruebas»… · Marcar «Solo para pruebas»…
    (aparte, en rojo)   Eliminar…
  Todo pasa por un informe antes de guardar nada, y se guarda en un único commit (almacen.js).
  Decap no tiene un sitio oficial para añadir botones a la lista: se pone al detectar la vista
  «#/collections/<nombre>» (comprobarlo al actualizar Decap, scripts/actualizar-decap.js).
*/
import {
  PERFILES, columnasDe, leerEntrada, crearContexto, planificarImportacion, planificarAccion,
  hayCambios, resumenPlan, esImagen,
} from './nucleo.js';
import { crearLibro, leerLibro, libroInforme } from './libro.js';
import { crearAlmacen } from './almacen.js';

/* ---------- Librerías (se cargan al usarlas por primera vez) ---------- */
let libs = null;
const script = src => new Promise((ok, mal) => {
  const s = document.createElement('script');
  s.src = src; s.onload = ok; s.onerror = () => mal(new Error(`No se ha podido cargar ${src}.`));
  document.head.appendChild(s);
});
async function cargarLibrerias() {
  if (libs) return libs;
  const [YAML] = await Promise.all([
    import('/admin/vendor/yaml/index.js'),
    window.ExcelJS ? null : script('/admin/vendor/exceljs.min.js'),
    window.JSZip ? null : script('/admin/vendor/jszip.min.js'),
  ]);
  const cfg = YAML.parse(await (await fetch('/config.yml', { cache: 'no-store' })).text());
  libs = { YAML, ExcelJS: window.ExcelJS, JSZip: window.JSZip, cfg, almacen: await crearAlmacen(cfg) };
  return libs;
}

/* ---------- Estilos ---------- */
const css = `
.xl-eng{position:relative;display:inline-flex;margin:0 10px 0 auto;vertical-align:middle}
.xl-eng>button{display:inline-flex;align-items:center;gap:4px;height:36px;padding:0 10px;border:1px solid #dfdfe3;border-radius:5px;background:#fff;color:#313d3e;cursor:pointer;font:inherit}
.xl-eng>button:hover{background:#f4f4f6}
.xl-menu{position:absolute;right:0;top:40px;z-index:300;min-width:260px;background:#fff;border:1px solid #dfdfe3;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.15);padding:4px;font-size:14px;text-align:left}
.xl-menu .xl-gr{font-size:12px;color:#798291;padding:8px 10px 2px}
.xl-menu button{display:flex;gap:8px;align-items:center;width:100%;padding:7px 10px;border:0;background:none;border-radius:4px;cursor:pointer;font:inherit;color:#313d3e;text-align:left}
.xl-menu button:hover{background:#eff0f4}
.xl-menu .xl-ico{flex:none;color:#798291}
.xl-menu .xl-rojo .xl-ico{color:inherit}
.xl-menu .xl-sep{border-top:1px solid #eff0f4;margin:4px 0}
.xl-rojo{color:#c92a2a!important}
.xl-velo{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;font-family:inherit}
.xl-modal{background:#fff;border-radius:10px;width:100%;max-width:640px;padding:20px 22px;font-size:14px;color:#313d3e;box-shadow:0 10px 40px rgba(0,0,0,.25)}
.xl-modal h2{font-size:18px;margin:0 0 6px;font-weight:600}
.xl-gris{color:#6c757d}
.xl-op{display:flex;gap:10px;align-items:flex-start;border:1px solid #dfdfe3;border-radius:6px;padding:10px 12px;margin:8px 0;cursor:pointer}
.xl-pie{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;flex-wrap:wrap}
.xl-pie .xl-izq{margin-right:auto}
.xl-b{height:36px;padding:0 14px;border:1px solid #c9ced6;border-radius:5px;background:#fff;color:#313d3e;cursor:pointer;font:inherit}
.xl-b:hover{background:#f4f4f6}
.xl-b.xl-pri{background:#3a69c7;border-color:#3a69c7;color:#fff}
.xl-b.xl-peligro{background:#c92a2a;border-color:#c92a2a;color:#fff}
.xl-zona{border:2px dashed #b9c0cb;border-radius:8px;padding:24px;text-align:center;margin:12px 0;cursor:pointer}
.xl-zona.xl-sobre{background:#eef3fc;border-color:#3a69c7}
.xl-fich{display:flex;justify-content:space-between;border:1px solid #eff0f4;border-radius:6px;padding:6px 10px;margin:4px 0}
.xl-cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:12px 0}
.xl-cifras div{border-radius:6px;padding:8px 10px;background:#f4f4f6}
.xl-cifras b{display:block;font-size:20px}
.xl-sec{font-weight:600;margin:14px 0 4px}
.xl-fila{display:flex;gap:10px;justify-content:space-between;padding:6px 4px;border-bottom:1px solid #eff0f4}
.xl-fila span:last-child{text-align:right;color:#6c757d}
.xl-err{color:#c92a2a}.xl-ok{color:#2b8a3e}.xl-av{color:#a35f00}
.xl-lista{max-height:46vh;overflow:auto;border:1px solid #eff0f4;border-radius:6px;margin-top:8px}
.xl-lista label{display:flex;gap:8px;align-items:center;padding:6px 10px;border-bottom:1px solid #f4f4f6;cursor:pointer}
.xl-lista label.xl-no{cursor:default;color:#98a0ab}
.xl-modal input[type=text],.xl-modal input[type=search]{width:100%;height:36px;border:1px solid #c9ced6;border-radius:5px;padding:0 10px;font:inherit;box-sizing:border-box}
.xl-espera{display:flex;align-items:center;gap:10px;margin:14px 0}
.xl-espera::before{content:"";width:18px;height:18px;border:3px solid #dfe5f2;border-top-color:#3a69c7;border-radius:50%;animation:xl-gira 1s linear infinite}
@keyframes xl-gira{to{transform:rotate(360deg)}}
`;
document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

/* ---------- Utilidades de la interfaz ---------- */
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svg = {
  eng: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1 2.5c1.9.5 1.9 3.1 0 3.5a1.7 1.7 0 0 0-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 0 0-2.6 1c-.4 1.9-3 1.9-3.4 0a1.7 1.7 0 0 0-2.6-1c-1.5.9-3.3-.9-2.4-2.4a1.7 1.7 0 0 0-1-2.6c-1.9-.4-1.9-3 0-3.5a1.7 1.7 0 0 0 1-2.5c-.9-1.6.9-3.3 2.4-2.4 1 .6 2.3.1 2.6-1.1z"/><circle cx="12" cy="12" r="3"/></svg>',
  descargar: '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="m7 11 5 5 5-5"/><path d="M12 4v12"/>',
  subir: '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="m7 9 5-5 5 5"/><path d="M12 4v12"/>',
  ver: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  matraz: '<path d="M9 3h6"/><path d="M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 14h9"/>',
  papelera: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="m5 7 1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/>',
  flecha: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
};
const ico = d => `<svg class="xl-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const hoy = () => new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' }).split('/').map(x => x.padStart(2, '0')).join('-');
const hoyIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
const ahora = () => new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'short', timeStyle: 'short' });
function descargar(bytes, nombre, tipo) {
  const url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ZIP = 'application/zip';
const TIPOS_FICHERO = { [XLSX]: { description: 'Libro de Excel', accept: { [XLSX]: ['.xlsx'] } }, [ZIP]: { description: 'Carpeta comprimida (ZIP)', accept: { [ZIP]: ['.zip'] } } };
/* Preguntar dónde guardar (Chrome y Edge: ventana «Guardar como»). Hay que pedirlo nada más pulsar el
   botón, antes de preparar el fichero, porque el navegador solo deja abrir esa ventana justo tras un clic.
   Devuelve el destino, null si el navegador no lo permite (se descargará como siempre: en Firefox,
   según su ajuste «Preguntar dónde guardar») o lanza AbortError si se cancela. */
async function pedirDestino(nombre, tipo) {
  if (typeof window.showSaveFilePicker !== 'function') return null;
  try {
    return await window.showSaveFilePicker({ suggestedName: nombre, id: 'tienda-excel', types: [TIPOS_FICHERO[tipo]] });
  } catch (e) {
    if (e && e.name === 'AbortError') throw e;
    return null; // p. ej. en una ventana sin permiso: descarga normal
  }
}
async function guardarFichero(destino, bytes, nombre, tipo) {
  if (!destino) { descargar(bytes, nombre, tipo); return { nombre, preguntado: false }; }
  const w = await destino.createWritable();
  await w.write(new Blob([bytes], { type: tipo }));
  await w.close();
  return { nombre: destino.name, preguntado: true };
}

function modal(html) {
  const velo = document.createElement('div');
  velo.className = 'xl-velo';
  velo.innerHTML = `<div class="xl-modal" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(velo);
  const cerrar = () => velo.remove();
  velo.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
  const m = velo.firstElementChild;
  return { m, cerrar, poner: h => { m.innerHTML = h; }, q: s => m.querySelector(s) };
}
const esperar = (v, texto) => v.poner(`<div class="xl-espera">${esc(texto)}</div>`);
function mostrarError(v, e, titulo = 'No se ha podido terminar') {
  console.error(e);
  v.poner(`<h2 class="xl-err">${esc(titulo)}</h2><p>${esc(e.message || e)}</p><p class="xl-gris">No se ha guardado nada.</p><div class="xl-pie"><button class="xl-b" data-x>Cerrar</button></div>`);
  v.q('[data-x]').onclick = v.cerrar;
}

/* ---------- Datos de la colección ---------- */
async function preparar(nombre) {
  const L = await cargarLibrerias();
  const col = L.cfg.collections.find(c => c.name === nombre);
  if (!col || !PERFILES[nombre]) throw new Error(`La sección «${nombre}» todavía no tiene Excel.`);
  const perfil = PERFILES[nombre];
  return { ...L, col, perfil, columnas: columnasDe(L.cfg, col, perfil) };
}
async function leerActuales(x) {
  const lista = await x.almacen.leerCarpeta(x.col.folder, 2);
  const actuales = lista.map(f => leerEntrada(x.YAML, f.ruta, f.raw));
  const malas = actuales.filter(a => a.error);
  if (malas.length) throw new Error(`No se pueden leer: ${malas.map(a => a.ruta).join(', ')}.`);
  return actuales;
}
// Productos (para contarlos) y, si hace falta, el texto de todas las fichas (para saber si una
// imagen la usa otra antes de borrarla)
async function leerContexto(x, { textos = false } = {}) {
  const prodCol = x.cfg.collections.find(c => c.name === 'productos');
  const productos = prodCol ? (await x.almacen.leerCarpeta(prodCol.folder, 1)).map(f => leerEntrada(x.YAML, f.ruta, f.raw)) : [];
  let todos = [];
  if (textos) {
    const carpetas = [...new Set(x.cfg.collections.filter(c => c.folder).map(c => c.folder))];
    for (const c of carpetas) todos.push(...await x.almacen.leerCarpeta(c, 2));
    const ficheros = x.cfg.collections.flatMap(c => (c.files || []).map(f => f.file)).filter(Boolean);
    todos.push(...await x.almacen.leerFicheros(ficheros));
  }
  return crearContexto({ productos, textos: todos });
}
async function leerMedios(x) {
  const medios = new Map();
  for (const c of x.columnas.campos.filter(c => c.widget === 'image')) {
    if (!medios.has(c.imagen.repo)) medios.set(c.imagen.repo, await x.almacen.listarMedios(c.imagen.repo).catch(() => new Map()));
  }
  return medios;
}

/* ---------- Exportar ---------- */
async function exportar(nombre) {
  const v = modal('');
  try {
    esperar(v, 'Preparando…');
    const x = await preparar(nombre);
    const conImagenes = x.columnas.campos.some(c => c.widget === 'image');
    v.poner(`<h2>Exportar ${esc(x.perfil.varios)}</h2>
      <p class="xl-gris">Se exportan todos, también lo que aún no se ha publicado en la web. Se leen de ${esc(x.almacen.descripcion)}.</p>
      <label class="xl-op"><input type="radio" name="xl-modo" value="excel" checked><span><b>Solo Excel</b><br><span class="xl-gris">Para cambiar datos. Las imágenes se quedan como están.</span></span></label>
      ${conImagenes ? `<label class="xl-op"><input type="radio" name="xl-modo" value="zip"><span><b>Excel + imágenes (ZIP)</b><br><span class="xl-gris">Incluye las imágenes, por si quieres cambiarlas.</span></span></label>` : ''}
      <div class="xl-pie"><button class="xl-b" data-x>Cancelar</button><button class="xl-b xl-pri" data-ok>Descargar…</button></div>
      <p class="xl-gris" style="margin:8px 0 0;font-size:13px">${typeof window.showSaveFilePicker === 'function' ? 'Te preguntará dónde guardarlo.' : 'Se guardará en la carpeta de descargas del navegador (en Firefox, según su ajuste «Preguntar dónde guardar»).'}</p>`);
    v.q('[data-x]').onclick = v.cerrar;
    v.q('[data-ok]').onclick = async () => {
      const zip = v.q('input[name="xl-modo"]:checked').value === 'zip';
      const base = `${nombre}-${hoyIso()}`;
      let destino;
      try { destino = await pedirDestino(`${base}.${zip ? 'zip' : 'xlsx'}`, zip ? ZIP : XLSX); } catch { return; } // cancelado: sigue la ventana
      try {
        esperar(v, `Leyendo ${x.perfil.varios}…`);
        const [actuales, ctx] = await Promise.all([leerActuales(x), leerContexto(x)]);
        esperar(v, 'Creando el Excel…');
        const wb = await crearLibro(x.ExcelJS, { cfg: x.cfg, col: x.col, perfil: x.perfil, columnas: x.columnas, actuales, ctx, meta: { fecha: ahora(), rama: x.almacen.rama, total: actuales.length } });
        const buf = await wb.xlsx.writeBuffer();
        let fallidas = [];
        let guardado;
        if (zip) {
          const z = new x.JSZip();
          z.file(`${base}.xlsx`, buf);
          const rutas = new Set();
          for (const a of actuales) for (const c of x.columnas.campos.filter(c => c.widget === 'image')) {
            const r = a.datos[c.campo];
            if (r && !/^https?:/i.test(r)) rutas.add(r.startsWith(c.imagen.publica + '/') ? c.imagen.repo + r.slice(c.imagen.publica.length) : 'public' + r);
          }
          let i = 0;
          for (const r of rutas) {
            esperar(v, `Añadiendo imágenes ${++i}/${rutas.size}…`);
            try { z.file(`imagenes/${r.split('/').pop()}`, await x.almacen.leerBinario(r)); } catch { fallidas.push(r.split('/').pop()); }
          }
          guardado = await guardarFichero(destino, await z.generateAsync({ type: 'uint8array' }), `${base}.zip`, ZIP);
        } else guardado = await guardarFichero(destino, buf, `${base}.xlsx`, XLSX);
        v.poner(`<h2 class="xl-ok">${guardado.preguntado ? 'Guardado' : 'Descargado'}</h2><p>${esc(guardado.nombre)}: ${actuales.length} ${esc(actuales.length === 1 ? x.perfil.uno : x.perfil.varios)}${guardado.preguntado ? ', en la carpeta que has elegido' : ', en la carpeta de descargas del navegador'}.</p>
          ${fallidas.length ? `<p class="xl-av">No se han podido añadir estas imágenes: ${esc(fallidas.join(', '))}.</p>` : ''}
          <p class="xl-gris">La primera hoja del Excel explica cómo usarlo. Para subir los cambios: engranaje → «Importar Excel».</p>
          <div class="xl-pie"><button class="xl-b xl-pri" data-x>Cerrar</button></div>`);
        v.q('[data-x]').onclick = v.cerrar;
      } catch (e) { mostrarError(v, e, 'No se ha podido exportar'); }
    };
  } catch (e) { mostrarError(v, e); }
}

/* ---------- Importar ---------- */
async function importar(nombre) {
  const v = modal('');
  let x;
  try { esperar(v, 'Preparando…'); x = await preparar(nombre); } catch (e) { return mostrarError(v, e); }
  const elegidos = [];
  const pintar = () => {
    v.poner(`<h2>Importar ${esc(x.perfil.varios)}</h2>
      <div class="xl-zona" tabindex="0"><b>Arrastra aquí el Excel, un ZIP o el Excel con sus imágenes</b><br><span class="xl-gris">o pulsa para elegir ficheros</span>
        <input type="file" multiple accept=".xlsx,.zip,image/*" hidden></div>
      ${elegidos.map((f, i) => `<div class="xl-fich"><span>${esc(f.name)}</span><span class="xl-gris">${Math.max(1, Math.round(f.size / 1024))} KB · <a href="#" data-quitar="${i}">quitar</a></span></div>`).join('')}
      <p class="xl-gris">Aún no se cambia nada: primero verás el informe. Se guardará en ${esc(x.almacen.descripcion)}.</p>
      <p class="xl-err" data-err></p>
      <div class="xl-pie"><button class="xl-b" data-x>Cancelar</button><button class="xl-b xl-pri" data-ok>Revisar cambios</button></div>`);
    const zona = v.q('.xl-zona');
    const input = v.q('input[type=file]');
    const anadir = lista => { for (const f of lista) if (!elegidos.some(e => e.name === f.name && e.size === f.size)) elegidos.push(f); pintar(); };
    zona.onclick = () => input.click();
    zona.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
    input.onchange = () => anadir(input.files);
    zona.ondragover = e => { e.preventDefault(); zona.classList.add('xl-sobre'); };
    zona.ondragleave = () => zona.classList.remove('xl-sobre');
    zona.ondrop = e => { e.preventDefault(); anadir(e.dataTransfer.files); };
    v.m.querySelectorAll('[data-quitar]').forEach(a => { a.onclick = e => { e.preventDefault(); elegidos.splice(Number(a.dataset.quitar), 1); pintar(); }; });
    v.q('[data-x]').onclick = v.cerrar;
    v.q('[data-ok]').onclick = () => {
      const n = elegidos.filter(f => /\.(xlsx|zip)$/i.test(f.name)).length;
      if (!n) { v.q('[data-err]').textContent = 'Elige el Excel (.xlsx) o un ZIP que lo lleve dentro.'; return; }
      revisar();
    };
  };
  const revisar = async () => {
    try {
      esperar(v, 'Leyendo los ficheros…');
      let excel = null;
      const subidos = new Map();
      const guardarImagen = async (nombreFich, bytes) => {
        subidos.set(nombreFich, { nombre: nombreFich, bytes, huella: await x.almacen.huella(bytes) });
      };
      for (const f of elegidos) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        if (/\.xlsx$/i.test(f.name)) { if (excel) throw new Error('Has elegido más de un Excel: deja solo uno.'); excel = { nombre: f.name, bytes }; }
        else if (/\.zip$/i.test(f.name)) {
          const z = await x.JSZip.loadAsync(bytes);
          for (const e of Object.values(z.files)) {
            const base = e.name.split('/').pop();
            if (e.dir || e.name.startsWith('__MACOSX/') || base.startsWith('~$') || base.startsWith('.')) continue;
            if (/\.xlsx$/i.test(base)) { if (excel) throw new Error('Hay más de un Excel (en el ZIP o fuera): deja solo uno.'); excel = { nombre: base, bytes: await e.async('uint8array') }; }
            else if (esImagen(base)) await guardarImagen(base, await e.async('uint8array'));
          }
        } else if (esImagen(f.name)) await guardarImagen(f.name, bytes);
      }
      if (!excel) throw new Error('No hay ningún Excel (.xlsx) entre los ficheros.');
      const wb = new x.ExcelJS.Workbook();
      try { await wb.xlsx.load(excel.bytes); } catch { throw new Error(`«${excel.nombre}» no se puede abrir como Excel (.xlsx).`); }
      const leido = leerLibro(wb, { col: x.col, perfil: x.perfil, columnas: x.columnas });
      esperar(v, `Comparando con ${x.perfil.varios} actuales…`);
      const [actuales, ctx, medios] = await Promise.all([leerActuales(x), leerContexto(x, { textos: true }), leerMedios(x)]);
      const plan = leido.errores.length
        ? { nuevos: [], modificados: [], sinCambios: 0, borrados: [], avisos: [], errores: [], escribir: [], borrar: [], ignoradas: 0, imagenesUsadas: new Set() }
        : await planificarImportacion({ YAML: x.YAML, cfg: x.cfg, col: x.col, perfil: x.perfil, columnas: x.columnas, filas: leido.filas, actuales, huellas: leido.huellas, medios, subidos, ctx });
      plan.errores.unshift(...leido.errores);
      plan.avisos.unshift(...leido.avisos);
      const sinUso = [...subidos.keys()].filter(n => !plan.imagenesUsadas?.has(n));
      if (sinUso.length) plan.avisos.push({ fila: 0, texto: `Imágenes que no usa ninguna fila (no se suben): ${sinUso.join(', ')}.` });
      informe(v, x, plan, { titulo: `Importar ${x.perfil.varios}`, confirmar: plan.borrados.length ? 'casilla' : 'boton', boton: 'Importar', mensaje: `Panel (Excel): importación de ${x.perfil.varios} — ${resumenPlan(plan, x.perfil).replace(/^[^:]*: /, '')}`, medios, volver: pintar });
    } catch (e) { mostrarError(v, e, 'No se ha podido revisar'); }
  };
  pintar();
}

/* ---------- Informe y guardado ---------- */
function informe(v, x, plan, { titulo, confirmar, boton, mensaje, medios, volver }) {
  // Solo las cifras que no son cero
  const cifra = (t, n, cl = '') => (n ? `<div><span class="${cl}">${t}</span><b class="${cl}">${n}</b></div>` : '');
  const filaTxt = f => (f ? `fila ${f}` : '');
  const errores = plan.errores.length;
  const nb = plan.borrados.length;
  v.poner(`<h2>${esc(titulo)}: informe</h2>
    <div class="xl-cifras">${cifra('Nuevos', plan.nuevos.length, 'xl-ok')}${cifra('Modificados', plan.modificados.length)}${cifra('Sin cambios', plan.sinCambios, 'xl-gris')}${cifra('Se borran', nb, 'xl-err')}${errores ? cifra('Errores', errores, 'xl-err') : ''}</div>
    ${errores ? `<div class="xl-sec xl-err">Errores: corrígelos en el Excel y vuelve a importarlo (no se guarda nada mientras haya alguno)</div>${plan.errores.map(e => `<div class="xl-fila xl-err"><span>${esc(e.texto)}</span><span>${filaTxt(e.fila)}</span></div>`).join('')}` : ''}
    ${plan.nuevos.length ? `<div class="xl-sec">Nuevos</div>${plan.nuevos.map(n => `<div class="xl-fila"><span>${esc(n.nombre)} <span class="xl-gris">· ${esc(n.slug)}</span></span><span>${filaTxt(n.fila)}</span></div>`).join('')}` : ''}
    ${plan.modificados.length ? `<div class="xl-sec">Modificados</div>${plan.modificados.map(m => m.cambios.map(c => `<div class="xl-fila"><span>${esc(m.nombre)} <span class="xl-gris">· ${esc(c.campo)}</span></span><span>${esc(c.antes)} → ${esc(c.despues)}</span></div>`).join('')).join('')}` : ''}
    ${nb ? `<div class="xl-sec xl-err">Se borrarán</div>${plan.borrados.map(b => `<div class="xl-fila xl-err"><span>${esc(b.nombre)} <span class="xl-gris">· ${esc(b.slug)}</span></span><span>${esc([filaTxt(b.fila), ...b.arrastra].filter(Boolean).join(' · '))}</span></div>`).join('')}` : ''}
    ${plan.avisos.length ? `<div class="xl-sec xl-av">Avisos</div>${plan.avisos.map(a => `<div class="xl-fila"><span>${esc(a.texto)}</span><span>${filaTxt(a.fila)}</span></div>`).join('')}` : ''}
    ${!errores && hayCambios(plan) && nb && confirmar === 'casilla' ? `<label style="display:flex;gap:8px;margin-top:14px"><input type="checkbox" data-conf> Entiendo que se ${nb === 1 ? 'borrará 1 ficha' : `borrarán ${nb} fichas`}</label>` : ''}
    ${!errores && hayCambios(plan) && confirmar === 'numero' ? `<p style="margin-top:14px">Escribe <b>${nb}</b> para confirmar el borrado:</p><input type="text" inputmode="numeric" data-conf autocomplete="off">` : ''}
    <p class="xl-err" data-err></p>
    <div class="xl-pie"><button class="xl-b xl-izq" data-inf>Descargar informe</button>${volver ? '<button class="xl-b" data-atras>Atrás</button>' : ''}<button class="xl-b" data-x>${errores || !hayCambios(plan) ? 'Cerrar' : 'Cancelar'}</button>
      ${!errores && hayCambios(plan) ? `<button class="xl-b ${nb ? 'xl-peligro' : 'xl-pri'}" data-ok>${esc(boton)}</button>` : ''}</div>
    ${!errores && !hayCambios(plan) ? '<p class="xl-gris">No hay nada que guardar.</p>' : ''}`);
  v.q('[data-x]').onclick = v.cerrar;
  if (volver) v.q('[data-atras]').onclick = volver;
  v.q('[data-inf]').onclick = async () => {
    const nombreInf = `informe-${x.col.name}-${hoyIso()}.xlsx`;
    let destino;
    try { destino = await pedirDestino(nombreInf, XLSX); } catch { return; }
    await guardarFichero(destino, await libroInforme(x.ExcelJS, plan, `${titulo} · ${ahora()}`).xlsx.writeBuffer(), nombreInf, XLSX);
  };
  const ok = v.q('[data-ok]');
  if (!ok) return;
  const conf = v.q('[data-conf]');
  if (conf) conf.oninput = conf.onchange = () => { v.q('[data-err]').textContent = ''; };
  ok.onclick = async () => {
    if (confirmar === 'casilla' && conf && !conf.checked) { v.q('[data-err]').textContent = 'Marca la casilla para confirmar el borrado.'; return; }
    if (confirmar === 'numero' && conf.value.trim() !== String(nb)) { v.q('[data-err]').textContent = `Escribe ${nb} para confirmar.`; return; }
    try {
      // Solo se borran imágenes que existen de verdad
      const existe = r => [...(medios || new Map())].some(([carpeta, m]) => r.startsWith(carpeta + '/') && m.has(r.slice(carpeta.length + 1)));
      const borrar = plan.borrar.filter(r => r.endsWith('.md') || existe(r));
      esperar(v, 'Guardando…');
      const r = await x.almacen.guardar({ escribir: plan.escribir, borrar, mensaje }, t => esperar(v, t + '…'));
      v.poner(`<h2 class="xl-ok">Guardado</h2>
        <p>${esc(resumenPlan(plan, x.perfil))}, en un solo cambio de ${esc(x.almacen.descripcion)}.</p>
        ${r.url ? `<p><a href="${esc(r.url)}" target="_blank" rel="noopener">Ver el cambio en GitHub</a> (si hace falta deshacerlo, se revierte ese commit).</p>` : ''}
        <p class="xl-gris">${x.almacen.tipo === 'github' ? 'La web se actualizará en unos minutos, con el próximo despliegue.' : 'Revisa los cambios en Sourcetree antes de hacer el commit.'} Recarga el panel para ver la lista al día.</p>
        <div class="xl-pie"><button class="xl-b" data-x>Cerrar</button><button class="xl-b xl-pri" data-rec>Recargar el panel</button></div>`);
      v.q('[data-x]').onclick = v.cerrar;
      v.q('[data-rec]').onclick = () => location.reload();
    } catch (e) { mostrarError(v, e, 'No se ha podido guardar'); }
  };
}

/* ---------- Acciones en bloque sin Excel ---------- */
const ACCIONES = {
  'prueba-quitar': { titulo: 'Quitar «Solo para pruebas»', boton: 'Aplicar', ya: a => !a.datos.prueba, yaTexto: 'ya se publica', explica: 'Pasarán a verse en la web pública.', confirmar: 'boton' },
  'prueba-poner': { titulo: 'Marcar «Solo para pruebas»', boton: 'Aplicar', ya: a => Boolean(a.datos.prueba), yaTexto: 'ya es de pruebas', explica: 'Dejarán de verse en la web pública (seguirán en los entornos de pruebas).', confirmar: 'boton' },
  borrar: { titulo: 'Eliminar', boton: 'Revisar', explica: 'Se borran la ficha y sus imágenes que no use otra.', confirmar: 'numero' },
};
async function enBloque(nombre, accion) {
  const A = ACCIONES[accion];
  const v = modal('');
  try {
    esperar(v, 'Preparando…');
    const x = await preparar(nombre);
    const [actuales, ctx] = await Promise.all([leerActuales(x), leerContexto(x, { textos: accion === 'borrar' })]);
    const items = [...actuales].sort((a, b) => x.perfil.nombre(a.datos).localeCompare(x.perfil.nombre(b.datos), 'es')).map(a => {
      const motivo = accion === 'borrar' ? (x.perfil.motivoNoBorrar?.(a.slug, ctx) || '') : (A.ya(a) ? A.yaTexto : '');
      return { a, motivo, marcado: false };
    });
    const pintar = (filtro = '') => {
      const f = filtro.trim().toLowerCase();
      const n = items.filter(i => i.marcado).length;
      v.poner(`<h2 class="${accion === 'borrar' ? 'xl-err' : ''}">${esc(A.titulo)}: ${esc(x.perfil.varios)}</h2>
        <p class="xl-gris">${esc(A.explica)} Elige cuáles; después verás la lista exacta antes de guardar.</p>
        <input type="search" placeholder="Buscar por nombre" value="${esc(filtro)}" data-buscar>
        <div style="margin-top:8px"><a href="#" data-todos>Marcar los que se ven</a> · <a href="#" data-ninguno>Desmarcar todos</a></div>
        <div class="xl-lista">${items.map((i, k) => {
          const nombreV = x.perfil.nombre(i.a.datos) || i.a.slug;
          if (f && !nombreV.toLowerCase().includes(f) && !i.a.slug.includes(f)) return '';
          return `<label class="${i.motivo ? 'xl-no' : ''}"><input type="checkbox" data-k="${k}" ${i.marcado ? 'checked' : ''} ${i.motivo ? 'disabled' : ''}><span style="flex:1">${esc(nombreV)} <span class="xl-gris">· ${esc(i.a.slug)}</span></span>${i.motivo ? `<span class="xl-gris" style="font-size:12px">${esc(i.motivo)}</span>` : ''}</label>`;
        }).join('')}</div>
        <p class="xl-err" data-err></p>
        <div class="xl-pie"><span class="xl-izq" style="align-self:center"><b>${n}</b> ${esc(n === 1 ? x.perfil.uno : x.perfil.varios)} elegidos</span><button class="xl-b" data-x>Cancelar</button><button class="xl-b ${accion === 'borrar' ? 'xl-peligro' : 'xl-pri'}" data-ok>Revisar</button></div>`);
      const buscar = v.q('[data-buscar]');
      buscar.oninput = () => { const pos = buscar.selectionStart; pintar(buscar.value); const b = v.q('[data-buscar]'); b.focus(); b.setSelectionRange(pos, pos); };
      v.m.querySelectorAll('[data-k]').forEach(c => { c.onchange = () => { items[Number(c.dataset.k)].marcado = c.checked; pintar(buscar.value); }; });
      v.q('[data-todos]').onclick = e => { e.preventDefault(); v.m.querySelectorAll('[data-k]:not(:disabled)').forEach(c => { items[Number(c.dataset.k)].marcado = true; }); pintar(buscar.value); };
      v.q('[data-ninguno]').onclick = e => { e.preventDefault(); items.forEach(i => { i.marcado = false; }); pintar(buscar.value); };
      v.q('[data-x]').onclick = v.cerrar;
      v.q('[data-ok]').onclick = async () => {
        const slugs = items.filter(i => i.marcado).map(i => i.a.slug);
        if (!slugs.length) { v.q('[data-err]').textContent = 'Elige al menos uno.'; return; }
        try {
          esperar(v, 'Preparando la lista…');
          const medios = accion === 'borrar' ? await leerMedios(x) : new Map();
          const plan = await planificarAccion({ YAML: x.YAML, col: x.col, perfil: x.perfil, columnas: x.columnas, actuales, slugs, accion, ctx });
          const resumen = resumenPlan(plan, x.perfil).replace(/^[^:]*: /, '');
          informe(v, x, plan, { titulo: `${A.titulo}: ${x.perfil.varios}`, confirmar: A.confirmar, boton: accion === 'borrar' ? `Eliminar ${plan.borrados.length}` : `${A.boton} a ${plan.modificados.length}`, mensaje: `Panel: ${A.titulo.toLowerCase()} en ${x.perfil.varios} — ${resumen}`, medios, volver: () => pintar(buscar.value) });
        } catch (e) { mostrarError(v, e); }
      };
    };
    pintar();
  } catch (e) { mostrarError(v, e); }
}

/* ---------- El engranaje en la lista ---------- */
function crearEngranaje(nombre) {
  const caja = document.createElement('span');
  caja.className = 'xl-eng';
  caja.dataset.xlColeccion = nombre;
  caja.innerHTML = `<button type="button" title="Exportar, importar o cambiar en bloque" aria-label="Exportar, importar o cambiar en bloque" aria-haspopup="true" aria-expanded="false">${svg.eng}${svg.flecha}</button>
    <div class="xl-menu" role="menu" hidden>
      <div class="xl-gr">Excel</div>
      <button role="menuitem" data-a="exportar">${ico(svg.descargar)}Exportar a Excel…</button>
      <button role="menuitem" data-a="importar">${ico(svg.subir)}Importar Excel…</button>
      <div class="xl-sep"></div><div class="xl-gr">Cambiar en bloque</div>
      <button role="menuitem" data-a="prueba-quitar">${ico(svg.ver)}Quitar «Solo para pruebas»…</button>
      <button role="menuitem" data-a="prueba-poner">${ico(svg.matraz)}Marcar «Solo para pruebas»…</button>
      <div class="xl-sep"></div>
      <button role="menuitem" data-a="borrar" class="xl-rojo">${ico(svg.papelera)}Eliminar…</button>
    </div>`;
  const boton = caja.firstElementChild;
  const menu = caja.querySelector('.xl-menu');
  const abrir = si => { menu.hidden = !si; boton.setAttribute('aria-expanded', String(si)); };
  boton.onclick = e => { e.preventDefault(); e.stopPropagation(); abrir(menu.hidden); };
  document.addEventListener('click', e => { if (!caja.contains(e.target)) abrir(false); });
  menu.querySelectorAll('[data-a]').forEach(b => {
    b.onclick = e => {
      e.preventDefault(); abrir(false);
      const a = b.dataset.a;
      if (a === 'exportar') exportar(nombre);
      else if (a === 'importar') importar(nombre);
      else enBloque(nombre, a);
    };
  });
  return caja;
}
function colocar() {
  const m = location.hash.match(/^#\/collections\/([^/?]+)\/?(\?.*)?$/);
  const nombre = m && m[1];
  document.querySelectorAll('.xl-eng').forEach(e => { if (e.dataset.xlColeccion !== nombre) e.remove(); });
  if (!nombre || !PERFILES[nombre]) return;
  const nuevo = document.querySelector(`a[href="#/collections/${nombre}/new"]`);
  if (!nuevo || nuevo.previousElementSibling?.classList?.contains('xl-eng')) return;
  nuevo.parentElement.insertBefore(crearEngranaje(nombre), nuevo);
}
let pendiente = false;
new MutationObserver(() => {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(() => { pendiente = false; colocar(); });
}).observe(document.body, { childList: true, subtree: true });
window.addEventListener('hashchange', colocar);
colocar();
