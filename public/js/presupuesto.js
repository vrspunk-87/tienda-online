/*
  Solicitud de presupuesto en el navegador (solo se carga si está activa en
  Decap → Solicitud de presupuesto):
  - Contador del menú: número de productos de la solicitud.
  - Fichas: unidades (− / +) y «Añadir a la solicitud» (data-anadir-solicitud), también en la barra
    fija del móvil, que sale al pasar la caja de compra.
    Máquinas con dos precios (completa y cabezal): un botón por versión (data-version); el cabezal
    va en la solicitud como «<identificador>~cabezal» (ver /presupuesto/productos.json).
  - Tarjetas de producto: botón «+» (data-anadir-rapido), que añade una unidad (de la completa).
  - /presupuesto/: productos con − / + y una nota opcional, «Quitar» con «Deshacer», accesorios
    compatibles con su «+», resumen con el total (fijo a la derecha en el ordenador; barra abajo en
    el móvil), formulario y ventana con las condiciones y la protección de datos: hay que abrir las
    dos pestañas para poder aceptar (la casilla abre la ventana si aún no se han leído).
  La solicitud se guarda en este navegador (localStorage): solo identificadores y cantidades,
  sin datos personales. Los nombres y precios se leen de /presupuesto/productos.json, que
  genera el build: un producto que ya no está disponible se quita solo.
  PARTE VISUAL: el envío real llega en la fase 5 (docs/PLAN.md); de momento, al enviar se
  comprueban los campos y se avisa de que el envío no está activo.
  Va en un fichero aparte porque la política de seguridad de la web no permite scripts
  escritos dentro del HTML.
*/
(function () {
  const CLAVE = 'solicitud-presupuesto';
  const MAX_UNIDADES = 99;
  const MAX_NOTA = 300;
  // Sin céntimos cuando el importe es redondo (3.813 €); con ellos si no (19,95 €)
  const formatoEuros = d => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always', minimumFractionDigits: d, maximumFractionDigits: d });
  const EUR_REDONDO = formatoEuros(0), EUR_CENTIMOS = formatoEuros(2);
  const euros = { format: v => (Math.abs(v - Math.round(v)) < 0.005 ? EUR_REDONDO : EUR_CENTIMOS).format(v) };

  function leer() {
    try {
      const v = JSON.parse(localStorage.getItem(CLAVE) || '[]');
      return Array.isArray(v) ? v.filter(x => x && typeof x.id === 'string')
        .map(x => ({ id: x.id, cantidad: Math.min(MAX_UNIDADES, Math.max(1, parseInt(x.cantidad, 10) || 1)), ...(typeof x.nota === 'string' && x.nota.trim() ? { nota: x.nota.slice(0, MAX_NOTA) } : {}) })) : [];
    } catch (e) { return []; }
  }
  function guardar(lista) {
    try { localStorage.setItem(CLAVE, JSON.stringify(lista)); return true; } catch (e) { return false; }
  }
  const el = (etiqueta, clase, texto) => {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  };

  /* ---------- Contador del menú ---------- */
  function contador() {
    const n = leer().length;
    document.querySelectorAll('[data-contador-solicitud]').forEach(c => {
      c.textContent = n;
      c.hidden = n === 0;
    });
    document.querySelectorAll('[data-enlace-solicitud]').forEach(a => {
      a.title = n ? `Mi solicitud de presupuesto (${n} ${n === 1 ? 'producto' : 'productos'})` : 'Mi solicitud de presupuesto';
    });
  }

  /* ---------- Fichas: unidades (− / +) y «Añadir a la solicitud» (también en la barra del móvil) ---------- */
  const cantidadFicha = document.querySelector('[data-cantidad-ficha]');
  let unidades = 1;
  function pintarUnidades() {
    if (!cantidadFicha) return;
    cantidadFicha.querySelector('[data-cantidad-num]').textContent = unidades;
    cantidadFicha.querySelector('[data-cantidad-menos]').disabled = unidades <= 1;
    cantidadFicha.querySelector('[data-cantidad-mas]').disabled = unidades >= MAX_UNIDADES;
  }
  if (cantidadFicha) {
    cantidadFicha.hidden = false;
    cantidadFicha.querySelector('[data-cantidad-menos]').addEventListener('click', () => { unidades = Math.max(1, unidades - 1); pintarUnidades(); });
    cantidadFicha.querySelector('[data-cantidad-mas]').addEventListener('click', () => { unidades = Math.min(MAX_UNIDADES, unidades + 1); pintarUnidades(); });
  }
  const botonesFicha = Array.from(document.querySelectorAll('[data-anadir-solicitud]'));
  const verSolicitud = document.querySelector('[data-ver-solicitud]');
  const estadoSolicitud = document.querySelector('[data-estado-solicitud]');
  function pintarFicha(mensaje) {
    const lista = leer();
    const enSolicitud = [];
    botonesFicha.forEach(boton => {
      const item = lista.find(x => x.id === boton.dataset.anadirSolicitud);
      const texto = boton.querySelector('span');
      const version = boton.dataset.version;
      if (version) {
        // Completa / Cabezal: en la barra del móvil se mantiene el nombre; en la caja, «Añadir» o «Añadir más»
        if (texto && !('anadirBarra' in boton.dataset)) texto.textContent = item ? 'Añadir más' : 'Añadir';
        boton.classList.toggle('en-solicitud', !!item);
        const i = boton.querySelector('i');
        if (i) i.className = item ? 'bi bi-clipboard-check' : 'bi bi-clipboard-plus';
        if (item && !('anadirBarra' in boton.dataset)) enSolicitud.push(`${item.cantidad} ud. ${version.toLowerCase()}`);
      } else {
        if (texto) texto.textContent = item ? ('anadirBarra' in boton.dataset ? 'Añadir más' : 'Añadir más unidades') : 'Añadir a la solicitud';
        if (item && boton === botonesFicha[0]) enSolicitud.push(`${item.cantidad} ud.`);
      }
    });
    if (verSolicitud) verSolicitud.hidden = !enSolicitud.length;
    if (estadoSolicitud) estadoSolicitud.textContent = mensaje || (enSolicitud.length ? `En tu solicitud: ${enSolicitud.join(' · ')}` : '');
  }
  botonesFicha.forEach(boton => {
    const id = boton.dataset.anadirSolicitud;
    boton.hidden = false;
    boton.addEventListener('click', () => {
      const lista = leer();
      const actual = lista.find(x => x.id === id);
      const n = unidades;
      if (actual) actual.cantidad = Math.min(MAX_UNIDADES, actual.cantidad + n);
      else lista.push({ id, cantidad: Math.min(MAX_UNIDADES, n) });
      if (!guardar(lista)) { pintarFicha('No se ha podido guardar: tu navegador no permite guardar datos de esta web.'); return; }
      contador();
      unidades = 1; pintarUnidades();
      const total = (actual || lista[lista.length - 1]).cantidad;
      const v = boton.dataset.version ? ` (${boton.dataset.version.toLowerCase()})` : '';
      pintarFicha(actual ? `Añadido${v}. Ahora tienes ${total} ud. en tu solicitud.` : `Añadido a tu solicitud${v}${n > 1 ? ` (${n} ud.)` : ''}.`);
    });
  });
  if (botonesFicha.length) pintarFicha();
  // Barra fija del móvil: aparece cuando el botón de la caja de compra queda por encima de la pantalla
  const barraFicha = document.querySelector('[data-ficha-barra]');
  const cajaCompra = document.querySelector('[data-ficha-compra] .ficha-accion') || document.querySelector('[data-ficha-compra] .ficha-versiones') || document.querySelector('[data-ficha-compra]');
  if (barraFicha && cajaCompra && 'IntersectionObserver' in window) {
    barraFicha.hidden = false;
    new IntersectionObserver(([e]) => {
      barraFicha.classList.toggle('visible', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(cajaCompra);
  }

  /* ---------- Tarjetas: botón «+» (añadir una unidad sin entrar en la ficha) ---------- */
  const avisoRapido = el('p', 'visually-hidden');
  avisoRapido.setAttribute('aria-live', 'polite');
  document.body.appendChild(avisoRapido);
  function pintarRapido(boton) {
    const item = leer().find(x => x.id === boton.dataset.anadirRapido);
    boton.classList.toggle('en-solicitud', !!item);
    boton.title = item ? `En tu solicitud: ${item.cantidad} ud. Pulsa para añadir otra.` : 'Añadir a la solicitud de presupuesto';
    const i = boton.querySelector('i');
    if (i) i.className = item ? 'bi bi-check-lg' : 'bi bi-plus-lg';
  }
  function activarRapido(boton) {
    if ('listo' in boton.dataset) return;
    boton.dataset.listo = '';
    boton.hidden = false;
    pintarRapido(boton);
    boton.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const id = boton.dataset.anadirRapido;
      const lista = leer();
      const actual = lista.find(x => x.id === id);
      if (actual) actual.cantidad = Math.min(MAX_UNIDADES, actual.cantidad + 1);
      else lista.push({ id, cantidad: 1 });
      if (!guardar(lista)) { avisoRapido.textContent = 'No se ha podido guardar: tu navegador no permite guardar datos de esta web.'; return; }
      contador();
      document.querySelectorAll(`[data-anadir-rapido="${CSS.escape(id)}"]`).forEach(pintarRapido);
      boton.classList.remove('latido'); void boton.offsetWidth; boton.classList.add('latido');
      avisoRapido.textContent = actual ? `Ahora tienes ${actual.cantidad} ud. en tu solicitud.` : 'Añadido a tu solicitud de presupuesto.';
    });
  }
  document.querySelectorAll('[data-anadir-rapido]').forEach(activarRapido);
  // Tarjetas que llegan después (listas largas, public/js/catalogo.js)
  document.addEventListener('tarjetas:nuevas', e => (e.detail || document).querySelectorAll('[data-anadir-rapido]').forEach(activarRapido));

  /* ---------- Página /presupuesto/ ---------- */
  const pagina = document.querySelector('[data-solicitud]');
  if (pagina) {
    const q = s => pagina.querySelector(s);
    const contenido = q('[data-solicitud-contenido]');
    const items = q('[data-solicitud-items]');
    const vacia = q('[data-solicitud-vacia]');
    const aviso = q('[data-solicitud-aviso]');
    const form = q('[data-solicitud-form]');
    const barra = q('[data-solicitud-barra]');
    const conNotas = 'notas' in pagina.dataset;
    const pasos = document.querySelector('[data-solicitud-pasos]');
    let productos = new Map();
    let quitado = null, esperaDeshacer = null;

    const precioUnidad = p => (p.precioOferta != null ? p.precioOferta : p.precio);
    const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
    function cambiar(id, fn) {
      const l = leer(); const it = l.find(y => y.id === id);
      if (it) { fn(it); guardar(l); }
    }
    function boton(clase, etiqueta, icono, texto) {
      const b = el('button', clase);
      b.type = 'button';
      if (etiqueta) b.setAttribute('aria-label', etiqueta);
      if (icono) b.appendChild(el('i', 'bi ' + icono)).setAttribute('aria-hidden', 'true');
      if (texto) b.append(texto);
      return b;
    }

    function pintar(foco) {
      const sol = leer().filter(x => productos.has(x.id));
      vacia.hidden = sol.length > 0;
      contenido.hidden = sol.length === 0;
      if (barra) barra.hidden = sol.length === 0;
      items.textContent = '';
      let suma = 0, aConsultar = 0, unidades = 0;
      sol.forEach(x => {
        const p = productos.get(x.id);
        const pu = precioUnidad(p);
        const li = el('li', 'solicitud-item');
        li.dataset.id = x.id;
        if (p.imagen) {
          const img = el('img', 'solicitud-foto');
          img.src = p.imagen; img.alt = ''; img.width = 84; img.height = 84; img.loading = 'lazy';
          li.appendChild(img);
        } else li.appendChild(el('span', 'solicitud-foto producto-sin-foto'));

        const datos = el('div', 'solicitud-datos');
        const a = el('a', 'solicitud-nombre', p.nombre); a.href = p.url;
        datos.appendChild(a);
        if (p.version) a.appendChild(el('span', 'solicitud-version', p.version));
        datos.appendChild(el('span', 'solicitud-detalle', [p.fabricante, p.modelo && `Modelo ${p.modelo}`].filter(Boolean).join(' · ')));
        const acciones = el('div', 'solicitud-acciones');
        const nombreV = p.version ? `${p.nombre} (${p.version.toLowerCase()})` : p.nombre;
        const quitar = boton('solicitud-accion', `Quitar ${nombreV} de la solicitud`, 'bi-trash3', 'Quitar');
        quitar.addEventListener('click', () => {
          const l = leer(); const k = l.findIndex(y => y.id === x.id);
          if (k < 0) return;
          quitado = { item: l[k], pos: k, nombre: nombreV };
          l.splice(k, 1); guardar(l); contador(); pintar();
          mostrarDeshacer();
        });
        acciones.appendChild(quitar);
        let cajaNota = null;
        if (conNotas) {
          const tieneNota = !!x.nota;
          const bNota = boton('solicitud-accion', null, 'bi-chat-left-text', tieneNota ? 'Editar la nota' : 'Añadir una nota');
          bNota.setAttribute('aria-expanded', String(tieneNota));
          const idNota = `nota-${x.id}`;
          bNota.setAttribute('aria-controls', idNota);
          cajaNota = el('div', 'solicitud-nota');
          cajaNota.id = idNota;
          cajaNota.hidden = !tieneNota;
          const etq = el('label', 'visually-hidden', `Nota sobre ${nombreV}`); etq.htmlFor = idNota + '-texto';
          const ta = el('textarea', 'form-control form-control-sm');
          Object.assign(ta, { id: idNota + '-texto', rows: 2, maxLength: MAX_NOTA, placeholder: 'P. ej. «¿Hacéis demostración?» o «La quiero con mueble»', value: x.nota || '' });
          ta.addEventListener('input', () => cambiar(x.id, it => { if (ta.value.trim()) it.nota = ta.value.slice(0, MAX_NOTA); else delete it.nota; }));
          cajaNota.append(etq, ta);
          bNota.addEventListener('click', () => {
            const abrir = cajaNota.hidden;
            cajaNota.hidden = !abrir;
            bNota.setAttribute('aria-expanded', String(abrir));
            if (abrir) ta.focus();
          });
          acciones.appendChild(bNota);
        }
        datos.appendChild(acciones);
        li.appendChild(datos);

        // Unidades con − y +
        const cant = el('div', 'solicitud-cantidad');
        cant.setAttribute('role', 'group');
        cant.setAttribute('aria-label', `Unidades de ${nombreV}`);
        const menos = boton('solicitud-cantidad-boton', `Una unidad menos de ${nombreV}`, null, '−');
        const num = el('span', 'solicitud-cantidad-num', String(x.cantidad));
        num.setAttribute('aria-live', 'polite');
        const mas = boton('solicitud-cantidad-boton', `Una unidad más de ${nombreV}`, null, '+');
        menos.disabled = x.cantidad <= 1; mas.disabled = x.cantidad >= MAX_UNIDADES;
        menos.dataset.foco = `menos-${x.id}`; mas.dataset.foco = `mas-${x.id}`;
        menos.addEventListener('click', () => { cambiar(x.id, it => { it.cantidad = Math.max(1, it.cantidad - 1); }); pintar(menos.dataset.foco); });
        mas.addEventListener('click', () => { cambiar(x.id, it => { it.cantidad = Math.min(MAX_UNIDADES, it.cantidad + 1); }); pintar(mas.dataset.foco); });
        cant.append(menos, num, mas);
        li.appendChild(cant);

        const sub = el('div', 'solicitud-subtotal' + (pu == null ? ' consultar' : ''));
        if (pu == null) sub.textContent = 'A consultar';
        else {
          sub.appendChild(el('span', p.precioOferta != null ? 'precio-oferta' : '', euros.format(pu * x.cantidad)));
          const por = el('small', null, `${euros.format(pu)} / ud.`);
          if (p.precioOferta != null && p.precio != null) { por.append(' '); por.appendChild(el('del', 'precio-anterior', euros.format(p.precio))); }
          sub.appendChild(por);
        }
        li.appendChild(sub);
        if (cajaNota) li.appendChild(cajaNota);
        if (pu == null) aConsultar++; else suma += pu * x.cantidad;
        unidades += x.cantidad;
        items.appendChild(li);
      });
      // Resumen y barra del móvil
      const nProd = sol.length;
      const txtProductos = `${plural(nProd, 'producto', 'productos')}${unidades !== nProd ? ` (${plural(unidades, 'unidad', 'unidades')})` : ''}`;
      const set = (sel, t) => { const e = q(sel); if (e) e.textContent = t; };
      set('[data-resumen-productos]', txtProductos);
      set('[data-resumen-suma]', euros.format(suma));
      const filaConsultar = q('[data-resumen-consultar-fila]');
      if (filaConsultar) filaConsultar.hidden = !aConsultar;
      set('[data-resumen-consultar]', plural(aConsultar, 'producto', 'productos'));
      set('[data-solicitud-total]', euros.format(suma));
      set('[data-barra-productos]', `Total orientativo · ${plural(nProd, 'producto', 'productos')}${aConsultar ? ` (${aConsultar} a consultar)` : ''}`);
      set('[data-barra-total]', euros.format(suma));
      pintarAccesorios(sol);
      if (foco) { const b = pagina.querySelector(`[data-foco="${foco}"]`); if (b && !b.disabled) b.focus(); else if (b) b.parentElement.querySelector('button:not([disabled])')?.focus(); }
    }

    // Accesorios compatibles con las máquinas de la solicitud (los que aún no están en ella)
    function pintarAccesorios(sol) {
      const caja = q('[data-solicitud-accesorios]');
      if (!caja) return;
      const dentro = new Set(sol.map(x => x.id));
      const ids = [...new Set(sol.flatMap(x => productos.get(x.id).accesorios || []))].filter(id => !dentro.has(id) && productos.has(id)).slice(0, 6);
      const lista = q('[data-solicitud-sugerencias]');
      lista.textContent = '';
      ids.forEach(id => {
        const p = productos.get(id);
        const fila = el('div', 'solicitud-sugerencia');
        if (p.imagen) { const img = el('img'); img.src = p.imagen; img.alt = ''; img.width = 48; img.height = 48; img.loading = 'lazy'; fila.appendChild(img); }
        else fila.appendChild(el('span', 'producto-sin-foto'));
        const t = el('span', 'solicitud-sugerencia-texto');
        const a = el('a', null, p.nombre); a.href = p.url;
        const pu = precioUnidad(p);
        t.append(a, el('small', null, pu == null ? 'Precio a consultar' : euros.format(pu)));
        fila.appendChild(t);
        const b = boton('tarjeta-anadir', `Añadir ${p.nombre} a la solicitud`, 'bi-plus-lg');
        b.addEventListener('click', () => {
          const l = leer();
          if (!l.some(y => y.id === id)) l.push({ id, cantidad: 1 });
          guardar(l); contador(); pintar();
          avisoRapido.textContent = `${p.nombre}: añadido a tu solicitud.`;
        });
        fila.appendChild(b);
        lista.appendChild(fila);
      });
      caja.hidden = !ids.length;
    }

    // «Quitar» con «Deshacer» durante unos segundos
    const deshacer = q('[data-solicitud-deshacer]');
    function mostrarDeshacer() {
      if (!deshacer || !quitado) return;
      deshacer.querySelector('[data-deshacer-texto]').textContent = `Has quitado «${quitado.nombre}».`;
      deshacer.hidden = false;
      clearTimeout(esperaDeshacer);
      esperaDeshacer = setTimeout(() => { deshacer.hidden = true; quitado = null; }, 7000);
    }
    deshacer?.querySelector('[data-deshacer-boton]').addEventListener('click', () => {
      if (!quitado) return;
      const l = leer();
      if (!l.some(y => y.id === quitado.item.id)) l.splice(Math.min(quitado.pos, l.length), 0, quitado.item);
      guardar(l); contador(); pintar();
      quitado = null; deshacer.hidden = true;
    });

    // Pasos: «Tus datos» al llegar al formulario
    function paso(n) {
      if (!pasos) return;
      pasos.querySelectorAll('[data-paso]').forEach(li => {
        const k = +li.dataset.paso;
        li.classList.toggle('actual', k === n);
        li.classList.toggle('hecho', k < n);
      });
    }
    form.addEventListener('focusin', () => paso(2));
    pagina.querySelectorAll('[data-ir-datos]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => form.querySelector('input')?.focus({ preventScroll: true }), 400);
      paso(2);
    }));
    // En el móvil, la barra del total se esconde cuando se ve el formulario
    if (barra && 'IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => barra.classList.toggle('oculta', e.isIntersecting), { threshold: 0.15 }).observe(form);
    }

    /* ---------- Condiciones y protección de datos: leerlas antes de aceptar ---------- */
    const casilla = q('[data-legal-casilla]');
    const ventana = q('[data-legal-ventana]');
    if (casilla && ventana && window.bootstrap) {
      const modal = bootstrap.Modal.getOrCreateInstance(ventana);
      const pestanas = [...ventana.querySelectorAll('[data-legal-pestana]')];
      const leidos = new Set();
      const aceptar = ventana.querySelector('[data-legal-aceptar]');
      const pista = ventana.querySelector('[data-legal-pista]');
      const todos = () => pestanas.every(t => leidos.has(t.dataset.legalPestana));
      function marcarLeido(t) {
        leidos.add(t.dataset.legalPestana);
        t.classList.add('leido');
        aceptar.disabled = !todos();
        if (pista) pista.textContent = todos() ? '' : 'Abre también la otra pestaña para poder aceptar.';
      }
      pestanas.forEach(t => t.addEventListener('shown.bs.tab', () => marcarLeido(t)));
      ventana.addEventListener('shown.bs.modal', () => { const activa = pestanas.find(t => t.classList.contains('active')); if (activa) marcarLeido(activa); });
      function abrir(cual) {
        const t = pestanas.find(x => x.dataset.legalPestana === cual) || pestanas.find(x => !leidos.has(x.dataset.legalPestana)) || pestanas[0];
        bootstrap.Tab.getOrCreateInstance(t).show();
        modal.show();
      }
      pagina.querySelectorAll('[data-legal-abrir]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); abrir(a.dataset.legalAbrir); }));
      casilla.addEventListener('click', e => {
        if (casilla.checked && !todos()) { e.preventDefault(); abrir(); }
      });
      aceptar.addEventListener('click', () => {
        casilla.checked = true;
        casilla.dispatchEvent(new Event('change', { bubbles: true }));
        modal.hide();
        casilla.focus();
      });
    }

    fetch(pagina.dataset.datos, { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(datos => {
        productos = new Map(datos.map(p => [p.id, p]));
        const antes = leer();
        const validos = antes.filter(x => productos.has(x.id));
        if (validos.length < antes.length) {
          guardar(validos);
          const n = antes.length - validos.length;
          aviso.textContent = `${n} ${n === 1 ? 'producto de tu solicitud ya no está disponible y se ha quitado' : 'productos de tu solicitud ya no están disponibles y se han quitado'}.`;
          aviso.hidden = false;
        }
        q('[data-solicitud-cargando]').hidden = true;
        contador();
        pintar();
      })
      .catch(() => { q('[data-solicitud-cargando]').textContent = 'No se ha podido cargar tu solicitud. Vuelve a intentarlo en unos minutos.'; });

    /* ---------- Validación de los datos (además de «required»: sin espacios sueltos) ---------- */
    const limpiar = v => v.replace(/\s+/g, ' ').trim();
    const REGLAS = {
      nombre: v => (/\p{L}.*\p{L}/u.test(v) ? '' : 'Escribe tu nombre (al menos dos letras).'),
      telefono: v => {
        const cifras = v.replace(/\D/g, '').length;
        if (!/^[0-9+()\s.\-]+$/.test(v)) return 'El teléfono solo puede tener cifras, espacios y los signos + ( ) . -';
        return cifras >= 9 && cifras <= 15 ? '' : 'Escribe un teléfono con 9 cifras como mínimo.';
      },
      correo: v => (/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i.test(v) ? '' : 'Escribe un correo válido, p. ej. nombre@ejemplo.es.'),
    };
    function validarCampo(input) {
      const regla = REGLAS[input.name];
      if (!regla) return;
      const v = limpiar(input.value);
      const error = !v ? (input.name === 'nombre' ? 'Escribe tu nombre.' : input.name === 'telefono' ? 'Escribe tu teléfono.' : 'Escribe tu correo electrónico.') : regla(v);
      input.setCustomValidity(error);
      const fb = input.parentElement.querySelector('.invalid-feedback');
      if (fb && error) fb.textContent = error;
    }
    Object.keys(REGLAS).forEach(n => {
      const input = form.elements[n];
      if (!input) return;
      input.addEventListener('input', () => validarCampo(input));
      // Al salir del campo se quitan los espacios sobrantes (y en el correo, todos)
      input.addEventListener('blur', () => {
        input.value = n === 'correo' ? input.value.replace(/\s+/g, '') : limpiar(input.value);
        validarCampo(input);
      });
    });
    const obs = form.elements.observaciones;
    obs?.addEventListener('blur', () => { obs.value = obs.value.trim(); });

    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const resultado = q('[data-solicitud-resultado]');
      Object.keys(REGLAS).forEach(n => { const i = form.elements[n]; if (i) { i.value = n === 'correo' ? i.value.replace(/\s+/g, '') : limpiar(i.value); validarCampo(i); } });
      if (obs) obs.value = obs.value.trim();
      form.classList.add('was-validated');
      if (!form.checkValidity()) {
        resultado.className = 'mt-3 text-danger fw-semibold';
        resultado.textContent = 'Revisa los campos marcados.';
        const primero = form.querySelector(':invalid'); if (primero) primero.focus();
        return;
      }
      paso(3);
      // PROVISIONAL (fase 5): todavía no hay función de envío ni hoja de Google conectada
      resultado.className = 'mt-3 alert alert-info';
      resultado.textContent = 'Todavía no se pueden enviar solicitudes desde la web: el envío se activará en breve. Mientras tanto, llámanos o escríbenos (ver Contacto y horario). Tu solicitud se queda guardada en este navegador.';
    });
  }

  contador();
})();
