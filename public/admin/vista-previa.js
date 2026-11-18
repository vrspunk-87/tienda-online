/*
  Vista previa del panel de Decap con el aspecto real de la web.
  Usa los mismos estilos que la web (tema, estilos.css y los colores de los Ajustes del sitio) y
  plantillas con la misma estructura que las páginas que genera scripts/build.js para:
    - entradas del blog y páginas (con los marcadores {titular}, {correo}… ya rellenos);
    - productos (ficha: fotos, precio u oferta, características y ficha técnica);
    - Contacto y horario, Sobre nosotros y la Solicitud de presupuesto.
  Es una vista aproximada: la página real la genera el build al publicar (fotos optimizadas,
  accesorios compatibles, menú, pie…). Los nombres del catálogo, los fabricantes y los datos de la
  tienda salen de /admin/datos-panel.json (los del último despliegue).
  Los cambios en Ajustes del sitio se ven aquí tras el siguiente despliegue.
*/
(function () {
  if (!window.CMS) return;
  const h = window.h;
  const createClass = window.createClass;

  CMS.registerPreviewStyle('/css/tema.css');
  CMS.registerPreviewStyle('/css/estilos.css');
  CMS.registerPreviewStyle('/css/personalizado.css');
  CMS.registerPreviewStyle(`
    .vp-nota { margin: 0 0 1rem; padding: .45rem .8rem; border-radius: .5rem; background: #fff8e1; color: #6b5300; font-size: .8rem; }
    .vp-nota b { font-weight: 700; }
    body { background: var(--bs-body-bg); }
  `, { raw: true });

  /* ---------- Datos del último despliegue ---------- */
  let DATOS = {};
  const cargando = fetch('/admin/datos-panel.json', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : {})).then(d => { DATOS = d || {}; }).catch(() => {});
  // Cada plantilla se vuelve a pintar cuando llegan los datos
  const conDatos = def => createClass(Object.assign({}, def, {
    componentDidMount() {
      cargando.then(() => this.forceUpdate());
      if (def.componentDidMount) def.componentDidMount.call(this);
    },
  }));

  /* ---------- Utilidades ---------- */
  const ZONA = 'Europe/Madrid';
  const js = v => (v && typeof v.toJS === 'function' ? v.toJS() : v);
  const dato = (props, ...ruta) => js(props.entry.getIn(['data', ...ruta]));
  const fecha = v => {
    const d = v ? new Date(v) : null;
    return d && !isNaN(d) ? d.toLocaleDateString('es-ES', { timeZone: ZONA, day: 'numeric', month: 'long', year: 'numeric' }) : '';
  };
  const fechaCorta = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: ZONA });
  const num = v => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));
  // Como en la web: 1.155 € / 454,96 €
  const euros = v => {
    const n = Number(v);
    const redondo = Math.abs(n - Math.round(n)) < 0.005;
    const [e, d] = (redondo ? String(Math.round(n)) : n.toFixed(2)).split('.');
    return e.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : '') + ' €';
  };
  const asset = (props, ruta) => (ruta ? props.getAsset(ruta).toString() : '');
  const icono = (clase, extra) => h('i', { className: `bi ${clase}${extra ? ' ' + extra : ''}`, 'aria-hidden': 'true' });
  const nota = texto => h('p', { className: 'vp-nota' }, h('b', null, 'Vista previa aproximada. '), texto || 'La página real se genera al publicar.');

  // Marcadores de los textos legales ({titular}, {correo}…), como hace el build
  const MARCADORES = /\{(titular|nif|nombre_comercial|direccion|correo|telefono)\}/g;
  const rellenar = texto => String(texto ?? '').replace(MARCADORES, (m, k) =>
    (DATOS.legales && DATOS.legales[k]) || `[${(DATOS.huecos && DATOS.huecos[k]) || k}]`);
  // En el texto ya convertido de Markdown (widgetFor) se rellenan recorriendo sus nodos de texto
  function rellenarEn(el) {
    if (!el) return;
    const w = el.ownerDocument.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeValue.includes('{')) { const v = rellenar(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
    }
  }

  const migas = (items, volver) => h('nav', { className: 'migas mb-3', 'aria-label': 'Estás en' },
    volver ? h('span', { className: 'migas-volver' }, icono('bi-arrow-left'), h('span', null, volver)) : null,
    h('ol', { className: 'breadcrumb mb-0' },
      h('li', { className: 'breadcrumb-item' }, icono('bi-house-door-fill', 'migas-casa')),
      ...items.filter(Boolean).map((t, i, a) => h('li', { key: i, className: 'breadcrumb-item' + (i === a.length - 1 ? ' active' : '') }, h('span', { className: 'migas-t' }, t)))));

  const imagen = (props, campo, campoAlt) => {
    const ruta = dato(props, campo);
    if (!ruta) return null;
    return h('img', { src: asset(props, ruta), alt: dato(props, campoAlt) || '', className: 'img-fluid rounded my-4' });
  };

  /* ---------- Blog ---------- */
  const Entrada = createClass({
    render() {
      const d = campo => dato(this.props, campo);
      return h('main', { className: 'container seccion articulo' },
        h('time', { className: 'text-body-secondary' }, fecha(d('date'))),
        h('h1', { className: 'display-5 fw-bold mt-1' }, d('title')),
        imagen(this.props, 'thumbnail', 'thumbnail_alt'),
        h('div', { className: 'articulo-cuerpo mt-4' }, this.props.widgetFor('body')));
    },
  });

  /* ---------- Páginas (aviso legal, privacidad…) ---------- */
  const Pagina = conDatos({
    componentDidMount() { rellenarEn(this.cuerpo); },
    componentDidUpdate() { rellenarEn(this.cuerpo); },
    render() {
      const d = campo => dato(this.props, campo);
      return h('main', { className: 'container seccion articulo' },
        nota('Los datos de la tienda ({titular}, {correo}…) se rellenan con los de «Contacto y horario» publicados.'),
        migas([d('title')], 'Inicio'),
        h('h1', { className: 'titulo-marca display-5 fw-bold' }, d('title')),
        d('description') ? h('p', { className: 'lead text-body-secondary' }, d('description')) : null,
        imagen(this.props, 'imagen', 'imagen_alt'),
        h('div', { className: 'articulo-cuerpo mt-4', ref: el => { this.cuerpo = el; } }, this.props.widgetFor('body')));
    },
  });

  /* ---------- Producto (ficha) ---------- */
  const Producto = conDatos({
    render() {
      const p = this.props;
      const d = (...r) => dato(p, ...r);
      const cat = (DATOS.categorias || {})[d('categoria')];
      const fab = (DATOS.fabricantes || {})[d('fabricante')] || { nombre: d('fabricante') || '' };
      const fotos = (d('imagenes') || []).filter(x => x && x.imagen);
      const segunda = d('condicion') === 'segunda_mano';
      const oferta = d('oferta') || {};
      const h0 = hoy();
      const enOferta = d('estado') === 'oferta' && num(oferta.precio) != null
        && (!oferta.inicio || oferta.inicio <= h0) && (!oferta.fin || h0 <= oferta.fin);
      const precio = num(d('precio'));
      const dos = DATOS.tipoDosPrecios && cat && cat.tipo === DATOS.tipoDosPrecios && num(d('precio_cabezal')) != null;
      const linea = (normal, rebajado) => (rebajado != null
        ? [h('span', { key: 'o', className: 'precio precio-oferta' }, euros(rebajado)),
          normal != null ? h('del', { key: 'a', className: 'precio-anterior' }, ' ', euros(normal)) : null,
          normal != null ? h('span', { key: 'd', className: 'badge descuento' }, `-${Math.round((1 - rebajado / normal) * 100)} %`) : null]
        : normal != null ? h('span', { className: 'precio' }, euros(normal)) : h('span', { className: 'precio precio-consultar' }, 'Precio a consultar'));
      const precioBloque = dos
        ? h('div', { className: 'ficha-versiones' },
          ...[['Completa', precio, enOferta ? num(oferta.precio) : null], ['Cabezal', num(d('precio_cabezal')), enOferta ? num(oferta.precio_cabezal) : null]]
            .map(([n, v, o]) => h('div', { key: n, className: 'ficha-version' },
              h('span', { className: 'ficha-version-nombre' }, n), h('span', { className: 'ficha-version-precio' }, linea(v, o)))))
        : h('div', { className: 'ficha-precio' }, linea(precio, enOferta ? num(oferta.precio) : null));
      const tabla = [
        ['Fabricante', fab.nombre], ['Modelo', d('modelo')], ['Referencia', d('referencia')],
        ['Condición', segunda ? 'Segunda mano' : 'Nuevo'], ['Categoría', cat ? cat.titulo : d('categoria')],
      ].filter(x => x[1]);
      const caracteristicas = (d('caracteristicas') || []).filter(c => c && c.valor);
      const destacados = (d('destacados') || []).filter(x => x && x.texto);
      const ventajas = (DATOS.solicitud && DATOS.solicitud.ventajas) || [];
      const iconos = (DATOS.solicitud && DATOS.solicitud.iconos) || {};
      const sm = d('segunda_mano') || {};
      const contacto = DATOS.contacto || {};
      return h('main', { className: 'container seccion' },
        nota(d('estado') === 'no_disponible' ? 'Este producto está como «No disponible»: no se ve en la web.'
          : 'Las fotos se optimizan y los accesorios compatibles se añaden al publicar.'),
        migas(['Catálogo', ...(cat ? cat.ruta : []), d('title')], cat ? cat.titulo : 'Catálogo'),
        h('article', { className: 'ficha' },
          h('div', { className: 'ficha-rejilla' },
            h('div', { className: 'ficha-medios' },
              h('div', { className: 'ficha-galeria' + (fotos.length > 1 ? ' con-miniaturas' : '') },
                fotos.length > 1 ? h('ul', { className: 'ficha-miniaturas' }, ...fotos.map((f, i) =>
                  h('li', { key: i }, h('span', { className: 'ficha-miniatura' + (i === 0 ? ' activa' : '') }, h('img', { src: asset(p, f.imagen), alt: '' }))))) : null,
                h('div', { className: 'ficha-visor' },
                  fotos.length
                    ? h('div', { className: 'ficha-carril' }, h('figure', { className: 'ficha-diapositiva' }, h('img', { src: asset(p, fotos[0].imagen), alt: fotos[0].alt || '' })))
                    : h('div', { className: 'producto-sin-foto d-grid', style: { placeItems: 'center', minHeight: '300px', fontSize: '3rem', color: '#adb5bd' } }, icono('bi-image')),
                  fotos.length > 1 ? h('span', { className: 'ficha-contador' }, `1 / ${fotos.length}`) : null))),
            h('div', { className: 'ficha-info' },
              h('div', { className: 'ficha-marca' },
                fab.imagen ? h('img', { src: fab.imagen, alt: '', className: 'logo-fabricante', height: 26 }) : h('span', { className: 'ficha-marca-nombre' }, fab.nombre),
                h('span', { className: 'pildora' }, segunda ? 'Segunda mano' : 'Nuevo')),
              h('h1', { className: 'ficha-titulo' }, d('title')),
              h('p', { className: 'ficha-subtitulo' }, [d('modelo') ? `Modelo ${d('modelo')}` : '', d('referencia') ? `Ref. ${d('referencia')}` : ''].filter(Boolean).join(' · ')),
              h('div', { className: 'caja-pespunte ficha-compra' },
                precioBloque,
                enOferta && oferta.fin ? h('p', { className: 'ficha-oferta' }, icono('bi-clock-history'), `Oferta hasta el ${fechaCorta(oferta.fin)}`) : null,
                d('estado') === 'oferta' && !enOferta ? h('p', { className: 'ficha-oferta' }, icono('bi-clock-history'), 'Oferta fuera de fechas (o sin precio de oferta): hoy se ve el precio normal') : null,
                h('p', { className: 'ficha-iva' }, 'Precio orientativo, IVA incluido. Te confirmamos la disponibilidad y el precio final.'),
                DATOS.solicitud && DATOS.solicitud.activa === false ? null
                  : h('div', { className: 'ficha-accion' }, h('span', { className: 'btn btn-destacado btn-lg ficha-anadir' }, icono('bi-clipboard-plus', 'me-2'), 'Añadir a la solicitud')),
                h('div', { className: 'ficha-contacto' },
                  contacto.whatsapp ? h('span', { className: 'ficha-contacto-boton whatsapp' }, icono('bi-whatsapp'), 'Preguntar por WhatsApp') : null,
                  contacto.telefono ? h('span', { className: 'ficha-contacto-boton' }, icono('bi-telephone'), 'Llamar') : null),
                ventajas.length ? h('ul', { className: 'ficha-ventajas' }, ...ventajas.map((v, i) =>
                  h('li', { key: i }, icono(iconos[v.icono] || iconos.check || 'bi-check-circle-fill'), v.texto))) : null))),
          h('div', { className: 'ficha-pestanas' },
            h('div', { className: 'ficha-pestanas-nav' },
              h('span', { className: 'ficha-pestana active' }, 'Descripción'),
              destacados.length ? h('span', { className: 'ficha-pestana' }, 'Características') : null,
              h('span', { className: 'ficha-pestana' }, 'Ficha técnica')),
            h('section', { className: 'ficha-panel' }, h('div', { className: 'articulo-cuerpo ficha-descripcion' }, p.widgetFor('body'))),
            destacados.length ? h('section', { className: 'ficha-panel' }, h('h2', { className: 'h5 fw-bold mt-4' }, 'Características'),
              h('ul', { className: 'ficha-destacados' }, ...destacados.map((x, i) => h('li', { key: i }, icono('bi-check-circle-fill'), x.texto)))) : null,
            h('section', { className: 'ficha-panel' }, h('h2', { className: 'h5 fw-bold mt-4' }, 'Ficha técnica'),
              h('table', { className: 'ficha-tabla' }, h('tbody', null,
                ...tabla.map(([k, v], i) => h('tr', { key: 't' + i }, h('th', { scope: 'row' }, k), h('td', null, v))),
                ...caracteristicas.map((c, i) => (c.nombre
                  ? h('tr', { key: 'c' + i }, h('th', { scope: 'row' }, c.nombre), h('td', null, c.valor))
                  : h('tr', { key: 'c' + i }, h('td', { colSpan: 2 }, c.valor)))),
                segunda && sm.estado ? h('tr', { key: 'se' }, h('th', { scope: 'row' }, 'Estado'), h('td', null, sm.estado)) : null,
                segunda ? h('tr', { key: 'sg' }, h('th', { scope: 'row' }, 'Garantía'), h('td', null, `${sm.garantia || 12} meses`)) : null))))));
    },
  });

  /* ---------- Contacto y horario ---------- */
  const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const NOMBRE_DIA = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
  const nombreDias = dias => {
    const idx = (dias || []).map(x => DIAS.indexOf(x)).filter(i => i >= 0).sort((a, b) => a - b);
    if (!idx.length) return '';
    const seguidos = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    if (idx.length > 2 && seguidos) return `${NOMBRE_DIA[DIAS[idx[0]]]} a ${NOMBRE_DIA[DIAS[idx[idx.length - 1]]].toLowerCase()}`;
    return idx.map((v, i) => (i ? NOMBRE_DIA[DIAS[v]].toLowerCase() : NOMBRE_DIA[DIAS[v]])).join(', ').replace(/, ([^,]+)$/, ' y $1');
  };
  const ICONOS_LLEGAR = { aparcamiento: 'bi-p-square-fill', referencia: 'bi-signpost-2-fill', accesible: 'bi-universal-access', bus: 'bi-bus-front-fill', check: 'bi-check-circle-fill' };
  const Contacto = conDatos({
    render() {
      const d = (...r) => dato(this.props, ...r);
      const wa = String(d('whatsapp') || '').replace(/\D/g, '');
      const waVer = wa.replace(/^34(?=\d{9}$)/, '').replace(/^(\d{3})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4');
      const dir = [d('direccion'), [d('codigo_postal'), d('localidad')].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      const vias = [
        d('telefono') && ['bi-telephone-fill', 'Llámanos', d('telefono'), 'Llamar', ''],
        wa && ['bi-whatsapp', 'WhatsApp', waVer, 'Escribir', ' whatsapp'],
        d('correo') && ['bi-envelope-fill', 'Correo', d('correo'), 'Escribir', ''],
        d('direccion') && ['bi-geo-alt-fill', 'Dirección', [d('direccion'), d('localidad')].filter(Boolean).join(', '), 'Cómo llegar', ''],
      ].filter(Boolean);
      const horario = (d('horario') || []).filter(f => f && (f.dias || []).length);
      const llegar = (d('como_llegar') || []).filter(x => x && x.texto);
      const aviso = d('aviso') || {};
      return h('main', null,
        h('section', { className: 'pagina-cabecera' }, h('div', { className: 'container' },
          nota('El mapa, el estado «Abierto / Cerrado» y los botones funcionan en la web publicada.'),
          migas([d('titulo') || 'Contacto y horario'], 'Inicio'),
          d('provisional') ? h('div', { className: 'aviso-provisional' }, icono('bi-pencil-square'), 'Datos de ejemplo: cámbialos en el panel («Contacto y horario») y desmarca «Textos de ejemplo».') : null,
          h('h1', { className: 'titulo-marca pagina-titulo' }, d('titulo') || 'Contacto y horario'),
          d('introduccion') ? h('p', { className: 'pagina-intro' }, d('introduccion')) : null)),
        h('div', { className: 'container contacto' },
          h('ul', { className: 'contacto-vias' }, ...vias.map(([ic, t, v, acc, extra], i) => h('li', { key: i },
            h('span', { className: 'contacto-via' + extra }, h('span', { className: 'contacto-via-icono' }, icono(ic)),
              h('b', null, t), h('span', { className: 'contacto-via-dato' }, v),
              h('span', { className: 'contacto-via-accion' }, acc, ' ', icono('bi-arrow-right')))))),
          h('div', { className: 'contacto-rejilla' },
            h('section', { className: 'caja-pespunte' },
              h('h2', { className: 'caja-pespunte-titulo' }, icono('bi-clock-fill'), 'Horario'),
              h('table', { className: 'horario-tabla' }, h('tbody', null, ...horario.map((f, i) => {
                const tramos = [f.manana, f.tarde].filter(t => t && String(t).trim()).map(t => String(t).replace('-', '–'));
                return h('tr', { key: i }, h('th', { scope: 'row' }, nombreDias(f.dias)), h('td', null, tramos.length ? tramos.join(' · ') : 'Cerrado'));
              }))),
              d('nota_horario') ? h('p', { className: 'horario-nota' }, d('nota_horario')) : null,
              aviso.texto ? h('p', { className: 'horario-nota' }, h('b', null, 'Aviso: '), aviso.texto, aviso.hasta ? ` (hasta el ${fechaCorta(aviso.hasta)})` : '') : null),
            h('section', { className: 'caja-pespunte' },
              h('h2', { className: 'caja-pespunte-titulo' }, icono('bi-map-fill'), 'Cómo llegar'),
              h('div', { className: 'mapa' }, h('div', { className: 'mapa-tarjeta' }, icono('bi-geo-alt-fill', 'mapa-pin'),
                h('b', null, DATOS.tienda || ''), h('span', null, [dir, d('provincia') ? `(${d('provincia')})` : ''].filter(Boolean).join(' ')))),
              llegar.length ? h('ul', { className: 'contacto-llegar' }, ...llegar.map((x, i) =>
                h('li', { key: i }, icono(ICONOS_LLEGAR[x.icono] || 'bi-check-circle-fill'), x.texto))) : null)),
          h('p', { className: 'text-body-secondary small mt-4' }, `Titular: ${d('titular') || '—'} · NIF: ${d('nif') || '—'} (salen en los textos legales; el NIF, solo en el aviso legal).`)));
    },
  });

  /* ---------- Sobre nosotros ---------- */
  const Sobre = conDatos({
    render() {
      const p = this.props;
      const d = (...r) => dato(p, ...r);
      const anio = parseInt(d('desde'), 10);
      const anos = Number.isFinite(anio) ? new Date().getFullYear() - anio : null;
      const cifra = n => String(n ?? '').replace('{años}', anos != null ? `+${anos}` : '').replace('{marcas}', String(DATOS.marcas ?? '')).trim();
      const cifras = (d('cifras') || []).filter(c => c && c.numero);
      const galeria = ((d('galeria') || {}).fotos || []).filter(f => f && f.imagen);
      const servicios = (d('servicios') || []).filter(x => x && x.titulo);
      const porque = d('porque') || {};
      const razones = (porque.lista || []).filter(x => x && x.titulo);
      const historia = (d('historia') || []).filter(x => x && x.texto);
      const iconos = (DATOS.solicitud && DATOS.solicitud.iconos) || {};
      const caja = (x, i) => h('div', { key: i, className: 'caja-icono' },
        h('span', { className: 'caja-icono-icono' }, icono(iconos[x.icono] || iconos.check || 'bi-check-circle-fill')),
        h('h3', null, x.titulo), x.texto ? h('p', null, x.texto) : null,
        x.enlace_texto ? h('span', { className: 'enlace-flecha' }, x.enlace_texto, ' ', icono('bi-arrow-right')) : null);
      const titulo = d('titulo') || 'Sobre nosotros';
      return h('main', null,
        h('section', { className: 'container sobre-cabecera' },
          nota('Las marcas con las que trabajáis y el bloque «Ven a conocernos» se añaden al publicar.'),
          migas(['Sobre nosotros'], 'Inicio'),
          d('provisional') ? h('div', { className: 'aviso-provisional' }, icono('bi-pencil-square'), 'Textos de ejemplo: cámbialos en el panel («Sobre nosotros») y desmarca «Textos de ejemplo».') : null,
          h('div', { className: 'sobre-rejilla' },
            h('div', null,
              d('antetitulo') ? h('p', { className: 'antetitulo' }, d('antetitulo')) : null,
              h('h1', { className: 'titulo-marca sobre-titulo' }, titulo),
              h('div', { className: 'sobre-texto' }, p.widgetFor('texto')),
              cifras.length ? h('ul', { className: 'sobre-cifras' }, ...cifras.map((c, i) => h('li', { key: i }, h('b', null, cifra(c.numero)), h('span', null, c.texto)))) : null),
            h('div', { className: 'sobre-foto' + (d('foto_marco') === false ? ' sobre-foto-libre' : '') },
              d('foto') ? h('img', { src: asset(p, d('foto')), alt: d('foto_alt') || '' })
                : h('div', { className: 'sobre-foto-vacia' }, icono('bi-scissors'), h('span', null, DATOS.tienda || '')),
              Number.isFinite(anio) ? h('span', { className: 'sobre-sello' }, h('span', null, 'desde'), h('b', null, anio)) : null))),
        galeria.length ? h('section', { className: 'container seccion pt-0' },
          h('div', { className: 'titulo-bloque' }, h('h2', null, (d('galeria') || {}).titulo || 'Nuestra tienda')),
          h('div', { className: 'sobre-galeria' }, ...galeria.map((f, i) => h('figure', { key: i },
            h('img', { src: asset(p, f.imagen), alt: f.alt || '' }), f.pie ? h('figcaption', null, f.pie) : null)))) : null,
        servicios.length ? h('section', { className: 'container seccion pt-0' },
          h('div', { className: 'titulo-bloque' }, h('h2', null, 'Qué hacemos')), h('div', { className: 'cajas-icono' }, ...servicios.map(caja))) : null,
        razones.length ? h('section', { className: 'bg-body-tertiary seccion' }, h('div', { className: 'container' },
          h('div', { className: 'titulo-bloque' }, h('h2', null, porque.titulo || 'Por qué comprar con nosotros')),
          h('div', { className: 'cajas-icono' }, ...razones.map(caja)))) : null,
        historia.length ? h('section', { className: 'container seccion' },
          h('div', { className: 'titulo-bloque' }, h('h2', null, 'Nuestra historia')),
          h('ol', { className: 'sobre-historia' }, ...historia.map((x, i) => h('li', { key: i }, h('b', null, String(x['año'] ?? '')), h('span', null, x.texto))))) : null);
    },
  });

  /* ---------- Solicitud de presupuesto ---------- */
  const OPCIONES = { llamada: ['Llamada', 'bi-telephone'], whatsapp: ['WhatsApp', 'bi-whatsapp'], correo: ['Correo', 'bi-envelope'] };
  const Solicitud = conDatos({
    render() {
      const d = (...r) => dato(this.props, ...r);
      if (d('activa') === false) {
        return h('main', { className: 'container seccion' }, nota('La solicitud de presupuesto está desactivada: no se ve en la web ni el botón «Añadir a la solicitud».'));
      }
      const pref = d('preferencia_contacto') || {};
      const opciones = (pref.opciones && pref.opciones.length ? pref.opciones : ['llamada', 'whatsapp', 'correo']).filter(o => OPCIONES[o]);
      const ventajas = (d('ventajas') || []).filter(v => v && v.texto);
      const iconos = (DATOS.solicitud && DATOS.solicitud.iconos) || {};
      const acuse = d('acuse') || {};
      const campo = (t, ancho) => h('div', { className: ancho ? 'ancho' : '' },
        h('label', { className: 'form-label' }, t, ' ', h('span', { className: 'text-danger' }, '*')), h('input', { className: 'form-control', disabled: true }));
      const correo = [
        acuse.texto || '', '', 'Número de solicitud: S-2026-0001', '', 'Productos:',
        '- 1 × (los productos de la solicitud, con su precio orientativo)', '',
        'Precios orientativos con IVA incluido; no son un precio firme: la tienda te confirmará la disponibilidad y el precio final.', '',
        DATOS.tienda || '',
      ].join('\n');
      return h('main', null,
        h('section', { className: 'solicitud-cabecera' }, h('div', { className: 'container' },
          nota('Con la lista de productos vacía. Abajo, el mensaje tras enviar y el correo que recibe el cliente.'),
          migas([d('titulo') || 'Mi solicitud de presupuesto'], 'Inicio'),
          h('h1', { className: 'titulo-marca solicitud-titulo' }, d('titulo') || 'Mi solicitud de presupuesto'),
          d('introduccion') ? h('p', { className: 'solicitud-intro' }, d('introduccion')) : null,
          h('ol', { className: 'solicitud-pasos' },
            h('li', { className: 'actual' }, h('b', null, '1'), 'Revisa tu solicitud'), h('li', null, h('b', null, '2'), 'Tus datos'), h('li', null, h('b', null, '3'), 'Te contestamos')))),
        h('div', { className: 'container solicitud' }, h('div', { className: 'solicitud-rejilla' },
          h('div', { className: 'solicitud-principal' },
            h('section', { className: 'caja-pespunte' }, h('h2', { className: 'caja-pespunte-titulo' }, icono('bi-scissors'), 'Productos'),
              h('p', { className: 'text-body-secondary mb-0' }, 'Aquí salen los productos que el cliente ha añadido, con sus unidades y precios.')),
            h('div', { className: 'caja-pespunte solicitud-form' },
              h('h2', { className: 'caja-pespunte-titulo' }, icono('bi-person-fill'), 'Tus datos'),
              h('div', { className: 'solicitud-campos' },
                campo('Nombre'), campo('Teléfono'), campo('Correo electrónico', true),
                pref.mostrar !== false && opciones.length > 1 ? h('fieldset', { className: 'ancho' },
                  h('legend', { className: 'form-label' }, pref.pregunta || '¿Cómo prefieres que te contestemos?', ' ', h('span', { className: 'solicitud-pista' }, 'Puedes marcar varias.')),
                  h('div', { className: 'solicitud-chips' }, ...opciones.map((o, i) => h('label', { key: o, className: 'solicitud-chip' },
                    h('input', { type: 'checkbox', defaultChecked: i === 0, disabled: true }), h('span', null, icono(OPCIONES[o][1]), OPCIONES[o][0]))))) : null,
                h('div', { className: 'ancho' }, h('label', { className: 'form-label' }, 'Observaciones'), h('textarea', { className: 'form-control', rows: 3, disabled: true })),
                h('div', { className: 'ancho form-check solicitud-acepto' },
                  h('input', { className: 'form-check-input', type: 'checkbox', disabled: true }),
                  h('label', { className: 'form-check-label' }, rellenar(d('aceptacion')), ' (condiciones · protección de datos) ', h('span', { className: 'text-danger' }, '*')))),
              h('span', { className: 'btn btn-destacado btn-lg mt-3' }, icono('bi-send', 'me-2'), d('boton') || 'Enviar solicitud'),
              d('info_privacidad') ? h('p', { className: 'solicitud-legal mt-3' }, rellenar(d('info_privacidad')), ' Más información.') : null)),
          h('aside', null, h('div', { className: 'caja-pespunte' },
            h('h2', { className: 'caja-pespunte-titulo' }, icono('bi-clipboard-check'), 'Resumen'),
            h('p', { className: 'text-body-secondary' }, 'Precios orientativos, IVA incluido. La tienda te confirma la disponibilidad y el precio final.'),
            ventajas.length ? h('ul', { className: 'ficha-ventajas' }, ...ventajas.map((v, i) =>
              h('li', { key: i }, icono(iconos[v.icono] || iconos.check || 'bi-check-circle-fill'), v.texto))) : null)))),
        h('div', { className: 'container seccion' },
          h('h2', { className: 'h5 fw-bold' }, 'Tras enviar'),
          h('div', { className: 'alert alert-success solicitud-exito' },
            h('h3', { className: 'h5 fw-bold' }, 'Solicitud S-2026-0001 enviada'), h('p', { className: 'mb-0' }, d('mensaje_exito') || '')),
          h('h2', { className: 'h5 fw-bold mt-4' }, 'Correo al cliente'),
          h('div', { className: 'caja-pespunte', style: { whiteSpace: 'pre-line' } },
            h('p', { className: 'mb-2' }, h('b', null, 'Asunto: '), `${acuse.asunto || 'Hemos recibido tu solicitud de presupuesto'} (S-2026-0001)`),
            h('p', { className: 'mb-0' }, correo))));
    },
  });

  /* ---------- Componente «Botón» del editor (menú «+») ----------
     Se guarda como un enlace Markdown con título «boton», «boton-negro» o «boton-borde»;
     el build lo convierte en un botón del diseño. Si se quita el componente, sigue siendo
     un enlace normal. */
  const ESTILOS = { destacado: '', negro: '-negro', borde: '-borde' };
  const CLASES = { destacado: 'btn-destacado', negro: 'btn-dark', borde: 'btn-outline-dark' };
  CMS.registerEditorComponent({
    id: 'boton',
    label: 'Botón',
    fields: [
      { name: 'texto', label: 'Texto del botón', widget: 'string', hint: 'p. ej. «Ver el catálogo»' },
      { name: 'enlace', label: 'Dirección', widget: 'string', hint: 'p. ej. /blog/ o https://…' },
      { name: 'estilo', label: 'Estilo', widget: 'select', default: 'destacado', options: [
        { label: 'Color de acento (destacado)', value: 'destacado' },
        { label: 'Negro', value: 'negro' },
        { label: 'Con borde', value: 'borde' },
      ] },
    ],
    pattern: /^\[([^\]\n]+)\]\(([^\s)]+) "boton(-negro|-borde)?"\)$/,
    fromBlock: m => ({
      texto: m[1],
      enlace: m[2],
      estilo: m[3] === '-negro' ? 'negro' : m[3] === '-borde' ? 'borde' : 'destacado',
    }),
    toBlock: d => `[${(d.texto || 'Botón').replace(/[\[\]]/g, '')}](${(d.enlace || '/').replace(/\s/g, '')} "boton${ESTILOS[d.estilo] || ''}")`,
    toPreview: d => `<p class="boton-p"><a class="btn btn-lg ${CLASES[d.estilo] || CLASES.destacado}" href="${d.enlace || '#'}">${d.texto || 'Botón'}</a></p>`,
  });

  CMS.registerPreviewTemplate('blog', Entrada);
  CMS.registerPreviewTemplate('paginas', Pagina);
  CMS.registerPreviewTemplate('productos', Producto);
  // Colecciones de ficheros: la plantilla se elige por el nombre del fichero
  CMS.registerPreviewTemplate('contacto', Contacto);
  CMS.registerPreviewTemplate('sobre_nosotros', Sobre);
  CMS.registerPreviewTemplate('ajustes', Solicitud); // «Solicitud de presupuesto» (public/_datos/solicitud.yml, fichero «ajustes»)
})();
