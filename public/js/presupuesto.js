/*
  Solicitud de presupuesto en el navegador (solo se carga si está activa en
  Decap → Solicitud de presupuesto):
  - Contador del menú: número de productos de la solicitud.
  - Fichas: botón «Añadir a la solicitud» (data-anadir-solicitud).
  - /presupuesto/: lista con cantidades, quitar productos, total orientativo y formulario.
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
  const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

  function leer() {
    try {
      const v = JSON.parse(localStorage.getItem(CLAVE) || '[]');
      return Array.isArray(v) ? v.filter(x => x && typeof x.id === 'string')
        .map(x => ({ id: x.id, cantidad: Math.min(MAX_UNIDADES, Math.max(1, parseInt(x.cantidad, 10) || 1)) })) : [];
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

  /* ---------- Fichas: «Añadir a la solicitud» ---------- */
  document.querySelectorAll('[data-anadir-solicitud]').forEach(boton => {
    const id = boton.dataset.anadirSolicitud;
    const caja = boton.parentElement;
    const ver = caja.querySelector('[data-ver-solicitud]');
    const estado = caja.parentElement.querySelector('[data-estado-solicitud]');
    const texto = boton.querySelector('span');
    function pintar(mensaje) {
      const esta = leer().some(x => x.id === id);
      texto.textContent = esta ? 'Añadir otra unidad' : 'Añadir a la solicitud';
      if (ver) ver.hidden = !esta;
      if (estado) estado.textContent = mensaje || (esta ? `En tu solicitud: ${leer().find(x => x.id === id).cantidad} ud.` : '');
    }
    boton.hidden = false;
    boton.addEventListener('click', () => {
      const lista = leer();
      const actual = lista.find(x => x.id === id);
      if (actual) actual.cantidad = Math.min(MAX_UNIDADES, actual.cantidad + 1);
      else lista.push({ id, cantidad: 1 });
      if (!guardar(lista)) { pintar('No se ha podido guardar: tu navegador no permite guardar datos de esta web.'); return; }
      contador();
      pintar(actual ? `Ahora tienes ${actual.cantidad} ud. en tu solicitud.` : 'Añadido a tu solicitud.');
    });
    pintar();
  });

  /* ---------- Página /presupuesto/ ---------- */
  const pagina = document.querySelector('[data-solicitud]');
  if (pagina) {
    const q = s => pagina.querySelector(s);
    const lista = q('[data-solicitud-lista]');
    const items = q('[data-solicitud-items]');
    const vacia = q('[data-solicitud-vacia]');
    const aviso = q('[data-solicitud-aviso]');
    const form = q('[data-solicitud-form]');
    const total = q('[data-solicitud-total]');
    let productos = new Map();

    function precioUnidad(p) {
      return p.precioOferta != null ? p.precioOferta : p.precio;
    }

    function pintar() {
      const sol = leer().filter(x => productos.has(x.id));
      vacia.hidden = sol.length > 0;
      lista.hidden = form.hidden = sol.length === 0;
      items.textContent = '';
      let suma = 0, aConsultar = 0;
      sol.forEach(x => {
        const p = productos.get(x.id);
        const li = el('li', 'solicitud-item');
        if (p.imagen) {
          const img = el('img', 'solicitud-foto rounded');
          img.src = p.imagen; img.alt = ''; img.width = 72; img.height = 72; img.loading = 'lazy';
          li.appendChild(img);
        } else li.appendChild(el('span', 'solicitud-foto rounded producto-sin-foto'));

        const datos = el('div', 'solicitud-datos');
        const a = el('a', 'fw-semibold', p.nombre); a.href = p.url;
        datos.appendChild(a);
        datos.appendChild(el('div', 'small text-body-secondary', [p.fabricante, p.modelo && `Modelo ${p.modelo}`].filter(Boolean).join(' · ')));
        const pu = precioUnidad(p);
        const precio = el('div', 'small');
        if (pu == null) precio.textContent = 'Precio a consultar';
        else {
          precio.appendChild(el('span', p.precioOferta != null ? 'precio-oferta fw-semibold' : '', `${euros.format(pu)} / ud.`));
          if (p.precioOferta != null && p.precio != null) { precio.append(' '); precio.appendChild(el('del', 'precio-anterior', euros.format(p.precio))); }
        }
        datos.appendChild(precio);
        li.appendChild(datos);

        const cant = el('div', 'solicitud-cantidad');
        const idInput = `cant-${x.id}`;
        const etq = el('label', 'visually-hidden', `Unidades de ${p.nombre}`); etq.htmlFor = idInput;
        const input = el('input', 'form-control form-control-sm');
        Object.assign(input, { type: 'number', id: idInput, min: 1, max: MAX_UNIDADES, step: 1, value: x.cantidad, inputMode: 'numeric' });
        input.addEventListener('change', () => {
          const v = Math.min(MAX_UNIDADES, Math.max(1, parseInt(input.value, 10) || 1));
          const l = leer(); const it = l.find(y => y.id === x.id);
          if (it) { it.cantidad = v; guardar(l); }
          pintar();
          const nuevo = document.getElementById(idInput); if (nuevo) nuevo.focus();
        });
        cant.append(etq, el('span', 'small text-body-secondary me-1', 'Ud.'), input);
        li.appendChild(cant);

        const sub = el('div', 'solicitud-subtotal fw-semibold text-end', pu == null ? 'A consultar' : euros.format(pu * x.cantidad));
        li.appendChild(sub);
        if (pu == null) aConsultar++; else suma += pu * x.cantidad;

        const quitar = el('button', 'btn btn-link text-danger p-1 solicitud-quitar');
        quitar.type = 'button';
        quitar.setAttribute('aria-label', `Quitar ${p.nombre} de la solicitud`);
        quitar.title = 'Quitar';
        quitar.appendChild(el('i', 'bi bi-trash')).setAttribute('aria-hidden', 'true');
        quitar.addEventListener('click', () => { guardar(leer().filter(y => y.id !== x.id)); contador(); pintar(); });
        li.appendChild(quitar);
        items.appendChild(li);
      });
      total.textContent = euros.format(suma) + (aConsultar ? ` (más ${aConsultar} ${aConsultar === 1 ? 'producto' : 'productos'} a consultar)` : '');
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

    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const resultado = q('[data-solicitud-resultado]');
      form.classList.add('was-validated');
      if (!form.checkValidity()) {
        resultado.className = 'mt-3 text-danger fw-semibold';
        resultado.textContent = 'Revisa los campos marcados.';
        const primero = form.querySelector(':invalid'); if (primero) primero.focus();
        return;
      }
      // PROVISIONAL (fase 5): todavía no hay función de envío ni hoja de Google conectada
      resultado.className = 'mt-3 alert alert-info';
      resultado.textContent = 'Todavía no se pueden enviar solicitudes desde la web: el envío se activará en breve. Mientras tanto, llámanos o escríbenos (ver Contacto y horario). Tu solicitud se queda guardada en este navegador.';
    });
  }

  contador();
})();
