/*
  Rejillas de productos y de entradas del blog (portada, /catalogo/, /ofertas/ y categorías).
  Las genera scripts/build.js con el atributo data-rejilla; aquí, en el navegador:
  - data-esperar: no empieza hasta el evento «rejilla:lista» (resultados del buscador);
  - data-aleatorio: baraja los productos en cada visita (es el orden «Recomendados»);
  - data-por-pagina: muestra N por página; debajo, «Mostrando 1–12 de 40 productos» y los botones
    de página en círculos (con «…» cuando hay muchas: 1 … 4 5 6 … 17); data-unidad: «producto|
    productos» o «entrada|entradas»;
  - [data-rejilla-filtro]: barra de filtros compacta:
    · «Fabricante (N)» despliega un panel con un botón por fabricante con su logo (varios
      marcados = cualquiera de ellos; ninguno = todos);
    · «Precio» despliega un panel: en el ordenador, un deslizador doble que filtra al moverlo; en
      el móvil, «Desde / Hasta», rangos rápidos y «Aplicar». Se usa el precio que se paga (el de
      oferta, si la hay). «Incluir "Precio a consultar"» decide si salen los que no tienen precio;
    · «Segunda mano» y «En oferta» se marcan y desmarcan;
    · «Ordenar»: Recomendados, precio (de menor a mayor y al revés), nombre, modelo y novedades.
      Al ordenar por precio, los «a consultar» van al final;
    · lo marcado sale como etiquetas con «×» en una segunda línea; «Quitar filtros» lo desmarca
      todo; junto a «Ordenar», cuántos productos se ven. Esc o un clic fuera cierran los paneles.
  - data-tarjetas + data-tarjetas-resto (listas largas): el HTML solo trae la primera página; el
    resto de tarjetas se piden a ese JSON (una vez, aunque haya varias rejillas) y se añaden antes
    de empezar. Avisa con el evento «tarjetas:nuevas» (lo usa public/js/presupuesto.js para el «+»).
  Sin JavaScript se ve la lista que deja el build (los N primeros, en un orden que cambia
  cada día). Va en un fichero aparte porque la política de seguridad de la web no permite
  scripts escritos dentro del HTML.
*/
(function () {
  const EUROS = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' });
  const euros = v => `${EUROS.format(v)} €`;
  const icono = clase => {
    const i = document.createElement('i');
    i.className = 'bi ' + clase;
    i.setAttribute('aria-hidden', 'true');
    return i;
  };

  function barajar(lista) {
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
  }

  const pedidas = {};
  function cargarResto(rejilla) {
    const url = rejilla.dataset.tarjetas, resto = rejilla.dataset.tarjetasResto;
    if (!url || !resto) return Promise.resolve();
    pedidas[url] = pedidas[url] || fetch(url).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
    return pedidas[url].then(lista => {
      const caja = rejilla.querySelector('[data-rejilla-items]');
      const plantilla = document.createElement('template');
      plantilla.innerHTML = resto.split(',').map(i => lista[+i] || '').join('');
      plantilla.content.querySelectorAll('[data-producto], [data-item]').forEach(el => { el.hidden = true; });
      caja.appendChild(plantilla.content);
      delete rejilla.dataset.tarjetas;
      delete rejilla.dataset.tarjetasResto;
      document.dispatchEvent(new CustomEvent('tarjetas:nuevas', { detail: caja }));
    }).catch(() => { /* sin conexión o fichero viejo: se queda con las tarjetas del HTML */ });
  }
  // El buscador (public/js/buscar.js) las necesita todas antes de quedarse con las encontradas
  window.cargarTarjetasRejilla = cargarResto;

  function iniciar(rejilla) {
    const caja = rejilla.querySelector('[data-rejilla-items]');
    const nav = rejilla.querySelector('[data-rejilla-nav]');
    const vacio = rejilla.querySelector('[data-rejilla-vacio]');
    const filtro = rejilla.querySelector('[data-rejilla-filtro]');
    const q = sel => (filtro ? filtro.querySelector(sel) : null);
    const botonesFab = filtro ? Array.from(filtro.querySelectorAll('[data-filtro-fabricante]')) : [];
    const segunda = q('[data-filtro-segunda]');
    const oferta = q('[data-filtro-oferta]');
    const quitar = q('[data-filtro-quitar]');
    const elegidos = q('[data-filtro-elegidos]');
    const cajaTotal = q('[data-filtro-total]');
    const estado = q('[data-filtro-estado]');
    const unidad = (rejilla.dataset.unidad || 'producto|productos').split('|');
    const marcado = b => !!b && b.getAttribute('aria-pressed') === 'true';
    const porPagina = parseInt(rejilla.dataset.porPagina, 10) || 8;
    let items = Array.from(caja.querySelectorAll('[data-producto], [data-item]'));
    let pagina = 1;

    if ('aleatorio' in rejilla.dataset) barajar(items);
    items.forEach((el, i) => { el.dataset.base = i; caja.appendChild(el); });

    /* ---------- Paneles desplegables (fabricante, precio, ordenar) ---------- */
    const paneles = filtro ? Array.from(filtro.querySelectorAll('[aria-controls][aria-expanded]')).map(boton => ({
      boton, panel: document.getElementById(boton.getAttribute('aria-controls')),
    })).filter(x => x.panel) : [];
    function mostrar(p, si) {
      p.panel.hidden = !si;
      p.boton.setAttribute('aria-expanded', String(si));
      // El panel de precio, debajo de su botón (en el ordenador)
      if (si && p.panel.hasAttribute('data-alinear')) {
        const barra = filtro.getBoundingClientRect();
        const b = p.boton.getBoundingClientRect();
        p.panel.style.left = window.matchMedia('(min-width: 992px)').matches ? `${Math.max(0, Math.min(b.left - barra.left, barra.width - p.panel.offsetWidth))}px` : '';
      }
    }
    const cerrarTodos = (salvo) => paneles.forEach(p => { if (p !== salvo && !p.panel.hidden) mostrar(p, false); });
    paneles.forEach(p => p.boton.addEventListener('click', () => {
      const abrir = p.panel.hidden;
      cerrarTodos(p);
      mostrar(p, abrir);
    }));
    if (filtro) {
      document.addEventListener('click', e => { if (!filtro.contains(e.target)) cerrarTodos(); });
      filtro.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        const abierto = paneles.find(p => !p.panel.hidden);
        if (abierto) { mostrar(abierto, false); abierto.boton.focus(); }
      });
    }

    /* ---------- Botones que se marcan (fabricantes, segunda mano, oferta) ---------- */
    const conmutables = botonesFab.concat(segunda || [], oferta || []);
    conmutables.forEach(b => b.addEventListener('click', () => {
      b.setAttribute('aria-pressed', marcado(b) ? 'false' : 'true');
      pagina = 1;
      pintar();
    }));

    /* ---------- Precio ---------- */
    const panelPrecio = q('[data-panel-precio]');
    const pMin = panelPrecio ? parseFloat(panelPrecio.dataset.precioMin) : 0;
    const pMax = panelPrecio ? parseFloat(panelPrecio.dataset.precioMax) : 0;
    const precio = { lo: null, hi: null, consultar: true };
    const lo = q('[data-precio-lo]'), hi = q('[data-precio-hi]');
    const loTxt = q('[data-precio-lo-txt]'), hiTxt = q('[data-precio-hi-txt]'), tramo = q('[data-precio-tramo]');
    const desde = q('[data-precio-desde]'), hasta = q('[data-precio-hasta]');
    const consultar = q('[data-precio-consultar]');
    const precioActivo = () => precio.lo != null || precio.hi != null || !precio.consultar;
    function sincronizarPrecio() {
      const a = precio.lo ?? pMin, b = precio.hi ?? pMax;
      if (lo) { lo.value = a; hi.value = b; }
      pintarDeslizador(a, b);
      if (desde) { desde.value = precio.lo ?? ''; hasta.value = precio.hi ?? ''; }
      if (consultar) consultar.checked = precio.consultar;
      if (panelPrecio) panelPrecio.querySelectorAll('[data-desde]').forEach(r => {
        const rl = r.dataset.desde ? parseFloat(r.dataset.desde) : null, rh = r.dataset.hasta ? parseFloat(r.dataset.hasta) : null;
        r.setAttribute('aria-pressed', String(rl === precio.lo && rh === precio.hi));
      });
      const boton = q('[data-boton-precio]');
      if (boton) boton.classList.toggle('activo', precioActivo());
    }
    function pintarDeslizador(a, b) {
      if (loTxt) { loTxt.textContent = euros(a); hiTxt.textContent = euros(b); }
      if (tramo && pMax > pMin) {
        tramo.style.left = `${((a - pMin) / (pMax - pMin)) * 100}%`;
        tramo.style.right = `${100 - ((b - pMin) / (pMax - pMin)) * 100}%`;
      }
    }
    function aplicarPrecio(a, b) {
      if (a != null && b != null && a > b) [a, b] = [b, a];
      precio.lo = a != null && a > pMin ? a : null;
      precio.hi = b != null && b < pMax ? b : null;
      sincronizarPrecio();
      pagina = 1;
      pintar();
    }
    if (lo && hi) {
      let espera;
      const mover = e => {
        let a = parseFloat(lo.value), b = parseFloat(hi.value);
        if (a > b) { if (e.target === lo) { a = b; lo.value = a; } else { b = a; hi.value = b; } }
        pintarDeslizador(a, b);
        clearTimeout(espera);
        espera = setTimeout(() => aplicarPrecio(a, b), 150);
      };
      lo.addEventListener('input', mover);
      hi.addEventListener('input', mover);
    }
    const numero = input => {
      const v = parseFloat(String(input.value).replace(',', '.'));
      return Number.isFinite(v) ? v : null;
    };
    q('[data-precio-aplicar]')?.addEventListener('click', () => {
      aplicarPrecio(numero(desde), numero(hasta));
      const p = paneles.find(x => x.panel === panelPrecio);
      if (p) { mostrar(p, false); p.boton.focus(); }
    });
    [desde, hasta].forEach(i => i && i.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); q('[data-precio-aplicar]').click(); }
    }));
    q('[data-precio-borrar]')?.addEventListener('click', () => { precio.consultar = true; aplicarPrecio(null, null); });
    if (panelPrecio) panelPrecio.querySelectorAll('[data-desde]').forEach(r => r.addEventListener('click', () => {
      const a = r.dataset.desde ? parseFloat(r.dataset.desde) : null, b = r.dataset.hasta ? parseFloat(r.dataset.hasta) : null;
      if (desde) { desde.value = a ?? ''; hasta.value = b ?? ''; }
      aplicarPrecio(a, b);
    }));
    consultar?.addEventListener('change', () => { precio.consultar = consultar.checked; sincronizarPrecio(); pagina = 1; pintar(); });

    /* ---------- Ordenar ---------- */
    let orden = '';
    const opcionesOrden = filtro ? Array.from(filtro.querySelectorAll('[data-orden]')) : [];
    const ordenActual = q('[data-orden-actual]');
    opcionesOrden.forEach(op => op.addEventListener('click', () => {
      orden = op.dataset.orden;
      opcionesOrden.forEach(o => o.setAttribute('aria-checked', String(o === op)));
      if (ordenActual) ordenActual.textContent = op.dataset.corto || op.textContent.trim();
      const p = paneles.find(x => x.panel.contains(op));
      if (p) { mostrar(p, false); p.boton.focus(); }
      pagina = 1;
      pintar();
    }));
    const valorPrecio = el => { const v = parseFloat(el.dataset.precio); return Number.isFinite(v) ? v : null; };
    const texto = (el, campo) => (el.dataset[campo] || '').toLocaleLowerCase('es');
    function ordenar(lista) {
      const base = (a, b) => a.dataset.base - b.dataset.base;
      const porPrecio = signo => (a, b) => {
        const x = valorPrecio(a), y = valorPrecio(b);
        if (x == null || y == null) return (x == null) - (y == null) || base(a, b);
        return signo * (x - y) || base(a, b);
      };
      const criterios = {
        'precio-asc': porPrecio(1),
        'precio-desc': porPrecio(-1),
        nombre: (a, b) => texto(a, 'nombre').localeCompare(texto(b, 'nombre'), 'es', { numeric: true }) || base(a, b),
        modelo: (a, b) => (!a.dataset.modelo) - (!b.dataset.modelo) || texto(a, 'modelo').localeCompare(texto(b, 'modelo'), 'es', { numeric: true }) || base(a, b),
        novedades: (a, b) => (b.dataset.fecha || '').localeCompare(a.dataset.fecha || '') || base(a, b),
      };
      return lista.slice().sort(criterios[orden] || base);
    }

    /* ---------- Quitar filtros y etiquetas ---------- */
    const enfocarBarra = () => (q('[data-filtro-abrir]') || q('[aria-controls]') || segunda || oferta)?.focus();
    quitar?.addEventListener('click', () => {
      conmutables.forEach(b => b.setAttribute('aria-pressed', 'false'));
      precio.lo = precio.hi = null; precio.consultar = true;
      sincronizarPrecio();
      pagina = 1;
      pintar();
      enfocarBarra();
    });
    function etiqueta(texto, alQuitar) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'filtros-chip';
      chip.setAttribute('aria-label', 'Quitar el filtro ' + texto);
      chip.append(texto + ' ', icono('bi-x-lg'));
      chip.addEventListener('click', () => { alQuitar(); pagina = 1; pintar(); enfocarBarra(); });
      return chip;
    }
    function pintarElegidos() {
      if (!elegidos) return;
      elegidos.textContent = '';
      botonesFab.filter(marcado).forEach(b => elegidos.appendChild(etiqueta(b.dataset.nombre || b.title, () => b.setAttribute('aria-pressed', 'false'))));
      if (precio.lo != null || precio.hi != null) {
        const t = precio.lo != null && precio.hi != null ? `${EUROS.format(precio.lo)}–${euros(precio.hi)}`
          : precio.lo != null ? `Desde ${euros(precio.lo)}` : `Hasta ${euros(precio.hi)}`;
        elegidos.appendChild(etiqueta(t, () => { precio.lo = precio.hi = null; sincronizarPrecio(); }));
      }
      if (!precio.consultar) elegidos.appendChild(etiqueta('Sin «precio a consultar»', () => { precio.consultar = true; sincronizarPrecio(); }));
    }

    function visibles(lista) {
      const fabs = botonesFab.filter(marcado).map(b => b.dataset.filtroFabricante);
      const soloSegunda = marcado(segunda);
      const soloOferta = marcado(oferta);
      return lista.filter(el => {
        if (fabs.length && !fabs.includes(el.dataset.fabricante)) return false;
        if (soloSegunda && !('segundaMano' in el.dataset)) return false;
        if (soloOferta && !('oferta' in el.dataset)) return false;
        if (panelPrecio) {
          const v = valorPrecio(el);
          if (v == null) return precio.consultar;
          if (precio.lo != null && v < precio.lo) return false;
          if (precio.hi != null && v > precio.hi) return false;
        }
        return true;
      });
    }

    /* ---------- Paginación ---------- */
    function boton(texto, n, { actual = false, desactivado = false, etiqueta = '', icono: ic = '' } = {}) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'paginacion-num' + (actual ? ' actual' : '') + (ic ? ' flecha' : '');
      if (ic) b.appendChild(icono(ic)); else b.textContent = texto;
      if (etiqueta) b.setAttribute('aria-label', etiqueta);
      if (actual) b.setAttribute('aria-current', 'page');
      if (desactivado) b.disabled = true;
      else b.addEventListener('click', () => {
        pagina = n;
        pintar();
        const arriba = rejilla.getBoundingClientRect().top;
        if (arriba < 0) rejilla.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const primero = caja.querySelector('[data-producto]:not([hidden]) a, [data-item]:not([hidden]) a');
        if (primero) primero.focus({ preventScroll: true });
      });
      li.appendChild(b);
      return li;
    }

    function pintar() {
      const ordenados = ordenar(items);
      ordenados.forEach(el => caja.appendChild(el));
      const lista = visibles(ordenados);
      const total = Math.max(1, Math.ceil(lista.length / porPagina));
      if (pagina > total) pagina = total;
      const inicio = (pagina - 1) * porPagina;
      const enPagina = new Set(lista.slice(inicio, inicio + porPagina));
      items.forEach(el => { el.hidden = !enPagina.has(el); });
      if (vacio) vacio.hidden = lista.length > 0;
      if (quitar) quitar.hidden = !(conmutables.some(marcado) || precioActivo());
      pintarElegidos();
      if (estado) estado.hidden = !(elegidos && elegidos.childElementCount) && (!quitar || quitar.hidden);
      if (cajaTotal) {
        const n = lista.length;
        cajaTotal.textContent = n === items.length ? `${n} ${n === 1 ? 'producto' : 'productos'}` : `${n} de ${items.length} productos`;
      }

      nav.innerHTML = '';
      nav.hidden = total <= 1;
      if (total <= 1) return;
      const caja2 = document.createElement('div');
      caja2.className = 'paginacion';
      const info = document.createElement('p');
      info.className = 'paginacion-info';
      const rango = document.createElement('b');
      rango.textContent = `${inicio + 1}–${Math.min(inicio + porPagina, lista.length)}`;
      info.append('Mostrando ', rango, ` de ${lista.length} ${unidad[lista.length === 1 ? 0 : unidad.length - 1]}`);
      const ul = document.createElement('ul');
      ul.className = 'paginacion-nums';
      ul.appendChild(boton('', pagina - 1, { desactivado: pagina === 1, etiqueta: 'Página anterior', icono: 'bi-chevron-left' }));
      // Siempre la primera, la última y las de alrededor de la actual; el resto, «…»
      const ver = new Set([1, total, pagina - 1, pagina, pagina + 1].filter(n => n >= 1 && n <= total));
      if (pagina <= 3) [2, 3, 4].forEach(n => n <= total && ver.add(n));
      if (pagina >= total - 2) [total - 1, total - 2, total - 3].forEach(n => n >= 1 && ver.add(n));
      // Si solo falta una página entre dos, se muestra en vez de «…»
      [...ver].forEach(n => { if (ver.has(n + 2) && !ver.has(n + 1)) ver.add(n + 1); });
      let anterior = 0;
      [...ver].sort((a, b) => a - b).forEach(n => {
        if (n - anterior > 1) {
          const li = document.createElement('li');
          li.className = 'paginacion-puntos';
          li.setAttribute('aria-hidden', 'true');
          li.textContent = '…';
          ul.appendChild(li);
        }
        ul.appendChild(boton(String(n), n, { actual: n === pagina, etiqueta: 'Página ' + n }));
        anterior = n;
      });
      ul.appendChild(boton('', pagina + 1, { desactivado: pagina === total, etiqueta: 'Página siguiente', icono: 'bi-chevron-right' }));
      caja2.append(info, ul);
      nav.appendChild(caja2);
    }

    if (filtro) filtro.hidden = false;
    sincronizarPrecio();
    pintar();
  }

  // data-esperar (resultados del buscador): se pone en marcha cuando public/js/buscar.js ha dejado
  // solo las tarjetas encontradas (evento «rejilla:lista»)
  document.querySelectorAll('[data-rejilla]').forEach(rejilla => {
    if ('esperar' in rejilla.dataset && !('lista' in rejilla.dataset)) rejilla.addEventListener('rejilla:lista', () => iniciar(rejilla), { once: true });
    else cargarResto(rejilla).then(() => iniciar(rejilla));
  });
})();
