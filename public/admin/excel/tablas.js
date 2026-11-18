/*
  Listas del panel como tablas (docs/PLAN.md, fase 3; prototipos aprobados por Víctor el 18-11-2026).

  En «Catálogo: productos, fabricantes, tipos de producto, categorías y subcategorías» se sustituye la
  lista de Decap (con su «cargar más» al bajar) por tablas propias:
  - Productos: plegados por clasificación (en el orden del menú) o todos en una tabla.
  - Fabricantes y tipos: una tabla; al pulsar una fila se despliega debajo la tabla de sus productos.
  - Categorías (plegadas por tipo) y subcategorías (plegadas por «Tipo › Categoría»): igual.
  Todas las tablas: miniatura, ordenar pulsando la cabecera, fila de filtros, paginación con selector
  de 12, 24 o 48 por página. El lápiz abre la ficha; pulsar un producto abre la suya. Empieza todo
  plegado cada vez (no se recuerda nada entre visitas).
  Los datos se leen igual que el engranaje (almacen.js): lo que hay en la rama, también lo no publicado.
*/
import { PERFILES } from './nucleo.js';

const LISTAS = ['productos', 'fabricantes', 'tipos', 'categorias', 'subcategorias'];
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sinTildes = t => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2, useGrouping: 'always' });
const ESTADOS = { disponible: 'Disponible', oferta: 'En oferta', no_disponible: 'No disponible' };
const flecha = abierta => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="${abierta ? 'm6 9 6 6 6-6' : 'm9 6 6 6-6 6'}"/></svg>`;
const lapiz = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/></svg>';

const css = `
.xl-oculto{display:none!important}
.xl-tablas{margin-top:20px;font-size:14px;color:#313d3e}
.xl-tablas .xl-barra{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.xl-tablas .xl-barra input[type=search]{flex:1;min-width:200px;height:36px;border:1px solid #c9ced6;border-radius:5px;padding:0 10px;font:inherit}
.xl-tablas select{height:32px;border:1px solid #c9ced6;border-radius:5px;padding:0 6px;font:inherit;background:#fff}
.xl-tablas .xl-seg button{height:32px;padding:0 12px;border:1px solid #c9ced6;background:#fff;font:inherit;cursor:pointer;color:#313d3e}
.xl-tablas .xl-seg button:first-child{border-radius:5px 0 0 5px}.xl-tablas .xl-seg button:last-child{border-radius:0 5px 5px 0;margin-left:-1px}
.xl-tablas .xl-seg button.xl-on{background:#e8effb;border-color:#3a69c7;color:#1f4e9c;position:relative}
.xl-tablas .xl-grupo{background:#fff;border-radius:5px;box-shadow:0 2px 6px rgba(68,74,87,.05),0 1px 3px rgba(68,74,87,.1);margin:8px 0;overflow-x:auto}
.xl-tablas .xl-grupo>button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;width:100%;align-items:center;gap:8px;padding:12px 14px;font-weight:600}
.xl-tablas .xl-grupo>button small{margin-left:auto;font-weight:400;color:#798291}
.xl-tablas table{width:100%;border-collapse:collapse;font-size:13px}
.xl-tablas th,.xl-tablas td{text-align:left;padding:6px 8px;border-top:1px solid #eff0f4;vertical-align:middle}
.xl-tablas th{color:#798291;font-weight:600;white-space:nowrap;cursor:pointer;user-select:none}
.xl-tablas th.xl-sin{cursor:default}
.xl-tablas tr.xl-filtros td{padding:4px 6px;background:#fafbfc}
.xl-tablas tr.xl-filtros input,.xl-tablas tr.xl-filtros select{width:100%;min-width:64px;height:28px;box-sizing:border-box;border:1px solid #dfdfe3;border-radius:4px;padding:0 6px;font:inherit;font-size:12px}
.xl-tablas tr.xl-tr{cursor:pointer}.xl-tablas tr.xl-tr:hover>td{background:#f4f6fb}
.xl-tablas tr.xl-abierta>td{background:#eef3fc}
.xl-tablas td.xl-dentro{padding:6px 8px 12px 34px;background:#f6f7f9}
.xl-tablas td.xl-dentro .xl-tabla{background:#fff;border:1px solid #e3e6ea;border-radius:6px}
.xl-tablas .xl-mini{width:34px;height:34px;object-fit:contain;border-radius:4px;background:#f1f2f4;display:block}
.xl-tablas .xl-mini-vacia{width:34px;height:34px;border-radius:4px;background:#f1f2f4;display:block}
.xl-tablas .xl-pill{font-size:11px;padding:1px 7px;border-radius:4px;white-space:nowrap}
.xl-tablas .xl-pie-t{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px;color:#798291;font-size:12px}
.xl-tablas .xl-pie-t button{min-width:28px;height:28px;padding:0 7px;border-radius:14px;border:1px solid #c9ced6;background:#fff;cursor:pointer;font:inherit;font-size:12px}
.xl-tablas .xl-pie-t button.xl-on{background:#3a69c7;border-color:#3a69c7;color:#fff}
.xl-tablas .xl-lapiz{all:unset;cursor:pointer;padding:4px 6px;border-radius:5px;color:#798291;display:inline-flex}
.xl-tablas .xl-lapiz:hover{background:#e8effb;color:#1f4e9c}
.xl-tablas .xl-nota{color:#798291}
.xl-tablas .xl-gris{color:#798291}
`;

/* ---------- Miniaturas: la versión pequeña que publica el build; si no, la original ---------- */
function miniatura(ruta) {
  if (!ruta || typeof ruta !== 'string') return '<span class="xl-mini-vacia"></span>';
  const base = ruta.replace(/^\/img\//, '').replace(/\.[^.]+$/, '').replace(/[\/\\]+/g, '-');
  const opt = /\.(jpe?g|png|webp)$/i.test(ruta) ? `/img/opt/${base}-480.webp` : ruta;
  return `<img class="xl-mini" loading="lazy" alt="" src="${esc(opt)}" data-original="${esc(ruta)}">`;
}
function arreglarMiniaturas(raiz) {
  raiz.querySelectorAll('img.xl-mini:not([data-ok])').forEach(img => {
    img.dataset.ok = '1';
    img.addEventListener('error', () => {
      if (img.dataset.original && img.src.indexOf(img.dataset.original) === -1) img.src = img.dataset.original;
      else img.replaceWith(Object.assign(document.createElement('span'), { className: 'xl-mini-vacia' }));
    });
  });
}

/* ---------- Tabla genérica: ordenar, filtrar, paginar y desplegar ----------
   cols: [{ k, t, tipo: 'foto'|'txt'|'sel'|'num'|'sino', val(f), html(f) }] */
class Tabla {
  constructor({ cols, filas, porPagina, alPulsar, desplegar, lapiz: conLapiz, vacia = 'No hay ninguno.' }) {
    Object.assign(this, { cols, filas, porPagina, alPulsar, desplegar, conLapiz, vacia });
    this.pag = 1; this.orden = null; this.filtros = {}; this.abiertas = new Set(); this.hijas = new Map();
    this.el = document.createElement('div');
    this.el.className = 'xl-tabla';
  }
  pasa(f) {
    return this.cols.every(c => {
      const q = this.filtros[c.k];
      if (q === undefined || q === '') return true;
      const v = c.val(f);
      if (c.tipo === 'sino') return (q === 'si') === Boolean(v);
      if (c.tipo === 'sel') return String(v ?? '') === q;
      if (c.tipo === 'num') {
        const m = String(q).replace(',', '.').match(/^\s*(>=|<=|>|<|=)?\s*(-?\d+(?:\.\d+)?)\s*$/);
        if (!m) return true;
        const n = Number(m[2]);
        if (v === null || v === undefined || v === '') return false;
        return { '>': v > n, '<': v < n, '>=': v >= n, '<=': v <= n }[m[1]] ?? v === n;
      }
      return sinTildes(v).includes(sinTildes(q));
    });
  }
  visibles() {
    let l = this.filas.filter(f => this.pasa(f));
    if (this.orden) {
      const c = this.cols.find(x => x.k === this.orden.k);
      const vacio = v => v === null || v === undefined || v === '';
      l = [...l].sort((a, b) => {
        const A = c.val(a); const B = c.val(b);
        if (vacio(A) !== vacio(B)) return vacio(A) ? 1 : -1; // los vacíos, al final
        const s = typeof A === 'number' && typeof B === 'number' ? A - B : String(A ?? '').localeCompare(String(B ?? ''), 'es', { numeric: true });
        return this.orden.d * s;
      });
    }
    return l;
  }
  pintar() {
    const l = this.visibles();
    const por = this.porPagina();
    const total = Math.max(1, Math.ceil(l.length / por));
    if (this.pag > total) this.pag = total;
    const ini = (this.pag - 1) * por;
    const extra = (this.desplegar ? 1 : 0) + (this.conLapiz ? 1 : 0);
    const opciones = c => [...new Set(this.filas.map(f => c.val(f)).filter(v => v !== '' && v !== null && v !== undefined))].sort((a, b) => String(a).localeCompare(String(b), 'es'));
    this.el.innerHTML = `<table>
      <tr>${this.desplegar ? '<th class="xl-sin" style="width:22px"></th>' : ''}${this.cols.map(c => `<th class="${c.tipo === 'foto' ? 'xl-sin' : ''}" data-o="${c.tipo === 'foto' ? '' : c.k}" ${c.ancho ? `style="width:${c.ancho}"` : ''}>${esc(c.t)}${this.orden?.k === c.k ? (this.orden.d > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}${this.conLapiz ? '<th class="xl-sin" style="width:36px"></th>' : ''}</tr>
      <tr class="xl-filtros">${this.desplegar ? '<td></td>' : ''}${this.cols.map(c => {
        const v = this.filtros[c.k] ?? '';
        if (c.tipo === 'foto') return '<td></td>';
        if (c.tipo === 'sino') return `<td><select data-f="${c.k}" aria-label="Filtrar ${esc(c.t)}"><option value="">Todos</option><option value="si" ${v === 'si' ? 'selected' : ''}>Sí</option><option value="no" ${v === 'no' ? 'selected' : ''}>No</option></select></td>`;
        if (c.tipo === 'sel') return `<td><select data-f="${c.k}" aria-label="Filtrar ${esc(c.t)}"><option value="">Todos</option>${opciones(c).map(o => `<option ${String(o) === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></td>`;
        return `<td><input data-f="${c.k}" value="${esc(v)}" placeholder="${c.tipo === 'num' ? 'p. ej. >0' : 'Filtrar'}" aria-label="Filtrar ${esc(c.t)}"></td>`;
      }).join('')}${this.conLapiz ? '<td></td>' : ''}</tr>
      ${l.slice(ini, ini + por).map((f, i) => {
        const id = String(f.id);
        const abierta = this.abiertas.has(id);
        return `<tr class="xl-tr ${abierta ? 'xl-abierta' : ''}" data-i="${ini + i}">${this.desplegar ? `<td>${flecha(abierta)}</td>` : ''}${this.cols.map(c => `<td>${c.html ? c.html(f) : esc(c.val(f))}</td>`).join('')}${this.conLapiz ? `<td><button type="button" class="xl-lapiz" data-lapiz="${ini + i}" title="Editar" aria-label="Editar ${esc(f.nombre || '')}">${lapiz}</button></td>` : ''}</tr>
          ${abierta ? `<tr><td class="xl-dentro" colspan="${this.cols.length + extra}" data-hija="${esc(id)}"></td></tr>` : ''}`;
      }).join('') || `<tr><td colspan="${this.cols.length + extra}" class="xl-gris">${esc(this.vacia)}</td></tr>`}
    </table>
    <div class="xl-pie-t"><span>Mostrando ${l.length ? ini + 1 : 0}–${Math.min(ini + por, l.length)} de ${l.length}</span><span>${botonesPagina(this.pag, total)}</span></div>`;
    arreglarMiniaturas(this.el);
    this.el.querySelectorAll('th[data-o]').forEach(th => th.addEventListener('click', e => {
      e.stopPropagation();
      const k = th.dataset.o;
      if (!k) return;
      this.orden = this.orden?.k === k ? { k, d: -this.orden.d } : { k, d: 1 };
      this.pintar();
    }));
    this.el.querySelectorAll('[data-f]').forEach(c => {
      const ev = c.tagName === 'SELECT' ? 'change' : 'input';
      c.addEventListener(ev, e => {
        e.stopPropagation();
        this.filtros[c.dataset.f] = c.value;
        this.pag = 1;
        const pos = c.selectionStart;
        this.pintar();
        if (c.tagName === 'INPUT') { const n = this.el.querySelector(`input[data-f="${c.dataset.f}"]`); n.focus(); n.setSelectionRange(pos, pos); }
      });
      c.addEventListener('click', e => e.stopPropagation());
    });
    this.el.querySelectorAll(':scope > div.xl-pie-t [data-p]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); this.pag = Number(b.dataset.p); this.pintar(); }));
    this.el.querySelectorAll(':scope > table > tbody > tr.xl-tr, :scope > table > tr.xl-tr').forEach(tr => tr.addEventListener('click', e => {
      if (e.target.closest('.xl-lapiz')) return;
      e.stopPropagation();
      const f = l[Number(tr.dataset.i)];
      if (this.desplegar) {
        const id = String(f.id);
        this.abiertas.has(id) ? this.abiertas.delete(id) : this.abiertas.add(id);
        this.pintar();
      } else this.alPulsar?.(f);
    }));
    this.el.querySelectorAll('[data-lapiz]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); this.alPulsar?.(l[Number(b.dataset.lapiz)]); }));
    // Al final (después de enlazar los eventos de esta tabla, para no enlazar los de las de dentro):
    // Tablas desplegadas (conservan su estado mientras la de arriba no se recarga)
    this.el.querySelectorAll('[data-hija]').forEach(td => {
      const id = td.dataset.hija;
      const f = this.filas.find(x => String(x.id) === id);
      if (!this.hijas.has(id)) this.hijas.set(id, this.desplegar(f));
      const h = this.hijas.get(id);
      h.pintar();
      td.appendChild(h.el);
    });
  }
}
function botonesPagina(pag, total) {
  if (total <= 1) return '';
  const nums = [];
  for (let i = 1; i <= total; i++) if (i === 1 || i === total || Math.abs(i - pag) <= 2) nums.push(i); else if (nums.at(-1) !== '…') nums.push('…');
  return nums.map(n => (n === '…' ? '<span>…</span>' : `<button type="button" class="${n === pag ? 'xl-on' : ''}" data-p="${n}">${n}</button>`)).join(' ');
}

/* ---------- Columnas de productos ---------- */
function colsProductos(ctx, conClasificacion) {
  const etiquetaPrecio = p => (p.datos.precio === undefined || p.datos.precio === null || p.datos.precio === '' ? null : Number(p.datos.precio));
  return [
    { k: 'foto', t: '', tipo: 'foto', val: () => '', html: p => miniatura(Array.isArray(p.datos.imagenes) ? p.datos.imagenes[0]?.imagen : '') , ancho: '44px' },
    { k: 'nombre', t: 'Producto', tipo: 'txt', val: p => p.datos.title || p.slug },
    ...(conClasificacion ? [{ k: 'clas', t: 'Clasificación', tipo: 'txt', val: p => ctx.catalogo.etiqueta(p.datos.categoria) || p.datos.categoria || '' }] : []),
    { k: 'fab', t: 'Fabricante', tipo: 'sel', val: p => ctx.nombreFabricante(p.datos.fabricante) },
    { k: 'modelo', t: 'Modelo', tipo: 'txt', val: p => p.datos.modelo || '' },
    { k: 'ref', t: 'Referencia', tipo: 'txt', val: p => p.datos.referencia || '' },
    { k: 'precio', t: 'Precio', tipo: 'num', val: etiquetaPrecio, html: p => { const v = etiquetaPrecio(p); return v === null ? '<span class="xl-gris">a consultar</span>' : esc(euros.format(v).replace(/,00(?=\s)/, '')); } },
    { k: 'estado', t: 'Estado', tipo: 'sel', val: p => ESTADOS[p.datos.estado || 'disponible'] || p.datos.estado, html: p => pildoraEstado(p.datos.estado || 'disponible') },
    { k: 'prueba', t: 'Pruebas', tipo: 'sino', val: p => Boolean(p.datos.prueba), html: p => (p.datos.prueba ? '<span class="xl-pill" style="background:#f1f2f4;color:#5f6670">pruebas</span>' : '') },
  ];
}
function pildoraEstado(e) {
  const c = { disponible: ['#e6f4ea', '#1e7a3a'], oferta: ['#fdf1dc', '#8a5300'], no_disponible: ['#fdeaea', '#b02a2a'] }[e] || ['#f1f2f4', '#5f6670'];
  return `<span class="xl-pill" style="background:${c[0]};color:${c[1]}">${esc(ESTADOS[e] || e)}</span>`;
}
const irA = (col, slug) => { location.hash = `#/collections/${col}/entries/${encodeURIComponent(slug)}`; };

/* ---------- Orden del catálogo como en el menú (Ajustes del sitio → «Orden del catálogo en el menú») ---------- */
function ordenCatalogo(YAML, ctx) {
  const cat = ctx.catalogo;
  let lista = [];
  try { lista = YAML.parse(String(ctx.sitio?.raw || ''))?.catalogo_orden || []; } catch { /* sin orden */ }
  const pos = new Map();
  (function recorrer(l, padre) {
    (Array.isArray(l) ? l : []).forEach((it, i) => {
      const s = String((typeof it === 'string' ? it : it?.categoria) || '').trim();
      const c = cat.porSlug.get(s);
      if (c && !pos.has(s) && (c.padre || '') === padre) pos.set(s, i);
      if (it && typeof it === 'object') recorrer(it.hijos, s);
    });
  })(lista, '');
  const orden = new Map();
  let n = 0;
  const hijos = padre => [...cat.porSlug.values()].filter(c => (c.padre || '') === padre)
    .sort((a, b) => (pos.get(a.slug) ?? 1e6) - (pos.get(b.slug) ?? 1e6) || a.titulo.localeCompare(b.titulo, 'es'));
  (function dfs(padre) { for (const c of hijos(padre)) { orden.set(c.slug, n++); dfs(c.slug); } })('');
  return slug => orden.get(slug) ?? 1e6;
}

/* ---------- Montaje de cada lista ---------- */
export function crearTablas({ preparar, leerActuales, leerContexto }) {
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
  let montada = null; // { nombre, raiz }

  async function montar(nombre, main) {
    const raiz = document.createElement('div');
    raiz.className = 'xl-tablas';
    raiz.innerHTML = '<p class="xl-nota">Cargando…</p>';
    main.appendChild(raiz);
    montada = { nombre, raiz, main };
    try {
      const x = await preparar(nombre);
      const [actuales, ctx] = await Promise.all([leerActuales(x), leerContexto(x)]);
      if (montada?.raiz !== raiz) return;
      const { YAML } = x;
      const posMenu = ordenCatalogo(YAML, ctx);
      const productos = ctx.productos;
      let porPagina = 12;
      const porPag = () => porPagina;
      const tablaProd = (lista, conClas) => new Tabla({ cols: colsProductos(ctx, conClas), filas: lista.map(p => ({ ...p, id: p.slug })), porPagina: porPag, alPulsar: p => irA('productos', p.slug), vacia: 'Sin productos.' });

      // Filas de la sección (fabricantes, tipos, categorías o subcategorías)
      const cat = ctx.catalogo;
      const deCategoria = slug => productos.filter(p => cat.rutaSlugs(p.datos.categoria).includes(slug));
      const filasSeccion = actuales.map(a => {
        const prods = nombre === 'fabricantes' ? productos.filter(p => p.datos.fabricante === a.slug) : deCategoria(a.slug);
        return { ...a, id: a.slug, nombre: a.datos.title || a.slug, prods, hijas: cat.hijas(a.slug).length };
      });
      const colsSeccion = [
        { k: 'foto', t: '', tipo: 'foto', val: () => '', html: f => miniatura(f.datos.imagen), ancho: '44px' },
        { k: 'nombre', t: 'Nombre', tipo: 'txt', val: f => f.nombre },
        ...(nombre === 'tipos' ? [{ k: 'hijas', t: 'Categorías', tipo: 'num', val: f => f.hijas }] : []),
        ...(nombre === 'categorias' ? [{ k: 'hijas', t: 'Subcategorías', tipo: 'num', val: f => f.hijas }] : []),
        { k: 'n', t: 'Productos', tipo: 'num', val: f => f.prods.length },
        { k: 'prueba', t: 'Pruebas', tipo: 'sino', val: f => Boolean(f.datos.prueba), html: f => (f.datos.prueba ? '<span class="xl-pill" style="background:#f1f2f4;color:#5f6670">pruebas</span>' : '') },
      ];
      const tablaSeccion = filas => new Tabla({
        cols: colsSeccion, filas, porPagina: porPag, lapiz: true,
        alPulsar: f => irA(nombre, f.slug),
        // En las subcategorías la clasificación es siempre la misma: no hace falta la columna
        desplegar: f => tablaProd(f.prods, nombre !== 'subcategorias'),
      });

      // Grupos plegados: productos por clasificación; categorías por tipo; subcategorías por «Tipo › Categoría»
      let vista = nombre === 'productos' || nombre === 'categorias' || nombre === 'subcategorias' ? 'grupos' : 'tabla';
      const conVistas = vista === 'grupos';
      const etiquetaGrupos = { productos: 'Por clasificación', categorias: 'Por tipo de producto', subcategorias: 'Por categoría' }[nombre];
      const abiertos = new Set();
      const tablas = new Map();
      let busqueda = '';

      const pasaBusqueda = (texto) => !busqueda || sinTildes(texto).includes(sinTildes(busqueda));
      const textoProducto = p => [p.datos.title, p.datos.modelo, p.datos.referencia, ctx.nombreFabricante(p.datos.fabricante), p.slug].join(' ');

      const pintar = () => {
        const prodsFiltrados = productos.filter(p => pasaBusqueda(textoProducto(p)));
        const seccionFiltrada = filasSeccion.filter(f => pasaBusqueda(`${f.nombre} ${f.slug}`));
        raiz.innerHTML = `<div class="xl-barra">
            <input type="search" placeholder="${nombre === 'productos' ? 'Buscar por nombre, modelo, referencia o fabricante' : 'Buscar por nombre'}" value="${esc(busqueda)}" data-buscar>
            ${conVistas ? `<span class="xl-seg"><button type="button" data-v="grupos" class="${vista === 'grupos' ? 'xl-on' : ''}">${etiquetaGrupos}</button><button type="button" data-v="tabla" class="${vista === 'tabla' ? 'xl-on' : ''}">Tabla</button></span>` : ''}
            <label class="xl-gris">Por página <select data-por>${[12, 24, 48].map(n => `<option ${n === porPagina ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          </div><div data-cont></div>`;
        const cont = raiz.querySelector('[data-cont]');
        const conTabla = (clave, crear) => { if (!tablas.has(clave)) tablas.set(clave, crear()); const t = tablas.get(clave); t.pintar(); return t.el; };

        if (vista === 'tabla') {
          const caja = document.createElement('div');
          caja.className = 'xl-grupo';
          if (nombre === 'productos') caja.appendChild(conTabla(`todo:${busqueda}`, () => tablaProd(prodsFiltrados, true)));
          else caja.appendChild(conTabla(`todo:${busqueda}`, () => tablaSeccion(seccionFiltrada)));
          cont.appendChild(caja);
        } else {
          // Grupos
          const grupos = new Map();
          if (nombre === 'productos') {
            for (const p of prodsFiltrados) { const k = p.datos.categoria || ''; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(p); }
          } else {
            for (const f of seccionFiltrada) { const k = f.datos.padre || ''; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(f); }
          }
          const claves = [...grupos.keys()].sort((a, b) => posMenu(a) - posMenu(b) || (cat.etiqueta(a) || a).localeCompare(cat.etiqueta(b) || b, 'es'));
          if (!claves.length) cont.innerHTML = '<p class="xl-gris">No hay ninguno.</p>';
          for (const k of claves) {
            const caja = document.createElement('div');
            caja.className = 'xl-grupo';
            const abierto = abiertos.has(k);
            const n = grupos.get(k).length;
            const unidad = nombre === 'productos' ? (n === 1 ? 'producto' : 'productos') : nombre === 'categorias' ? (n === 1 ? 'categoría' : 'categorías') : (n === 1 ? 'subcategoría' : 'subcategorías');
            const titulo = k ? (cat.porSlug.has(k) ? cat.etiqueta(k) : `${k} (no existe en el catálogo)`) : 'Sin clasificación';
            caja.innerHTML = `<button type="button" aria-expanded="${abierto}">${flecha(abierto)}${esc(titulo)}<small>${n} ${unidad}</small></button>`;
            caja.firstElementChild.addEventListener('click', () => { abierto ? abiertos.delete(k) : abiertos.add(k); pintar(); });
            if (abierto) caja.appendChild(conTabla(`g:${k}:${busqueda}`, () => (nombre === 'productos' ? tablaProd(grupos.get(k), false) : tablaSeccion(grupos.get(k)))));
            cont.appendChild(caja);
          }
        }
        const b = raiz.querySelector('[data-buscar]');
        b.addEventListener('input', () => { const pos = b.selectionStart; busqueda = b.value; pintar(); const n = raiz.querySelector('[data-buscar]'); n.focus(); n.setSelectionRange(pos, pos); });
        raiz.querySelector('[data-por]').addEventListener('change', e => { porPagina = Number(e.target.value); tablas.forEach(t => { t.pag = 1; }); pintar(); });
        raiz.querySelectorAll('[data-v]').forEach(btn => btn.addEventListener('click', () => { vista = btn.dataset.v; pintar(); }));
      };
      pintar();
    } catch (e) {
      console.error(e);
      raiz.innerHTML = `<p style="color:#c92a2a">No se ha podido cargar la lista: ${esc(e.message || e)}. Se muestra la lista normal del panel.</p>`;
      main.querySelectorAll('.xl-oculto').forEach(el => el.classList.remove('xl-oculto'));
      montada = { nombre, raiz, main, error: true };
    }
  }

  // Coloca la tabla en la vista de lista de la colección y esconde la de Decap
  return function revisar() {
    const m = location.hash.match(/^#\/collections\/([^/?]+)\/?(\?.*)?$/);
    const nombre = m && LISTAS.includes(m[1]) && PERFILES[m[1]] ? m[1] : null;
    if (montada && (montada.nombre !== nombre || !document.body.contains(montada.raiz))) {
      montada.raiz.remove();
      montada.main?.querySelectorAll('.xl-oculto').forEach(el => el.classList.remove('xl-oculto'));
      montada = null;
    }
    if (!nombre) return;
    const nuevo = document.querySelector(`a[href="#/collections/${nombre}/new"]`);
    const main = nuevo?.closest('main');
    if (!main) return;
    if (!montada) montar(nombre, main);
    if (montada?.error) return;
    // Todo lo que pinta Decap debajo de la cabecera (ordenar, agrupar y la lista) queda escondido
    const cabecera = [...main.children].find(c => c.contains(nuevo));
    for (const c of main.children) if (c !== cabecera && c !== montada.raiz && !c.classList.contains('xl-oculto')) c.classList.add('xl-oculto');
  };
}
