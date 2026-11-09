/*
  Buscador (Pagefind; el índice lo crea el build en /pagefind/). Va en un fichero aparte porque la
  política de seguridad de la web no permite scripts escritos dentro del HTML.
  - En /buscar/?q=…: resumen («9 resultados para…»), categorías que coinciden en píldoras con su
    número de productos, productos con las tarjetas y la barra de filtros del catálogo (el build
    deja todas las tarjetas; aquí se quedan solo las encontradas, por relevancia, y se avisa a
    public/js/catalogo.js con el evento «rejilla:lista») y el bloque «En el blog y otras páginas».
    Sin resultados o sin nada escrito: sugerencias, «Pregúntanos» y los tipos de producto.
  - Las sugerencias mientras se escribe en la caja de la cabecera están en public/js/extras.js.
*/
(function () {
  const pagina = document.querySelector('[data-busqueda]');
  if (!pagina) return;
  const $ = sel => pagina.querySelector(sel);
  const q = (new URLSearchParams(location.search).get('q') || '').trim();
  const resumen = $('[data-busqueda-resumen]');
  const vacio = $('[data-busqueda-vacio]');
  const entrada = $('[data-busqueda-q]');
  entrada.value = q;
  const cabecera = document.getElementById('buscar-cabecera');
  if (cabecera) cabecera.value = q;

  const limpia = u => { try { u = new URL(u, location.origin).pathname; } catch (e) { /* ruta relativa */ } return u.replace(/index\.html$/, '').replace(/\/+$/, '') || '/'; };
  const texto = t => { const s = document.createElement('span'); s.textContent = t; return s.innerHTML; };
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

  function mostrarVacio(sinResultados) {
    vacio.hidden = false;
    vacio.querySelector('[data-busqueda-vacio-titulo]').textContent = sinResultados ? `No hemos encontrado nada con «${q}»` : '¿Qué estás buscando?';
    vacio.querySelectorAll('[data-busqueda-solo-sin-resultados]').forEach(el => { el.hidden = !sinResultados; });
  }

  if (!q) {
    resumen.textContent = 'Escribe lo que buscas: una máquina, un accesorio, un fabricante o un modelo.';
    mostrarVacio(false);
    entrada.focus();
    return;
  }
  document.title = `«${q}» · ${document.title}`;
  resumen.textContent = 'Buscando…';

  // Productos: deja solo las tarjetas encontradas, en orden de relevancia, y ajusta los filtros
  function pintarProductos(urls) {
    const bloque = $('[data-busqueda-productos]');
    const rejilla = bloque && bloque.querySelector('[data-rejilla]');
    if (!rejilla) return 0;
    const caja = rejilla.querySelector('[data-rejilla-items]');
    const tarjetas = new Map();
    caja.querySelectorAll('[data-producto]').forEach(el => {
      const a = el.querySelector('a[href]');
      if (a) tarjetas.set(limpia(a.getAttribute('href')), el);
      el.remove();
    });
    const lista = urls.map(u => tarjetas.get(u)).filter(Boolean);
    lista.forEach(el => { el.hidden = false; caja.appendChild(el); });
    if (lista.length) ajustarFiltros(rejilla, lista);
    bloque.hidden = !lista.length;
    rejilla.dataset.lista = '';
    rejilla.dispatchEvent(new Event('rejilla:lista'));
    return lista.length;
  }
  function ajustarFiltros(rejilla, lista) {
    const filtro = rejilla.querySelector('[data-rejilla-filtro]');
    if (!filtro) return;
    const fabs = new Set(lista.map(el => el.dataset.fabricante).filter(Boolean));
    const botones = [...filtro.querySelectorAll('[data-filtro-fabricante]')];
    botones.forEach(b => { b.hidden = !fabs.has(b.dataset.filtroFabricante); });
    const abrirFab = filtro.querySelector('[data-filtro-abrir]');
    if (abrirFab) {
      abrirFab.hidden = fabs.size < 2;
      const n = abrirFab.querySelector('.filtros-num');
      if (n) n.textContent = `(${fabs.size})`;
    }
    const segunda = filtro.querySelector('[data-filtro-segunda]');
    if (segunda) segunda.hidden = !lista.some(el => 'segundaMano' in el.dataset) || lista.every(el => 'segundaMano' in el.dataset);
    const oferta = filtro.querySelector('[data-filtro-oferta]');
    if (oferta) {
      const n = lista.filter(el => 'oferta' in el.dataset).length;
      oferta.hidden = !n || n === lista.length;
      const num = oferta.querySelector('.filtros-num');
      if (num) num.textContent = `(${n})`;
    }
    // Precio: entre el mínimo y el máximo de lo encontrado; los rangos rápidos que no dejan nada, fuera
    const panel = filtro.querySelector('[data-panel-precio]');
    const precios = lista.map(el => parseFloat(el.dataset.precio)).filter(Number.isFinite);
    const botonPrecio = filtro.querySelector('[data-boton-precio]');
    if (panel && botonPrecio) {
      if (new Set(precios).size < 2) { botonPrecio.hidden = true; return; }
      const lo = panel.querySelector('[data-precio-lo]'), hi = panel.querySelector('[data-precio-hi]');
      const paso = parseFloat(lo.step) || 1;
      const min = Math.floor(Math.min(...precios) / paso) * paso, max = Math.ceil(Math.max(...precios) / paso) * paso;
      panel.dataset.precioMin = min; panel.dataset.precioMax = max;
      [lo, hi].forEach(i => { i.min = min; i.max = max; });
      lo.value = min; hi.value = max;
      panel.querySelectorAll('[data-desde]').forEach(r => {
        const a = r.dataset.desde ? parseFloat(r.dataset.desde) : -Infinity, b = r.dataset.hasta ? parseFloat(r.dataset.hasta) : Infinity;
        r.hidden = !precios.some(v => v >= a && v <= b);
      });
      const hasta = panel.querySelector('[data-precio-hasta]');
      if (hasta) hasta.placeholder = max;
    }
  }

  // Categorías: las que tienen la palabra buscada en el nombre (si no hay ninguna, las 3 más
  // relevantes), primero las que tienen productos; 6 a la vista y «+ N más»
  const normal = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const palabras = normal(q).split(/[^a-z0-9ñ]+/).filter(p => p.length > 1);
  const enNombre = c => palabras.some(p => normal(c.meta.title).includes(p.length > 4 ? p.slice(0, -1) : p));
  function elegirCategorias(cats) {
    const porNombre = cats.filter(enNombre);
    const lista = porNombre.length ? porNombre : cats.slice(0, 3);
    const n = c => parseInt(c.meta.productos, 10) || 0;
    return lista.map((c, i) => ({ c, i })).sort((a, b) => (n(b.c) > 0) - (n(a.c) > 0) || a.i - b.i).map(x => x.c);
  }
  const MAX_CATS = 6;
  function pintarCategorias(cats) {
    const caja = $('[data-busqueda-cats]');
    if (!cats.length) return;
    caja.innerHTML = '<span class="busqueda-cats-titulo">Categorías</span>' + cats.map((c, i) => {
      const n = parseInt(c.meta.productos, 10) || 0;
      return `<a class="busqueda-cat" href="${texto(c.url)}"${i >= MAX_CATS ? ' hidden' : ''}><span>${texto(c.meta.title || '')}${c.meta.ruta ? ` <small>· ${texto(c.meta.ruta)}</small>` : ''}</span><span class="insignia-menu${n ? '' : ' vacia'}">${n}<span class="visually-hidden"> ${n === 1 ? 'producto' : 'productos'}</span></span></a>`;
    }).join('') + (cats.length > MAX_CATS ? `<button type="button" class="busqueda-cats-mas">+ ${cats.length - MAX_CATS} más</button>` : '');
    caja.querySelector('.busqueda-cats-mas')?.addEventListener('click', e => {
      caja.querySelectorAll('.busqueda-cat[hidden]').forEach(a => { a.hidden = false; });
      e.currentTarget.remove();
    });
    caja.hidden = false;
  }

  function pintarOtros(otros) {
    const bloque = $('[data-busqueda-otros]');
    if (!bloque || !otros.length) return;
    bloque.querySelector('[data-busqueda-lista]').innerHTML = otros.map(r => {
      const blog = r.tipo === 'Blog';
      const dato = [blog ? 'Blog' : 'Página', blog && r.meta.fecha ? r.meta.fecha : ''].filter(Boolean).join(' · ');
      // El extracto lo devuelve Pagefind ya escapado, con <mark> en las palabras encontradas
      return `<a class="busqueda-fila" href="${texto(r.url)}"><span class="busqueda-icono"><i class="bi ${blog ? 'bi-journal-text' : 'bi-file-earmark-text'}" aria-hidden="true"></i></span><span class="busqueda-fila-texto"><b>${texto(r.meta.title || '')}</b><span class="busqueda-fila-dato">${texto(dato)}</span><span class="busqueda-fila-extracto">${r.excerpt || ''}</span></span><i class="bi bi-chevron-right busqueda-fila-flecha" aria-hidden="true"></i></a>`;
    }).join('');
    bloque.hidden = false;
  }

  (async () => {
    let datos = [];
    try {
      const pagefind = await import('/pagefind/pagefind.js');
      await pagefind.options({ excerptLength: 26 });
      const r = await pagefind.search(q);
      datos = await Promise.all(r.results.slice(0, 300).map(x => x.data()));
    } catch (e) {
      resumen.textContent = 'No se ha podido usar el buscador. Recarga la página o vuelve a intentarlo más tarde.';
      return;
    }
    const grupos = { Producto: [], Categoría: [], otros: [] };
    for (const d of datos) {
      const tipo = (d.filters && d.filters.tipo && d.filters.tipo[0]) || 'Página';
      const r = { url: limpia(d.url), meta: d.meta || {}, excerpt: d.excerpt, tipo };
      (grupos[tipo] || grupos.otros).push(r);
    }
    // Listas largas: el HTML trae solo algunas tarjetas; el resto llegan de un JSON (catalogo.js)
    const rejillaProd = pagina.querySelector('[data-busqueda-productos] [data-rejilla]');
    if (rejillaProd && grupos.Producto.length && window.cargarTarjetasRejilla) await window.cargarTarjetasRejilla(rejillaProd);
    const nProd = pintarProductos(grupos.Producto.map(r => r.url));
    grupos.Categoría = elegirCategorias(grupos.Categoría);
    pintarCategorias(grupos.Categoría);
    pintarOtros(grupos.otros);
    const total = nProd + grupos.Categoría.length + grupos.otros.length;
    if (!total) {
      resumen.innerHTML = `<b>Sin resultados</b> para «${texto(q)}».`;
      mostrarVacio(true);
      return;
    }
    const partes = [
      nProd && plural(nProd, 'producto', 'productos'),
      grupos.Categoría.length && plural(grupos.Categoría.length, 'categoría', 'categorías'),
      grupos.otros.length && plural(grupos.otros.length, 'entrada o página', 'entradas y páginas'),
    ].filter(Boolean);
    resumen.innerHTML = `<b>${plural(total, 'resultado', 'resultados')}</b> para «${texto(q)}»: ${partes.join(', ')}.`;
  })();
})();
