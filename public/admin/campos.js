/*
  Campos propios del panel de Decap.

  «categoria-catalogo»: elegir un sitio del catálogo con desplegables dependientes
  Tipo de producto › Categoría › Subcategoría. Cada uno solo ofrece lo que cuelga del elegido en
  el anterior, en el orden de Ajustes del sitio → «Orden del catálogo en el menú» (lo que no esté
  allí, al final y por orden alfabético, como en la web). Se guarda un único valor: el nivel más
  concreto elegido (su identificador, p. ej. «bordadoras-industriales»).
  Opciones del campo en public/config.yml:
    niveles      cuántos desplegables se muestran (1 a 3; por defecto 3)
    obligatorios cuántos hay que rellenar como mínimo (por defecto 1)
  Se usa en los productos (3 niveles, 1 obligatorio), en el «Tipo de producto» de las categorías
  (1 y 1) y en la «Categoría» de las subcategorías (2 y 2).
  Las categorías salen de la colección oculta «catalogo» (public/_categorias, campo «nivel») y el
  orden, de Ajustes del sitio. Se vuelven a leer al abrir cada ficha y al volver a la pestaña del
  panel, así que lo que se acabe de publicar aparece sin recargar la página.

  «precio-producto»: precio normal o «Precio Completa» + «Precio Cabezal» según el tipo de producto
  (máquinas industriales); ver más abajo.

  Al final: el número de productos de cada tipo, categoría y subcategoría en sus listas.
*/
(function () {
  if (!window.CMS) return;
  const h = window.h;
  const createClass = window.createClass;

  const NIVELES = [
    { nivel: 'tipo', etiqueta: 'Tipo de producto', elegir: '— Elige el tipo de producto —', ninguno: '' },
    { nivel: 'categoria', etiqueta: 'Categoría', elegir: '— Elige la categoría —', ninguno: '— Ninguna (directamente en el tipo) —' },
    { nivel: 'subcategoria', etiqueta: 'Subcategoría', elegir: '— Elige la subcategoría —', ninguno: '— Ninguna (directamente en la categoría) —' },
  ];

  // Decap guarda unos segundos las respuestas de búsquedas idénticas: un límite distinto en cada
  // petición obliga a leer los datos de nuevo
  let peticion = 0;
  const limite = () => 1000000 + (++peticion);

  function leerCategorias(query, forID) {
    return query(forID, 'catalogo', ['title'], '', undefined, limite()).then(({ payload }) => {
      const mapa = new Map();
      for (const e of payload.hits || []) {
        const d = e.data || {};
        mapa.set(e.slug, { slug: e.slug, titulo: d.title || e.slug, nivel: d.nivel || '', padre: d.padre || '' });
      }
      return mapa;
    });
  }
  // Posición de cada categoría en «Orden del catálogo en el menú» (solo si está bajo su padre real)
  function leerOrden(query, forID) {
    return query(forID, 'ajustes', ['nombre'], '', 'sitio', limite())
      .then(({ payload }) => (payload.hits || [])[0]?.data?.catalogo_orden || [])
      .catch(() => []);
  }
  function posiciones(lista, mapa) {
    const pos = new Map();
    (function recorrer(l, padre) {
      (Array.isArray(l) ? l : []).forEach((it, i) => {
        const slug = String((typeof it === 'string' ? it : it && it.categoria) || '').trim();
        const c = mapa.get(slug);
        if (c && !pos.has(slug) && (c.padre || '') === padre) pos.set(slug, i);
        if (it && typeof it === 'object') recorrer(it.hijos, slug);
      });
    })(lista, '');
    return pos;
  }

  // Del valor guardado (el nivel más concreto) a la ruta [tipo, categoría, subcategoría]
  function ruta(mapa, valor) {
    const r = [];
    for (let x = mapa.get(valor), vistos = new Set(); x && !vistos.has(x.slug); x = mapa.get(x.padre)) {
      vistos.add(x.slug); r.unshift(x.slug);
    }
    return [r[0] || '', r[1] || '', r[2] || ''];
  }

  const Control = createClass({
    getInitialState() { return { mapa: null, pos: new Map(), error: '' }; },
    componentDidMount() {
      this.vivo = true;
      this.avisar();
      this.cargar();
      // Al volver a la pestaña (p. ej. tras crear una categoría en otra), se leen otra vez
      this.alVolver = () => { if (document.visibilityState === 'visible') this.cargar(); };
      document.addEventListener('visibilitychange', this.alVolver);
      window.addEventListener('focus', this.alVolver);
    },
    componentDidUpdate(antes) { if (antes.value !== this.props.value) this.avisar(); },
    // Los campos de precio (más abajo) dependen de la categoría: Decap no los vuelve a pintar
    // cuando cambia otro campo, así que se les avisa con un evento
    avisar() {
      window.categoriaEnEdicion = this.props.value || '';
      window.dispatchEvent(new CustomEvent('campos:categoria', { detail: window.categoriaEnEdicion }));
    },
    componentWillUnmount() {
      this.vivo = false;
      window.categoriaEnEdicion = null;
      document.removeEventListener('visibilitychange', this.alVolver);
      window.removeEventListener('focus', this.alVolver);
    },
    cargar() {
      if (this.cargando) return;
      this.cargando = true;
      const { query, forID } = this.props;
      Promise.all([leerCategorias(query, forID), leerOrden(query, forID)])
        .then(([mapa, orden]) => this.vivo && this.setState({ mapa, pos: posiciones(orden, mapa), error: '' }))
        .catch(() => this.vivo && !this.state.mapa && this.setState({ error: 'No se han podido cargar las categorías. Recarga la página.' }))
        .then(() => { this.cargando = false; });
    },
    opcion(nombre, defecto) {
      const v = Number(this.props.field.get(nombre));
      return Number.isInteger(v) && v >= 1 && v <= 3 ? v : defecto;
    },
    // Decap lo llama al guardar: los niveles obligatorios tienen que estar elegidos
    isValid() {
      const { mapa } = this.state;
      const valor = this.props.value || '';
      if (!valor || !mapa) return true; // vacío: lo comprueba Decap con «required»
      if (!mapa.has(valor)) return { error: { type: 'CUSTOM', message: 'La categoría guardada ya no existe: elige otra.' } };
      const obligatorios = this.opcion('obligatorios', 1);
      const elegidos = ruta(mapa, valor).filter(Boolean).length;
      if (elegidos < obligatorios) return { error: { type: 'CUSTOM', message: `Elige también ${NIVELES[elegidos].etiqueta.toLowerCase()}.` } };
      return true;
    },
    elegir(i, slug) {
      const actual = ruta(this.state.mapa, this.props.value || '');
      const nueva = actual.slice(0, i).concat(slug);
      this.props.onChange(nueva[2] || nueva[1] || nueva[0] || '');
    },
    render() {
      const { forID, classNameWrapper, setActiveStyle, setInactiveStyle, value } = this.props;
      const { mapa, pos, error } = this.state;
      if (error) return h('div', { className: classNameWrapper }, error);
      if (!mapa) return h('div', { className: classNameWrapper }, 'Cargando categorías…');
      const niveles = this.opcion('niveles', 3);
      const obligatorios = this.opcion('obligatorios', 1);
      const sel = ruta(mapa, value || '');
      const huerfano = value && !mapa.has(value);
      const posDe = c => (pos.has(c.slug) ? pos.get(c.slug) : Infinity);
      const orden = (a, b) => posDe(a) - posDe(b) || a.titulo.localeCompare(b.titulo, 'es');
      return h('div', { className: classNameWrapper, style: { display: 'grid', gap: '12px' } },
        huerfano ? h('p', { style: { color: '#d93025', margin: 0 } }, `La categoría guardada («${value}») ya no existe: elige otra.`) : null,
        NIVELES.slice(0, niveles).map((n, i) => {
          const padre = i === 0 ? '' : sel[i - 1];
          const opciones = [...mapa.values()].filter(c => c.nivel === n.nivel && (i === 0 || c.padre === padre)).sort(orden);
          const obligatorio = i < obligatorios;
          const desactivado = i > 0 && (!padre || !opciones.length);
          const id = i === 0 ? forID : `${forID}-${n.nivel}`;
          const vacio = i > 0 && padre && !opciones.length ? '— No tiene —' : (obligatorio || !padre ? n.elegir : n.ninguno);
          return h('div', { key: n.nivel },
            niveles > 1 ? h('label', { htmlFor: id, style: { display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' } },
              n.etiqueta + (obligatorio ? '' : ' (opcional)')) : null,
            h('select', {
              id, value: sel[i], disabled: desactivado,
              onChange: e => this.elegir(i, e.target.value),
              onFocus: setActiveStyle, onBlur: setInactiveStyle,
              style: { width: '100%', padding: '10px 12px', fontSize: '15px', border: '2px solid #dfdfe3', borderRadius: '5px', background: desactivado ? '#f4f4f6' : '#fff' },
            },
              h('option', { value: '' }, vacio),
              opciones.map(c => h('option', { key: c.slug, value: c.slug }, c.titulo))));
        }));
    },
  });

  // En la vista previa, el identificador de lo elegido
  const Vista = createClass({
    render() { return h('span', null, this.props.value || ''); },
  });

  CMS.registerWidget('categoria-catalogo', Control, Vista);

  /* ---------- «precio-producto»: precio normal o Completa / Cabezal según el tipo de producto ----------
     Los productos del tipo indicado en «tipo_dos_precios» (p. ej. «maquinas-industriales») tienen dos
     precios: el campo del precio pasa a llamarse con «etiqueta_dos_precios» (p. ej. «Precio Completa»)
     y aparece el del cabezal (campo con «rol: cabezal»), que en el resto de productos no se ve.
     Se usa en «precio» / «precio_cabezal» y en los de la oferta. El tipo sale de la categoría elegida
     en «Catálogo» (y de la colección «catalogo»), y cambia en cuanto se cambia la categoría (el campo
     «categoria-catalogo» avisa con el evento «campos:categoria»).
     Opciones en public/config.yml: tipo_dos_precios, etiqueta_dos_precios (solo el precio
     principal) y rol: cabezal. La web (scripts/build.js) lee la misma opción «tipo_dos_precios». */
  let catalogoCache = null; // { mapa, promesa }
  function catalogo(query, forID, forzar) {
    if (!catalogoCache || forzar) {
      const promesa = leerCategorias(query, forID).then(mapa => { catalogoCache.mapa = mapa; return mapa; });
      catalogoCache = { mapa: catalogoCache && catalogoCache.mapa, promesa };
    }
    return catalogoCache.promesa;
  }
  const PrecioControl = createClass({
    getInitialState() {
      const entry = this.props.entry;
      const cat = entry && entry.getIn ? entry.getIn(['data', 'categoria']) || '' : '';
      return { mapa: catalogoCache && catalogoCache.mapa, cat };
    },
    componentDidMount() {
      this.vivo = true;
      this.alCambiar = e => this.vivo && this.setState({ cat: e.detail || '' });
      window.addEventListener('campos:categoria', this.alCambiar);
      // El campo de la categoría (más arriba) ya se ha montado y ha dejado su valor
      if (window.categoriaEnEdicion != null && window.categoriaEnEdicion !== this.state.cat) this.setState({ cat: window.categoriaEnEdicion });
      const { query, forID } = this.props;
      catalogo(query, forID, !this.state.mapa).then(mapa => this.vivo && this.setState({ mapa })).catch(() => {});
      this.etiquetar();
    },
    componentDidUpdate() { this.etiquetar(); },
    componentWillUnmount() { this.vivo = false; window.removeEventListener('campos:categoria', this.alCambiar); },
    esCabezal() { return this.props.field.get('rol') === 'cabezal'; },
    dosPrecios() {
      const tipo = this.props.field.get('tipo_dos_precios');
      const cat = this.state.cat;
      return !!(tipo && cat && this.state.mapa && ruta(this.state.mapa, cat)[0] === tipo);
    },
    vacio() { const v = this.props.value; return v === '' || v == null || (typeof v === 'number' && isNaN(v)); },
    // Decap pinta la etiqueta del campo fuera del widget: se cambia (o se oculta el campo entero) aquí
    etiquetar() {
      const etiqueta = document.querySelector(`label[for="${this.props.forID}"]`);
      if (!etiqueta) return;
      const dos = this.dosPrecios();
      if (this.esCabezal()) {
        const caja = etiqueta.parentElement;
        if (caja) caja.style.display = dos || !this.vacio() ? '' : 'none';
        return;
      }
      // Decap añade « (opcional)» a los campos no obligatorios
      const { field } = this.props;
      const opcional = field.get('required') === false ? ' (opcional)' : '';
      const otra = field.get('etiqueta_dos_precios');
      const texto = (dos && otra ? otra : field.get('label')) + opcional;
      if (etiqueta.textContent !== texto) etiqueta.textContent = texto;
    },
    isValid() {
      const v = this.props.value;
      if (!this.vacio() && (typeof v !== 'number' || v < 0)) return { error: { type: 'CUSTOM', message: 'Escribe un precio válido (0 o más).' } };
      return true;
    },
    render() {
      const { forID, classNameWrapper, setActiveStyle, setInactiveStyle, value, onChange } = this.props;
      const fuera = this.esCabezal() && !this.dosPrecios() && !this.vacio();
      return h('div', null,
        h('input', {
          id: forID, type: 'number', min: 0, step: 0.01, inputMode: 'decimal', className: classNameWrapper,
          value: this.vacio() ? '' : value,
          onChange: e => onChange(e.target.value === '' ? '' : parseFloat(e.target.value)),
          onFocus: setActiveStyle, onBlur: setInactiveStyle,
        }),
        fuera ? h('p', { style: { color: '#d93025', margin: '6px 0 0', fontSize: '13px' } },
          'Este producto no es del tipo con dos precios: el precio del cabezal no se usa en la web. Bórralo o cambia la categoría.') : null);
    },
  });
  const PrecioVista = createClass({
    render() { const v = this.props.value; return h('span', null, v === '' || v == null ? '' : String(v)); },
  });
  CMS.registerWidget('precio-producto', PrecioControl, PrecioVista);

  /* ---------- Productos de cada tipo, categoría y subcategoría en sus listas ----------
     El build deja en /admin/conteos.json cuántos productos tiene cada una (contando los de las
     que cuelgan de ella), con los datos del último despliegue. Aquí se añaden al final de cada
     fila de las listas «Catálogo: tipos de producto / categorías / subcategorías». */
  const LISTAS = /#\/collections\/(tipos|categorias|subcategorias)\/entries\/([^/?#]+)$/;
  fetch('/admin/conteos.json', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(datos => {
      const cuenta = datos && datos.productosPorCategoria;
      if (!cuenta) return;
      const pintar = () => {
        for (const a of document.querySelectorAll('a[href*="/entries/"]')) {
          const m = (a.getAttribute('href') || '').match(LISTAS);
          if (!m) continue;
          const n = cuenta[decodeURIComponent(m[2])] || 0;
          const texto = n === 0 ? 'sin productos' : n === 1 ? '1 producto' : n + ' productos';
          const destino = a.querySelector('h2') || a;
          let marca = destino.querySelector('.conteo-productos');
          if (marca && marca.textContent === ' · ' + texto) continue;
          if (!marca) {
            marca = document.createElement('span');
            marca.className = 'conteo-productos';
            marca.style.cssText = 'font-weight:400;color:#798291;white-space:nowrap';
            destino.appendChild(marca);
          }
          marca.textContent = ' · ' + texto;
        }
      };
      let pendiente = false;
      new MutationObserver(() => {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(() => { pendiente = false; pintar(); });
      }).observe(document.body, { childList: true, subtree: true });
      pintar();
    })
    .catch(() => {});
})();
