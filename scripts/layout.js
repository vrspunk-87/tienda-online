/*
  Cabecera y pie de todas las páginas.
  Los datos (nombre, logo, menú, redes, colores...) vienen de
  public/_datos/sitio.yml, que se edita en Decap → Ajustes del sitio.
*/
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const COLORES = {
  primario: { tema: 'dark',  clase: 'bg-primary' },
  oscuro:   { tema: 'dark',  clase: 'bg-dark' },
  claro:    { tema: 'light', clase: 'bg-body-tertiary border-bottom' },
  blanco:   { tema: 'light', clase: 'bg-white border-bottom' },
};

const limpia = p => p.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/+$/, '') || '/';

// Dirección de una opción del menú: "enlace" escrito a mano o una página de Decap
const SEGURA = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i;
export const hrefDe = m => (m.enlace && SEGURA.test(m.enlace) ? m.enlace : null)
  || (m.pagina ? `/paginas/${encodeURIComponent(m.pagina)}/` : '#');

export function construir(sitio, ruta) {
  const actual = limpia(ruta);
  const menu = sitio.menu || [];
  const legales = sitio.legales || [];
  const redes = sitio.redes || {};

  const activo = m => {
    if (m.hijos?.length && (m.hijos.some(activo) || (m.tambien || []).some(p => p && actual.startsWith(p)))) return true;
    if (m.hijos?.length && hrefDe(m) === '#') return false;
    const href = hrefDe(m);
    if (href.includes('#')) return false;
    const destino = limpia(href);
    if (destino === '/') return actual === '/';
    return actual === destino
        || actual.startsWith(destino + '/')
        || (m.tambien || []).some(p => p && actual.startsWith(p));
  };

  const marca = `
      <a class="navbar-brand d-flex align-items-center gap-2 fw-bold" href="/">
        ${sitio.logo ? `<img src="${esc(sitio.logo)}" alt="${esc(sitio.nombre)}" class="logo" width="40" height="40">` : ''}
        <span>${esc(sitio.nombre)}</span>
      </a>`;

  // Opción «Catálogo» (Ajustes → Menú → «Desplegable del catálogo»): sus subopciones son las
  // categorías y subcategorías (las pone scripts/build.js en sitio.catalogo)
  const conCatalogo = m => (m.catalogo ? {
    ...m,
    tambien: [...(m.tambien || []), '/catalogo', '/productos'],
    hijos: [
      { texto: 'Todo el catálogo', enlace: '/catalogo/' },
      ...((sitio.catalogo || []).length ? [{ separador: true }] : []),
      ...(sitio.catalogo || []).flatMap(c => [{ texto: c.texto, enlace: c.enlace, principal: true },
        ...(c.hijos || []).map(h => ({ texto: h.texto, enlace: h.enlace, sub: true }))]),
    ],
  } : m);

  // En los desplegables solo se marca la página exacta en la que se está
  const exacto = h => !hrefDe(h).includes('#') && limpia(hrefDe(h)) === actual;
  const itemDesplegable = h => ((h.texto === '---' || h.separador)
    ? '<li><hr class="dropdown-divider"></li>'
    : `<li><a class="dropdown-item${h.sub ? ' ps-4 sub' : ''}${h.principal ? ' fw-semibold' : ''}${exacto(h) ? ' active' : ''}"${exacto(h) ? ' aria-current="page"' : ''}
              href="${esc(hrefDe(h))}">${esc(h.texto)}</a></li>`);

  const opcion = original => {
    const m = conCatalogo(original);
    const act = activo(m);
    if (m.hijos?.length) {
      const propio = hrefDe(m) !== '#';
      // Con página propia: el texto lleva a la página y la flecha abre el desplegable
      if (propio) {
        const actPropia = limpia(hrefDe(m)) === actual;
        return `
          <li class="nav-item dropdown nav-dividido">
            <a class="nav-link${act ? ' active' : ''}"${actPropia ? ' aria-current="page"' : ''} href="${esc(hrefDe(m))}">${esc(m.texto)}</a>
            <button class="nav-link dropdown-toggle dropdown-toggle-split${act ? ' active' : ''}" type="button"
                    data-bs-toggle="dropdown" aria-expanded="false"><span class="visually-hidden">Ver las opciones de ${esc(m.texto)}</span></button>
            <ul class="dropdown-menu dropdown-menu-lg-end">
              ${m.hijos.map(itemDesplegable).join('')}
            </ul>
          </li>`;
      }
      return `
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle${act ? ' active' : ''}" href="#" role="button"
               data-bs-toggle="dropdown" aria-expanded="false">${esc(m.texto)}</a>
            <ul class="dropdown-menu dropdown-menu-lg-end">
              ${m.hijos.map(itemDesplegable).join('')}
            </ul>
          </li>`;
    }
    return `
        <li class="nav-item">
          <a class="nav-link${act ? ' active' : ''}"${act ? ' aria-current="page"' : ''} href="${esc(hrefDe(m))}">${esc(m.texto)}</a>
        </li>`;
  };

  const buscar = sitio.buscador === false ? '' : `
        <li class="nav-item">
          <a class="nav-link${actual === '/buscar' ? ' active' : ''}" href="/buscar/" aria-label="Buscar en la web" title="Buscar">
            <i class="bi bi-search" aria-hidden="true"></i><span class="d-lg-none ms-2">Buscar</span>
          </a>
        </li>`;
  // Botón destacado al final del menú (Ajustes → Menú superior: diseño → Botón destacado)
  const cfgBoton = (sitio.navbar || {}).boton || {};
  const hrefBoton = cfgBoton.texto ? hrefDe(cfgBoton) : '#';
  const destacado = cfgBoton.texto && hrefBoton !== '#' ? `
        <li class="nav-item nav-destacado">
          <a class="btn btn-destacado"${actual === limpia(hrefBoton) ? ' aria-current="page"' : ''} href="${esc(hrefBoton)}">${esc(cfgBoton.texto)}</a>
        </li>` : '';
  const enlaces = (claseUl = '') => `<ul class="navbar-nav ${claseUl}">${menu.map(opcion).join('')}${buscar}${destacado}</ul>`;

  const boton = tipo => `
      <button class="navbar-toggler" type="button" data-bs-toggle="${tipo}" data-bs-target="#menu"
              aria-controls="menu" aria-expanded="false" aria-label="Abrir menú">
        <span class="navbar-toggler-icon"></span>
      </button>`;

  const DISENOS = {
    // Logo a la izquierda, enlaces a la derecha; en móvil se despliega hacia abajo
    clasico: () => `
        <div class="container">
          ${marca}
          ${boton('collapse')}
          <div class="collapse navbar-collapse" id="menu">${enlaces('ms-auto')}</div>
        </div>`,
    // Logo centrado arriba y enlaces centrados debajo
    centrado: () => `
        <div class="container flex-column align-items-stretch">
          <div class="d-flex justify-content-between justify-content-lg-center align-items-center">
            ${marca}
            ${boton('collapse')}
          </div>
          <div class="collapse navbar-collapse justify-content-lg-center" id="menu">${enlaces()}</div>
        </div>`,
    // Como el clásico en escritorio; en móvil el menú sale como panel lateral
    lateral: () => `
        <div class="container">
          ${marca}
          ${boton('offcanvas')}
          <div class="offcanvas offcanvas-end" tabindex="-1" id="menu" aria-labelledby="menu-titulo">
            <div class="offcanvas-header">
              <span class="offcanvas-title fw-bold" id="menu-titulo">${esc(sitio.nombre)}</span>
              <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Cerrar menú"></button>
            </div>
            <div class="offcanvas-body">${enlaces('justify-content-end flex-grow-1')}</div>
          </div>
        </div>`,
    // Como el clásico en escritorio; en móvil el menú ocupa toda la pantalla
    pantalla: () => `
        <div class="container">
          ${marca}
          ${boton('offcanvas')}
          <div class="offcanvas offcanvas-top menu-pantalla" tabindex="-1" id="menu" aria-labelledby="menu-titulo">
            <div class="offcanvas-header">
              <span class="offcanvas-title fw-bold" id="menu-titulo">${esc(sitio.nombre)}</span>
              <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Cerrar menú"></button>
            </div>
            <div class="offcanvas-body">${enlaces('justify-content-end align-items-lg-center flex-grow-1')}</div>
          </div>
        </div>`,
  };

  const cfg = sitio.navbar || {};
  const color = COLORES[cfg.color] || COLORES.primario;
  const diseno = DISENOS[cfg.diseno] || DISENOS.clasico;

  const cabecera = `
      <header class="${cfg.fijo === false ? '' : 'sticky-top'} cabecera-web shadow-sm">
        <nav class="navbar navbar-expand-lg ${color.clase} nav-${cfg.diseno || 'clasico'}" data-bs-theme="${color.tema}"
             aria-label="Navegación principal">
          ${diseno()}
        </nav>
      </header>`;

  const REDES = [
    redes.facebook  && { icono: 'bi-facebook',      texto: 'Facebook',  href: redes.facebook, externo: true },
    redes.instagram && { icono: 'bi-instagram',     texto: 'Instagram', href: redes.instagram, externo: true },
    redes.email     && { icono: 'bi-envelope-fill', texto: 'Correo',    href: `mailto:${redes.email}`, externo: false },
    redes.whatsapp  && { icono: 'bi-whatsapp',      texto: 'WhatsApp',  href: `https://wa.me/${String(redes.whatsapp).replace(/\D/g, '')}`, externo: true },
    redes.rss !== false && { icono: 'bi-rss-fill',  texto: 'Suscribirse al blog por RSS', href: '/blog/feed.xml', externo: false },
  ].filter(Boolean);

  // Opciones del menú que llevan a una página (sin desplegables ni anclas) para el pie
  const enlacesPie = menu.flatMap(m => (m.catalogo ? [m] : m.hijos?.length ? [...(hrefDe(m) !== '#' ? [m] : []), ...m.hijos] : [m]))
    .filter(m => m.texto && m.texto !== '---' && !m.separador && hrefDe(m) !== '#');

  const pie = `
      <footer class="pie-web mt-auto">
        <div class="container py-5">
          <div class="row g-4">
            <div class="col-lg-5">
              <a class="d-inline-flex align-items-center gap-3 text-decoration-none pie-marca" href="/">
                ${sitio.logo ? `<img src="${esc(sitio.logo)}" alt="" class="logo-pie" width="56" height="56" loading="lazy">` : ''}
                <span>${esc(sitio.nombre)}</span>
              </a>
              ${sitio.descripcion ? `<p class="pie-descripcion mt-3 mb-0">${esc(sitio.descripcion)}</p>` : ''}
            </div>
            ${enlacesPie.length ? `<nav class="col-6 col-lg-3" aria-label="Secciones de la web">
              <h2 class="pie-titulo">La web</h2>
              <ul class="list-unstyled pie-enlaces mb-0">
                ${enlacesPie.map(m => `<li><a href="${esc(hrefDe(m))}">${esc(m.texto)}</a></li>`).join('')}
              </ul>
            </nav>` : ''}
            <div class="col-6 col-lg-4">
              ${REDES.length ? `<h2 class="pie-titulo">Síguenos</h2>
              <ul class="list-unstyled d-flex flex-wrap gap-2 mb-0" aria-label="Redes sociales y contacto">
                ${REDES.map(x => `
                  <li>
                    <a class="btn btn-outline-light rounded-circle social" href="${esc(x.href)}"
                       aria-label="${esc(x.texto)}" title="${esc(x.texto)}"
                       ${x.externo ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                      <i class="bi ${x.icono}" aria-hidden="true"></i>
                    </a>
                  </li>`).join('')}
              </ul>` : ''}
            </div>
          </div>
          <div class="pie-legal d-flex flex-column flex-md-row justify-content-between gap-2 mt-5 pt-4 small">
            <span>© ${new Date().getFullYear()} ${esc(sitio.nombre)}${sitio.localidad ? ` · ${esc(sitio.localidad)}` : ''}</span>
            ${legales.length ? `<nav aria-label="Información legal" class="enlaces-legales">
              ${legales.map(l => `<a class="link-light" href="${esc(hrefDe(l))}">${esc(l.texto)}</a>`).join('<span aria-hidden="true"> · </span>')}
            </nav>` : ''}
          </div>
        </div>
      </footer>`;

  return { cabecera, pie };
}
