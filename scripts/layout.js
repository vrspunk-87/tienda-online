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

  // En los desplegables solo se marca la página exacta en la que se está
  const exacto = h => !hrefDe(h).includes('#') && limpia(hrefDe(h)) === actual;
  const itemDesplegable = h => ((h.texto === '---' || h.separador)
    ? '<li><hr class="dropdown-divider"></li>'
    : `<li><a class="dropdown-item${h.sub ? ' ps-4 sub' : ''}${h.principal ? ' fw-semibold' : ''}${exacto(h) ? ' active' : ''}"${exacto(h) ? ' aria-current="page"' : ''}
              href="${esc(hrefDe(h))}">${esc(h.texto)}</a></li>`);

  // Catálogo (opción del menú marcada como «Desplegable del catálogo»): en el ordenador va en una
  // segunda fila, la «barra del catálogo», con «Todo el catálogo», cada tipo de producto con su
  // número de productos y su propio panel, y «Ofertas». El panel de cada tipo tiene a la izquierda
  // un resumen (productos, descripción breve, enlace a todo el tipo y a sus ofertas) y a la derecha
  // sus categorías: en columnas con sus subcategorías si las tiene, o en lista. En el móvil va
  // arriba del menú, en una caja, y se navega por niveles (← para volver). Los datos los pone
  // scripts/build.js en sitio.catalogo, en el orden de los Ajustes.
  const posicion = actual.startsWith('/catalogo/') ? actual : limpia(sitio.categoriaDeRuta?.[actual] || '');
  const dentroDe = n => posicion === limpia(n.enlace) || posicion.startsWith(limpia(n.enlace) + '/');
  const actualAttr = n => (exacto(n) ? ' aria-current="page"' : '');
  const insignia = (n, clase = '') => `<span class="insignia-menu${n ? '' : ' vacia'}${clase}">${n}<span class="visually-hidden"> ${n === 1 ? 'producto' : 'productos'}</span></span>`;
  const verProductos = n => (n.n === 1 ? 'Ver el producto' : n.n ? `Ver los ${n.n} productos` : 'Ver la sección');
  const MAX_SUBS = 5;
  const panelTipo = t => {
    const columnas = t.hijos.some(c => c.hijos?.length);
    const cats = !t.hijos.length ? '' : columnas
      ? `<div class="barra-columnas">${t.hijos.map(c => `
                <div class="barra-columna">
                  <a class="barra-cat${dentroDe(c) ? ' dentro' : ''}" href="${esc(c.enlace)}"${actualAttr(c)}><span>${esc(c.texto)}</span>${insignia(c.n)}</a>
                  ${(c.hijos || []).slice(0, MAX_SUBS).map(x => `<a class="barra-sub${dentroDe(x) ? ' dentro' : ''}" href="${esc(x.enlace)}"${actualAttr(x)}><span>${esc(x.texto)}</span>${insignia(x.n, ' insignia-mini')}</a>`).join('')}
                  ${(c.hijos || []).length > MAX_SUBS ? `<a class="barra-mas" href="${esc(c.enlace)}">Ver las ${c.hijos.length} <i class="bi bi-arrow-right" aria-hidden="true"></i></a>` : ''}
                </div>`).join('')}</div>`
      : `<div class="barra-lista">${t.hijos.map(c => `<a class="barra-lista-cat${dentroDe(c) ? ' dentro' : ''}" href="${esc(c.enlace)}"${actualAttr(c)}><span>${esc(c.texto)}</span>${insignia(c.n)}<i class="bi bi-chevron-right" aria-hidden="true"></i></a>`).join('')}</div>`;
    return `
            <div class="dropdown-menu barra-panel">
              <div class="container"><div class="barra-panel-rejilla${cats ? '' : ' solo'}">
                <div class="barra-resumen">
                  <p class="barra-resumen-tipo"><i class="bi bi-scissors" aria-hidden="true"></i>${esc(t.texto)}</p>
                  <p class="barra-resumen-n">${t.n} ${t.n === 1 ? 'producto' : 'productos'}</p>
                  ${t.resumen ? `<p class="barra-resumen-texto">${esc(t.resumen)}</p>` : ''}
                  <a class="barra-ver" href="${esc(t.enlace)}"${actualAttr(t)}>${verProductos(t)} <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
                  ${t.nOfertas ? `<a class="barra-ofertas-tipo" href="${esc(t.ofertas)}"><i class="bi bi-tag-fill" aria-hidden="true"></i>Ofertas de ${esc(t.texto.toLowerCase())} <span class="insignia-menu">${t.nOfertas}</span></a>` : ''}
                </div>
                ${cats}
              </div></div>
            </div>`;
  };
  const cfgBarra = (sitio.navbar || {}).barra_catalogo || {};
  const COLORES_BARRA = ['gris', 'blanco', 'marca', 'oscuro', 'personalizado'];
  const colorBarra = COLORES_BARRA.includes(cfgBarra.color) ? cfgBarra.color : 'gris';
  const enOfertas = actual === '/ofertas' || actual.startsWith('/ofertas/');
  const barraCatalogo = m => `
        <nav class="barra-catalogo barra-${colorBarra} d-none d-lg-block" aria-label="${esc(m.texto || 'Catálogo')}">
          <div class="container">
            <ul class="barra-items">
              <li><a class="barra-enlace barra-todo${actual === '/catalogo' ? ' activo' : ''}" href="/catalogo/"${actual === '/catalogo' ? ' aria-current="page"' : ''}><i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i>Todo el catálogo</a></li>
              ${(sitio.catalogo || []).map(t => `
              <li class="dropdown barra-item">
                <button class="barra-enlace${dentroDe(t) ? ' activo' : ''}" type="button" data-bs-toggle="dropdown" data-bs-display="static" aria-expanded="false">${esc(t.texto)}${insignia(t.n)}<i class="bi bi-chevron-down barra-flecha" aria-hidden="true"></i></button>
                ${panelTipo(t)}
              </li>`).join('')}
              ${sitio.sinOfertas ? '' : `<li class="barra-derecha"><a class="barra-enlace barra-ofertas${enOfertas ? ' activo' : ''}" href="/ofertas/"${actual === '/ofertas' ? ' aria-current="page"' : ''}><i class="bi bi-tag-fill" aria-hidden="true"></i>Ofertas${sitio.nOfertas ? insignia(sitio.nOfertas).replace(/<span class="visually-hidden">[^<]*<\/span>/, '') : ''}</a></li>`}
            </ul>
          </div>
        </nav>`;
  // Móvil: niveles (raíz, cada tipo y cada categoría con subcategorías); se muestra el de la página
  // en la que se está, o la raíz
  const niveles = [];
  let nNivel = 0;
  const filaMovil = (n, padreId) => {
    if (!n.hijos?.length) return `<a class="cat-fila${dentroDe(n) ? ' dentro' : ''}" href="${esc(n.enlace)}"${actualAttr(n)}><span>${esc(n.texto)}</span>${n.n !== undefined ? insignia(n.n) : ''}<i class="bi bi-chevron-right" aria-hidden="true"></i></a>`;
    const id = `cat-nivel-${++nNivel}`;
    niveles.push({ id, n, padreId });
    return `<button class="cat-fila${dentroDe(n) ? ' dentro' : ''}" type="button" data-cat-nivel="${id}"><span>${esc(n.texto)}</span>${n.n !== undefined ? insignia(n.n) : ''}<i class="bi bi-chevron-right" aria-hidden="true"></i></button>`;
  };
  const catalogoMovil = m => {
    niveles.length = 0; nNivel = 0;
    const tipos = (sitio.catalogo || []).map(t => ({ ...t, tipo: true }));
    const raiz = `<a class="cat-fila${actual === '/catalogo' ? ' dentro' : ''}" href="/catalogo/"${actual === '/catalogo' ? ' aria-current="page"' : ''}><span>Todo el catálogo</span><i class="bi bi-chevron-right" aria-hidden="true"></i></a>
              ${tipos.map(t => filaMovil(t, 'cat-nivel-0')).join('')}
              ${sitio.sinOfertas ? '' : `<a class="cat-fila cat-ofertas${enOfertas ? ' dentro' : ''}" href="/ofertas/"><span><i class="bi bi-tag-fill" aria-hidden="true"></i>Ofertas</span>${sitio.nOfertas ? `<span class="insignia-menu">${sitio.nOfertas}</span>` : ''}<i class="bi bi-chevron-right" aria-hidden="true"></i></a>`}`;
    const html = [];
    for (let k = 0; k < niveles.length; k++) {
      const { id, n, padreId } = niveles[k];
      const filas = n.hijos.map(h => filaMovil(h, id)).join('');
      const padre = niveles.find(x => x.id === padreId);
      html.push({ id, n, contenido: `
              <button class="cat-volver" type="button" data-cat-nivel="${padreId}"><i class="bi bi-arrow-left" aria-hidden="true"></i>${esc(padre ? padre.n.texto : (m.texto || 'Catálogo'))}</button>
              <p class="cat-nivel-titulo">${esc(n.texto)}</p>
              <a class="cat-ver" href="${esc(n.enlace)}"${actualAttr(n)}>${n.tipo || n.n !== undefined ? verProductos(n) : 'Ver todo'} <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
              ${filas}` });
    }
    // Nivel abierto: el más profundo que contiene la página actual
    const abierto = [...html].reverse().find(x => dentroDe(x.n));
    const visible = abierto ? abierto.id : 'cat-nivel-0';
    return `
          <div class="cat-movil d-lg-none" data-cat-movil>
            <p class="cat-movil-cabecera"><i class="bi bi-scissors" aria-hidden="true"></i>${esc(m.texto || 'Catálogo')}</p>
            <div class="cat-movil-caja">
              <div class="cat-nivel" id="cat-nivel-0"${visible === 'cat-nivel-0' ? '' : ' hidden'}>${raiz}</div>
              ${html.map(x => `<div class="cat-nivel" id="${x.id}"${visible === x.id ? '' : ' hidden'}>${x.contenido}</div>`).join('')}
            </div>
          </div>`;
  };
  // Sin catálogo (todo oculto por no tener productos): ni barra, ni caja en el móvil, ni columna en el pie
  const itemCatalogo = sitio.sinCatalogo ? null : menu.find(m => m.catalogo);

  const opcion = m => {
    if (m.catalogo) return '';
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
        <li class="nav-item d-lg-none">
          <a class="nav-link${actual === '/buscar' ? ' active' : ''}" href="/buscar/" aria-label="Buscar en la web" title="Buscar">
            <i class="bi bi-search" aria-hidden="true"></i><span class="d-lg-none ms-2">Buscar</span>
          </a>
        </li>`;
  // Buscador en la primera fila (ordenador): envía a /buscar/?q=…
  const cajaBuscar = sitio.buscador === false ? '' : `
      <form class="buscador-cabecera d-none d-lg-flex" action="/buscar/" method="get" role="search">
        <i class="bi bi-search" aria-hidden="true"></i>
        <label class="visually-hidden" for="buscar-cabecera">Buscar en la web</label>
        <input id="buscar-cabecera" type="search" name="q" placeholder="Buscar máquinas, accesorios…" autocomplete="off">
      </form>`;
  // Solicitud de presupuesto (si está activa): icono con el número de productos, que pone
  // public/js/presupuesto.js
  // (en el móvil no se repite dentro del menú: está a la vista junto al botón del menú)
  const solicitud = sitio.solicitud ? `
        <li class="nav-item d-none d-lg-block">
          <a class="nav-link pildora-solicitud${actual === '/presupuesto' ? ' active' : ''}"${actual === '/presupuesto' ? ' aria-current="page"' : ''} href="/presupuesto/" title="Mi solicitud de presupuesto" data-enlace-solicitud>
            <i class="bi bi-clipboard-check" aria-hidden="true"></i>Mi solicitud<span class="visually-hidden"> de presupuesto</span>
            <span class="badge rounded-pill contador-solicitud" data-contador-solicitud hidden></span>
          </a>
        </li>` : '';
  // Botón destacado al final del menú (Ajustes → Menú superior: diseño → Botón destacado)
  const cfgBoton = (sitio.navbar || {}).boton || {};
  const hrefBoton = cfgBoton.texto ? hrefDe(cfgBoton) : '#';
  const destacado = cfgBoton.texto && hrefBoton !== '#' ? `
        <li class="nav-item nav-destacado">
          <a class="btn btn-destacado"${actual === limpia(hrefBoton) ? ' aria-current="page"' : ''} href="${esc(hrefBoton)}">${esc(cfgBoton.texto)}</a>
        </li>` : '';
  const enlaces = (claseUl = '') => `${itemCatalogo ? catalogoMovil(itemCatalogo) : ''}<ul class="navbar-nav ${claseUl}">${menu.map(opcion).join('')}${solicitud}${buscar}${destacado}</ul>`;

  // En el móvil, el acceso a la solicitud (con su contador) queda a la vista junto al botón del menú
  const solicitudMovil = sitio.solicitud ? `
      <a class="nav-link me-3 position-relative enlace-solicitud-movil" href="/presupuesto/" title="Mi solicitud de presupuesto" data-enlace-solicitud>
        <i class="bi bi-clipboard-check fs-4" aria-hidden="true"></i><span class="visually-hidden">Mi solicitud de presupuesto</span>
        <span class="badge rounded-pill contador-solicitud position-absolute top-0 start-100 translate-middle" data-contador-solicitud hidden></span>
      </a>` : '';
  // Solicitud y botón del menú juntos a la derecha, en la misma línea que el logo
  const boton = tipo => `
      <div class="d-flex align-items-center ms-auto d-lg-none cabecera-acciones">${solicitudMovil}
      <button class="navbar-toggler" type="button" data-bs-toggle="${tipo}" data-bs-target="#menu"
              aria-controls="menu" aria-expanded="false" aria-label="Abrir menú">
        <span class="navbar-toggler-icon"></span>
      </button>
      </div>`;

  const DISENOS = {
    // Logo a la izquierda, enlaces a la derecha; en móvil se despliega hacia abajo
    clasico: () => `
        <div class="container">
          ${marca}${cajaBuscar}
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
        </nav>${itemCatalogo ? barraCatalogo(itemCatalogo) : ''}
      </header>`;

  // Pie en cuatro columnas: marca, descripción y redes · Catálogo (tipos con su número y Ofertas) ·
  // La tienda (opciones del menú, Mi solicitud y Buscar) · Visítanos (dirección, «Cómo llegar»,
  // teléfono, WhatsApp, correo y «Abierto / Cerrado · abre…», que pone public/js/extras.js)
  const co = sitio.contacto || {};
  const wa = String(redes.whatsapp || '').replace(/\D/g, '');
  const REDES = [
    redes.facebook  && { icono: 'bi-facebook',      texto: 'Facebook',  href: redes.facebook, externo: true },
    redes.instagram && { icono: 'bi-instagram',     texto: 'Instagram', href: redes.instagram, externo: true },
    wa              && { icono: 'bi-whatsapp',      texto: 'WhatsApp',  href: `https://wa.me/${wa}`, externo: true },
    redes.rss !== false && !sitio.sinBlog && { icono: 'bi-rss-fill',  texto: 'Suscribirse al blog por RSS', href: '/blog/feed.xml', externo: false },
  ].filter(Boolean);
  const insigniaPie = n => (n ? ` <span class="pie-insignia">${n}<span class="visually-hidden"> ${n === 1 ? 'producto' : 'productos'}</span></span>` : '');
  const catalogoPie = sitio.sinCatalogo ? '' : (sitio.catalogo || []).map(t => `<li><a href="${esc(t.enlace)}">${esc(t.texto)}</a>${insigniaPie(t.n)}</li>`).join('')
    + (menu.some(m => m.catalogo) && !sitio.sinOfertas ? `<li><a href="/ofertas/">Ofertas</a>${sitio.nOfertas ? ` <span class="pie-insignia">${sitio.nOfertas}</span>` : ''}</li>` : '');
  // La tienda: opciones del menú que llevan a una página (sin el catálogo), Mi solicitud y Buscar
  const enlacesTienda = menu.filter(m => !m.catalogo).flatMap(m => (m.hijos?.length ? [...(hrefDe(m) !== '#' ? [m] : []), ...m.hijos] : [m]))
    .filter(m => m.texto && m.texto !== '---' && !m.separador && hrefDe(m) !== '#')
    .map(m => ({ texto: m.texto, href: hrefDe(m) }))
    .concat(sitio.solicitud ? [{ texto: 'Mi solicitud de presupuesto', href: '/presupuesto/' }] : [], sitio.buscador === false ? [] : [{ texto: 'Buscar', href: '/buscar/' }]);
  const telHref = String(co.telefono || '').replace(/[^\d+]/g, '');
  const datoPie = (icono, html) => `<li><i class="bi ${icono}" aria-hidden="true"></i><span>${html}</span></li>`;
  const visitanos = [
    co.lineas?.length && datoPie('bi-geo-alt', `${co.lineas.map(esc).join('<br>')}<br><a class="pie-llegar" href="/paginas/contacto-y-horario/#como-llegar">Cómo llegar <i class="bi bi-arrow-right" aria-hidden="true"></i></a>`),
    co.telefono && datoPie('bi-telephone', `<a href="tel:${esc(telHref)}">${esc(co.telefono)}</a>`),
    wa && datoPie('bi-whatsapp', `<a href="https://wa.me/${wa}" target="_blank" rel="noopener noreferrer">${esc(wa.replace(/^34(?=\d{9}$)/, '').replace(/(\d{3})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4'))}</a>`),
    co.correo && datoPie('bi-envelope', `<a href="mailto:${esc(co.correo)}">${esc(co.correo)}</a>`),
  ].filter(Boolean).join('');

  const pie = `
      <footer class="pie-web mt-auto">
        <div class="container">
          <div class="pie-rejilla${catalogoPie ? '' : ' sin-catalogo'}">
            <div class="pie-columna-marca">
              <a class="pie-marca" href="/">
                ${sitio.logo ? `<img src="${esc(sitio.logo)}" alt="" class="logo-pie" width="46" height="46" loading="lazy">` : ''}
                <span>${esc(sitio.nombre)}</span>
              </a>
              ${sitio.descripcion ? `<p class="pie-descripcion">${esc(sitio.descripcion)}</p>` : ''}
              ${REDES.length ? `<ul class="pie-redes" aria-label="Redes sociales">
                ${REDES.map(x => `<li><a href="${esc(x.href)}" aria-label="${esc(x.texto)}" title="${esc(x.texto)}"${x.externo ? ' target="_blank" rel="noopener noreferrer"' : ''}><i class="bi ${x.icono}" aria-hidden="true"></i></a></li>`).join('')}
              </ul>` : ''}
            </div>
            ${catalogoPie ? `<nav aria-labelledby="pie-catalogo">
              <h2 class="pie-titulo" id="pie-catalogo"><i class="bi bi-scissors" aria-hidden="true"></i>Catálogo</h2>
              <ul class="pie-enlaces">${catalogoPie}</ul>
            </nav>` : ''}
            ${enlacesTienda.length ? `<nav aria-labelledby="pie-tienda">
              <h2 class="pie-titulo" id="pie-tienda"><i class="bi bi-shop" aria-hidden="true"></i>La tienda</h2>
              <ul class="pie-enlaces">${enlacesTienda.map(m => `<li><a href="${esc(m.href)}">${esc(m.texto)}</a></li>`).join('')}</ul>
            </nav>` : ''}
            ${visitanos || co.conHorario ? `<div>
              <h2 class="pie-titulo"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i>Visítanos</h2>
              ${visitanos ? `<ul class="pie-datos">${visitanos}</ul>` : ''}
              ${co.conHorario ? `<p class="estado-tienda pie-estado" data-abierto data-horario="${esc(co.horario)}"${co.aviso ? ` data-aviso="${esc(co.aviso)}"` : ''} aria-live="polite" hidden></p>` : ''}
            </div>` : ''}
          </div>
          <div class="pie-legal">
            <span>© ${new Date().getFullYear()} ${esc(sitio.nombre)}${sitio.localidad ? ` · ${esc(sitio.localidad)}` : ''} · Precios orientativos, IVA incluido</span>
            ${legales.length ? `<nav aria-label="Información legal" class="enlaces-legales">
              ${legales.map(l => `<a href="${esc(hrefDe(l))}">${esc(l.texto)}</a>`).join('')}
            </nav>` : ''}
          </div>
        </div>
      </footer>`;

  return { cabecera, pie };
}
