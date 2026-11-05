/*
  Rejillas de productos (portada, /catalogo/ y categorías). Las genera scripts/build.js
  con el atributo data-rejilla; aquí, en el navegador:
  - data-aleatorio: baraja los productos en cada visita;
  - data-por-pagina: muestra N productos por página, con botones de página;
  - [data-rejilla-filtro]: filtros por fabricante y «Solo segunda mano» (los pone el build
    cuando tienen sentido); se combinan entre sí.
  Sin JavaScript se ve la lista que deja el build (los N primeros, en un orden que cambia
  cada día). Va en un fichero aparte porque la política de seguridad de la web no permite
  scripts escritos dentro del HTML.
*/
(function () {
  function barajar(lista) {
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
  }

  document.querySelectorAll('[data-rejilla]').forEach(rejilla => {
    const caja = rejilla.querySelector('[data-rejilla-items]');
    const nav = rejilla.querySelector('[data-rejilla-nav]');
    const vacio = rejilla.querySelector('[data-rejilla-vacio]');
    const filtro = rejilla.querySelector('[data-rejilla-filtro]');
    const select = filtro && filtro.querySelector('[data-filtro-fabricante]');
    const segunda = filtro && filtro.querySelector('[data-filtro-segunda]');
    const porPagina = parseInt(rejilla.dataset.porPagina, 10) || 8;
    let items = Array.from(caja.querySelectorAll('[data-producto]'));
    let pagina = 1;

    if ('aleatorio' in rejilla.dataset) {
      items = barajar(items);
      items.forEach(el => caja.appendChild(el));
    }
    if (filtro) {
      filtro.hidden = false;
      [select, segunda].forEach(c => c && c.addEventListener('change', () => { pagina = 1; pintar(); }));
    }

    function visibles() {
      const fab = select ? select.value : '';
      const soloSegunda = !!(segunda && segunda.checked);
      return items.filter(el => (!fab || el.dataset.fabricante === fab)
        && (!soloSegunda || 'segundaMano' in el.dataset));
    }

    function boton(texto, n, { actual = false, desactivado = false, etiqueta = '' } = {}) {
      const li = document.createElement('li');
      li.className = 'page-item' + (actual ? ' active' : '') + (desactivado ? ' disabled' : '');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'page-link';
      b.textContent = texto;
      if (etiqueta) b.setAttribute('aria-label', etiqueta);
      if (actual) b.setAttribute('aria-current', 'page');
      if (desactivado) b.disabled = true;
      else b.addEventListener('click', () => {
        pagina = n;
        pintar();
        const arriba = rejilla.getBoundingClientRect().top;
        if (arriba < 0) rejilla.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const primero = caja.querySelector('[data-producto]:not([hidden]) a');
        if (primero) primero.focus({ preventScroll: true });
      });
      li.appendChild(b);
      return li;
    }

    function pintar() {
      const lista = visibles();
      const total = Math.max(1, Math.ceil(lista.length / porPagina));
      if (pagina > total) pagina = total;
      const desde = (pagina - 1) * porPagina;
      const enPagina = new Set(lista.slice(desde, desde + porPagina));
      items.forEach(el => { el.hidden = !enPagina.has(el); });
      if (vacio) vacio.hidden = lista.length > 0;

      nav.innerHTML = '';
      nav.hidden = total <= 1;
      if (total <= 1) return;
      const ul = document.createElement('ul');
      ul.className = 'pagination flex-wrap justify-content-center mb-0';
      ul.appendChild(boton('‹', pagina - 1, { desactivado: pagina === 1, etiqueta: 'Página anterior' }));
      for (let n = 1; n <= total; n++) ul.appendChild(boton(String(n), n, { actual: n === pagina, etiqueta: 'Página ' + n }));
      ul.appendChild(boton('›', pagina + 1, { desactivado: pagina === total, etiqueta: 'Página siguiente' }));
      nav.appendChild(ul);
    }

    pintar();
  });
})();
