/*
  Listas del panel como tablas (docs/PLAN.md, fase 3; prototipos aprobados por Víctor el 18-11-2026).

  En «Productos», «Fabricantes», «Tipos de producto», «Categorías» y «Subcategorías» se sustituye la
  lista de Decap (con su «cargar más» al bajar) por tablas propias:
  - Productos: plegados por clasificación (en el orden del menú) o todos en una tabla.
  - Fabricantes y tipos: una tabla; al pulsar una fila se despliega debajo la tabla de sus productos.
  - Categorías (plegadas por tipo) y subcategorías (plegadas por «Tipo › Categoría»): igual.
  Todas las tablas: miniatura, ordenar pulsando la cabecera, fila de filtros, paginación con selector
  de 12, 24 o 48 por página. El lápiz abre la ficha; pulsar un producto abre la suya. Empieza todo
  plegado al entrar en la sección; al volver de una ficha (con «←» o «Atrás») queda todo como estaba: vista,
  búsqueda, grupos y filas desplegados, página, orden, filtros y posición, y se vuelve a leer en segundo plano
  por si la ficha cambió (Víctor, 18-11-2026). Al cambiar de sección se empieza de cero.
  Los datos se leen igual que el engranaje (almacen.js): lo que hay en la rama, también lo no publicado.
*/
import { PERFILES } from './nucleo.js';

