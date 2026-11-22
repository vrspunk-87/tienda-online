/*
  «Medios» del panel con pestañas por carpeta (aprobado por Víctor el 18-11-2026).

  La ventana «Medios» de Decap solo enseña la carpeta general (/img/). Las fotos de fabricantes, tipos,
  categorías y subcategorías, productos y las fichas en PDF están en sus propias carpetas
  (media_folder de cada sección o campo en public/config.yml) y no se podían ver ni gestionar.
  Al abrir «Medios» desde la cabecera se añaden pestañas, todas pintadas por este fichero («General», la
  carpeta /img/ con sus archivos sueltos, también desde el 18-11-2026; la vista de Decap queda escondida):
  - cada archivo con su miniatura, nombre, tamaño y si está «En uso» (qué ficha lo usa, con enlace) o
    «Sin usar»; buscar (por nombre o por la ficha), filtrar (Todas, En uso, Sin usar) y paginar;
  - Subir (las fotos se reducen a 1600 px, como al importar; si el nombre ya existe, pregunta),
    Descargar (una o varias, en un ZIP), Reemplazar, Copiar ruta;
  - Eliminar: solo las que no usa ninguna ficha, todas en un único cambio y con confirmación.
  Lee y guarda como el engranaje (almacen.js): en la web, en la rama del panel, al momento; en local
  (npm run panel), la lista sale del último «npm run build».
  Decap no tiene un sitio oficial para esto: se retoca su ventana (comprobarlo al actualizar Decap).
*/
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sinTildes = t => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const tam = b => (b === null || b === undefined ? '' : b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`);
const EXT_IMG = /\.(jpe?g|png|webp|gif|svg|avif)$/i;
// Miniaturas que no son «-480.webp» (fotos de menos de 480 px de ancho: el build solo hace la de su ancho), según el
// último build (medios.json → _miniaturas). El original no sirve de reserva: el build no lo publica si no lo usa nada.
let MINIATURAS = {};
const POR_PAGINA = 48;
const NOMBRES = { 'public/img/catalogo': 'Catálogo', 'public/img/fichas': 'Fichas PDF', 'public/img/productos': 'Productos', 'public/img/fabricantes': 'Fabricantes' };
// Manuales de uso en PDF (docs/manuales, 21-11-2026): pestaña de solo lectura. No se publican en la web; se abren y se
// descargan desde el panel. Sin «Subir», «Eliminar», «Reemplazar» ni «Copiar ruta»: los prepara Víctor
const MANUALES = { carpeta: 'docs/manuales', publica: '/docs/manuales', nombre: 'Manuales', soloLectura: true };

const css = `
.xl-med-tabs{display:flex;gap:6px;flex-wrap:wrap;align-items:center;align-self:stretch;flex:none;width:100%;box-sizing:border-box;padding:0 0 10px;margin-bottom:10px;border-bottom:2px dashed var(--xl-pespunte,#e3e3df)}
.xl-med-tabs button{flex:none;height:auto;line-height:1.4;border:1px solid var(--xl-borde,#dfdfe3);background:#fff;border-radius:16px;padding:4px 12px;font:inherit;font-size:13px;cursor:pointer;color:inherit}
.xl-med-tabs button small{opacity:.7;margin-left:4px}
.xl-med-tabs button.xl-on{background:var(--xl-acento,#3a69c7);border-color:var(--xl-acento,#3a69c7);color:#fff}
.xl-med{font-size:13px;min-height:0;flex:1;overflow:auto;text-align:left;padding-right:4px}
.xl-med-barra{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px;position:sticky;top:0;z-index:2;background:#fff;padding:6px 0}
.xl-med-barra input[type=search]{flex:1;min-width:160px;height:34px;border:1px solid #c9ced6;border-radius:8px;padding:0 10px;font:inherit}
.xl-med-barra select{height:34px;border:1px solid #c9ced6;border-radius:8px;padding:0 6px;font:inherit;background:#fff}
.xl-med-barra button,.xl-med-det button,.xl-med-conf button{height:34px;padding:0 12px;border:1px solid #c9ced6;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:inherit}
.xl-med button.xl-rojo-b{background:#c92a2a;border-color:#c92a2a;color:#fff}
.xl-med button:disabled{opacity:.5;cursor:default}
.xl-med-rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;padding:2px}
.xl-med-f{position:relative;background:#fff;border:1px solid var(--xl-borde,#dfdfe3);border-radius:10px;padding:6px;cursor:pointer}
.xl-med-f.xl-on{outline:2px solid var(--xl-acento,#3a69c7)}
.xl-med-f .xl-med-img{height:84px;border-radius:6px;background:#f1f2f4;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#798291;font-weight:700}
.xl-med-f img{max-width:100%;max-height:100%;object-fit:contain}
.xl-med-f b{display:block;font-size:11px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.xl-med-f input{position:absolute;top:10px;left:10px;width:16px;height:16px}
.xl-med-p{display:inline-block;font-size:10px;font-weight:600;border-radius:9px;padding:0 6px;margin-top:3px}
.xl-med-p.xl-uso{background:#e6f4ea;color:#1e7a3a}.xl-med-p.xl-libre{background:#fdf1dc;color:#8a5300}
.xl-med-det,.xl-med-conf{background:#fff;border:1px solid var(--xl-borde,#dfdfe3);border-radius:10px;padding:10px 12px;margin-top:8px}
.xl-med-det a{color:var(--xl-acento,#3a69c7)}
.xl-med-pie{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;color:#798291;font-size:12px;margin-top:8px}
.xl-med-pie button{min-width:28px;height:28px;border-radius:14px;border:1px solid #c9ced6;background:#fff;cursor:pointer;font:inherit;font-size:12px}
.xl-med-pie button.xl-on{background:var(--xl-acento,#3a69c7);border-color:var(--xl-acento,#3a69c7);color:#fff}
.xl-med-msj{margin:6px 0;padding:8px 10px;border-radius:8px;background:#f4f4f6}
.xl-med-msj.xl-mal{background:#fdeaea;color:#b02a2a}.xl-med-msj.xl-bien{background:#e6f4ea;color:#1e7a3a}
.xl-oculto-med{display:none!important}
`;

export function crearMedios({ cargarLibrerias, reducirImagen, descargar, nombreImagen }) {
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
  let desdeCabecera = false;
  // Solo cuando se abre «Medios» desde la cabecera (al elegir una imagen en una ficha, Decap ya abre su carpeta)
  document.addEventListener('click', e => {
    const b = e.target.closest?.('header button');
    if (b && /Medios/.test(b.textContent)) desdeCabecera = true;
  }, true);

  let estado = null; // { modal, carpeta, ... }

  async function carpetasDe() {
    const { cfg } = await cargarLibrerias();
    const general = String(cfg.media_folder || 'public/img').replace(/^\/+|\/+$/g, '');
    const mapa = new Map();
    const anotar = (carpeta, etiqueta) => {
      const c = String(carpeta).replace(/^\/+|\/+$/g, '');
      if (!c || c === general || /\{\{/.test(c)) return;
      if (!mapa.has(c)) mapa.set(c, { carpeta: c, publica: '', nombre: NOMBRES[c] || etiqueta });
    };
    for (const col of cfg.collections || []) {
      if (col.media_folder) anotar(col.media_folder, col.label);
      (function campos(lista) {
        for (const f of lista || []) {
          if (f.media_folder) anotar(f.media_folder, f.label);
          campos(f.fields);
          if (f.field) campos([f.field]);
        }
      })(col.fields);
    }
    // Ruta pública (/img/…): la carpeta sin «public»
    for (const m of mapa.values()) m.publica = `/${m.carpeta.replace(/^public\//, '')}`;
    // «General» (la carpeta de medios de todo el panel): solo sus archivos sueltos, no las subcarpetas
    return [{ carpeta: general, publica: `/${general.replace(/^public\//, '')}`, nombre: 'General' }, ...mapa.values(), { ...MANUALES }];
  }

  // Qué ficha usa cada archivo: se buscan las rutas /img/… en el texto de todas las fichas
  async function usos() {
    const L = await cargarLibrerias();
    const cols = L.cfg.collections || [];
    const enlaces = new Map(); // ruta pública → [{ titulo, href, seccion }]
    const anotar = (raw, ficha) => {
      for (const m of String(raw).matchAll(/\/img\/[^\s"'()<>\]\\]+/g)) {
        const r = m[0].replace(/[.,;:]+$/, '');
        if (!enlaces.has(r)) enlaces.set(r, []);
        const l = enlaces.get(r);
        if (!l.some(x => x.href === ficha.href)) l.push(ficha);
      }
    };
    const titulo = raw => (String(raw).match(/^title:\s*["']?(.*?)["']?\s*$/m) || [])[1] || '';
    const carpetas = [...new Set(cols.filter(c => c.folder).map(c => c.folder))];
    for (const carpeta of carpetas) {
      const candidatas = cols.filter(c => c.folder === carpeta);
      for (const f of await L.almacen.leerCarpeta(carpeta, 2)) {
        // Sección a la que pertenece (las del catálogo comparten carpeta y se distinguen por su filtro)
        const col = candidatas.filter(c => !c.hide).find(c => !c.filter || new RegExp(`^${c.filter.field}:\\s*["']?${c.filter.value}["']?\\s*$`, 'm').test(f.raw))
          || candidatas.find(c => !c.filter) || candidatas[0];
        const slug = f.ruta.slice(carpeta.replace(/\/+$/, '').length + 1).replace(/\.md$/, '');
        const fabricante = col.name === 'productos' ? ((String(f.raw).match(/^fabricante:\s*["']?([^"'\r\n]+?)["']?\s*$/m) || [])[1] || '') : '';
        anotar(f.raw, { titulo: titulo(f.raw) || slug, seccion: col.label, href: `#/collections/${col.name}/entries/${slug}`, fabricante });
      }
    }
    const ficheros = cols.flatMap(c => (c.files || []).map(f => ({ c, f })));
    const leidos = await L.almacen.leerFicheros(ficheros.map(x => x.f.file));
    for (const l of leidos) {
      const x = ficheros.find(y => y.f.file === l.ruta);
      anotar(l.raw, { titulo: x.f.label || x.f.name, seccion: x.c.label, href: `#/collections/${x.c.name}/entries/${x.f.name}` });
    }
    // Los que usa el propio código de la web (iconos, imagen al compartir por defecto…), según el último build
    try {
      const m = await (await fetch('/admin/medios.json', { cache: 'no-store' })).json();
      for (const r of m._codigo || []) anotar(r, { titulo: 'La propia web (iconos, imagen al compartir…)', seccion: 'código', href: '' });
      MINIATURAS = m._miniaturas || {};
    } catch { /* sin lista del build */ }
    return enlaces;
  }

  // ---------- Pestañas en la ventana de Decap ----------
  function revisar() {
    const ventana = document.querySelector('[class*="-StyledModal"]');
    if (!ventana || !ventana.querySelector('[class*="-LibraryTop"]')) {
      if (!ventana) { desdeCabecera = false; estado = null; }
      return;
    }
    if (ventana.querySelector('.xl-med-tabs')) { if (estado?.ventana === ventana && estado.carpeta !== null) ocultarDecap(); return; }
    if (!desdeCabecera) return;
    const tabs = document.createElement('div');
    tabs.className = 'xl-med-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.innerHTML = '<span class="xl-gris">Cargando carpetas…</span>';
    ventana.insertBefore(tabs, ventana.firstChild);
    ventana.style.display = 'flex';
    ventana.style.flexDirection = 'column';
    estado = { ventana, tabs, carpeta: null, cache: new Map() };
    carpetasDe().then(lista => {
      if (estado?.tabs !== tabs) return;
      estado.lista = lista;
      elegir(lista[0].carpeta);
      // Número de archivos de cada carpeta
      cargarLibrerias().then(L => Promise.all(lista.map(async c => {
        try { c.n = (await L.almacen.listarDetalle(c.carpeta)).length; } catch { c.n = null; }
      }))).then(() => { if (estado?.tabs === tabs) pintarTabs(); });
    }).catch(e => { tabs.innerHTML = `<span class="xl-err">No se han podido leer las carpetas: ${esc(e.message || e)}</span>`; });
  }
  function pintarTabs() {
    const { tabs, lista, carpeta } = estado;
    tabs.innerHTML = lista.map(c => `<button type="button" role="tab" aria-selected="${c.carpeta === carpeta}" class="${c.carpeta === carpeta ? 'xl-on' : ''}" data-c="${esc(c.carpeta)}">${esc(c.nombre)}${typeof c.n === 'number' ? `<small>${c.n}</small>` : ''}</button>`).join('');
    tabs.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => elegir(b.dataset.c)));
  }
  // Muestra la carpeta elegida (todas con esta vista; la de Decap queda escondida)
  function elegir(carpeta) {
    estado.carpeta = carpeta;
    pintarTabs();
    const { ventana } = estado;
    ventana.querySelector('.xl-med')?.remove();
    ocultarDecap();
    const info = estado.lista.find(c => c.carpeta === carpeta);
    const panel = document.createElement('div');
    panel.className = 'xl-med';
    ventana.appendChild(panel);
    montarCarpeta(panel, info).catch(e => { panel.innerHTML = `<div class="xl-med-msj xl-mal">No se ha podido leer la carpeta: ${esc(e.message || e)}</div>`; });
  }

  // Lo de Decap (buscar, botones y fotos) queda escondido; Decap puede pintarlo más tarde, por eso se repite
  function ocultarDecap() {
    const { ventana } = estado;
    const top = ventana.querySelector('[class*="-LibraryTop"]');
    const filas = top ? [...top.querySelectorAll(':scope > [class*="-RowContainer"]')] : [];
    [filas[1], filas[0]?.querySelector('[class*="-ButtonsContainer"]'), ventana.querySelector('[class*="-CardGridContainer"]')]
      .filter(el => el && !el.classList.contains('xl-oculto-med')).forEach(el => el.classList.add('xl-oculto-med'));
  }

  async function montarCarpeta(panel, info) {
    panel.innerHTML = '<div class="xl-med-msj">Leyendo los archivos y qué fichas los usan…</div>';
    const L = await cargarLibrerias();
    const [ficheros, enlaces] = await Promise.all([L.almacen.listarDetalle(info.carpeta), estado.usos || (estado.usos = usos())]);
    const v = { buscar: '', filtro: '', fab: '', verTodos: false, pag: 1, elegidos: new Set(), detalle: null, msj: null, conf: null };
    // Fabricantes de los productos que usan los archivos de esta carpeta (nombres del último despliegue)
    let nombresFab = {};
    try { nombresFab = (await (await fetch('/admin/datos-panel.json', { cache: 'no-store' })).json()).fabricantes || {}; } catch { /* sin nombres */ }
    const soloLectura = !!info.soloLectura;
    const USO_MANUAL = [{ titulo: 'Manual de uso (se abre y se descarga desde aquí)', seccion: 'manuales', href: '' }];
    let lista = ficheros.map(f => ({ ...f, ruta: `${info.publica}/${f.nombre}`, usos: soloLectura ? USO_MANUAL : enlaces.get(`${info.publica}/${f.nombre}`) || [] }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
    info.n = lista.length; pintarTabs();
    const repo = nombre => `${info.carpeta}/${nombre}`;

    const fabricantesCarpeta = [...new Set(lista.flatMap(f => f.usos.map(u => u.fabricante)).filter(Boolean))]
      .map(s => [s, nombresFab[s]?.nombre || s]).sort((a, b) => a[1].localeCompare(b[1], 'es'));
    // Con muchos archivos (p. ej. las 1145 fotos de productos) se elige antes qué ver
    const GRANDE = 150;
    const hayEleccion = () => v.verTodos || v.buscar || v.filtro || v.fab;
    const visibles = () => lista.filter(f => (!v.fab || f.usos.some(u => u.fabricante === v.fab))
      && (!v.filtro || (v.filtro === 'uso' ? f.usos.length : !f.usos.length))
      && (!v.buscar || sinTildes(`${f.nombre} ${f.usos.map(u => u.titulo).join(' ')}`).includes(sinTildes(v.buscar))));
    const miniatura = f => {
      if (!EXT_IMG.test(f.nombre)) return `<div class="xl-med-img">${esc((f.nombre.split('.').pop() || '').toUpperCase())}</div>`;
      const base = f.ruta.replace(/^\/img\//, '').replace(/\.[^.]+$/, '').replace(/[/\\]+/g, '-');
      const opt = /\.(jpe?g|png|webp)$/i.test(f.nombre) ? (MINIATURAS[f.ruta] || `/img/opt/${base}-480.webp`) : f.ruta;
      return `<div class="xl-med-img"><img loading="lazy" alt="" src="${esc(opt)}" data-original="${esc(f.ruta)}"></div>`;
    };

    const pintar = () => {
      const l = visibles();
      const total = Math.max(1, Math.ceil(l.length / POR_PAGINA));
      if (v.pag > total) v.pag = total;
      const ini = (v.pag - 1) * POR_PAGINA;
      const det = v.detalle && lista.find(f => f.nombre === v.detalle);
      panel.innerHTML = `
        <div class="xl-med-barra">
          <input type="search" placeholder="Buscar por nombre o por la ficha que lo usa" value="${esc(v.buscar)}" data-buscar aria-label="Buscar">
          ${fabricantesCarpeta.length ? `<select data-fab aria-label="Fabricante"><option value="">Todos los fabricantes</option>${fabricantesCarpeta.map(([s, n]) => `<option value="${esc(s)}" ${v.fab === s ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>` : ''}
          ${soloLectura ? '' : `<select data-filtro aria-label="Filtrar"><option value="">Todos</option><option value="uso" ${v.filtro === 'uso' ? 'selected' : ''}>En uso</option><option value="libre" ${v.filtro === 'libre' ? 'selected' : ''}>Sin usar</option></select>
          <button type="button" data-subir>Subir…</button>`}
          <button type="button" data-bajar ${v.elegidos.size ? '' : 'disabled'}>Descargar</button>
          ${soloLectura ? '' : `<button type="button" class="xl-rojo-b" data-borrar ${v.elegidos.size ? '' : 'disabled'}>Eliminar…</button>`}
          <input type="file" multiple hidden data-fichero>
        </div>
        ${soloLectura ? '<div class="xl-med-msj">Manuales de uso de la web y del panel. Pulsa uno y luego <b>«Abrir»</b> para leerlo o <b>«Descargar»</b> para guardarlo en tu ordenador.</div>' : L.almacen.listaAlDia ? '' : '<div class="xl-med-msj">En local, la lista es la del último «npm run build» (lo que subas o borres aquí se ve en tu carpeta al momento).</div>'}
        ${v.msj ? `<div class="xl-med-msj ${v.msj.clase || ''}">${v.msj.html}</div>` : ''}
        ${v.conf ? `<div class="xl-med-conf">${v.conf}</div>` : ''}
        ${lista.length > GRANDE && !hayEleccion() ? `<div class="xl-med-msj">Hay <b>${lista.length}</b> archivos en esta carpeta. Para ir más rápido, elige un fabricante, busca por nombre o por la ficha, o filtra «Sin usar»; o <a href="#" data-ver-todos>ver todos</a>.</div>` : `<div class="xl-med-rejilla">${l.slice(ini, ini + POR_PAGINA).map(f => `
          <div class="xl-med-f ${v.elegidos.has(f.nombre) ? 'xl-on' : ''}" data-n="${esc(f.nombre)}" title="${esc(f.nombre)}">
            <input type="checkbox" ${v.elegidos.has(f.nombre) ? 'checked' : ''} aria-label="Elegir ${esc(f.nombre)}">
            ${miniatura(f)}<b>${esc(f.nombre)}</b>
            <span class="xl-med-p ${f.usos.length ? 'xl-uso' : 'xl-libre'}">${soloLectura ? 'Manual' : f.usos.length ? 'En uso' : 'Sin usar'}</span> <small class="xl-gris">${tam(f.bytes)}</small>
          </div>`).join('') || '<p class="xl-gris">No hay archivos. «Subir…» los guarda en esta carpeta.</p>'}</div>`}
        ${det ? `<div class="xl-med-det"><b>${esc(det.nombre)}</b> · ${esc(tam(det.bytes))} · ${soloLectura ? '' : `<code>${esc(det.ruta)}</code>`}<br>
          ${soloLectura ? '' : det.usos.length ? `Lo usa: ${det.usos.map(u => `${u.href ? `<a href="${esc(u.href)}" data-ir>${esc(u.titulo)}</a>` : esc(u.titulo)} <span class="xl-gris">(${esc(u.seccion)})</span>`).join(', ')}` : 'No lo usa ninguna ficha publicada: se puede eliminar.'}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${soloLectura && /\.pdf$/i.test(det.nombre) ? '<button type="button" data-uno-abrir>Abrir</button>' : ''}<button type="button" data-uno-bajar>Descargar</button>${soloLectura ? '' : '<button type="button" data-reemplazar>Reemplazar…</button><button type="button" data-copiar>Copiar ruta</button><input type="file" hidden data-fichero-uno>'}</div></div>` : ''}
        <div class="xl-med-pie"><span>Mostrando ${l.length ? ini + 1 : 0}–${Math.min(ini + POR_PAGINA, l.length)} de ${l.length} · ${v.elegidos.size} elegidos${l.length ? ` · <a href="#" data-todos>${l.every(f => v.elegidos.has(f.nombre)) ? 'Quitar la selección' : 'Elegir todos los de la lista'}</a>` : ''}</span><span>${paginas(v.pag, total)}</span></div>`;
      enlazar(l);
    };
    const enlazar = l => {
      panel.querySelectorAll('.xl-med-img img').forEach(img => img.addEventListener('error', () => {
        if (img.dataset.original && !img.src.endsWith(img.dataset.original)) img.src = img.dataset.original;
        else img.replaceWith(Object.assign(document.createElement('span'), { textContent: (img.dataset.original.split('.').pop() || '').toUpperCase() }));
      }));
      const b = panel.querySelector('[data-buscar]');
      b.addEventListener('input', () => { const pos = b.selectionStart; v.buscar = b.value; v.pag = 1; pintar(); const n = panel.querySelector('[data-buscar]'); n.focus(); n.setSelectionRange(pos, pos); });
      panel.querySelector('[data-filtro]')?.addEventListener('change', e => { v.filtro = e.target.value; v.pag = 1; pintar(); });
      panel.querySelector('[data-fab]')?.addEventListener('change', e => { v.fab = e.target.value; v.pag = 1; pintar(); });
      panel.querySelector('[data-ver-todos]')?.addEventListener('click', e => { e.preventDefault(); v.verTodos = true; pintar(); });
      panel.querySelectorAll('.xl-med-f').forEach(c => c.addEventListener('click', e => {
        const n = c.dataset.n;
        if (e.target.type === 'checkbox') { e.target.checked ? v.elegidos.add(n) : v.elegidos.delete(n); }
        else v.detalle = v.detalle === n ? null : n;
        pintar();
      }));
      panel.querySelector('[data-todos]')?.addEventListener('click', e => {
        e.preventDefault();
        const todos = l.every(f => v.elegidos.has(f.nombre));
        l.forEach(f => (todos ? v.elegidos.delete(f.nombre) : v.elegidos.add(f.nombre)));
        pintar();
      });
      panel.querySelectorAll('[data-p]').forEach(x => x.addEventListener('click', () => { v.pag = Number(x.dataset.p); pintar(); }));
      panel.querySelectorAll('[data-ir]').forEach(a => a.addEventListener('click', () => {
        // Cierra la ventana de Medios al ir a la ficha
        document.querySelector('[class*="-StyledModal"] [class*="-CloseButton"]')?.click();
      }));
      // Subir
      const input = panel.querySelector('[data-fichero]');
      panel.querySelector('[data-subir]')?.addEventListener('click', () => input.click());
      input?.addEventListener('change', () => subir([...input.files]));
      // Descargar (una: tal cual; varias: en un ZIP)
      panel.querySelector('[data-bajar]').addEventListener('click', () => bajar([...v.elegidos]));
      panel.querySelector('[data-uno-bajar]')?.addEventListener('click', () => bajar([v.detalle]));
      // Abrir un PDF en otra pestaña (la ventana se abre ya, para que el navegador no la bloquee)
      panel.querySelector('[data-uno-abrir]')?.addEventListener('click', async () => {
        const w = window.open('', '_blank');
        try {
          const bytes = await L.almacen.leerBinario(repo(v.detalle));
          const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
          if (w) w.location.href = url; else window.open(url, '_blank');
        } catch (e) { w?.close(); v.msj = { html: `No se ha podido abrir: ${esc(e.message || e)}`, clase: 'xl-mal' }; pintar(); }
      });
      panel.querySelector('[data-copiar]')?.addEventListener('click', async () => {
        const f = lista.find(x => x.nombre === v.detalle);
        try { await navigator.clipboard.writeText(f.ruta); v.msj = { html: `Copiada la ruta <code>${esc(f.ruta)}</code>.`, clase: 'xl-bien' }; } catch { v.msj = { html: `Ruta: <code>${esc(f.ruta)}</code>` }; }
        pintar();
      });
      const uno = panel.querySelector('[data-fichero-uno]');
      panel.querySelector('[data-reemplazar]')?.addEventListener('click', () => uno.click());
      uno?.addEventListener('change', () => { if (uno.files[0]) subir([uno.files[0]], v.detalle); });
      // Eliminar: primero se confirma
      panel.querySelector('[data-borrar]')?.addEventListener('click', () => {
        const el = lista.filter(f => v.elegidos.has(f.nombre));
        const libres = el.filter(f => !f.usos.length);
        const usados = el.filter(f => f.usos.length);
        v.conf = `${libres.length ? `<p>Se eliminarán <b>${libres.length}</b> ${libres.length === 1 ? 'archivo' : 'archivos'} sin usar de <code>${esc(info.publica)}</code>, en un único cambio${L.almacen.tipo === 'github' ? ` en ${esc(L.almacen.descripcion)}` : ' en tu copia local'}. No se puede deshacer desde el panel.</p>` : ''}
          ${usados.length ? `<p class="xl-av">No se ${usados.length === 1 ? 'eliminará' : 'eliminarán'} ${usados.length} porque ${usados.length === 1 ? 'la usa' : 'las usan'} alguna ficha (quítalas antes de la ficha): ${usados.slice(0, 8).map(f => `${esc(f.nombre)} → ${f.usos.map(u => esc(u.titulo)).join(', ')}`).join('; ')}${usados.length > 8 ? '…' : ''}</p>` : ''}
          <p class="xl-gris">Las fichas en borrador que todavía no se han publicado no se revisan: si alguna usa estos archivos, se quedará sin ellos.</p>
          <div style="display:flex;gap:6px;justify-content:flex-end"><button type="button" data-no>Cancelar</button>${libres.length ? `<button type="button" class="xl-rojo-b" data-si>Eliminar ${libres.length}</button>` : ''}</div>`;
        pintar();
        panel.querySelector('[data-no]').addEventListener('click', () => { v.conf = null; pintar(); });
        panel.querySelector('[data-si]')?.addEventListener('click', () => borrar(libres));
      });
    };
    const paginas = (pag, total) => {
      if (total <= 1) return '';
      const n = [];
      for (let i = 1; i <= total; i++) if (i === 1 || i === total || Math.abs(i - pag) <= 2) n.push(i); else if (n.at(-1) !== '…') n.push('…');
      return n.map(x => (x === '…' ? '<span>…</span>' : `<button type="button" class="${x === pag ? 'xl-on' : ''}" data-p="${x}">${x}</button>`)).join(' ');
    };
    const trabajando = texto => { v.msj = { html: esc(texto) }; v.conf = null; pintar(); panel.querySelectorAll('button').forEach(b => { b.disabled = true; }); };

    async function subir(archivos, reemplazar = null) {
      if (!archivos.length) return;
      const nuevos = archivos.map(f => ({ f, nombre: reemplazar || nombreImagen(f.name) }));
      const existen = nuevos.filter(x => !reemplazar && lista.some(f => f.nombre === x.nombre));
      if (existen.length && !window.confirm(`Ya ${existen.length === 1 ? 'existe' : 'existen'} en esta carpeta: ${existen.map(x => x.nombre).join(', ')}.\n\n¿Reemplazarlos por los nuevos? (Cancelar: no se sube nada)`)) return;
      try {
        trabajando('Preparando los archivos…');
        const escribir = [];
        for (const x of nuevos) {
          let bytes = new Uint8Array(await x.f.arrayBuffer());
          if (/\.(jpe?g|png|webp)$/i.test(x.nombre)) bytes = await reducirImagen(bytes, x.nombre);
          escribir.push({ ruta: repo(x.nombre), bytes });
        }
        // Peso máximo de cada archivo (Ajustes del sitio → Panel; por defecto 8 MB)
        const maxMb = Number(globalThis.XL_PANEL?.peso_maximo_mb) || 8;
        const grandes = escribir.filter(e => e.bytes.length > maxMb * 1000 * 1000);
        if (grandes.length) throw new Error(`pesan más de ${maxMb} MB: ${grandes.map(e => e.ruta.split('/').pop()).join(', ')}. Redúcelos antes de subirlos`);
        const res = await L.almacen.guardar({ escribir, mensaje: `Medios: ${reemplazar ? `reemplazar ${reemplazar}` : `subir ${escribir.length} ${escribir.length === 1 ? 'archivo' : 'archivos'}`} en ${info.publica}` }, t => trabajando(t));
        for (const e of escribir) {
          const nombre = e.ruta.split('/').pop();
          const viejo = lista.find(f => f.nombre === nombre);
          if (viejo) viejo.bytes = e.bytes.length;
          else lista.push({ nombre, bytes: e.bytes.length, ruta: `${info.publica}/${nombre}`, usos: enlaces.get(`${info.publica}/${nombre}`) || [] });
        }
        lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
        info.n = lista.length; pintarTabs();
        v.msj = { html: `Hecho: ${escribir.map(e => esc(e.ruta.split('/').pop())).join(', ')}.${res?.url ? ` <a href="${esc(res.url)}" target="_blank" rel="noopener">Ver el cambio</a>.` : ''} La miniatura sale tras el siguiente despliegue.`, clase: 'xl-bien' };
      } catch (e) {
        console.error(e);
        v.msj = { html: `No se ha podido subir: ${esc(e.message || e)}`, clase: 'xl-mal' };
      }
      pintar();
    }
    async function bajar(nombres) {
      if (!nombres.length) return;
      try {
        trabajando(`Descargando ${nombres.length === 1 ? nombres[0] : `${nombres.length} archivos`}…`);
        if (nombres.length === 1) {
          descargar(await L.almacen.leerBinario(repo(nombres[0])), nombres[0], 'application/octet-stream');
        } else {
          const zip = new L.JSZip();
          let i = 0;
          for (const n of nombres) { trabajando(`Descargando ${++i}/${nombres.length}…`); zip.file(n, await L.almacen.leerBinario(repo(n))); }
          descargar(await zip.generateAsync({ type: 'uint8array' }), `${info.carpeta.split('/').pop()}.zip`, 'application/zip');
        }
        v.msj = null;
      } catch (e) {
        console.error(e);
        v.msj = { html: `No se ha podido descargar: ${esc(e.message || e)}`, clase: 'xl-mal' };
      }
      pintar();
    }
    async function borrar(libres) {
      try {
        trabajando(`Eliminando ${libres.length} archivos…`);
        const res = await L.almacen.guardar({ borrar: libres.map(f => repo(f.nombre)), mensaje: `Medios: eliminar ${libres.length} ${libres.length === 1 ? 'archivo sin usar' : 'archivos sin usar'} de ${info.publica}` }, t => trabajando(t));
        const fuera = new Set(libres.map(f => f.nombre));
        lista = lista.filter(f => !fuera.has(f.nombre));
        fuera.forEach(n => v.elegidos.delete(n));
        if (fuera.has(v.detalle)) v.detalle = null;
        info.n = lista.length; pintarTabs();
        v.msj = { html: `Eliminados ${libres.length}.${res?.url ? ` <a href="${esc(res.url)}" target="_blank" rel="noopener">Ver el cambio</a>.` : ''}`, clase: 'xl-bien' };
      } catch (e) {
        console.error(e);
        v.msj = { html: `No se ha podido eliminar: ${esc(e.message || e)}`, clase: 'xl-mal' };
      }
      v.conf = null;
      pintar();
    }
    pintar();
  }

  return revisar;
}
