/*
  «Eliminar entrada» dentro de una ficha del panel (prototipo aprobado por Víctor el 19-11-2026).

  El botón de Decap borra solo el fichero de la ficha: no mira qué otras fichas dependen de ella (un
  accesorio que la tiene en «Compatible con», los productos de un fabricante o de una categoría…) y
  deja sus fotos en el repositorio. Decap no ofrece ningún evento antes de borrar, así que se
  intercepta el clic en el botón (fase de captura, antes que React) en las secciones con engranaje
  (PERFILES en nucleo.js) y se usa lo mismo que «Eliminar…» del engranaje (planificarAccion):
  - Si algo impide borrarla (fabricante o categoría con productos, categoría con subcategorías, página
    enlazada desde el menú…), se explica qué hay que mover antes y no se borra nada.
  - Si no, se enseña qué se hará: accesorios de los que se quita (y cuántas máquinas les quedan), fotos que
    se borran o se quedan, y «Orden del catálogo en el menú». Todo se guarda en un único cambio.
  Solo se intercepta «Eliminar entrada publicada» (o «Eliminar entrada» sin flujo editorial); «Eliminar
  cambios no publicados» y «Eliminar entrada no publicada» siguen siendo de Decap (no borran nada publicado).
  Al actualizar Decap, comprobar que los textos de los botones siguen siendo estos (scripts/actualizar-decap.js).
*/
import { PERFILES, ficherosDe, planificarAccion, hayCambios } from './nucleo.js';

const BOTONES = ['Eliminar entrada publicada', 'Eliminar entrada'];
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lista = v => (Array.isArray(v) ? v : v ? [v] : []).map(String);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const nombreFich = r => String(r).split('/').pop();
const enlace = (col, slug) => `#/collections/${col}/entries/${String(slug).split('/').map(encodeURIComponent).join('/')}`;
const MAX_LISTA = 8; // productos que se enseñan antes de «… y N más»

const css = `
.xl-caja{border-radius:6px;padding:10px 12px;margin:10px 0}
.xl-caja.xl-c-av{background:#fdf1dc;color:#7a4700}
.xl-caja.xl-c-err{background:#fde8e8;color:#8f1d1d}
.xl-caja.xl-c-ok{background:#e9f6ec;color:#1f6b31}
.xl-modal .xl-fila a{color:var(--xl-acento,#3a69c7)}
`;

