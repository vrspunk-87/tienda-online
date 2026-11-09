/*
  Funciones del navegador que complementan las páginas generadas:
  - Menú en móvil: se cierra al pulsar un enlace.
  - Catálogo en el menú del móvil, por niveles: cada tipo o categoría con subniveles abre su
    nivel en la misma caja, y «←» vuelve al anterior.
  - Sugerencias mientras se escribe en el buscador de la cabecera (Pagefind).
  - Galería de la ficha de producto y días que quedan de cada oferta.
  - Contacto: «Abierto ahora / Cerrado · abre…», el día de hoy en el horario y el mapa al pulsar.
  - Botones de compartir: copiar enlace y menú nativo de compartir del móvil.
  El build añade este script a todas las páginas.
*/
(function () {
  /* ---------- Menú en móvil ---------- */
  const menu = document.getElementById('menu');
  if (menu && window.bootstrap) {
    menu.querySelectorAll('.nav-link:not(.dropdown-toggle), .dropdown-item, a.cat-fila, a.cat-ver').forEach(a =>
      a.addEventListener('click', () => {
        if (menu.classList.contains('offcanvas')) {
          bootstrap.Offcanvas.getInstance(menu)?.hide();
        } else if (menu.classList.contains('show')) {
          bootstrap.Collapse.getOrCreateInstance(menu).hide();
        }
      }));
  }

  /* ---------- Catálogo en el menú del móvil, por niveles ---------- */
  document.querySelectorAll('[data-cat-movil]').forEach(caja => {
    caja.addEventListener('click', e => {
      const boton = e.target.closest('[data-cat-nivel]');
      if (!boton) return;
      const destino = caja.querySelector('#' + boton.dataset.catNivel);
      if (!destino) return;
      const origen = boton.closest('.cat-nivel');
      caja.querySelectorAll('.cat-nivel').forEach(n => { n.hidden = n !== destino; });
      // Al volver, el foco a la opción de la que se venía; al entrar, al «← volver»
      const volverA = boton.classList.contains('cat-volver') && origen && destino.querySelector(`[data-cat-nivel="${origen.id}"]`);
      (volverA || destino.querySelector('.cat-volver') || destino.querySelector('a, button'))?.focus();
    });
  });

  /* ---------- Sugerencias mientras se escribe en el buscador de la cabecera ----------
     Con Pagefind (se carga al entrar en la caja): categorías, productos (foto, precio) y entradas
     o páginas que coinciden, y «Ver los N resultados». Flechas para moverse, Intro para ir, Esc
     para cerrar; Intro sin elegir nada lleva a /buscar/?q=… */
  const caja = document.getElementById('buscar-cabecera');
  if (caja && caja.form) {
    const form = caja.form;
    const lista = document.createElement('div');
    lista.className = 'sugerencias';
    lista.id = 'sugerencias-busqueda';
    lista.setAttribute('role', 'listbox');
    lista.setAttribute('aria-label', 'Sugerencias');
    lista.hidden = true;
    form.appendChild(lista);
    caja.setAttribute('role', 'combobox');
    caja.setAttribute('aria-autocomplete', 'list');
    caja.setAttribute('aria-expanded', 'false');
    caja.setAttribute('aria-controls', lista.id);
    let pagefind = null, ultima = '', espera = null, activa = -1;
    const cargar = () => pagefind || (pagefind = import('/pagefind/pagefind.js').then(async m => { await m.options({ excerptLength: 12 }); return m; }));
    const html = t => { const s = document.createElement('span'); s.textContent = t == null ? '' : String(t); return s.innerHTML; };
    const resaltar = (t, consulta) => {
      let r = html(t);
      consulta.split(/\s+/).filter(p => p.length > 1).forEach(p => {
        const e = html(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        r = r.replace(new RegExp(`(^|[\\s(«"'/-])(${e})`, 'gi'), '$1<mark>$2</mark>');
      });
      return r;
    };
    const opciones = () => [...lista.querySelectorAll('[role="option"]')];
    function marcar(i) {
      const ops = opciones();
      activa = ops.length ? (i + ops.length) % ops.length : -1;
      ops.forEach((o, k) => o.classList.toggle('activa', k === activa));
      if (activa >= 0) { caja.setAttribute('aria-activedescendant', ops[activa].id); ops[activa].scrollIntoView({ block: 'nearest' }); }
      else caja.removeAttribute('aria-activedescendant');
    }
    function cerrar() {
      lista.hidden = true;
      caja.setAttribute('aria-expanded', 'false');
      caja.removeAttribute('aria-activedescendant');
      activa = -1;
    }
    async function sugerir(consulta) {
      if (consulta.length < 2) { cerrar(); return; }
      ultima = consulta;
      let r, datos;
      try {
        const m = await cargar();
        r = await m.search(consulta);
        if (consulta !== ultima) return;
        datos = await Promise.all(r.results.slice(0, 20).map(x => x.data()));
      } catch (e) { cerrar(); return; }
      if (consulta !== ultima) return;
      const tipo = d => (d.filters && d.filters.tipo && d.filters.tipo[0]) || 'Página';
      // Categorías: las que tienen la palabra en el nombre (con productos, primero)
      const normal = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const palabras = normal(consulta).split(/[^a-z0-9ñ]+/).filter(p => p.length > 1);
      const cats = datos.filter(d => tipo(d) === 'Categoría' && palabras.some(p => normal(d.meta.title).includes(p.length > 4 ? p.slice(0, -1) : p)))
        .sort((a, b) => (b.meta.productos !== '0') - (a.meta.productos !== '0')).slice(0, 3);
      const prods = datos.filter(d => tipo(d) === 'Producto').slice(0, 4);
      const otros = datos.filter(d => tipo(d) === 'Blog' || tipo(d) === 'Página').slice(0, 2);
      let n = 0;
      const id = () => `sugerencia-${++n}`;
      const url = `/buscar/?q=${encodeURIComponent(consulta)}`;
      let h = '';
      if (cats.length) h += '<p class="sugerencias-titulo">Categorías</p><div class="sugerencias-cats">' + cats.map(d => `<a class="sugerencia-cat" role="option" id="${id()}" href="${html(d.url)}"><span>${resaltar(d.meta.title, consulta)}</span>${d.meta.productos ? `<span class="insignia-menu${d.meta.productos === '0' ? ' vacia' : ''}">${html(d.meta.productos)}</span>` : ''}</a>`).join('') + '</div>';
      if (prods.length) h += '<p class="sugerencias-titulo">Productos</p>' + prods.map(d => `<a class="sugerencia" role="option" id="${id()}" href="${html(d.url)}">${d.meta.image ? `<img src="${html(d.meta.image)}" alt="" loading="lazy">` : '<span class="sugerencia-sin-foto"><i class="bi bi-image" aria-hidden="true"></i></span>'}<span><b>${resaltar(d.meta.title, consulta)}</b><small>${html([d.meta.fabricante, d.meta.precio].filter(Boolean).join(' · '))}</small></span></a>`).join('');
      if (otros.length) h += '<p class="sugerencias-titulo">Blog y páginas</p>' + otros.map(d => `<a class="sugerencia" role="option" id="${id()}" href="${html(d.url)}"><span class="sugerencia-icono"><i class="bi ${tipo(d) === 'Blog' ? 'bi-journal-text' : 'bi-file-earmark-text'}" aria-hidden="true"></i></span><span><b>${resaltar(d.meta.title, consulta)}</b><small>${tipo(d) === 'Blog' ? 'Blog' : 'Página'}${d.meta.fecha ? ' · ' + html(d.meta.fecha) : ''}</small></span></a>`).join('');
      h += r.results.length
        ? `<a class="sugerencias-todo" role="option" id="${id()}" href="${url}">Ver ${r.results.length === 1 ? 'el resultado' : `los ${r.results.length} resultados`} de «${html(consulta)}» <i class="bi bi-arrow-right" aria-hidden="true"></i></a>`
        : `<p class="sugerencias-nada">No hay nada con «${html(consulta)}». Prueba con otras palabras o <a href="${url}">mira las sugerencias</a>.</p>`;
      lista.innerHTML = h;
      lista.hidden = false;
      caja.setAttribute('aria-expanded', 'true');
      activa = -1;
    }
    caja.addEventListener('focus', () => { cargar().catch(() => {}); if (caja.value.trim().length > 1 && lista.childElementCount) { lista.hidden = false; caja.setAttribute('aria-expanded', 'true'); } });
    caja.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(() => sugerir(caja.value.trim()), 140); });
    caja.addEventListener('keydown', e => {
      if (lista.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); marcar(activa + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(activa - 1); }
      else if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
      else if (e.key === 'Enter' && activa >= 0) { e.preventDefault(); location.href = opciones()[activa].href; }
    });
    document.addEventListener('click', e => { if (!form.contains(e.target)) cerrar(); });
    form.addEventListener('focusout', e => { if (!form.contains(e.relatedTarget)) setTimeout(() => { if (!form.contains(document.activeElement)) cerrar(); }, 0); });
  }

  /* ---------- Galería de la ficha de producto ----------
     Carril con desplazamiento (con el dedo en el móvil); las miniaturas y los puntos siguen a la
     foto que se ve; «ver a pantalla completa» abre la ventana en la misma foto, con flechas y
     teclado (← →) */
  document.querySelectorAll('[data-galeria]').forEach(galeria => {
    const carril = galeria.querySelector('[data-galeria-carril]');
    if (!carril) return;
    const fotos = Array.from(carril.children);
    const minis = Array.from(galeria.querySelectorAll('[data-galeria-ir]'));
    const puntos = Array.from(galeria.querySelectorAll('.ficha-puntos span'));
    const cont = galeria.querySelector('[data-galeria-contador]');
    let actual = 0;
    const ir = (k, suave = true) => carril.scrollTo({ left: k * carril.clientWidth, behavior: suave ? 'smooth' : 'auto' });
    function marcar(k) {
      actual = k;
      minis.forEach((m, i) => { m.classList.toggle('activa', i === k); if (i === k) m.setAttribute('aria-current', 'true'); else m.removeAttribute('aria-current'); });
      puntos.forEach((p, i) => p.classList.toggle('activo', i === k));
      if (cont) cont.textContent = `${k + 1} / ${fotos.length}`;
    }
    let espera;
    carril.addEventListener('scroll', () => { clearTimeout(espera); espera = setTimeout(() => marcar(Math.round(carril.scrollLeft / carril.clientWidth)), 60); }, { passive: true });
    minis.forEach(m => m.addEventListener('click', () => ir(+m.dataset.galeriaIr)));
    // Ventana a pantalla completa
    const ventana = document.getElementById((galeria.querySelector('[data-galeria-ampliar]')?.dataset.bsTarget || '#').slice(1));
    if (!ventana) return;
    const carrilV = ventana.querySelector('[data-galeria-ventana-carril]');
    const contV = ventana.querySelector('[data-galeria-ventana-contador]');
    const n = carrilV.children.length;
    const irV = (k, suave = true) => { k = (k + n) % n; carrilV.scrollTo({ left: k * carrilV.clientWidth, behavior: suave ? 'smooth' : 'auto' }); };
    const actualV = () => Math.round(carrilV.scrollLeft / carrilV.clientWidth);
    carrilV.addEventListener('scroll', () => { if (contV && n > 1) contV.textContent = `${actualV() + 1} / ${n}`; }, { passive: true });
    ventana.addEventListener('shown.bs.modal', () => { irV(actual, false); carrilV.focus(); });
    ventana.addEventListener('hidden.bs.modal', () => ir(actualV(), false));
    ventana.querySelectorAll('[data-galeria-ventana-mover]').forEach(b => b.addEventListener('click', () => irV(actualV() + +b.dataset.galeriaVentanaMover)));
    ventana.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); irV(actualV() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); irV(actualV() - 1); }
    });
  });

  /* ---------- Ofertas: días que quedan («Oferta hasta el 30 de noviembre · quedan 22 días») ---------- */
  document.querySelectorAll('[data-oferta-fin]').forEach(el => {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
    const dias = Math.round((Date.parse(el.dataset.ofertaFin + 'T12:00:00Z') - Date.parse(hoy + 'T12:00:00Z')) / 864e5);
    const hueco = el.querySelector('[data-oferta-quedan]');
    if (!hueco || !Number.isFinite(dias) || dias < 0) return;
    hueco.textContent = dias === 0 ? ' · último día' : dias === 1 ? ' · queda 1 día' : ` · quedan ${dias} días`;
  });

  /* ---------- Tienda: «Abierto ahora · cierra a las 13:30», el día de hoy en el horario y el mapa ---------- */
  const ahoraMadrid = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date()).map(x => [x.type, x.value]));
    return { dia: { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday], hora: `${p.hour}:${p.minute}`, fecha: `${p.year}-${p.month}-${p.day}` };
  };
  const NOMBRES_DIA = ['', 'el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el sábado', 'el domingo'];
  document.querySelectorAll('[data-abierto]').forEach(el => {
    let horario, aviso = null;
    try { horario = JSON.parse(el.dataset.horario); if (el.dataset.aviso) aviso = JSON.parse(el.dataset.aviso); } catch (e) { return; }
    const ahora = ahoraMadrid();
    const tramosDe = d => (horario.find(f => f.d.includes(d)) || { t: [] }).t;
    let abierto = false, texto = '';
    if (aviso && aviso.desde <= ahora.fecha && ahora.fecha <= aviso.hasta) texto = aviso.texto;
    else {
      const hoy = tramosDe(ahora.dia);
      const dentro = hoy.find(([a, b]) => a <= ahora.hora && ahora.hora < b);
      if (dentro) { abierto = true; texto = `cierra a las ${dentro[1]}`; }
      else {
        const luego = hoy.find(([a]) => a > ahora.hora);
        if (luego) texto = `abre hoy a las ${luego[0]}`;
        else for (let i = 1; i <= 7; i++) {
          const d = ((ahora.dia - 1 + i) % 7) + 1;
          const t = tramosDe(d);
          if (t.length) { texto = `abre ${i === 1 ? 'mañana' : NOMBRES_DIA[d]} a las ${t[0][0]}`; break; }
        }
      }
    }
    el.className = `estado-tienda ${abierto ? 'abierta' : 'cerrada'}`;
    el.innerHTML = '';
    const punto = document.createElement('i'); punto.setAttribute('aria-hidden', 'true');
    const b = document.createElement('b'); b.textContent = abierto ? 'Abierto ahora' : 'Cerrado';
    el.append(punto, b);
    if (texto) { const sm = document.createElement('span'); sm.textContent = ` · ${texto}`; el.appendChild(sm); }
    el.hidden = false;
  });
  // El día de hoy, resaltado en la tabla del horario; el aviso de cierre ya pasado se quita
  if (document.querySelector('[data-dias], [data-aviso-cierre]')) {
    const ahora = ahoraMadrid();
    document.querySelectorAll('tr[data-dias]').forEach(tr => {
      const hoy = tr.dataset.dias.split(',').map(Number).includes(ahora.dia);
      tr.classList.toggle('hoy', hoy);
      const etq = tr.querySelector('.horario-hoy'); if (etq) etq.hidden = !hoy;
    });
    document.querySelectorAll('[data-aviso-cierre][data-hasta]').forEach(a => { if (a.dataset.hasta < ahora.fecha) a.hidden = true; });
  }
  // Mapa de Google: solo se carga al pulsar «Ver el mapa» (sin cookies de Google hasta entonces)
  document.querySelectorAll('[data-mapa]').forEach(caja => {
    caja.querySelector('[data-mapa-cargar]')?.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = caja.dataset.mapa;
      f.title = 'Mapa con la situación de la tienda';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.setAttribute('allowfullscreen', '');
      caja.textContent = '';
      caja.appendChild(f);
      caja.classList.add('cargado');
    });
  });

  /* ---------- Compartir ---------- */
  const avisoCopiado = document.createElement('span');
  avisoCopiado.className = 'visually-hidden';
  avisoCopiado.setAttribute('aria-live', 'polite');
  document.body.appendChild(avisoCopiado);
  document.querySelectorAll('[data-copiar]').forEach(boton => {
    boton.addEventListener('click', async () => {
      const url = boton.closest('[data-url]').dataset.url;
      const icono = boton.querySelector('i');
      try {
        await navigator.clipboard.writeText(url);
        // El icono pasa a ✓ y el aviso se lee con el lector de pantalla
        boton.classList.add('copiado');
        if (icono) icono.className = 'bi bi-check-lg';
        boton.setAttribute('aria-label', 'Enlace copiado');
        boton.title = 'Enlace copiado';
        avisoCopiado.textContent = 'Enlace copiado';
        setTimeout(() => {
          boton.classList.remove('copiado');
          if (icono) icono.className = 'bi bi-link-45deg';
          boton.setAttribute('aria-label', 'Copiar el enlace');
          boton.title = 'Copiar el enlace';
          avisoCopiado.textContent = '';
        }, 2500);
      } catch {
        window.prompt('Copia el enlace:', url);
      }
    });
  });

  if (navigator.share) {
    document.querySelectorAll('[data-compartir-nativo]').forEach(boton => {
      boton.classList.remove('d-none');
      boton.addEventListener('click', () => {
        const c = boton.closest('[data-url]');
        navigator.share({ title: c.dataset.titulo, url: c.dataset.url }).catch(() => {});
      });
    });
  }

})();
