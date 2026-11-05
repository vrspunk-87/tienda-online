/*
  Vista previa del panel de Decap con el aspecto real de la web.
  Usa los mismos estilos que la web (tema, estilos.css y los colores de los
  Ajustes del sitio). Los cambios en Ajustes se ven aquí tras el siguiente despliegue.
*/
(function () {
  if (!window.CMS) return;
  const h = window.h;
  const createClass = window.createClass;

  CMS.registerPreviewStyle('/css/tema.css');
  CMS.registerPreviewStyle('/css/estilos.css');
  CMS.registerPreviewStyle('/css/personalizado.css');

  const ZONA = 'Europe/Madrid';
  const fecha = v => {
    const d = v ? new Date(v) : null;
    return d && !isNaN(d) ? d.toLocaleDateString('es-ES', { timeZone: ZONA, day: 'numeric', month: 'long', year: 'numeric' }) : '';
  };

  const imagen = (props, campo, campoAlt) => {
    const ruta = props.entry.getIn(['data', campo]);
    if (!ruta) return null;
    return h('img', {
      src: props.getAsset(ruta).toString(),
      alt: props.entry.getIn(['data', campoAlt]) || '',
      className: 'img-fluid rounded my-4',
    });
  };

  const Entrada = createClass({
    render() {
      const d = campo => this.props.entry.getIn(['data', campo]);
      return h('main', { className: 'container seccion articulo' },
        h('time', { className: 'text-body-secondary' }, fecha(d('date'))),
        h('h1', { className: 'display-5 fw-bold mt-1' }, d('title')),
        imagen(this.props, 'thumbnail', 'thumbnail_alt'),
        h('div', { className: 'articulo-cuerpo mt-4' }, this.props.widgetFor('body')));
    },
  });

  const Pagina = createClass({
    render() {
      const d = campo => this.props.entry.getIn(['data', campo]);
      return h('main', { className: 'container seccion articulo' },
        h('h1', { className: 'display-5 fw-bold' }, d('title')),
        d('description') ? h('p', { className: 'lead text-body-secondary' }, d('description')) : null,
        imagen(this.props, 'imagen', 'imagen_alt'),
        h('div', { className: 'articulo-cuerpo mt-4' }, this.props.widgetFor('body')));
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

})();