const LISTAS = ['productos', 'fabricantes', 'tipos', 'categorias', 'subcategorias'];
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sinTildes = t => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2, useGrouping: 'always' });
const ESTADOS = { disponible: 'Disponible', oferta: 'En oferta', no_disponible: 'No disponible' };
const flecha = abierta => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="${abierta ? 'm6 9 6 6 6-6' : 'm9 6 6 6-6 6'}"/></svg>`;
const ICONO_ARBOL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6h11M12 12h8M12 18h8"/><path d="M5 4v14a2 2 0 0 0 2 2h1M5 10a2 2 0 0 0 2 2h1"/></svg>';
const ICONO_TABLA = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M10 4v16"/></svg>';
const lapiz = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/></svg>';

const css = `
.xl-oculto{display:none!important}
.xl-tablas{margin-top:20px;font-size:14px;color:#313d3e}
.xl-tablas .xl-barra{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.xl-tablas .xl-barra input[type=search]{flex:1;min-width:200px;height:36px;border:1px solid #c9ced6;border-radius:5px;padding:0 10px;font:inherit}
.xl-tablas select{height:32px;border:1px solid #c9ced6;border-radius:5px;padding:0 6px;font:inherit;background:#fff}
.xl-tablas .xl-seg button{display:inline-flex;align-items:center;justify-content:center;width:38px;height:32px;padding:0;border:1px solid #c9ced6;background:#fff;font:inherit;cursor:pointer;color:#313d3e}
.xl-tablas .xl-seg button:first-child{border-radius:5px 0 0 5px}.xl-tablas .xl-seg button:last-child{border-radius:0 5px 5px 0;margin-left:-1px}
.xl-tablas .xl-seg button.xl-on{background:var(--xl-acento-claro,#e8effb);border-color:var(--xl-acento,#3a69c7);color:var(--xl-acento,#1f4e9c);position:relative}
.xl-tablas .xl-grupo{background:#fff;border-radius:5px;box-shadow:0 2px 6px rgba(68,74,87,.05),0 1px 3px rgba(68,74,87,.1);margin:8px 0;overflow-x:auto}
.xl-tablas .xl-grupo>button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;width:100%;align-items:center;gap:8px;padding:12px 14px;font-weight:600}
.xl-tablas .xl-grupo>button small{font-weight:400;color:#798291}
.xl-tablas .xl-grupo>button .xl-dcha{margin-left:auto;display:inline-flex;align-items:center;gap:6px}
.xl-tablas table{width:100%;border-collapse:collapse;font-size:13px}
.xl-tablas th,.xl-tablas td{text-align:left;padding:6px 8px;border-top:1px solid #eff0f4;vertical-align:middle}
.xl-tablas th{color:#798291;font-weight:600;white-space:nowrap;cursor:pointer;user-select:none}
.xl-tablas th.xl-sin{cursor:default}
.xl-tablas tr.xl-filtros td{padding:4px 6px;background:#fafbfc}
.xl-tablas tr.xl-filtros input,.xl-tablas tr.xl-filtros select{width:100%;min-width:64px;height:28px;box-sizing:border-box;border:1px solid #dfdfe3;border-radius:4px;padding:0 6px;font:inherit;font-size:12px}
.xl-tablas tr.xl-tr{cursor:pointer}.xl-tablas tr.xl-tr:hover>td{background:var(--xl-hover,#f4f6fb)}
.xl-tablas tr.xl-abierta>td{background:var(--xl-acento-claro,#eef3fc)}
.xl-tablas td.xl-dentro{padding:6px 8px 12px 34px;background:#f6f7f9}
.xl-tablas td.xl-dentro .xl-tabla{background:#fff;border:1px solid #e3e6ea;border-radius:6px}
.xl-tablas .xl-mini{width:34px;height:34px;object-fit:contain;border-radius:4px;background:#f1f2f4;display:block}
.xl-tablas .xl-mini-vacia{width:34px;height:34px;border-radius:4px;background:#f1f2f4;display:block}
.xl-tablas .xl-pill{font-size:11px;padding:1px 7px;border-radius:4px;white-space:nowrap}
.xl-tablas .xl-pie-t{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px;color:#798291;font-size:12px}
.xl-tablas .xl-pie-t button{min-width:28px;height:28px;padding:0 7px;border-radius:14px;border:1px solid #c9ced6;background:#fff;cursor:pointer;font:inherit;font-size:12px}
.xl-tablas .xl-pie-t button.xl-on{background:var(--xl-acento,#3a69c7);border-color:var(--xl-acento,#3a69c7);color:#fff}
.xl-tablas .xl-lapiz{all:unset;cursor:pointer;padding:4px 6px;border-radius:5px;color:#798291;display:inline-flex}
.xl-tablas .xl-lapiz:hover{background:var(--xl-acento-claro,#e8effb);color:var(--xl-acento,#1f4e9c)}
.xl-tablas .xl-nota{color:#798291}
.xl-tablas .xl-chips-b{display:flex;gap:6px;flex-wrap:wrap}
.xl-tablas .xl-chips-b button{border:1px solid #c9ced6;background:#fff;border-radius:16px;padding:3px 11px;font:inherit;font-size:12px;cursor:pointer;color:inherit}
.xl-tablas .xl-chips-b button.xl-on{background:var(--xl-acento,#3a69c7);border-color:var(--xl-acento,#3a69c7);color:#fff}
.xl-tablas mark{background:#fde68a;color:inherit;border-radius:2px;padding:0}
.xl-tablas .xl-gris{color:#798291}
/* Avisos: icono con su número; el globo es uno solo para toda la página (.xl-globo) */
.xl-tablas .xl-av{all:unset;cursor:help;display:inline-flex;align-items:center;gap:3px;color:#b45309;font-weight:600;font-size:12px;padding:2px 4px;border-radius:5px}
.xl-tablas .xl-av:hover,.xl-tablas .xl-av:focus-visible{background:#fdf1dc}
.xl-av-n{display:inline-flex;align-items:center;gap:3px;margin-left:6px;color:#b45309;font-weight:700;font-size:12px;background:#fdf1dc;border-radius:10px;padding:1px 7px;vertical-align:middle;animation:xl-latido 1.6s ease-in-out infinite}
.xl-av-n svg{width:13px;height:13px}
@keyframes xl-latido{0%,100%{opacity:1}50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.xl-av-n{animation:none}}
.xl-tablas .xl-filtro-av{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 10px;border:1px solid #c9ced6;border-radius:8px;background:#fff;color:#b45309;font:inherit;font-weight:600;cursor:pointer}
.xl-tablas .xl-filtro-av.xl-on{background:#fdf1dc;border-color:#b45309}
.xl-globo{position:fixed;z-index:10001;max-width:300px;background:#fff;color:#1f2933;border:1px solid #e3e3df;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);padding:10px 12px;font-size:13px;line-height:1.45}
.xl-globo b{display:block;margin-bottom:4px}
.xl-globo ul{margin:0;padding-left:18px}.xl-globo li{margin:2px 0}
.xl-globo button{margin-top:6px;height:28px;padding:0 10px;border-radius:7px;border:1px solid var(--xl-acento,#c1121f);background:#fff;color:var(--xl-acento,#c1121f);cursor:pointer;font:inherit;font-size:12px}
.xl-globo .xl-visto{color:#6b7280;font-size:12px;margin-top:6px}
/* Barra para ordenar y mostrar los filtros: solo en el móvil (allí las filas son tarjetas) */
.xl-tablas .xl-movil-barra{display:none}
@media (max-width:799px){
  .xl-tablas .xl-movil-barra{display:flex;gap:6px;padding:8px;flex-wrap:wrap}
  .xl-tablas .xl-movil-barra select{flex:1;min-width:0}
  .xl-tablas .xl-movil-barra button{height:32px;border:1px solid #c9ced6;border-radius:8px;background:#fff;padding:0 10px;font:inherit;font-size:13px;color:inherit}
  .xl-tablas table,.xl-tablas tbody{display:block}
  .xl-tablas tr.xl-cab{display:none}
  .xl-tablas tr.xl-filtros{display:none}
  .xl-tablas .xl-ver-filtros>table>tbody>tr.xl-filtros,.xl-tablas .xl-ver-filtros>table>tr.xl-filtros{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 8px 8px}
  .xl-tablas tr.xl-filtros td{display:block;padding:0;background:none;border:0}
  .xl-tablas tr.xl-filtros td:empty{display:none}
  .xl-tablas tr.xl-filtros td[data-t]::before{content:attr(data-t);display:block;font-size:11px;color:#798291}
  .xl-tablas tr.xl-tr{display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px;padding:10px;border-top:1px solid #eff0f4;position:relative}
  .xl-tablas tr.xl-tr>td{border:0;padding:0;font-size:13px}
  .xl-tablas tr.xl-tr>td.xl-c-foto{order:-2}
  .xl-tablas tr.xl-tr>td.xl-c-nombre{order:-1;flex:1 1 60%;font-weight:600;font-size:14px}
  .xl-tablas tr.xl-tr>td.xl-c-dato{flex:0 1 auto}
  .xl-tablas tr.xl-tr>td.xl-c-dato:empty{display:none}
  .xl-tablas tr.xl-tr>td.xl-c-dato[data-t]::before{content:attr(data-t) ": ";color:#798291;font-weight:400}
  .xl-tablas tr.xl-tr>td.xl-c-sin-et::before{content:none!important}
  .xl-tablas tr.xl-tr>td.xl-c-flecha{order:-3}
  .xl-tablas tr.xl-tr>td.xl-c-lapiz{order:9;margin-left:auto}
  .xl-tablas tr.xl-tr+tr>td.xl-dentro{display:block;padding:6px 0 10px 8px}
  .xl-tablas tr:not(.xl-tr):not(.xl-cab):not(.xl-filtros)>td{display:block}
  .xl-tablas .xl-pie-t{justify-content:center}
}
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
  constructor({ cols, filas, porPagina, alPulsar, desplegar, lapiz: conLapiz, vacia = 'No hay ninguno.', resaltar = '' }) {
    Object.assign(this, { cols, filas, porPagina, alPulsar, desplegar, conLapiz, vacia, resaltar });
    this.pag = 1; this.orden = null; this.filtros = {}; this.abiertas = new Set(); this.hijas = new Map();
    this.el = document.createElement('div');
    this.el.className = 'xl-tabla';
    document.addEventListener('xl-avisos-vistos', () => { if (document.body.contains(this.el)) this.pintar(); });
  }
  // Estado de la tabla (página, orden, filtros, filas desplegadas y el de sus tablas de dentro), para
  // dejarla igual al volver de una ficha
  estado() {
    return {
      pag: this.pag, orden: this.orden, filtros: { ...this.filtros }, verFiltros: Boolean(this.verFiltros), abiertas: [...this.abiertas],
      hijas: Object.fromEntries([...this.hijas].filter(([id]) => this.abiertas.has(id)).map(([id, h]) => [id, h.estado()])),
    };
  }
  aplicarEstado(e) {
    if (!e) return this;
    this.pag = e.pag || 1; this.orden = e.orden || null; this.filtros = { ...(e.filtros || {}) }; this.verFiltros = e.verFiltros;
    this.abiertas = new Set(e.abiertas || []); this.estadoHijas = e.hijas || {};
    return this;
  }
  pasa(f) {
    return this.cols.every(c => {
      const q = this.filtros[c.k];
      if (q === undefined || q === '') return true;
      const v = c.val(f);
      if (c.tipo === 'sino') return (q === 'si') === Boolean(v);
      if (c.tipo === 'avisos') return (q === 'con') === (v > 0);
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
    const nFiltros = Object.values(this.filtros).filter(v => v !== '' && v !== undefined).length;
    const ordenables = this.cols.filter(c => c.tipo !== 'foto');
    this.el.classList.toggle('xl-ver-filtros', Boolean(this.verFiltros));
    // En el móvil las filas son tarjetas: sin cabecera, se ordena con un desplegable y los filtros se muestran con un botón
    this.el.innerHTML = `<div class="xl-movil-barra"><select data-orden-movil aria-label="Ordenar"><option value="">Ordenar…</option>${ordenables.map(c => ['1', '-1'].map(d => `<option value="${c.k}|${d}" ${this.orden?.k === c.k && String(this.orden.d) === d ? 'selected' : ''}>${esc(c.t)} ${d === '1' ? '▲' : '▼'}</option>`).join('')).join('')}</select><button type="button" data-ver-filtros aria-expanded="${Boolean(this.verFiltros)}">Filtros${nFiltros ? ` (${nFiltros})` : ''}</button></div><table>
      <tr class="xl-cab">${this.desplegar ? '<th class="xl-sin" style="width:22px"></th>' : ''}${this.cols.map(c => `<th class="${c.tipo === 'foto' ? 'xl-sin' : ''}" data-o="${c.tipo === 'foto' ? '' : c.k}" ${c.ancho ? `style="width:${c.ancho}"` : ''}>${esc(c.t)}${this.orden?.k === c.k ? (this.orden.d > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}${this.conLapiz ? '<th class="xl-sin" style="width:36px"></th>' : ''}</tr>
      <tr class="xl-filtros">${this.desplegar ? '<td></td>' : ''}${this.cols.map(c => {
        const v = this.filtros[c.k] ?? '';
        if (c.tipo === 'foto') return '<td></td>';
        if (c.tipo === 'avisos') return `<td data-t="${esc(c.t)}"><select data-f="${c.k}" aria-label="Filtrar ${esc(c.t)}"><option value="">Todos</option><option value="con" ${v === 'con' ? 'selected' : ''}>Con avisos</option><option value="sin" ${v === 'sin' ? 'selected' : ''}>Sin avisos</option></select></td>`;
        if (c.tipo === 'sino') return `<td data-t="${esc(c.t)}"><select data-f="${c.k}" aria-label="Filtrar ${esc(c.t)}"><option value="">Todos</option><option value="si" ${v === 'si' ? 'selected' : ''}>Sí</option><option value="no" ${v === 'no' ? 'selected' : ''}>No</option></select></td>`;
        if (c.tipo === 'sel') return `<td data-t="${esc(c.t)}"><select data-f="${c.k}" aria-label="Filtrar ${esc(c.t)}"><option value="">Todos</option>${opciones(c).map(o => `<option ${String(o) === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></td>`;
        return `<td data-t="${esc(c.t)}"><input data-f="${c.k}" value="${esc(v)}" placeholder="${c.tipo === 'num' ? 'p. ej. >0' : 'Filtrar'}" aria-label="Filtrar ${esc(c.t)}"></td>`;
      }).join('')}${this.conLapiz ? '<td></td>' : ''}</tr>
      ${l.slice(ini, ini + por).map((f, i) => {
        const id = String(f.id);
        const abierta = this.abiertas.has(id);
        return `<tr class="xl-tr ${abierta ? 'xl-abierta' : ''}" data-i="${ini + i}">${this.desplegar ? `<td class="xl-c-flecha">${flecha(abierta)}</td>` : ''}${this.cols.map(c => `<td class="${claseCelda(c)}" data-t="${esc(c.t)}">${c.html ? c.html(f) : esc(c.val(f))}</td>`).join('')}${this.conLapiz ? `<td class="xl-c-lapiz"><button type="button" class="xl-lapiz" data-lapiz="${ini + i}" title="Editar" aria-label="Editar ${esc(f.nombre || '')}">${lapiz}</button></td>` : ''}</tr>
          ${abierta ? `<tr><td class="xl-dentro" colspan="${this.cols.length + extra}" data-hija="${esc(id)}"></td></tr>` : ''}`;
      }).join('') || `<tr><td colspan="${this.cols.length + extra}" class="xl-gris">${esc(this.vacia)}</td></tr>`}
    </table>
    <div class="xl-pie-t"><span>Mostrando ${l.length ? ini + 1 : 0}–${Math.min(ini + por, l.length)} de ${l.length}</span><span>${botonesPagina(this.pag, total)}</span></div>`;
    arreglarMiniaturas(this.el);
    if (this.resaltar) resaltarEn(this.el.querySelectorAll(':scope > table > tbody > tr.xl-tr > td, :scope > table > tr.xl-tr > td'), this.resaltar);
    const om = this.el.querySelector(':scope > .xl-movil-barra [data-orden-movil]');
    om.addEventListener('change', e => { e.stopPropagation(); const [k, d] = om.value.split('|'); this.orden = k ? { k, d: Number(d) } : null; this.pintar(); });
    om.addEventListener('click', e => e.stopPropagation());
    this.el.querySelector(':scope > .xl-movil-barra [data-ver-filtros]').addEventListener('click', e => { e.stopPropagation(); this.verFiltros = !this.verFiltros; this.pintar(); });
    this.el.querySelectorAll(':scope > table .xl-av').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); globo.alternar(b); }));
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
      if (!this.hijas.has(id)) this.hijas.set(id, this.desplegar(f).aplicarEstado(this.estadoHijas?.[id]));
      const h = this.hijas.get(id);
      h.pintar();
      td.appendChild(h.el);
    });
  }
}
// Resalta las palabras buscadas en el texto de las celdas (sin tocar botones ni atributos)
function resaltarEn(celdas, q) {
  const palabras = sinTildes(q).split(/\s+/).filter(p => p.length > 1);
  if (!palabras.length) return;
  for (const td of celdas) {
    const andar = document.createTreeWalker(td, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement.closest('button,mark') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodos = [];
    while (andar.nextNode()) nodos.push(andar.currentNode);
    for (const n of nodos) {
      const nfd = n.nodeValue.normalize('NFD');
      // Texto sin tildes y, para cada letra, su posición en el original (en NFD)
      let plano = '';
      const pos0 = [];
      for (let i = 0; i < nfd.length; i++) { if (/[\u0300-\u036f]/.test(nfd[i])) continue; plano += nfd[i].toLowerCase(); pos0.push(i); }
      pos0.push(nfd.length);
      const tramos = [];
      for (const p of palabras) { let i = plano.indexOf(p); while (i >= 0) { tramos.push([pos0[i], pos0[i + p.length]]); i = plano.indexOf(p, i + p.length); } }
      if (!tramos.length) continue;
      tramos.sort((a, b) => a[0] - b[0]);
      const frag = document.createDocumentFragment();
      let pos = 0;
      for (const [a, b] of tramos) {
        if (a < pos) continue;
        frag.append(nfd.slice(pos, a).normalize('NFC'));
        const m = document.createElement('mark');
        m.textContent = nfd.slice(a, b).normalize('NFC');
        frag.append(m);
        pos = b;
      }
      frag.append(nfd.slice(pos).normalize('NFC'));
      n.replaceWith(frag);
    }
  }
}
// Clase de cada celda (en el móvil, la foto y el nombre van primero y el resto con su título delante)
function claseCelda(c) {
  if (c.tipo === 'foto') return 'xl-c-foto';
  if (c.k === 'nombre') return 'xl-c-nombre';
  return `xl-c-dato${c.sinEtiqueta ? ' xl-c-sin-et' : ''}`;
}
function botonesPagina(pag, total) {
  if (total <= 1) return '';
  const nums = [];
  for (let i = 1; i <= total; i++) if (i === 1 || i === total || Math.abs(i - pag) <= 2) nums.push(i); else if (nums.at(-1) !== '…') nums.push('…');
  return nums.map(n => (n === '…' ? '<span>…</span>' : `<button type="button" class="${n === pag ? 'xl-on' : ''}" data-p="${n}">${n}</button>`)).join(' ');
}

/* ---------- Avisos de cada producto (aprobado por Víctor el 18-11-2026) ----------
   Lo que conviene revisar en la ficha. «La oferta terminó» se puede marcar como visto («Entendido»): se
   recuerda en este navegador para esa oferta (producto + fecha de fin); si cambian las fechas y vuelve a
   terminar, sale otra vez. */
const CLAVE_VISTOS = 'xl-avisos-vistos';
function leerVistos() {
  let v = {};
  try { v = JSON.parse(localStorage.getItem(CLAVE_VISTOS) || '{}') || {}; } catch { /* sin almacenamiento */ }
  // «Vuelve a salir a los N días» (Ajustes del sitio → Panel; 0 o vacío: no vuelve)
  const dias = Number(ajustesPanel().avisos_vuelven_dias) || 0;
  if (dias > 0) {
    const limite = new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);
    for (const k of Object.keys(v)) if (v[k] < limite) delete v[k];
  }
  return v;
}
function marcarVisto(clave) {
  const v = leerVistos();
  v[clave] = new Date().toISOString().slice(0, 10);
  try { localStorage.setItem(CLAVE_VISTOS, JSON.stringify(v)); } catch { /* sin almacenamiento: vuelve a salir */ }
  document.dispatchEvent(new Event('xl-avisos-vistos'));
}
// Ajustes del sitio → Panel (los carga panel.js de /admin/datos-panel.json) y zona horaria de la tienda
const ajustesPanel = () => globalThis.XL_PANEL || {};
const hoyMadrid = () => new Date().toLocaleDateString('sv-SE', { timeZone: globalThis.XL_ZONA || 'Europe/Madrid' });
const diaIso = v => { if (!v) return ''; if (v instanceof Date) return v.toISOString().slice(0, 10); const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : ''; };
const fechaCorta = iso => iso.split('-').reverse().join('/');
const vacio = v => v === undefined || v === null || v === '';
const listaDe = v => (Array.isArray(v) ? v : vacio(v) ? [] : [v]).map(String);

// Al marcar uno como visto se vacían las cachés de avisos antes de repintar las tablas
const avisosCaches = new Set();
document.addEventListener('xl-avisos-vistos', () => { avisosCaches.forEach(c => c.clear()); });

function crearAvisos(ctx) {
  const cat = ctx.catalogo;
  const fabricantes = new Set((ctx.relaciones?.fabricantes || []).map(f => f.valor));
  // Referencias repetidas dentro del mismo fabricante
  const refs = new Map();
  for (const p of ctx.productos) {
    const r = String(p.datos.referencia ?? '').trim().toLowerCase();
    if (!r) continue;
    const k = `${p.datos.fabricante || ''}|${r}`;
    if (!refs.has(k)) refs.set(k, []);
    refs.get(k).push(p);
  }
  const cache = new Map();
  avisosCaches.add(cache);
  return function avisos(p) {
    if (cache.has(p.slug)) return cache.get(p.slug);
    const d = p.datos;
    const l = [];
    if (!Array.isArray(d.imagenes) || !d.imagenes.some(i => i?.imagen)) l.push({ tipo: 'sin_foto', texto: 'Sin foto.' });
    if (vacio(d.precio)) l.push({ tipo: 'sin_precio', texto: 'Sin precio: en la web sale «Precio a consultar».' });
    if (d.estado === 'oferta') {
      const fin = diaIso(d.oferta?.fin);
      if (vacio(d.oferta?.precio) || !diaIso(d.oferta?.inicio) || !fin) l.push({ tipo: 'oferta', texto: 'Está «En oferta» pero le falta el precio de oferta o las fechas.' });
      else if (fin < hoyMadrid()) l.push({ tipo: 'oferta_terminada', texto: `La oferta terminó el ${fechaCorta(fin)} y sigue marcado «En oferta» (en la web ya sale con su precio normal).`, clave: `oferta-terminada|${p.slug}|${fin}` });
    }
    const tipo = cat.tipoDe(d.categoria);
    if (ctx.tipoDosPrecios && tipo !== ctx.tipoDosPrecios && (!vacio(d.precio_cabezal) || !vacio(d.oferta?.precio_cabezal))) {
      l.push({ tipo: 'cabezal', texto: `Tiene precio de cabezal pero no es del tipo «${cat.etiqueta(ctx.tipoDosPrecios) || ctx.tipoDosPrecios}»: no se mostrará.` });
    }
    if (d.condicion !== 'segunda_mano' && d.segunda_mano && Object.values(d.segunda_mano).some(v => !vacio(v))) l.push({ tipo: 'segunda_mano', texto: 'Tiene datos de segunda mano pero su condición es «Nuevo».' });
    if (vacio(d.categoria)) l.push({ tipo: 'clasificacion', texto: 'No tiene clasificación (tipo de producto).' });
    else if (!cat.porSlug.has(String(d.categoria))) l.push({ tipo: 'clasificacion', texto: `Su clasificación («${d.categoria}») no existe en el catálogo.` });
    if (vacio(d.fabricante)) l.push({ tipo: 'fabricante', texto: 'No tiene fabricante.' });
    else if (!fabricantes.has(String(d.fabricante))) l.push({ tipo: 'fabricante', texto: `Su fabricante («${d.fabricante}») no existe.` });
    const rotos = listaDe(d.compatible_con).filter(s => !ctx.porSlugProducto.has(s));
    if (rotos.length) l.push({ tipo: 'compatible', texto: `«Compatible con» tiene productos que no existen: ${rotos.join(', ')}.` });
    const r = String(d.referencia ?? '').trim().toLowerCase();
    const otros = r ? (refs.get(`${d.fabricante || ''}|${r}`) || []).filter(o => o.slug !== p.slug) : [];
    if (otros.length) l.push({ tipo: 'referencia', texto: `Misma referencia (${d.referencia}) que ${otros.map(o => `«${o.datos.title || o.slug}»`).join(', ')}, del mismo fabricante.` });
    const vistos = leerVistos();
    // Solo los tipos de aviso marcados en Ajustes del sitio → Panel (sin ajuste: todos)
    const activos = ajustesPanel().avisos;
    if (Array.isArray(activos)) for (let i = l.length - 1; i >= 0; i--) if (!activos.includes(l[i].tipo)) l.splice(i, 1);
    const res = { pendientes: l.filter(a => !a.clave || !vistos[a.clave]), vistos: l.filter(a => a.clave && vistos[a.clave]) };
    cache.set(p.slug, res);
    return res;
  };
}

// Globo con la lista de avisos: al pasar el ratón o al pulsar el icono (en el móvil)
const globo = (() => {
  let el = null; let actual = null; let temporizador = null;
  const cerrar = () => { el?.remove(); el = null; actual = null; };
  const mostrar = b => {
    clearTimeout(temporizador);
    if (actual === b && el) return;
    cerrar();
    actual = b;
    let datos = { pendientes: [], vistos: [] };
    try { datos = JSON.parse(b.dataset.avisos); } catch { /* sin datos */ }
    el = document.createElement('div');
    el.className = 'xl-globo';
    el.setAttribute('role', 'tooltip');
    const n = datos.pendientes.length;
    el.innerHTML = `<b>${n === 1 ? '1 aviso' : `${n} avisos`}</b><ul>${datos.pendientes.map(a => `<li>${esc(a.texto)}${a.clave ? `<br><button type="button" data-visto="${esc(a.clave)}">Entendido</button>` : ''}</li>`).join('')}</ul>${datos.vistos.length ? `<div class="xl-visto">Ya revisado: ${datos.vistos.map(a => esc(a.texto)).join(' ')}</div>` : ''}`;
    document.body.appendChild(el);
    const r = b.getBoundingClientRect();
    const w = el.offsetWidth; const h = el.offsetHeight;
    const izq = Math.max(8, Math.min(r.right - w, innerWidth - w - 8));
    const arriba = r.bottom + 6 + h > innerHeight - 8 ? Math.max(8, r.top - h - 6) : r.bottom + 6;
    Object.assign(el.style, { left: `${izq}px`, top: `${arriba}px` });
    el.addEventListener('mouseenter', () => clearTimeout(temporizador));
    el.addEventListener('mouseleave', () => { temporizador = setTimeout(cerrar, 250); });
    el.addEventListener('click', e => {
      const v = e.target.closest('[data-visto]');
      if (!v) return;
      e.stopPropagation();
      const clave = v.dataset.visto;
      cerrar();
      marcarVisto(clave);
    });
  };
  document.addEventListener('mouseover', e => { const b = e.target.closest?.('.xl-av'); if (b) mostrar(b); });
  document.addEventListener('mouseout', e => { const b = e.target.closest?.('.xl-av'); if (b && !b.contains(e.relatedTarget)) temporizador = setTimeout(cerrar, 250); });
  document.addEventListener('focusin', e => { const b = e.target.closest?.('.xl-av'); if (b) mostrar(b); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
  document.addEventListener('click', e => { if (el && !el.contains(e.target) && !e.target.closest?.('.xl-av')) cerrar(); });
  window.addEventListener('hashchange', cerrar);
  window.addEventListener('scroll', cerrar, true);
  return { alternar: b => (actual === b && el ? cerrar() : mostrar(b)) };
})();
const ICONO_AVISO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';

// Insignia ⚠ con cuántos productos tienen avisos (parpadea suave; quieta con «reducir movimiento»)
const insigniaAvisos = n => (n ? `<span class="xl-av-n" title="${n === 1 ? '1 producto con avisos' : `${n} productos con avisos`}" aria-label="${n === 1 ? '1 producto con avisos' : `${n} productos con avisos`}">${ICONO_AVISO}${n}</span>` : '');
const avisosDe = ctx => (ctx.avisos ||= crearAvisos(ctx));
const conAvisos = (ctx, p) => avisosDe(ctx)(p).pendientes.length > 0;
// Botón ⚠ junto a las vistas: deja solo los productos con avisos (n: cuántos hay)
const botonFiltroAvisos = (activo, n) => `<button type="button" class="xl-filtro-av ${activo ? 'xl-on' : ''}" data-solo-avisos aria-pressed="${activo}" title="${activo ? 'Ver todos' : 'Ver solo los productos con avisos'}">${ICONO_AVISO}${activo ? `Con avisos (${n})` : n}</button>`;

/* ---------- Columnas de productos ---------- */
function colsProductos(ctx, conClasificacion) {
  const avisos = avisosDe(ctx);
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
    { k: 'prueba', t: 'Pruebas', tipo: 'sino', val: p => Boolean(p.datos.prueba), html: p => pildoraPruebas(p.datos.prueba) },
    // Avisos: la última columna
    { k: 'avisos', t: 'Avisos', tipo: 'avisos', sinEtiqueta: true, ancho: '64px', val: p => avisos(p).pendientes.length, html: p => {
      const a = avisos(p);
      if (!a.pendientes.length) return '';
      const n = a.pendientes.length;
      return `<button type="button" class="xl-av" data-avisos="${esc(JSON.stringify(a))}" aria-label="${n === 1 ? '1 aviso' : `${n} avisos`}: ${esc(a.pendientes.map(x => x.texto).join(' '))}">${ICONO_AVISO}${n}</button>`;
    } },
  ];
}
// «Solo para pruebas»: Sí (ámbar: solo en los entornos de pruebas) o No (verde: se publica)
const pildoraPruebas = v => (v ? '<span class="xl-pill" style="background:#fdf1dc;color:#8a5300" title="Solo se ve en los entornos de pruebas">Sí</span>'
  : '<span class="xl-pill" style="background:#e6f4ea;color:#1e7a3a" title="Se publica en la web">No</span>');
function pildoraEstado(e) {
  const c = { disponible: ['#e6f4ea', '#1e7a3a'], oferta: ['#fdf1dc', '#8a5300'], no_disponible: ['#fdeaea', '#b02a2a'] }[e] || ['#f1f2f4', '#5f6670'];
  return `<span class="xl-pill" style="background:${c[0]};color:${c[1]}">${esc(ESTADOS[e] || e)}</span>`;
}
// (las entradas del blog van en subcarpetas por año: «2026/2026-11-16-…»; la barra no se codifica)
const irA = (col, slug) => { location.hash = `#/collections/${col}/entries/${String(slug).split('/').map(encodeURIComponent).join('/')}`; };

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

/* ---------- Piezas comunes a las listas y al buscador ----------
   tablaProd: tabla de productos; filasSeccion y tablaSeccion: la de fabricantes, tipos, categorías,
   subcategorías (con sus productos desplegables), entradas del blog o páginas. */
function piezas(nombre, actuales, ctx, porPag, extra = {}, carpeta = '') {
  const cat = ctx.catalogo;
  const productos = ctx.productos;
  const tablaProd = (lista, conClas) => new Tabla({ cols: colsProductos(ctx, conClas), filas: lista.map(p => ({ ...p, id: p.slug })), porPagina: porPag, alPulsar: p => irA('productos', p.slug), vacia: 'Sin productos.', ...extra });
  const esCatalogo = ['tipos', 'categorias', 'subcategorias'].includes(nombre);
  const esTexto = nombre === 'blog' || nombre === 'paginas';
  const deCategoria = slug => productos.filter(p => cat.rutaSlugs(p.datos.categoria).includes(slug));
  const filasSeccion = actuales.map(a => {
    const prods = nombre === 'fabricantes' ? productos.filter(p => p.datos.fabricante === a.slug) : esCatalogo ? deCategoria(a.slug) : [];
    // Identificador de la ficha en el panel: la ruta dentro de la carpeta, sin «.md»
    const ent = carpeta && a.ruta.startsWith(`${carpeta}/`) ? a.ruta.slice(carpeta.length + 1).replace(/\.md$/, '') : a.slug;
    return { ...a, id: a.slug, ent, nombre: a.datos.title || a.slug, prods, hijas: esCatalogo ? cat.hijas(a.slug).length : 0 };
  });
  const fechaDe = f => { const d = f.datos.date; const s = d instanceof Date ? d.toISOString() : String(d || ''); return s.slice(0, 10); };
  const colsSeccion = [
    // La miniatura, solo si alguna ficha de la lista tiene imagen
    ...(actuales.some(a => a.datos.imagen) ? [{ k: 'foto', t: '', tipo: 'foto', val: () => '', html: f => miniatura(f.datos.imagen), ancho: '44px' }] : []),
    { k: 'nombre', t: esTexto ? 'Título' : 'Nombre', tipo: 'txt', val: f => f.nombre },
    ...(nombre === 'blog' ? [{ k: 'fecha', t: 'Fecha', tipo: 'txt', val: fechaDe, html: f => esc(fechaDe(f).split('-').reverse().join('/')) }, { k: 'tema', t: 'Tema', tipo: 'sel', val: f => f.datos.tema || '' }] : []),
    ...(nombre === 'tipos' ? [{ k: 'hijas', t: 'Categorías', tipo: 'num', val: f => f.hijas }] : []),
    ...(nombre === 'categorias' ? [{ k: 'hijas', t: 'Subcategorías', tipo: 'num', val: f => f.hijas }] : []),
    ...(esTexto ? [] : [{ k: 'n', t: 'Productos', tipo: 'num', val: f => f.prods.length, html: f => `${f.prods.length}${insigniaAvisos(f.prods.filter(p => conAvisos(ctx, p)).length)}` }]),
    { k: 'prueba', t: 'Pruebas', tipo: 'sino', val: f => Boolean(f.datos.prueba), html: f => pildoraPruebas(f.datos.prueba) },
  ];
  // En la vista «Tabla» de categorías y subcategorías, también de qué cuelgan (hay nombres repetidos)
  const colPadre = { k: 'padre', t: nombre === 'categorias' ? 'Tipo de producto' : 'Categoría', tipo: 'sel', val: f => cat.etiqueta(f.datos.padre) || f.datos.padre || '' };
  const tablaSeccion = (filas, conPadre = false) => new Tabla({
    cols: conPadre ? [...colsSeccion.slice(0, colsSeccion.findIndex(c => c.k === 'nombre') + 1), colPadre, ...colsSeccion.slice(colsSeccion.findIndex(c => c.k === 'nombre') + 1)] : colsSeccion,
    filas, porPagina: porPag, lapiz: !esTexto,
    alPulsar: f => irA(nombre, f.ent || f.slug),
    // En las subcategorías la clasificación es siempre la misma: no hace falta la columna
    desplegar: esTexto ? null : f => tablaProd(f.prods, nombre !== 'subcategorias'),
    ...extra,
  });
  return { tablaProd, filasSeccion, tablaSeccion };
}

/* ---------- Montaje de cada lista ---------- */
export function crearTablas({ preparar, leerActuales, leerContexto }) {
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
  let montada = null; // { nombre, raiz }
  // Lo que había al ir a una ficha desde la lista, para dejarlo igual al volver (solo en la misma sección;
  // al cambiar de sección o la primera vez, se carga de nuevo)
  let memoria = null;
  // «Ver los N productos en la lista» desde la ventana de eliminar (eliminar.js): se abre la lista en tabla,
  // buscando esa ficha y con su fila desplegada
  let peticion = null;
  const hash32 = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h; };
  const firmaDatos = (actuales, ctx) => hash32([...actuales, ...ctx.productos].map(a => `${a.ruta}:${hash32(a.raw || '')}`).join('|'));
  // Posición de la página mientras se ve la lista (al cambiar de página, Decap ya la ha movido)
  window.addEventListener('scroll', () => { if (montada && !montada.error && document.body.contains(montada.raiz)) montada.scroll = window.scrollY; }, { passive: true });

  async function montar(nombre, main) {
    // Al volver de una ficha de esta misma sección: los datos y el estado de antes (memoria)
    const previo = memoria && memoria.nombre === nombre ? memoria : null;
    memoria = null;
    const pet = peticion?.nombre === nombre ? peticion : null;
    peticion = null;
    const estado = pet ? { vista: 'tabla', busqueda: pet.busqueda, tablas: { [`todo:${pet.busqueda}:`]: { abiertas: [pet.slug] } } } : previo?.estado;
    const raiz = document.createElement('div');
    raiz.className = 'xl-tablas';
    raiz.innerHTML = '<p class="xl-nota">Cargando…</p>';
    main.appendChild(raiz);
    montada = { nombre, raiz, main, scroll: 0 };
    try {
      const x = previo ? previo.datos.x : await preparar(nombre);
      const [actuales, ctx] = previo ? [previo.datos.actuales, previo.datos.ctx] : await Promise.all([leerActuales(x), leerContexto(x)]);
      if (montada?.raiz !== raiz) return;
      dibujar(nombre, raiz, x, actuales, ctx, estado);
      if (!pet && previo?.estado?.scroll) {
        // Decap pinta la lista a la vez: se espera un poco para devolver la página a donde estaba
        const y = previo.estado.scroll;
        setTimeout(() => requestAnimationFrame(() => { if (montada?.raiz === raiz) window.scrollTo(0, y); }), 60);
      }
      if (previo) {
        // Mientras, se vuelve a leer lo guardado: si algo cambió (p. ej. la ficha que se acaba de editar), se
        // repinta con los datos nuevos sin perder lo que se estaba viendo
        Promise.all([leerActuales(x), leerContexto(x)]).then(([a2, c2]) => {
          if (montada?.raiz !== raiz || firmaDatos(a2, c2) === firmaDatos(actuales, ctx)) return;
          const e = { ...montada.guardar(), scroll: window.scrollY };
          dibujar(nombre, raiz, x, a2, c2, e);
          window.scrollTo(0, e.scroll);
        }).catch(() => { /* se queda con lo que había */ });
      }
    } catch (e) {
      console.error(e);
      raiz.innerHTML = `<p style="color:#c92a2a">No se ha podido cargar la lista: ${esc(e.message || e)}. Se muestra la lista normal del panel.</p>`;
      main.querySelectorAll('.xl-oculto').forEach(el => el.classList.remove('xl-oculto'));
      montada = { nombre, raiz, main, error: true };
    }
  }

  // Pinta la lista con unos datos y, si lo hay, el estado anterior (vista, búsqueda, grupos abiertos, página,
  // filtros y orden de cada tabla). Deja en «montada» los datos y cómo guardar el estado
  function dibujar(nombre, raiz, x, actuales, ctx, e = null) {
    {
      const version = (montada.version || 0) + 1;
      montada.version = version;
      montada.datos = { x, actuales, ctx };
      const { YAML } = x;
      const posMenu = ordenCatalogo(YAML, ctx);
      const productos = ctx.productos;
      let porPagina = e?.porPagina || ([12, 24, 48].includes(Number(ajustesPanel().por_pagina)) ? Number(ajustesPanel().por_pagina) : 12);
      const porPag = () => porPagina;
      const cat = ctx.catalogo;
      const { tablaProd, filasSeccion, tablaSeccion } = piezas(nombre, actuales, ctx, porPag);

      // Grupos plegados: productos por clasificación; categorías por tipo; subcategorías por «Tipo › Categoría»
      let vista = nombre === 'productos' || nombre === 'categorias' || nombre === 'subcategorias' ? 'grupos' : 'tabla';
      const conVistas = vista === 'grupos';
      if (conVistas && ajustesPanel().vista_inicial === 'tabla') vista = 'tabla';
      if (conVistas && e?.vista) vista = e.vista;
      const etiquetaGrupos = { productos: 'Por clasificación', categorias: 'Por tipo de producto', subcategorias: 'Por categoría' }[nombre];
      const abiertos = new Set(e?.abiertos || []);
      const tablas = new Map();
      const estadosTablas = { ...(e?.tablas || {}) }; // de antes de ir a la ficha; se aplican al crear cada tabla
      let busqueda = e?.busqueda || '';

      const pasaBusqueda = (texto) => !busqueda || sinTildes(texto).includes(sinTildes(busqueda));
      const textoProducto = p => [p.datos.title, p.datos.modelo, p.datos.referencia, ctx.nombreFabricante(p.datos.fabricante), p.slug].join(' ');

      let soloAvisos = Boolean(e?.soloAvisos);
      montada.guardar = () => ({
        vista, busqueda, porPagina, soloAvisos, abiertos: [...abiertos],
        tablas: { ...estadosTablas, ...Object.fromEntries([...tablas].map(([k, t]) => [k, t.estado()])) },
      });
      const pintar = () => {
        const av = p => conAvisos(ctx, p);
        const prodsFiltrados = productos.filter(p => pasaBusqueda(textoProducto(p)) && (!soloAvisos || av(p)));
        // Con el filtro ⚠: solo las filas con algún producto con avisos y, dentro, solo esos productos
        const seccionFiltrada = filasSeccion.filter(f => pasaBusqueda(`${f.nombre} ${f.slug}`))
          .map(f => (soloAvisos ? { ...f, prods: f.prods.filter(av) } : f)).filter(f => !soloAvisos || f.prods.length);
        const nAvisos = (nombre === 'productos' ? productos : [...new Set(filasSeccion.flatMap(f => f.prods))]).filter(av).length;
        const sa = soloAvisos ? 'av' : '';
        raiz.innerHTML = `<div class="xl-barra">
            <input type="search" placeholder="${nombre === 'productos' ? 'Buscar por nombre, modelo, referencia o fabricante' : 'Buscar por nombre'}" value="${esc(busqueda)}" data-buscar>
            ${conVistas ? `<span class="xl-seg" role="group" aria-label="Forma de ver la lista"><button type="button" data-v="grupos" class="${vista === 'grupos' ? 'xl-on' : ''}" title="${esc(etiquetaGrupos)}" aria-label="${esc(etiquetaGrupos)}" aria-pressed="${vista === 'grupos'}">${ICONO_ARBOL}</button><button type="button" data-v="tabla" class="${vista === 'tabla' ? 'xl-on' : ''}" title="Tabla" aria-label="Tabla" aria-pressed="${vista === 'tabla'}">${ICONO_TABLA}</button></span>` : ''}
            ${nAvisos || soloAvisos ? botonFiltroAvisos(soloAvisos, nAvisos) : ''}
            <label class="xl-gris">Por página <select data-por>${[12, 24, 48].map(n => `<option ${n === porPagina ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          </div><div data-cont></div>`;
        const cont = raiz.querySelector('[data-cont]');
        const conTabla = (clave, crear) => {
          clave += `:${sa}`;
          if (!tablas.has(clave)) { tablas.set(clave, crear().aplicarEstado(estadosTablas[clave])); delete estadosTablas[clave]; }
          const t = tablas.get(clave); t.pintar(); return t.el;
        };

        if (vista === 'tabla') {
          const caja = document.createElement('div');
          caja.className = 'xl-grupo';
          if (nombre === 'productos') caja.appendChild(conTabla(`todo:${busqueda}`, () => tablaProd(prodsFiltrados, true)));
          else caja.appendChild(conTabla(`todo:${busqueda}`, () => tablaSeccion(seccionFiltrada, nombre === 'categorias' || nombre === 'subcategorias')));
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
            // En categorías y subcategorías, también cuántos productos suman las del grupo
            const nProd = nombre === 'productos' ? 0 : grupos.get(k).reduce((t, f) => t + f.prods.length, 0);
            const resumen = nombre === 'productos' ? `${n} ${unidad}` : `${n} ${unidad} · ${nProd} ${nProd === 1 ? 'producto' : 'productos'}`;
            const prodsGrupo = nombre === 'productos' ? grupos.get(k) : [...new Set(grupos.get(k).flatMap(f => f.prods))];
            caja.innerHTML = `<button type="button" aria-expanded="${abierto}">${flecha(abierto)}${esc(titulo)}<span class="xl-dcha">${insigniaAvisos(prodsGrupo.filter(av).length)}<small>${resumen}</small></span></button>`;
            caja.firstElementChild.addEventListener('click', () => { abierto ? abiertos.delete(k) : abiertos.add(k); pintar(); });
            if (abierto) caja.appendChild(conTabla(`g:${k}:${busqueda}`, () => (nombre === 'productos' ? tablaProd(grupos.get(k), false) : tablaSeccion(grupos.get(k)))));
            cont.appendChild(caja);
          }
        }
        const b = raiz.querySelector('[data-buscar]');
        b.addEventListener('input', () => { const pos = b.selectionStart; busqueda = b.value; pintar(); const n = raiz.querySelector('[data-buscar]'); n.focus(); n.setSelectionRange(pos, pos); });
        raiz.querySelector('[data-por]').addEventListener('change', e => { porPagina = Number(e.target.value); tablas.forEach(t => { t.pag = 1; }); pintar(); });
        raiz.querySelectorAll('[data-v]').forEach(btn => btn.addEventListener('click', () => { vista = btn.dataset.v; pintar(); }));
        raiz.querySelector('[data-solo-avisos]')?.addEventListener('click', () => { soloAvisos = !soloAvisos; pintar(); });
      };
      // Al marcar un aviso como visto cambian los números: se rehace la lista (las tablas se crean de nuevo,
      // con el estado que tenían)
      document.addEventListener('xl-avisos-vistos', () => {
        if (!document.body.contains(raiz) || montada?.version !== version) return;
        Object.assign(estadosTablas, Object.fromEntries([...tablas].map(([k, t]) => [k, t.estado()])));
        tablas.clear(); pintar();
      });
      pintar();
    }
  }

  // Coloca la tabla en la vista de lista de la colección y esconde la de Decap
  /* ---------- Buscador de la cabecera: resultados en tablas, agrupados por sección ----------
     (aprobado por Víctor el 18-11-2026). Busca todas las palabras, sin distinguir tildes ni mayúsculas, en
     los mismos campos que el buscador de cada lista (y, en el blog y las páginas, también en el texto).
     La colección oculta «catalogo» no sale (sus fichas ya salen como tipos, categorías y subcategorías). */
  const SECCIONES_BUSCAR = ['tipos', 'categorias', 'subcategorias', 'productos', 'fabricantes', 'blog', 'paginas'];
  async function montarBusqueda(q, main) {
    const raiz = document.createElement('div');
    raiz.className = 'xl-tablas';
    raiz.innerHTML = '<p class="xl-nota">Buscando…</p>';
    main.appendChild(raiz);
    montada = { nombre: `buscar:${q}`, raiz, main };
    try {
      const xs = {};
      for (const n of SECCIONES_BUSCAR) { try { xs[n] = await preparar(n); } catch { /* sección sin perfil */ } }
      const ctx = await leerContexto(xs.productos);
      const actuales = {};
      await Promise.all(Object.entries(xs).map(async ([n, x]) => { actuales[n] = n === 'productos' ? ctx.productos : await leerActuales(x); }));
      if (montada?.raiz !== raiz) return;
      const cat = ctx.catalogo;
      const palabras = sinTildes(q).split(/\s+/).filter(Boolean);
      const casa = textos => { const s = sinTildes(textos.filter(v => typeof v === 'string' || typeof v === 'number').join(' ')); return palabras.every(p => s.includes(p)); };
      const textoDe = (n, a) => {
        const d = a.datos;
        if (n === 'productos') return [d.title, d.modelo, d.referencia, ctx.nombreFabricante(d.fabricante), cat.etiqueta(d.categoria), d.description, a.cuerpo, a.slug];
        if (n === 'blog' || n === 'paginas') return [d.title, d.description, d.tema, a.cuerpo, a.slug];
        return [d.title, d.description, d.texto, a.slug, ['categorias', 'subcategorias'].includes(n) ? cat.etiqueta(d.padre) : ''];
      };
      let porPagina = [12, 24, 48].includes(Number(ajustesPanel().por_pagina)) ? Number(ajustesPanel().por_pagina) : 12;
      const porPag = () => porPagina;
      const av = p => conAvisos(ctx, p);
      let soloAvisos = false;
      let grupos = [];
      let total = 0;
      let nAvisos = 0;
      // Grupos de resultados (con el filtro ⚠: solo productos con avisos y las fichas que los tienen)
      const construir = () => {
        const abiertos = new Map(grupos.map(g => [g.n, g.abierto]));
        grupos = [];
        const conAv = new Set();
        for (const n of SECCIONES_BUSCAR) {
          if (!xs[n]) continue;
          const enc = actuales[n].filter(a => casa(textoDe(n, a)));
          if (!enc.length) continue;
          const { tablaProd, filasSeccion, tablaSeccion } = piezas(n, enc, ctx, porPag, { resaltar: q }, xs[n].col.folder);
          const prods = n === 'productos' ? enc : [...new Set(filasSeccion.flatMap(f => f.prods))];
          prods.filter(av).forEach(p => conAv.add(p.slug));
          let filas = filasSeccion;
          let lista = enc;
          if (soloAvisos) {
            if (n === 'blog' || n === 'paginas') continue;
            lista = enc.filter(av);
            filas = filasSeccion.map(f => ({ ...f, prods: f.prods.filter(av) })).filter(f => f.prods.length);
            if (!(n === 'productos' ? lista : filas).length) continue;
          }
          const tabla = n === 'productos' ? tablaProd(lista, true) : tablaSeccion(filas, n === 'categorias' || n === 'subcategorias');
          grupos.push({ n, titulo: xs[n].col.label, total: n === 'productos' ? lista.length : filas.length, tabla, abierto: abiertos.get(n) ?? true, avisos: (n === 'productos' ? lista : [...new Set(filas.flatMap(f => f.prods))]).filter(av).length });
        }
        total = grupos.reduce((s, g) => s + g.total, 0);
        if (!soloAvisos) nAvisos = conAv.size;
      };
      construir();
      let solo = '';
      document.addEventListener('xl-avisos-vistos', () => { if (document.body.contains(raiz)) { construir(); pintar(); } });
      const pintar = () => {
        raiz.innerHTML = `<div class="xl-barra"><span class="xl-gris">${total ? `${total} ${total === 1 ? 'resultado' : 'resultados'} en ${grupos.length} ${grupos.length === 1 ? 'sección' : 'secciones'}` : 'Ningún resultado. Prueba con menos palabras o sin abreviaturas.'}</span>
          ${grupos.length > 1 ? `<span class="xl-chips-b">${[['', `Todo (${total})`], ...grupos.map(g => [g.n, `${g.titulo} (${g.total})`])].map(([k, x]) => `<button type="button" class="${solo === k ? 'xl-on' : ''}" data-solo="${k}">${esc(x)}</button>`).join('')}</span>` : ''}
          ${nAvisos || soloAvisos ? `<span style="margin-left:auto">${botonFiltroAvisos(soloAvisos, nAvisos)}</span>` : ''}
          <label class="xl-gris" style="${nAvisos || soloAvisos ? '' : 'margin-left:auto'}">Por página <select data-por>${[12, 24, 48].map(n => `<option ${n === porPagina ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div><div data-cont></div>`;
        const cont = raiz.querySelector('[data-cont]');
        for (const g of grupos.filter(x => !solo || x.n === solo)) {
          const caja = document.createElement('div');
          caja.className = 'xl-grupo';
          caja.innerHTML = `<button type="button" aria-expanded="${g.abierto}">${flecha(g.abierto)}${esc(g.titulo)}<span class="xl-dcha">${insigniaAvisos(g.avisos)}<small>${g.total} ${g.total === 1 ? 'resultado' : 'resultados'}</small></span></button>`;
          caja.firstElementChild.addEventListener('click', () => { g.abierto = !g.abierto; pintar(); });
          if (g.abierto) { g.tabla.pintar(); caja.appendChild(g.tabla.el); }
          cont.appendChild(caja);
        }
        raiz.querySelectorAll('[data-solo]').forEach(b => b.addEventListener('click', () => { solo = b.dataset.solo; pintar(); }));
        raiz.querySelector('[data-por]').addEventListener('change', e => { porPagina = Number(e.target.value); grupos.forEach(g => { g.tabla.pag = 1; }); pintar(); });
        raiz.querySelector('[data-solo-avisos]')?.addEventListener('click', () => { soloAvisos = !soloAvisos; solo = ''; construir(); pintar(); });
      };
      pintar();
    } catch (e) {
      console.error(e);
      raiz.innerHTML = `<p style="color:#c92a2a">No se ha podido buscar: ${esc(e.message || e)}. Se muestran los resultados normales del panel.</p>`;
      main.querySelectorAll('.xl-oculto').forEach(el => el.classList.remove('xl-oculto'));
      montada = { ...montada, error: true };
    }
  }

  function revisar() {
    const b = location.hash.match(/^#\/search\/([^?]*)/);
    const q = b ? decodeURIComponent(b[1]).trim() : '';
    const m = location.hash.match(/^#\/collections\/([^/?]+)\/?(\?.*)?$/);
    const nombre = q ? `buscar:${q}` : m && LISTAS.includes(m[1]) && PERFILES[m[1]] ? m[1] : null;
    if (montada && (montada.nombre !== nombre || !document.body.contains(montada.raiz))) {
      // Se guarda lo que había si se va a una ficha (de esta sección o, desde las tablas desplegadas, la de un
      // producto) o a crear una, o si Decap ha vuelto a pintar la misma lista; si se va a otra lista, se olvida
      const aSuFicha = /^#\/collections\/[^/]+\/(entries\/|new)/.test(location.hash);
      memoria = montada.guardar && (aSuFicha || montada.nombre === nombre)
        ? { nombre: montada.nombre, datos: montada.datos, estado: { ...montada.guardar(), scroll: montada.scroll } } : null;
      montada.raiz.remove();
      montada.main?.querySelectorAll('.xl-oculto').forEach(el => el.classList.remove('xl-oculto'));
      montada = null;
    }
    if (!nombre) return;
    if (q) {
      const titulo = document.querySelector('main [class*="-SearchResultContainer"]');
      const main = titulo?.closest('main');
      if (!main) return;
      if (!montada) montarBusqueda(q, main);
      if (montada?.error) return;
      for (const c of main.children) if (c !== titulo && c !== montada.raiz && !c.classList.contains('xl-oculto')) c.classList.add('xl-oculto');
      return;
    }
    const nuevo = document.querySelector(`a[href="#/collections/${nombre}/new"]`);
    const main = nuevo?.closest('main');
    if (!main) return;
    if (!montada) montar(nombre, main);
    if (montada?.error) return;
    // Todo lo que pinta Decap debajo de la cabecera (ordenar, agrupar y la lista) queda escondido
    const cabecera = [...main.children].find(c => c.contains(nuevo));
    for (const c of main.children) if (c !== cabecera && c !== montada.raiz && !c.classList.contains('xl-oculto')) c.classList.add('xl-oculto');
  }
  revisar.abrirEnLista = (nombre, slug, busqueda) => {
    peticion = { nombre, slug: String(slug), busqueda: String(busqueda || '') };
    location.hash = `#/collections/${nombre}`;
  };
  return revisar;
}