export function crearEliminar({ preparar, leerActuales, leerContexto, leerMedios, modal, esperar, mostrarError, abrirEnLista }) {
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  document.addEventListener('click', e => {
    const boton = e.target.closest?.('button');
    if (!boton || !BOTONES.includes(boton.textContent.trim())) return;
    const m = location.hash.match(/^#\/collections\/([^/?]+)\/entries\/([^?]+)/);
    if (!m || !PERFILES[m[1]]) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    eliminar(m[1], decodeURIComponent(m[2].split('/').pop()));
  }, true);

  async function eliminar(nombre, slug) {
    const v = modal('');
    try {
      esperar(v, 'Mirando qué fichas dependen de esta…');
      const x = await preparar(nombre);
      const [actuales, ctx] = await Promise.all([leerActuales(x), leerContexto(x, { textos: true })]);
      const a = actuales.find(f => f.slug === slug);
      if (!a) throw new Error(`No encuentro la ficha «${slug}» en ${x.almacen.descripcion}. Recarga el panel y vuelve a intentarlo.`);
      const titulo = x.perfil.nombre(a.datos) || slug;
      const motivo = x.perfil.motivoNoBorrar ? x.perfil.motivoNoBorrar(slug, ctx, new Set([slug])) : '';
      if (motivo) return bloqueado(v, x, ctx, a, titulo, motivo);
      const fotos = ficherosDe(x.columnas, a.datos);
      const medios = await leerMedios(x, new Set(fotos.map(f => nombreFich(f.ruta))));
      const plan = await planificarAccion({ YAML: x.YAML, col: x.col, perfil: x.perfil, columnas: x.columnas, actuales, slugs: [slug], accion: 'borrar', ctx });
      if (plan.errores.length) throw new Error(plan.errores.map(er => er.texto).join(' '));
      confirmar(v, x, ctx, a, titulo, fotos, medios, plan);
    } catch (er) { mostrarError(v, er, 'No se ha podido preparar el borrado'); }
  }

  // Un fabricante, tipo, categoría o subcategoría con productos (o con hijas), o una página enlazada: no se borra
  function bloqueado(v, x, ctx, a, titulo, motivo) {
    const nombre = x.col.name;
    const slug = a.slug;
    let prods = [];
    let hijas = [];
    let explica = '';
    if (nombre === 'fabricantes') {
      prods = ctx.productosPorFabricante.get(slug) || [];
      explica = `Hay <b>${plural(prods.length, 'producto', 'productos')}</b> de este fabricante. Si se borrara, se quedarían sin fabricante.`;
    } else if (x.perfil.nivel && ctx.catalogo) {
      const cat = ctx.catalogo;
      prods = [...new Set(todosLosProductos(cat, slug))];
      hijas = cat.hijas(slug);
      const de = { tipo: 'este tipo de producto', categoria: 'esta categoría', subcategoria: 'esta subcategoría' }[x.perfil.nivel];
      const partes = [];
      if (prods.length) partes.push(`<b>${plural(prods.length, 'producto', 'productos')}</b>`);
      if (hijas.length) partes.push(`<b>${plural(hijas.length, x.perfil.nivel === 'tipo' ? 'categoría' : 'subcategoría', x.perfil.nivel === 'tipo' ? 'categorías' : 'subcategorías')}</b>`);
      explica = `De ${de} dependen ${partes.join(' y ')}. Si se borrara, se quedarían sin sitio en el catálogo.`;
    } else explica = esc(motivo.charAt(0).toUpperCase() + motivo.slice(1));
    const filaProd = s => {
      const p = ctx.porSlugProducto.get(s);
      return `<div class="xl-fila"><span><a href="${esc(enlace('productos', s))}" data-ir>${esc(p?.datos.title || s)}</a></span><span>${esc(s)}</span></div>`;
    };
    const seccionHijas = { tipo: 'categorias', categoria: 'subcategorias' }[x.perfil.nivel];
    v.poner(`<h2>No se puede eliminar «${esc(titulo)}»</h2>
      <div class="xl-caja xl-c-err">${explica}</div>
      ${hijas.length ? `<div class="xl-sec">${x.perfil.nivel === 'tipo' ? 'Categorías' : 'Subcategorías'}</div>${hijas.map(h => `<div class="xl-fila"><span><a href="${esc(enlace(seccionHijas, h))}" data-ir>${esc(ctx.catalogo.etiqueta(h) || h)}</a></span><span>${esc(h)}</span></div>`).join('')}` : ''}
      ${prods.length ? `<div class="xl-sec">Productos${{ tipo: ' (con los de sus categorías y subcategorías)', categoria: ' (con los de sus subcategorías)' }[x.perfil.nivel] || ''}</div>${prods.slice(0, MAX_LISTA).map(filaProd).join('')}${prods.length > MAX_LISTA ? `<div class="xl-fila"><span class="xl-gris">… y ${prods.length - MAX_LISTA} más</span><span></span></div>` : ''}` : ''}
      ${x.perfil.quitarDelOrden ? '<div class="xl-fila"><span>Orden del catálogo en el menú</span><span>se quitaría al eliminar</span></div>' : ''}
      <p>${nombre === 'fabricantes' ? 'Cámbialos de fabricante o elimínalos antes (en bloque, desde el engranaje de Productos) y vuelve a intentarlo.'
        : x.perfil.nivel ? `${prods.length ? 'Pasa esos productos a otra categoría (o elimínalos)' : ''}${prods.length && hijas.length ? ' y ' : ''}${hijas.length ? `elimina antes ${hijas.length === 1 ? 'esa' : 'esas'} ${x.perfil.nivel === 'tipo' ? (hijas.length === 1 ? 'categoría' : 'categorías') : (hijas.length === 1 ? 'subcategoría' : 'subcategorías')}` : ''}; después, vuelve a intentarlo.`
        : 'Arréglalo y vuelve a intentarlo.'}</p>
      <div class="xl-pie"><button class="xl-b xl-izq" data-x>Cerrar</button>${prods.length && abrirEnLista ? `<button class="xl-b xl-pri" data-lista>Ver ${prods.length === 1 ? 'el producto' : `los ${prods.length} productos`} en la lista</button>` : ''}</div>`);
    v.q('[data-x]').onclick = v.cerrar;
    v.m.querySelectorAll('[data-ir]').forEach(l => { l.onclick = () => v.cerrar(); });
    const bl = v.q('[data-lista]');
    if (bl) bl.onclick = () => { v.cerrar(); abrirEnLista(nombre, slug, String(a.datos.title || slug)); };
  }

  // Lo que se hará al borrarla, y el botón para hacerlo (todo en un único cambio)
  function confirmar(v, x, ctx, a, titulo, fotos, medios, plan) {
    const slug = a.slug;
    // Accesorios que la tienen en «Compatible con»: cuántas máquinas les quedan
    const accesorios = (ctx.accesoriosDe?.get(slug) || []).filter(s => s !== slug).map(s => {
      const p = ctx.porSlugProducto.get(s);
      const quedan = lista(p?.datos.compatible_con).filter(c => c !== slug && ctx.porSlugProducto.has(c)).length;
      return { slug: s, nombre: String(p?.datos.title || s), quedan };
    });
    const sinMaquinas = accesorios.filter(c => !c.quedan).length;
    // Fotos y ficheros: los que se borran y los que se quedan porque los usa otra ficha
    const existe = r => [...medios].some(([carpeta, mm]) => r.startsWith(carpeta + '/') && mm.has(r.slice(carpeta.length + 1)));
    const seBorran = fotos.filter(f => plan.borrar.includes(f.repo) && existe(f.repo)).map(f => nombreFich(f.ruta));
    const seQuedan = fotos.filter(f => !plan.borrar.includes(f.repo)).map(f => nombreFich(f.ruta));
    const delOrden = plan.borrados[0]?.arrastra.some(t => t.includes('Orden del catálogo'));
    const masCambios = plan.escribir.length > 0; // además de borrar: accesorios u orden del menú
    const nAcc = accesorios.length;
    const filasFotos = (nombres, estado) => (nombres.length ? `<div class="xl-fila"><span>${esc(nombres.length > 3 ? `${nombres[0]} … ${nombres[nombres.length - 1]}` : nombres.join(', '))}</span><span>${estado(nombres.length)}</span></div>` : '');
    const conf = [nAcc ? `se quitará de «Compatible con» de ${plural(nAcc, 'accesorio', 'accesorios')}` : '', delOrden ? 'se quitará de «Orden del catálogo en el menú»' : ''].filter(Boolean).join(' y ');
    v.poner(`<h2>Eliminar «${esc(titulo)}»</h2>
      ${masCambios ? '<p class="xl-gris">Antes de borrar he mirado qué fichas dependen de esta. Se hará todo en un único cambio.</p>' : '<div class="xl-caja xl-c-ok">✓ Ninguna otra ficha depende de esta.</div>'}
      ${nAcc ? `<div class="xl-sec">Accesorios que la tienen en «Compatible con»</div>${accesorios.map(c => `<div class="xl-fila"><span><a href="${esc(enlace('productos', c.slug))}" data-ir>${esc(c.nombre)}</a> <span class="xl-gris">· ${esc(c.slug)}</span></span><span>se quita · ${c.quedan ? `le ${c.quedan === 1 ? 'queda' : 'quedan'} ${plural(c.quedan, 'máquina', 'máquinas')}` : '<b class="xl-av">se queda sin máquinas</b>'}</span></div>`).join('')}` : ''}
      ${sinMaquinas ? `<div class="xl-caja xl-c-av">⚠ ${sinMaquinas === 1 ? '1 accesorio se quedará' : `${sinMaquinas} accesorios se quedarán`} sin ninguna máquina compatible. Seguirá${sinMaquinas === 1 ? '' : 'n'} en la web; si ya no tiene sentido, márcalo «No disponible» o elimínalo después.</div>` : ''}
      ${seBorran.length || seQuedan.length ? `${masCambios ? '<div class="xl-sec">Fotos y ficheros</div>' : ''}${filasFotos(seBorran, n => (n === 1 ? 'se borra (no la usa otra ficha)' : 'se borran (no las usa otra ficha)'))}${filasFotos(seQuedan, n => (n === 1 ? 'se queda (la usa otra ficha)' : 'se quedan (las usa otra ficha)'))}` : ''}
      ${x.perfil.quitarDelOrden ? `<div class="xl-sec">Orden del catálogo en el menú</div><div class="xl-fila"><span class="xl-gris">${delOrden ? 'Aparece' : 'No aparece'}</span><span>${delOrden ? 'se quita' : 'nada que cambiar'}</span></div>` : ''}
      ${masCambios ? `<label style="display:flex;gap:8px;margin-top:14px"><input type="checkbox" data-conf> Entiendo que se borrará la ficha y ${esc(conf)}</label>` : ''}
      <p class="xl-err" data-err></p>
      <div class="xl-pie"><button class="xl-b" data-x>Cancelar</button><button class="xl-b xl-peligro" data-ok>${nAcc ? `Eliminar y quitar ${nAcc === 1 ? 'del accesorio' : 'de los accesorios'}` : 'Eliminar'}</button></div>`);
    v.q('[data-x]').onclick = v.cerrar;
    v.m.querySelectorAll('[data-ir]').forEach(l => { l.onclick = () => v.cerrar(); });
    const casilla = v.q('[data-conf]');
    if (casilla) casilla.onchange = () => { v.q('[data-err]').textContent = ''; };
    v.q('[data-ok]').onclick = async () => {
      if (casilla && !casilla.checked) { v.q('[data-err]').textContent = 'Marca la casilla para confirmar.'; return; }
      if (!hayCambios(plan)) { v.cerrar(); return; }
      try {
        // Solo se borran fotos que existen de verdad (la ficha, siempre)
        const borrar = plan.borrar.filter(r => r.endsWith('.md') || existe(r));
        const extra = [nAcc ? `se quita de «Compatible con» de ${plural(nAcc, 'accesorio', 'accesorios')}` : '', delOrden ? 'se quita del orden del menú' : ''].filter(Boolean).join(' y ');
        const mensaje = `Panel: eliminar ${x.perfil.uno} «${titulo}»${extra ? ` (${extra})` : ''}`;
        esperar(v, 'Guardando…');
        const r = await x.almacen.guardar({ escribir: plan.escribir, borrar, mensaje }, t => esperar(v, t + '…'));
        const destino = `${location.pathname}${location.search}#/collections/${x.col.name}`;
        v.poner(`<h2 class="xl-ok">Eliminado</h2>
          <p>«${esc(titulo)}»${extra ? `, y ${esc(extra)}` : ''}, en un solo cambio de ${esc(x.almacen.descripcion)}.</p>
          ${r.url ? `<p><a href="${esc(r.url)}" target="_blank" rel="noopener">Ver el cambio en GitHub</a> (si hace falta deshacerlo, se revierte ese commit).</p>` : ''}
          <p class="xl-gris">${x.almacen.tipo === 'github' ? 'La web se actualizará en unos minutos, con el próximo despliegue.' : 'Revisa los cambios en Sourcetree antes de hacer el commit.'}</p>
          <div class="xl-pie"><button class="xl-b xl-pri" data-volver>Volver a la lista</button></div>`);
        // Se recarga el panel: Decap aún tiene la ficha en memoria
        v.q('[data-volver]').onclick = () => { location.replace(destino); location.reload(); };
      } catch (er) { mostrarError(v, er, 'No se ha podido guardar'); }
    };
  }
}

// Productos de una categoría y de todo lo que cuelga de ella
function todosLosProductos(cat, slug) {
  const out = [...cat.productosDirectos(slug)];
  for (const h of cat.hijas(slug)) out.push(...todosLosProductos(cat, h));
  return out;
}
