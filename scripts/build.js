/*
  GENERADOR DE LA WEB DE LA TIENDA (se ejecuta en cada despliegue: npm run build)
  Adaptado del generador de la web de la plataforma (web-plataforma).

  Copia public/ a dist/ y genera, a partir de lo que se edita en Decap:
    - /blog/<slug>/            una página por entrada del blog
    - /paginas/<slug>/         una página por cada página de Decap
    - la portada, /blog/ y la 404 con el contenido ya dentro
    - cabecera, pie, menú, tema y colores desde los Ajustes del sitio
      (public/_datos/sitio.yml, editable en Decap)
    - etiquetas para buscadores y redes (title, description, canonical, Open Graph,
      Twitter), datos estructurados JSON-LD, iconos y manifest
    - imágenes con nombre descriptivo y versiones WebP reducidas
    - sitemap.xml, robots.txt y feed RSS del blog
    - imágenes automáticas para compartir (con el título) cuando no hay imagen
    - el índice del buscador (/buscar/, con Pagefind)
    - y al final comprueba que no hay enlaces internos rotos
  El catálogo (productos, fabricantes, categorías) llega en la fase 2 (docs/PLAN.md).

  ENTORNOS: la variable ENTORNO_WEB indica para qué entorno se construye. Si no se
  indica, en Cloudflare Pages se deduce de la rama (CF_PAGES_BRANCH): «main» es
  «produccion» y cualquier otra rama es un entorno de pruebas con su nombre; en el
  equipo, «local».
  Fuera de producción: aviso visible de entorno de pruebas y nada indexable por
  buscadores. En producción, la web tampoco se indexa mientras «Permitir que Google
  indexe la web» (Ajustes → Avanzado) esté desactivado: así se queda hasta tener el
  dominio definitivo.
  El panel de Decap de cada entorno edita SU rama (el build ajusta config.yml). El
  contenido marcado como «Solo para pruebas» no se publica en producción.
*/
import fs from 'fs';
import path from 'path';
import { parse as leerYaml, parseDocument } from 'yaml';
import { marked } from 'marked';
import { parse as leerHtml } from 'node-html-parser';
import { construir as construirLayout } from './layout.js';
import { RAMAS_CON_PANEL } from '../lib/origenes.js';
import opentype from 'opentype.js';
import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';

/* ---------- Informe del build ----------
   Todos los avisos (console.warn) y algunas notas se guardan, además de mostrarse en
   el registro, para escribir un informe (variable INFORME_BUILD) que el despliegue
   muestra en el Summary de GitHub Actions (scripts/resumen-despliegue.js). */
const INFORME = { avisos: [], notas: [] };
let capturarAvisos = true;
const avisoOriginal = console.warn.bind(console);
console.warn = (...partes) => {
  const texto = partes.join(' ').trim();
  if (capturarAvisos && texto) INFORME.avisos.push(texto.replace(/^Aviso(?: \([^)]*\))?:\s*/, ''));
  avisoOriginal(...partes);
};
const nota = texto => { INFORME.notas.push(texto); console.log(`  ${texto}`); };

const PUB = 'public';
const DIST = 'dist';
const AHORA = new Date();
const INICIO = Date.now();

/* =========================================================
   Ajustes del sitio (Decap → Ajustes del sitio → public/_datos/sitio.yml)
   ========================================================= */
const AJUSTES = leerYaml(fs.readFileSync(`${PUB}/_datos/sitio.yml`, 'utf8')) || {};
const ap = AJUSTES.apariencia || {};
const av = AJUSTES.avanzado || {};
const SITIO = {
  nombre: AJUSTES.nombre || 'Tienda',
  nombreCorto: AJUSTES.nombre_corto || AJUSTES.nombre || 'Tienda',
  descripcion: AJUSTES.descripcion || '',
  localidad: AJUSTES.localidad || '',
  provincia: AJUSTES.provincia || '',
  logo: AJUSTES.logo || '',
  imagenCompartir: AJUSTES.imagen_compartir || '/img/compartir.jpg',
  url: av.url || 'https://tienda-online.pages.dev',
  // Hasta tener el dominio definitivo, la web no se deja indexar (docs/PLAN.md, fase 0)
  indexable: av.indexable === true,
  colorTema: ap.color_barra_movil || '#ffffff',
  navbar: AJUSTES.navbar || {},
  menu: AJUSTES.menu || [],
  legales: AJUSTES.legales || [],
  redes: AJUSTES.redes || {},
  buscador: (AJUSTES.navbar || {}).buscador !== false,
};
// Solo direcciones seguras en los Ajustes (nada de javascript:, data:...)
const urlSegura = u => (typeof u === 'string' && /^(\/(?!\/)|#|https:\/\/|http:\/\/|mailto:|tel:)/i.test(u.trim()) ? u.trim() : '');
for (const r of ['facebook', 'instagram']) {
  if (SITIO.redes[r] && !urlSegura(SITIO.redes[r])) { console.warn(`Aviso: la dirección de «${r}» en Ajustes no es válida y se ignora.`); SITIO.redes[r] = ''; }
}
const revisarEnlaces = lista => (lista || []).forEach(m => {
  if (m.enlace && !urlSegura(m.enlace)) { console.warn(`Aviso: la dirección «${m.enlace}» de «${m.texto}» no es válida y se ignora.`); m.enlace = ''; }
  revisarEnlaces(m.hijos);
});
revisarEnlaces(SITIO.menu);
revisarEnlaces(SITIO.legales);
// Solicitud de presupuesto (Decap → Solicitud de presupuesto → public/_datos/solicitud.yml)
const DATOS_SOLICITUD = fs.existsSync(`${PUB}/_datos/solicitud.yml`) ? leerYaml(fs.readFileSync(`${PUB}/_datos/solicitud.yml`, 'utf8')) || {} : {};
const SOLICITUD = {
  activa: DATOS_SOLICITUD.activa !== false,
  titulo: DATOS_SOLICITUD.titulo || 'Mi solicitud de presupuesto',
  introduccion: DATOS_SOLICITUD.introduccion || '',
  aceptacion: DATOS_SOLICITUD.aceptacion || 'He leído y acepto las condiciones de la solicitud de presupuesto y la información sobre protección de datos.',
  infoPrivacidad: DATOS_SOLICITUD.info_privacidad || '',
  boton: DATOS_SOLICITUD.boton || 'Enviar solicitud',
};
SITIO.solicitud = SOLICITUD.activa; // contador del menú (scripts/layout.js)
if (!SOLICITUD.activa) console.log('Solicitud de presupuesto desactivada (Decap → Solicitud de presupuesto): sin botón, contador ni formulario.');
const construir = ruta => construirLayout(SITIO, ruta);

// Listados (Decap → Ajustes del sitio → Listados e imágenes)
const ls = AJUSTES.listados || {};
const entero = (v, def, min = 1) => (Number.isFinite(Number(v)) && Number(v) >= min ? Math.floor(Number(v)) : def);
const LISTADOS = {
  noticiasPorPagina: entero(ls.noticias_por_pagina, 12),
  productosPortada: entero(ls.productos_portada, 8),
  ofertasPortada: entero(ls.ofertas_portada, 8),
  productosPorPagina: entero(ls.productos_por_pagina, 12),
};

// Caché entre despliegues (node_modules/.cache): las imágenes ya
// optimizadas o generadas no se vuelven a calcular.
const CACHE = 'node_modules/.cache/tienda';
const VERSION_CACHE = 'v1';
fs.mkdirSync(CACHE, { recursive: true });
const huella = (...partes) => crypto.createHash('md5').update(partes.join('|')).digest('hex');
let usosCache = 0, generadasNuevas = 0;
const URL_BASE = SITIO.url.replace(/\/+$/, '');

// Entorno para el que se construye (ver comentario del principio)
const RAMA_CF = String(process.env.CF_PAGES_BRANCH || '').trim();
const ENTORNO = String(process.env.ENTORNO_WEB || (RAMA_CF ? (RAMA_CF === 'main' ? 'produccion' : RAMA_CF) : 'local'))
  .trim().toLowerCase().replace(/[^a-z0-9._/-]/g, '-').slice(0, 60) || 'local';
const ES_PRODUCCION = ENTORNO === 'produccion';
const ES_LOCAL = ENTORNO === 'local';
// ¿Se deja indexar a los buscadores? Solo producción y solo si está activado en los Ajustes
const INDEXABLE = ES_PRODUCCION && SITIO.indexable;
// Rama de Git exacta del entorno (para el panel); la da Cloudflare Pages o el despliegue
const RAMA_GIT = String(process.env.RAMA_GIT || RAMA_CF || (ES_PRODUCCION ? 'main' : '')).trim();
// Panel solo en producción, local y las ramas de entorno de lib/origenes.js
// (las únicas cuyas direcciones pueden usar el login). El resto de ramas (feature/…,
// borradores cms/…, Dependabot) tienen vista previa sin panel.
const PANEL_EN_ENTORNO = ES_PRODUCCION || ES_LOCAL || RAMAS_CON_PANEL.includes(RAMA_GIT);
if (!ES_PRODUCCION) {
  console.log(`Entorno: ${ENTORNO} (pruebas: no indexable; panel ${ES_LOCAL ? 'en local con «npm run panel»' : PANEL_EN_ENTORNO ? `editando la rama «${RAMA_GIT}»` : 'desactivado'}).`);
} else if (!INDEXABLE) {
  console.log('Producción sin indexar: «Permitir que Google indexe la web» está desactivado (Ajustes → Avanzado).');
}
const DOMINIO = new URL(URL_BASE).hostname;
const abs = p => (/^https?:\/\//.test(p) ? p : URL_BASE + p);

/* =========================================================
   Utilidades
   ========================================================= */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const desescapar = s => String(s ?? '')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const slugify = s => String(s ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  .slice(0, 80).replace(/-+$/, '');

const ZONA = 'Europe/Madrid';
const fmt = (d, op) => new Date(d).toLocaleString('es-ES', { timeZone: ZONA, ...op });
const fechaLarga = d => fmt(d, { day: 'numeric', month: 'long', year: 'numeric' });
const fechaValida = d => d && !Number.isNaN(new Date(d).getTime());

function textoPlano(md) {
  return String(md ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function resumir(txt, max = 155) {
  const t = textoPlano(txt);
  return t.length > max ? t.slice(0, max).replace(/\s\S*$/, '') + '…' : t;
}

const ldJson = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

function escribir(ruta, contenido) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, contenido);
}

const esVerdadero = v => v === true || v === 'true';

/* =========================================================
   Lectura del contenido de Decap
   ========================================================= */
// Lee los .md de una carpeta y de sus subcarpetas (las noticias van en subcarpetas
// por año: _posts/blog/2026/...). La URL sale solo del nombre del fichero.
let excluidosPrueba = 0;
function leerColeccion(dir) {
  if (!fs.existsSync(dir)) return [];
  const ficheros = fs.readdirSync(dir, { recursive: true }).map(String).filter(f => f.endsWith('.md'));
  const vistos = new Map();
  return ficheros.map(f => {
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    let meta = {};
    try { meta = m ? (leerYaml(m[1]) || {}) : {}; } catch (e) { console.warn(`Aviso: front matter no válido en ${dir}/${f}`); }
    const slug = path.basename(f).replace(/\.md$/, '');
    if (vistos.has(slug)) console.warn(`Aviso: hay dos ficheros con el mismo nombre (${vistos.get(slug)} y ${f}); solo se publica uno.`);
    vistos.set(slug, f);
    return { slug, meta, cuerpo: m ? m[2] : txt, fichero: path.join(dir, f).split(path.sep).join('/') };
  }).filter((x, i, todos) => todos.findIndex(y => y.slug === x.slug) === i)
    // «Solo para pruebas»: se ve en los entornos de prueba, nunca en producción
    .filter(x => {
      if (ES_PRODUCCION && (x.meta.prueba === true || x.meta.prueba === 'true')) {
        excluidosPrueba++;
        nota(`Sin publicar (solo para pruebas): ${path.basename(dir)}/${x.slug}`);
        return false;
      }
      return true;
    });
}

/* =========================================================
   1. Copiar public/ a dist/
   ========================================================= */
fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(PUB, DIST, { recursive: true });
// Los .md solo los necesita Decap (los lee desde GitHub), no la web
for (const d of ['_posts', '_paginas', '_datos', '_productos', '_categorias', '_fabricantes']) fs.rmSync(path.join(DIST, d), { recursive: true, force: true });

/* =========================================================
   2. Imágenes con nombre descriptivo
      La imagen que sube Decap conserva su nombre en el repo; en la web
      publicada se sirve con el título del contenido (p. ej.
      /img/asamblea-abierta-a-la-ciudadania.jpg). Si una imagen se usa en
      varios sitios, se queda con el nombre del primero.
   ========================================================= */
const RESERVADAS = new Set([SITIO.logo, SITIO.imagenCompartir]);
const ocupados = new Set(fs.existsSync(`${PUB}/img`) ? fs.readdirSync(`${PUB}/img`).map(f => `/img/${f}`) : []);
const mapaImagenes = new Map();
const usadas = new Set(); // imágenes que aparecen en el contenido (se optimizan)

function renombrarImagen(ruta, base) {
  if (!ruta || typeof ruta !== 'string' || !ruta.startsWith('/img/') || RESERVADAS.has(ruta)) return ruta;
  if (mapaImagenes.has(ruta)) return mapaImagenes.get(ruta);
  const origen = path.join(PUB, decodeURIComponent(ruta));
  if (!fs.existsSync(origen)) return ruta;

  const ext = path.extname(ruta).toLowerCase();
  let nuevo = `/img/${base}${ext}`;
  for (let n = 2; nuevo !== ruta && ocupados.has(nuevo); n++) nuevo = `/img/${base}-${n}${ext}`;

  if (nuevo !== ruta) {
    fs.copyFileSync(origen, path.join(DIST, nuevo));
    ocupados.add(nuevo);
  }
  mapaImagenes.set(ruta, nuevo);
  usadas.add(nuevo);
  return nuevo;
}

// Avisa de las imágenes que no están en /img/: no se publicarían (la web solo sirve las de
// public/img). Pasa, por ejemplo, si el panel guarda una imagen junto a la noticia en
// _posts/blog/<año>/ (ver media_folder en public/config.yml). Las externas (https://…) no se tocan.
function revisarImagenes(item, campoImagen) {
  const rutas = [];
  if (typeof item.meta[campoImagen] === 'string' && item.meta[campoImagen].trim()) rutas.push(item.meta[campoImagen].trim());
  for (const m of item.cuerpo.matchAll(/!\[[^\]]*\]\(\s*<?([^\s)>]+)/g)) rutas.push(m[1]);
  for (const m of item.cuerpo.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) rutas.push(m[1]);
  for (const ruta of new Set(rutas)) {
    if (/^(https?:)?\/\//i.test(ruta) || ruta.startsWith('/img/')) continue;
    console.warn(`Aviso: la imagen «${ruta}» de ${item.fichero || item.slug} no está en /img/ y no se verá en la web. Vuelve a elegirla en el panel (se guardará en public/img).`);
  }
}

// Renombra la imagen principal y las que haya dentro del texto
function prepararImagenes(item, campoImagen) {
  revisarImagenes(item, campoImagen);
  const base = slugify(item.meta.title) || item.slug;
  let n = 0;
  const siguiente = () => (++n === 1 ? base : `${base}-${n}`);
  if (item.meta[campoImagen]) item.meta[campoImagen] = renombrarImagen(item.meta[campoImagen], siguiente());
  item.cuerpo = item.cuerpo.replace(/\/img\/[^\s)"'<>]+/g, r => renombrarImagen(r, siguiente()));
}

/* =========================================================
   3. Datos
   ========================================================= */
const ORGANIZACION = {
  '@type': 'Store',
  '@id': `${URL_BASE}/#organizacion`,
  name: SITIO.nombre,
  url: `${URL_BASE}/`,
  logo: abs(SITIO.logo),
  email: SITIO.redes.email,
  description: SITIO.descripcion,
  areaServed: SITIO.localidad,
  address: { '@type': 'PostalAddress', addressLocality: SITIO.localidad, addressRegion: SITIO.provincia, addressCountry: 'ES' },
  sameAs: [SITIO.redes.facebook, SITIO.redes.instagram].filter(Boolean),
};
const REF_ORG = { '@id': ORGANIZACION['@id'] };

const noticias = leerColeccion(`${PUB}/_posts/blog`)
  .map(n => { prepararImagenes(n, 'thumbnail'); return n; })
  .map(n => ({
    ...n,
    titulo: n.meta.title || n.slug,
    fecha: fechaValida(n.meta.date) ? new Date(n.meta.date) : null,
    imagen: n.meta.thumbnail || '',
    imagenAlt: n.meta.thumbnail_alt || n.meta.title || '',
    resumen: n.meta.description || resumir(n.cuerpo),
    // Descripción para Google y redes escrita a mano (opcional): manda sobre la automática
    descGoogle: String(n.meta.descripcion_google || '').replace(/\s+/g, ' ').trim(),
    tipo: 'Blog',
    url: `/blog/${n.slug}/`,
  }))
  .sort((a, b) => (b.fecha || 0) - (a.fecha || 0));

const paginas = leerColeccion(`${PUB}/_paginas`)
  .map(p => { prepararImagenes(p, 'imagen'); return p; })
  .map(p => ({
    ...p,
    titulo: p.meta.title || p.slug,
    imagen: p.meta.imagen || '',
    imagenAlt: p.meta.imagen_alt || p.meta.title || '',
    resumen: p.meta.description || resumir(p.cuerpo),
    // Descripción para Google y redes escrita a mano (opcional): manda sobre la automática
    descGoogle: String(p.meta.descripcion_google || '').replace(/\s+/g, ' ').trim(),
    noindex: esVerdadero(p.meta.noindex),
    tipo: 'Página',
    url: `/paginas/${p.slug}/`,
  }));

/* =========================================================
   3b. Catálogo: fabricantes, categorías y productos (Decap → Catálogo)
       - Fabricantes: sin página; nombre e imagen para las fichas y los filtros.
       - Categorías: principales y subcategorías («Categoría padre»), dos niveles;
         cada una tiene su página y sale en el menú «Catálogo».
       - Productos: los «No disponibles» no se publican (ni sus fotos).
   ========================================================= */
// Día de hoy en Madrid (AAAA-MM-DD), para las ofertas
const diaMadrid = d => new Date(d).toLocaleDateString('sv-SE', { timeZone: ZONA });
const HOY = diaMadrid(AHORA);
const textoDia = v => (v instanceof Date ? diaMadrid(v) : /^\d{4}-\d{2}-\d{2}/.test(String(v || '')) ? String(v).slice(0, 10) : '');
const numero = v => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
const lista = v => (Array.isArray(v) ? v : v ? [v] : []).map(String).filter(Boolean);

const fabricantes = leerColeccion(`${PUB}/_fabricantes`).map(f => ({
  ...f,
  nombre: f.meta.title || f.slug,
  imagen: typeof f.meta.imagen === 'string' && f.meta.imagen.trim() ? f.meta.imagen.trim() : '',
})).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
const fabricantePorSlug = new Map(fabricantes.map(f => [f.slug, f]));

const categoriasTodas = leerColeccion(`${PUB}/_categorias`)
  .map(c => { prepararImagenes(c, 'imagen'); return c; })
  .map(c => ({
    ...c,
    titulo: c.meta.title || c.slug,
    padre: String(c.meta.padre || '').trim(),
    orden: Number.isFinite(Number(c.meta.orden)) ? Number(c.meta.orden) : 999,
    resumen: c.meta.description || resumir(c.cuerpo),
    imagen: c.meta.imagen || '',
    imagenAlt: c.meta.imagen_alt || c.meta.title || '',
  }));
const porOrden = (a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo, 'es');
const categoriaPorSlug = new Map(categoriasTodas.map(c => [c.slug, c]));
// Solo dos niveles: una subcategoría tiene que colgar de una categoría principal
for (const c of categoriasTodas) {
  if (!c.padre) continue;
  const p = categoriaPorSlug.get(c.padre);
  if (c.padre === c.slug) { console.warn(`Aviso: la categoría «${c.titulo}» es su propia categoría padre; se trata como principal.`); c.padre = ''; }
  else if (!p) { console.warn(`Aviso: la categoría padre «${c.padre}» de «${c.titulo}» no existe; se trata como principal.`); c.padre = ''; }
  else if (p.padre) { console.warn(`Aviso: «${c.titulo}» cuelga de «${p.titulo}», que ya es subcategoría (solo hay dos niveles); no se publica.`); c.invalida = true; }
}
const categorias = categoriasTodas.filter(c => !c.invalida);
for (const c of categorias) {
  c.url = c.padre ? `/catalogo/${c.padre}/${c.slug}/` : `/catalogo/${c.slug}/`;
  c.hijos = categorias.filter(h => h.padre === c.slug).sort(porOrden);
}
const categoriasPrincipales = categorias.filter(c => !c.padre).sort(porOrden);

const productosTodos = leerColeccion(`${PUB}/_productos`).map(p => {
  const m = p.meta;
  revisarImagenes({ ...p, meta: { ...m, _img: '' } }, '_img');
  const imagenes = (Array.isArray(m.imagenes) ? m.imagenes : [])
    .map(i => ({ src: String(i?.imagen || '').trim(), alt: String(i?.alt || '').trim() }))
    .filter(i => i.src);
  for (const i of imagenes) if (!/^(https?:)?\/\//i.test(i.src) && !i.src.startsWith('/img/')) console.warn(`Aviso: la foto «${i.src}» de ${p.fichero} no está en /img/ y no se verá en la web. Vuelve a elegirla en el panel.`);
  const o = m.oferta || {};
  return {
    ...p,
    nombre: m.title || p.slug,
    modelo: String(m.modelo || '').trim(),
    referencia: String(m.referencia || '').trim(),
    fabricante: fabricantePorSlug.get(String(m.fabricante || '').trim()) || null,
    fabricanteSlug: String(m.fabricante || '').trim(),
    categoria: categoriaPorSlug.get(String(m.categoria || '').trim()) || null,
    categoriaSlug: String(m.categoria || '').trim(),
    compatibleCon: lista(m.compatible_con),
    fecha: fechaValida(m.date) ? new Date(m.date) : null,
    precio: numero(m.precio),
    estado: ['disponible', 'oferta', 'no_disponible'].includes(m.estado) ? m.estado : 'disponible',
    oferta: { precio: numero(o.precio), inicio: textoDia(o.inicio), fin: textoDia(o.fin) },
    segundaMano: m.condicion === 'segunda_mano',
    estadoUso: String(m.segunda_mano?.estado || '').trim(),
    garantia: numero(m.segunda_mano?.garantia),
    imagenes: imagenes.slice(0, 5),
    resumen: m.description || resumir(p.cuerpo),
    caracteristicas: (Array.isArray(m.caracteristicas) ? m.caracteristicas : [])
      // La característica es opcional: sin ella, el valor ocupa la fila entera
      .map(c => ({ nombre: String(c?.nombre || '').trim(), valor: String(c?.valor || '').trim() })).filter(c => c.valor),
    tipo: 'Producto',
    url: `/productos/${p.slug}/`,
  };
});

// Validaciones (avisos para quien edita: el producto se publica igualmente salvo que se diga)
const refsVistas = new Map();
for (const p of productosTodos) {
  const donde = `el producto «${p.nombre}» (${p.fichero})`;
  const del = `del producto «${p.nombre}» (${p.fichero})`;
  if (!p.modelo) console.warn(`Aviso: falta el modelo en ${donde}.`);
  if (!p.fabricante) console.warn(`Aviso: ${p.fabricanteSlug ? `el fabricante «${p.fabricanteSlug}» no existe` : 'falta el fabricante'} en ${donde}.`);
  if (!p.categoria) console.warn(`Aviso: ${p.categoriaSlug ? `la categoría «${p.categoriaSlug}» no existe` : 'falta la categoría'} en ${donde}; solo saldrá en «Todo el catálogo».`);
  else if (p.categoria.hijos.length) nota(`${donde} está en «${p.categoria.titulo}», que tiene subcategorías: mejor elegir una subcategoría.`);
  if (p.estado !== 'no_disponible' && !p.imagenes.length) console.warn(`Aviso: ${donde} no tiene fotos.`);
  if (p.imagenes.some(i => !i.alt)) nota(`${donde}: alguna foto no tiene descripción; se usa el nombre del producto.`);
  if ((Array.isArray(p.meta.imagenes) ? p.meta.imagenes.length : 0) > 5) console.warn(`Aviso: ${donde} tiene más de 5 fotos; solo se publican las 5 primeras.`);
  if (p.meta.precio != null && p.meta.precio !== '' && p.precio == null) console.warn(`Aviso: el precio ${del} no es un número.`);
  if (p.segundaMano && (p.garantia == null || p.garantia < 12)) console.warn(`Aviso: la garantía ${del} (segunda mano) es ${p.garantia ?? 'vacía'}: tiene que ser de 12 meses como mínimo.`);
  if (p.referencia) {
    if (refsVistas.has(p.referencia)) console.warn(`Aviso: la referencia «${p.referencia}» se repite en «${refsVistas.get(p.referencia)}» y en «${p.nombre}».`);
    refsVistas.set(p.referencia, p.nombre);
  }
  if (p.compatibleCon.includes(p.slug)) console.warn(`Aviso: ${donde} es «compatible con» sí mismo.`);
  if (p.estado === 'oferta') {
    const o = p.oferta;
    if (o.precio == null || !o.inicio || !o.fin) console.warn(`Aviso: ${donde} está «En oferta» pero le falta el precio de oferta o alguna fecha; se muestra con su precio normal.`);
    else if (p.precio != null && o.precio >= p.precio) console.warn(`Aviso: el precio de oferta ${del} (${o.precio} €) no es menor que el normal (${p.precio} €); no se muestra como oferta.`);
    else if (o.fin < o.inicio) console.warn(`Aviso: la oferta ${del} acaba antes de empezar.`);
    // Oferta terminada: no es un error. La web ya lo trata como disponible, con su precio normal
    // (ver p.enOferta); en el panel sigue «En oferta» hasta que alguien lo cambie o ponga fechas nuevas.
    else if (o.fin < HOY) nota(`Oferta terminada el ${o.fin} ${del}: se muestra como disponible, con su precio normal.`);
  }
}
// Oferta vigente hoy (fechas incluidas, hora de Madrid)
for (const p of productosTodos) {
  const o = p.oferta;
  p.enOferta = p.estado === 'oferta' && o.precio != null && !!o.inicio && !!o.fin && o.inicio <= HOY && HOY <= o.fin
    && (p.precio == null || o.precio < p.precio);
  p.descuento = p.enOferta && p.precio ? Math.round((1 - o.precio / p.precio) * 100) : 0;
}
const productos = productosTodos.filter(p => p.estado !== 'no_disponible')
  .sort((a, b) => (b.fecha || 0) - (a.fecha || 0) || a.nombre.localeCompare(b.nombre, 'es'));
const productoPorSlug = new Map(productos.map(p => [p.slug, p]));
for (const p of productosTodos) {
  for (const s of p.compatibleCon) if (s !== p.slug && !productosTodos.some(x => x.slug === s)) console.warn(`Aviso: el producto «${p.nombre}» es «compatible con» «${s}», que no existe.`);
}
// Accesorios en los dos sentidos (solo entre productos visibles)
for (const p of productos) {
  p.compatibles = p.compatibleCon.map(s => productoPorSlug.get(s)).filter(x => x && x !== p);
  p.accesorios = [];
}
for (const a of productos) for (const m of a.compatibles) m.accesorios.push(a);
const enCategoria = c => productos.filter(p => p.categoria && (p.categoria === c || p.categoria.padre === c.slug));
const ofertas = productos.filter(p => p.enOferta).sort((a, b) => b.oferta.inicio.localeCompare(a.oferta.inicio) || a.nombre.localeCompare(b.nombre, 'es'));

// Fotos de productos y logos de fabricantes: solo se publican los que se usan (las fotos de los
// productos «No disponibles», o del contenido «Solo para pruebas» en producción, se quitan de dist/)
const fotosUsadas = new Set([...productos.flatMap(p => p.imagenes.map(i => i.src)), ...fabricantes.map(f => f.imagen)]);
function quitarFotos(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) quitarFotos(f);
    else if (!fotosUsadas.has('/' + path.relative(DIST, f).split(path.sep).join('/'))) fs.rmSync(f);
  }
}
quitarFotos(path.join(DIST, 'img/productos'));
quitarFotos(path.join(DIST, 'img/fabricantes'));

// Menú «Catálogo» (lo usa scripts/layout.js)
SITIO.catalogo = categoriasPrincipales.map(c => ({ texto: c.titulo, enlace: c.url, hijos: c.hijos.map(h => ({ texto: h.titulo, enlace: h.url })) }));

// Las imágenes renombradas no se publican también con su nombre original (menos ficheros)
for (const [orig, nuevo] of mapaImagenes) if (orig !== nuevo) fs.rmSync(path.join(DIST, decodeURIComponent(orig)), { force: true });

// Relacionados: las entradas más recientes del blog, sin la propia
const relacionados = (item, lista, max = 3) => lista.filter(x => x !== item).slice(0, max);

/* =========================================================
   4. Optimización de imágenes (WebP en varios tamaños)
      Si "sharp" no está disponible, la web se genera igual con las
      imágenes originales.
   ========================================================= */
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { console.warn('Aviso: sharp no disponible, las imágenes no se optimizan.'); }

const ANCHOS = [480, 960, 1600];
const optimizadas = new Map(); // ruta → { ancho, alto, fuentes: [{ url, w }] }

async function optimizar(ruta) {
  if (!sharp || optimizadas.has(ruta) || !/\.(jpe?g|png|webp)$/i.test(ruta)) return;
  const fichero = path.join(DIST, decodeURIComponent(ruta));
  if (!fs.existsSync(fichero)) return;
  try {
    const h = huella(VERSION_CACHE, fs.readFileSync(fichero).toString('base64'));
    const ficheroMeta = path.join(CACHE, `${h}.json`);
    let meta;
    if (fs.existsSync(ficheroMeta)) meta = JSON.parse(fs.readFileSync(ficheroMeta, 'utf8'));
    else { const m = await sharp(fichero).rotate().metadata(); meta = { width: m.width, height: m.height }; fs.writeFileSync(ficheroMeta, JSON.stringify(meta)); }
    const anchos = [...new Set([...ANCHOS.filter(w => w < meta.width), Math.min(meta.width, ANCHOS.at(-1))])];
    // Con la carpeta en el nombre (productos/foto-1, fabricantes/logo…), para que no choquen
    const base = ruta.replace(/^\/img\//, '').replace(/\.[^.]+$/, '').replace(/[\/\\]+/g, '-');
    const fuentes = [];
    fs.mkdirSync(path.join(DIST, 'img/opt'), { recursive: true });
    for (const w of anchos) {
      const url = `/img/opt/${base}-${w}.webp`;
      const enCache = path.join(CACHE, `${h}-${w}.webp`);
      if (fs.existsSync(enCache)) usosCache++;
      else { await sharp(fichero).rotate().resize({ width: w }).webp({ quality: 78 }).toFile(enCache); generadasNuevas++; }
      fs.copyFileSync(enCache, path.join(DIST, url));
      fuentes.push({ url, w });
    }
    optimizadas.set(ruta, { ancho: meta.width, alto: meta.height, fuentes });
  } catch (e) {
    console.warn(`Aviso: no se pudo optimizar ${ruta}: ${e.message}`);
  }
}

for (const ruta of usadas) await optimizar(ruta);
for (const x of [...noticias, ...paginas]) if (x.imagen) await optimizar(x.imagen);
for (const x of [...categorias, ...fabricantes]) if (x.imagen) await optimizar(x.imagen);
for (const p of productos) for (const i of p.imagenes) await optimizar(i.src);

const TAM_TARJETA = '(min-width: 992px) 33vw, (min-width: 768px) 50vw, 100vw';
const TAM_ARTICULO = '(min-width: 800px) 760px, 100vw';

// <picture> con WebP y la imagen original como alternativa
function imgHtml(src, alt, { clase = '', tam = TAM_ARTICULO, diferida = true } = {}) {
  const o = optimizadas.get(src);
  const carga = diferida ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"';
  const img = `<img src="${esc(src)}"${clase ? ` class="${clase}"` : ''} alt="${esc(alt)}"${o ? ` width="${o.ancho}" height="${o.alto}"` : ''}${carga}>`;
  if (!o) return img;
  return `<picture><source type="image/webp" srcset="${o.fuentes.map(f => `${f.url} ${f.w}w`).join(', ')}" sizes="${tam}">${img}</picture>`;
}

// Convierte las <img> del texto (markdown) en <picture>
function optimizarHtml(html) {
  const raiz = leerHtml(html, { comment: true });
  for (const img of raiz.querySelectorAll('img')) {
    const src = img.getAttribute('src') || '';
    if (!optimizadas.has(src)) { if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy'); continue; }
    img.insertAdjacentHTML('afterend', imgHtml(src, desescapar(img.getAttribute('alt') || ''), { clase: img.getAttribute('class') || '' }));
    img.remove();
  }
  return raiz.toString();
}
// Limpieza del texto: se permite el formato habitual (títulos, listas, enlaces,
// imágenes, tablas, citas...) y se quita todo lo que pueda ejecutar código
// (scripts, iframes, atributos on*, enlaces javascript:...), aunque alguien lo pegue.
const OPCIONES_LIMPIEZA = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'del', 'ins', 'sup', 'sub']),
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    th: ['align', 'colspan', 'rowspan'], td: ['align', 'colspan', 'rowspan'],
    ol: ['start'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    // Los enlaces externos que abren pestaña nueva no dan acceso a esta web
    a: (tag, attrs) => (attrs.target === '_blank' ? { tagName: 'a', attribs: { ...attrs, rel: 'noopener noreferrer' } } : { tagName: tag, attribs: attrs }),
  },
};
let avisosLimpieza = 0;
function limpiarHtml(html, origen = '') {
  const limpio = sanitizeHtml(html, OPCIONES_LIMPIEZA);
  if (/<(script|iframe|object|embed|form|style)\b|\son\w+\s*=|javascript:/i.test(html)) {
    avisosLimpieza++;
    console.warn(`Aviso: se ha quitado código no permitido (scripts, iframes...) del texto${origen ? ` de ${origen}` : ''}.`);
  }
  return limpio;
}
// Botones del editor (Decap → «+» → Botón): un enlace con título «boton», «boton-negro»
// o «boton-borde» se convierte en un botón del diseño; si está solo en su párrafo, se separa
const CLASE_BOTON = { '': 'btn-destacado', negro: 'btn-dark', borde: 'btn-outline-dark' };
const botonesEditor = html => html
  .replace(/<a ([^>]*?)\s*title="boton(?:-(negro|borde))?"([^>]*)>/g,
    (m, antes, estilo = '', despues) => `<a ${antes}${despues} class="btn btn-lg ${CLASE_BOTON[estilo]}">`)
  .replace(/<p>(\s*<a [^>]*class="btn btn-lg [^"]*"[^>]*>[\s\S]*?<\/a>\s*)<\/p>/g, '<p class="boton-p">$1</p>');
// Enlaces a la propia web escritos con la dirección completa (https://dominio-de-la-tienda/…):
// se convierten en enlaces relativos (/blog/…). Así funcionan también en los entornos de
// prueba (no mandan a producción) y la comprobación de enlaces rotos los revisa.
const HOST_PROPIO = (() => { try { return new URL(URL_BASE).hostname.replace(/^www\./, ''); } catch { return ''; } })();
const RE_ENLACE_PROPIO = HOST_PROPIO
  ? new RegExp(`(href|src)="https?://(?:www\\.)?${HOST_PROPIO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/[^"]*)?"`, 'gi')
  : null;
const enlacesPropios = html => (RE_ENLACE_PROPIO ? html.replace(RE_ENLACE_PROPIO, (m, attr, ruta) => `${attr}="${ruta || '/'}"`) : html);
// Párrafos que son solo una negrita (se usó «negrita» como título): nota para quien edita,
// porque los títulos reales (H2, H3) son mejores para la accesibilidad y para Google
const negritasAvisadas = new Set();
const avisarNegritasTitulo = (html, origen) => {
  // (las frases que acaban en punto son énfasis, no títulos)
  const n = (html.match(/<p><strong>[^<]{1,79}[^<.!?…]<\/strong><\/p>/g) || []).length;
  if (n && origen && !negritasAvisadas.has(origen) && negritasAvisadas.add(origen)) nota(`${origen}: ${n} párrafo(s) en negrita usados como título; mejor usar los títulos del editor (H2/H3).`);
  return html;
};
const md = (txt, origen) => botonesEditor(enlacesPropios(avisarNegritasTitulo(optimizarHtml(limpiarHtml(marked.parse(txt || ''), origen)), origen)));

/* =========================================================
   4b. Imágenes automáticas para compartir (1200×630)
       Para entradas del blog y páginas sin imagen: el título sobre un
       fondo con los colores de la marca. Es la que sale al compartir por WhatsApp o Facebook y la
       que reciben las herramientas de redes por RSS. El texto se dibuja con la
       fuente Montserrat incluida en el proyecto (no depende del servidor).
   ========================================================= */
let fuenteTitulos = null;
try {
  const b = fs.readFileSync('node_modules/@fontsource/montserrat/files/montserrat-latin-800-normal.woff');
  fuenteTitulos = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
} catch { console.warn('Aviso: no se encontró la fuente de los títulos; no se generan imágenes automáticas.'); }

// Trazado SVG de una letra: M, L, Q, C y Z con un decimal
const redondear = v => Math.round(v * 10) / 10;
const datosTrazado = trazo => trazo.commands.map(c => (c.type === 'Z' ? 'Z'
  : c.type + [c.x1, c.y1, c.x2, c.y2, c.x, c.y].filter(v => v !== undefined).map(redondear).join(' '))).join('');

function partirLineas(texto, tam, ancho) {
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (actual && fuenteTitulos.getAdvanceWidth(prueba, tam) > ancho) { lineas.push(actual); actual = p; }
    else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

async function imagenAutomatica(item, etiqueta) {
  if (!sharp || !fuenteTitulos) return '';
  const firma = crypto.createHash('md5').update(`${item.titulo}|${etiqueta}|${SITIO.nombre}`).digest('hex').slice(0, 8);
  const ruta = `/img/compartir/${item.tipo ? slugify(item.tipo) + '-' : ''}${item.slug}-${firma}.jpg`;
  const W = 1200, H = 630, X = 170, ANCHO = 860;

  // Tamaño de letra según la longitud del título, para que quepa en la franja central
  const ARRIBA = 232, ABAJO = 425; // entre la etiqueta y el nombre del sitio
  let tam = 72, lineas;
  for (; tam >= 34; tam -= 2) {
    lineas = partirLineas(item.titulo, tam, ANCHO);
    if (lineas.length <= 5 && lineas.length * tam * 1.15 <= ABAJO - ARRIBA) break;
  }
  const maxLineas = Math.floor((ABAJO - ARRIBA) / (tam * 1.15));
  if (lineas.length > maxLineas) { lineas = lineas.slice(0, maxLineas); lineas[maxLineas - 1] = lineas[maxLineas - 1].replace(/\s*\S*$/, '…'); }
  const alto = tam * 1.15;
  let y = ARRIBA + (ABAJO - ARRIBA - alto * lineas.length) / 2 + tam * 0.9;
  // Un <path> por letra, con el trazado escrito aquí: toPathData() de opentype.js escribe a veces
  // «NaN» en una coordenada (según la posición), y entonces la letra y el resto de la línea no
  // se dibujan
  const trazos = (texto, x, yy, t, relleno) => fuenteTitulos.getPaths(texto, x, yy, t)
    .map(datosTrazado).filter(Boolean).map(d => `<path d="${d}" ${relleno}/>`).join('');
  const caminos = lineas.map(l => { const d = trazos(l, X, y, tam, 'fill="#ffffff"'); y += alto; return d; }).join('');
  const etq = trazos(etiqueta.toUpperCase(), X, 205, 26, `fill="${MARCA.acento}"`);
  const pie = trazos(SITIO.nombre.toUpperCase(), X, H - 158, 24, 'fill="#ffffff" fill-opacity="0.7"');

  // Fondo del color del texto, franja y etiqueta del color de acento
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${MARCA.texto}"/>
    <rect x="${X}" y="150" width="120" height="10" fill="${MARCA.acento}"/>
    ${etq}${caminos}${pie}</svg>`;

  fs.mkdirSync(path.join(DIST, 'img/compartir'), { recursive: true });
  const enCache = path.join(CACHE, `compartir-${huella(VERSION_CACHE, svg)}.jpg`);
  if (fs.existsSync(enCache)) usosCache++;
  else { await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toFile(enCache); generadasNuevas++; }
  fs.copyFileSync(enCache, path.join(DIST, ruta));
  return ruta;
}

/* =========================================================
   5. Piezas de HTML
   ========================================================= */
const tarjetaNoticia = n => `
  <div class="col">
    <article class="card noticia h-100 shadow-sm">
      ${n.imagen ? imgHtml(n.imagen, n.imagenAlt, { clase: 'card-img-top', tam: TAM_TARJETA }) : ''}
      <div class="card-body">
        ${n.fecha ? `<time class="small text-body-secondary" datetime="${n.fecha.toISOString()}">${fechaLarga(n.fecha)}</time>` : ''}
        <h3 class="h5 card-title mt-1">
          <a class="stretched-link text-reset text-decoration-none" href="${n.url}">${esc(n.titulo)}</a>
        </h3>
        ${n.resumen ? `<p class="card-text text-body-secondary">${esc(n.resumen)}</p>` : ''}
      </div>
    </article>
  </div>`;

/* ---------- Catálogo: precio, tarjetas y rejillas de productos ---------- */
const EUROS = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const euros = v => EUROS.format(v).replace(/ /g, ' ');
const fechaCorta = dia => new Date(`${dia}T12:00:00Z`).toLocaleDateString('es-ES', { timeZone: ZONA, day: 'numeric', month: 'long' });
const fabricanteDe = p => p.fabricante?.nombre || p.fabricanteSlug || '';
const tituloProducto = p => [fabricanteDe(p), p.modelo].filter(Boolean).join(' ') || p.nombre;

// Precio: normal, a consultar u oferta (precio anterior tachado y porcentaje)
function precioHtml(p, { ficha = false } = {}) {
  if (p.enOferta) {
    return `<span class="precio precio-oferta">${euros(p.oferta.precio)}</span>`
      + (p.precio != null ? ` <del class="precio-anterior">${euros(p.precio)}</del> <span class="badge descuento">-${p.descuento} %</span>` : '')
      + (ficha ? `<span class="d-block small text-body-secondary mt-1">Oferta hasta el ${fechaCorta(p.oferta.fin)}</span>` : '');
  }
  return p.precio != null ? `<span class="precio">${euros(p.precio)}</span>` : '<span class="precio precio-consultar">Precio a consultar</span>';
}

const logoFabricante = (f, alto = 20) => (f?.imagen
  ? `<img src="${esc(f.imagen)}" alt="" class="logo-fabricante" height="${alto}" loading="lazy" decoding="async">` : '');

const TAM_PRODUCTO = '(min-width: 992px) 25vw, (min-width: 768px) 33vw, 50vw';
const tarjetaProducto = (p, { oculta = false } = {}) => `
  <div class="col" data-producto data-fabricante="${esc(p.fabricanteSlug)}"${p.segundaMano ? ' data-segunda-mano' : ''}${oculta ? ' hidden' : ''}>
    <article class="card producto h-100 shadow-sm">
      <div class="producto-foto">
        ${p.imagenes[0] ? imgHtml(p.imagenes[0].src, p.imagenes[0].alt || p.nombre, { clase: 'card-img-top', tam: TAM_PRODUCTO }) : '<div class="producto-sin-foto" aria-hidden="true"><i class="bi bi-image"></i></div>'}
        ${p.enOferta ? `<span class="badge etiqueta-oferta">Oferta${p.descuento ? ` -${p.descuento} %` : ''}</span>` : ''}
        ${p.segundaMano ? '<span class="badge etiqueta-segunda">Segunda mano</span>' : ''}
      </div>
      <div class="card-body d-flex flex-column">
        <p class="producto-fabricante small mb-1">${logoFabricante(p.fabricante, 18)}<span>${esc(fabricanteDe(p))}</span></p>
        <h3 class="h6 card-title mb-1 producto-nombre"><a class="stretched-link text-reset text-decoration-none" href="${p.url}">${esc(p.nombre)}</a></h3>
        ${p.modelo ? `<p class="small text-body-secondary mb-2">Modelo ${esc(p.modelo)}</p>` : ''}
        <p class="producto-precio mt-auto mb-0">${precioHtml(p)}</p>
      </div>
    </article>
  </div>`;

// Orden fijo del día (para quien no tiene JavaScript): barajado con la fecha como semilla
function barajarDelDia(lista) {
  let s = parseInt(huella(HOY).slice(0, 8), 16) || 1;
  const azar = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

// Rejilla de productos paginada en el navegador (public/js/catalogo.js): N por página,
// opcionalmente barajada en cada visita y con filtros por fabricante (si hay más de uno) y
// «Solo segunda mano» (si hay productos nuevos y de segunda mano). Sin JavaScript se ven
// los N primeros (o todos, si no hay máximo) y el enlace «Ver todo».
function rejillaProductos(lista, { porPagina = 8, aleatorio = false, filtro = false, maxSinJs = 0, etiqueta = 'Productos' } = {}) {
  const orden = aleatorio ? barajarDelDia(lista) : lista;
  const fabs = [...new Map(orden.filter(p => p.fabricante).map(p => [p.fabricanteSlug, p.fabricante])).values()]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const id = `rejilla-${huella(etiqueta, String(lista.length), String(porPagina)).slice(0, 6)}`;
  const conFabricante = filtro && fabs.length > 1;
  const conSegunda = filtro && lista.some(p => p.segundaMano) && lista.some(p => !p.segundaMano);
  return `
    <div class="rejilla" data-rejilla data-por-pagina="${porPagina}"${aleatorio ? ' data-aleatorio' : ''} id="${id}">
      ${conFabricante || conSegunda ? `<div class="d-flex flex-wrap align-items-center column-gap-4 row-gap-2 mb-3" data-rejilla-filtro hidden>
        ${conFabricante ? `<div class="d-flex align-items-center gap-2">
          <label class="form-label mb-0 small fw-semibold" for="${id}-fabricante">Fabricante</label>
          <select class="form-select form-select-sm w-auto" id="${id}-fabricante" data-filtro-fabricante>
            <option value="">Todos</option>
            ${fabs.map(f => `<option value="${esc(f.slug)}">${esc(f.nombre)}</option>`).join('')}
          </select>
        </div>` : ''}
        ${conSegunda ? `<div class="form-check mb-0">
          <input class="form-check-input" type="checkbox" id="${id}-segunda" data-filtro-segunda>
          <label class="form-check-label small fw-semibold" for="${id}-segunda">Solo segunda mano</label>
        </div>` : ''}
      </div>` : ''}
      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3" data-rejilla-items aria-label="${esc(etiqueta)}" role="list">
        ${orden.map((p, i) => tarjetaProducto(p, { oculta: maxSinJs && i >= maxSinJs })).join('').replace(/<div class="col" data-producto/g, '<div class="col" role="listitem" data-producto')}
      </div>
      <p class="text-body-secondary mt-3 mb-0" data-rejilla-vacio hidden>No hay productos con estos filtros.</p>
      <nav class="mt-4" aria-label="Páginas de ${esc(etiqueta.toLowerCase())}" data-rejilla-nav hidden></nav>
    </div>`;
}

const tarjetaCategoria = c => `
  <div class="col">
    <article class="card categoria h-100 shadow-sm">
      ${c.imagen ? imgHtml(c.imagen, c.imagenAlt, { clase: 'card-img-top', tam: TAM_TARJETA }) : ''}
      <div class="card-body">
        <h3 class="h5 card-title"><a class="stretched-link text-reset text-decoration-none" href="${c.url}">${esc(c.titulo)}</a></h3>
        ${c.resumen ? `<p class="card-text small text-body-secondary mb-0">${esc(c.resumen)}</p>` : ''}
      </div>
    </article>
  </div>`;

// Migas: Catálogo › Categoría › Subcategoría
function migas(trozos) {
  return `
    <nav aria-label="Estás en" class="migas mb-3" data-pagefind-ignore="all">
      <ol class="breadcrumb mb-0">
        ${trozos.map((t, i) => (i === trozos.length - 1 && !t.enlazar
          ? `<li class="breadcrumb-item active" aria-current="page">${esc(t.texto)}</li>`
          : `<li class="breadcrumb-item"><a href="${t.url}">${esc(t.texto)}</a></li>`)).join('')}
      </ol>
    </nav>`;
}
const migasDe = c => [{ texto: 'Catálogo', url: '/catalogo/' }, ...(c.padre ? [categoriaPorSlug.get(c.padre)] : []).map(x => ({ texto: x.titulo, url: x.url })), { texto: c.titulo, url: c.url }];

const vacio = texto => `<p class="text-body-secondary w-100" data-vacio>${texto}</p>`;

const listaNoticias = lista => lista.length ? lista.map(tarjetaNoticia).join('') : vacio('Todavía no hay entradas en el blog.');
// Paginación: /blog/, /blog/pagina/2/, ...
const rutaPagina = (base, n) => (n === 1 ? base : `${base}pagina/${n}/`);
const trocear = (lista, porPagina) => {
  const paginas = [];
  for (let i = 0; i < lista.length; i += porPagina) paginas.push(lista.slice(i, i + porPagina));
  return paginas.length ? paginas : [[]];
};
function navPaginacion(base, actual, total) {
  if (total <= 1) return '';
  const n = new Set([1, total, actual - 2, actual - 1, actual, actual + 1, actual + 2].filter(x => x >= 1 && x <= total));
  const nums = [...n].sort((a, b) => a - b);
  const items = [];
  nums.forEach((x, i) => {
    if (i && x - nums[i - 1] > 1) items.push('<li class="page-item disabled"><span class="page-link">…</span></li>');
    items.push(x === actual
      ? `<li class="page-item active" aria-current="page"><span class="page-link">${x}</span></li>`
      : `<li class="page-item"><a class="page-link" href="${rutaPagina(base, x)}">${x}</a></li>`);
  });
  return `
    <nav class="mt-5" aria-label="Páginas" data-pagefind-ignore="all">
      <ul class="pagination flex-wrap justify-content-center">
        <li class="page-item${actual === 1 ? ' disabled' : ''}">${actual === 1 ? '<span class="page-link">‹ Anteriores</span>' : `<a class="page-link" href="${rutaPagina(base, actual - 1)}" rel="prev">‹ Anteriores</a>`}</li>
        ${items.join('')}
        <li class="page-item${actual === total ? ' disabled' : ''}">${actual === total ? '<span class="page-link">Siguientes ›</span>' : `<a class="page-link" href="${rutaPagina(base, actual + 1)}" rel="next">Siguientes ›</a>`}</li>
      </ul>
    </nav>`;
}

// Bloque «Más del blog» al final de cada entrada
function bloqueRelacionado(item) {
  const nots = relacionados(item, noticias);
  if (!nots.length) return '';
  return `
    <section class="mt-5" aria-labelledby="relacionado-titulo" data-pagefind-ignore="all">
      <h2 class="h4 fw-bold mb-4" id="relacionado-titulo">Más del blog</h2>
      <div class="row row-cols-1 row-cols-md-2 g-4">${nots.map(tarjetaNoticia).join('')}</div>
    </section>`;
}

function botonesCompartir(titulo, ruta) {
  const url = abs(ruta);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(titulo);
  const boton = (href, icono, texto) =>
    `<a class="btn btn-outline-primary btn-sm" href="${href}" target="_blank" rel="noopener noreferrer"><i class="bi ${icono}" aria-hidden="true"></i><span>${texto}</span></a>`;
  return `
    <div class="compartir d-flex flex-wrap align-items-center gap-2 mt-5 pt-4 border-top" data-pagefind-ignore="all" data-url="${esc(url)}" data-titulo="${esc(titulo)}">
      <span class="fw-semibold me-1">Compartir:</span>
      ${boton(`https://wa.me/?text=${t}%20${u}`, 'bi-whatsapp', 'WhatsApp')}
      ${boton(`https://www.facebook.com/sharer/sharer.php?u=${u}`, 'bi-facebook', 'Facebook')}
      ${boton(`https://t.me/share/url?url=${u}&text=${t}`, 'bi-telegram', 'Telegram')}
      ${boton(`https://twitter.com/intent/tweet?url=${u}&text=${t}`, 'bi-twitter-x', 'X')}
      <button type="button" class="btn btn-outline-primary btn-sm" data-copiar><i class="bi bi-link-45deg" aria-hidden="true"></i><span>Copiar enlace</span></button>
      <button type="button" class="btn btn-outline-primary btn-sm d-none" data-compartir-nativo><i class="bi bi-share" aria-hidden="true"></i><span>Más opciones</span></button>
    </div>`;
}

/* =========================================================
   6. <head>: SEO, redes, iconos y estilos
   ========================================================= */
const FEEDS = [
  { ruta: '/blog/feed.xml', titulo: `${SITIO.nombre} — Blog`, enlace: '/blog/' },
];

/* ---------- Tema, iconos y colores (servidos desde la propia web) ----------
   Bootstrap, el tema de Bootswatch y los iconos se instalan con npm y se copian a
   /vendor/: no se carga nada de servidores externos (más rápido y más privado).
   Las fuentes de Google que traen muchos temas solo se cargan si se activa
   "Usar las fuentes del tema" en los Ajustes; si no, se usan las del sistema. */
const NM = 'node_modules';
const TEMAS = fs.readdirSync(path.join(NM, 'bootswatch/dist')).filter(t => fs.existsSync(path.join(NM, 'bootswatch/dist', t, 'bootstrap.min.css')));
// Temas propios (scripts/temas/<nombre>.css): Bootstrap original + la hoja de la marca
const TEMAS_PROPIOS = fs.readdirSync('scripts/temas').filter(f => f.endsWith('.css')).map(f => f.replace(/\.css$/, ''));
const esTemaPropio = t => TEMAS_PROPIOS.includes(t);
const tema = ap.tema === 'bootstrap' || TEMAS.includes(ap.tema) || esTemaPropio(ap.tema) ? ap.tema : 'tienda';
if (ap.tema && tema !== ap.tema) console.warn(`Aviso: el tema "${ap.tema}" no existe; se usa "tienda".`);

const VENDOR = path.join(DIST, 'vendor');
fs.mkdirSync(path.join(VENDOR, 'bootstrap-icons'), { recursive: true });
let cssTemaVendor = fs.readFileSync(tema === 'bootstrap' || esTemaPropio(tema)
  ? path.join(NM, 'bootstrap/dist/css/bootstrap.min.css')
  : path.join(NM, 'bootswatch/dist', tema, 'bootstrap.min.css'), 'utf8');
const usaGoogleFonts = /fonts\.googleapis\.com/.test(cssTemaVendor);
if (!ap.fuentes_google) cssTemaVendor = cssTemaVendor.replace(/@import\s+url\([^)]*fonts\.googleapis\.com[^)]*\)\s*;?/g, '');
cssTemaVendor = cssTemaVendor.replace(/\/\*#\s*sourceMappingURL=[^*]*\*\//g, '');

// Colores de la marca (Decap → Ajustes del sitio → Apariencia → Colores de la marca).
// Solo se usan con un tema propio; los vacíos o no válidos toman el color por defecto.
const MARCA_DEF = { texto: '#1f2933', fondo: '#ffffff', acento: '#2f6f8f' };
const esHex = v => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v || '').trim());
const MARCA = Object.fromEntries(Object.entries(MARCA_DEF).map(([k, d]) => {
  const v = (ap.marca || {})[k];
  if (v && !esHex(v)) console.warn(`Aviso: el color de marca «${k}» (${v}) no es válido; se usa ${d}.`);
  return [k, esHex(v) ? v.trim().toLowerCase() : d];
}));
const rgbTexto = h => { let x = h.slice(1); if (x.length === 3) x = [...x].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)).join(', '); };
// Mezcla dos colores #rrggbb: f = proporción del primero (0-1)
const mezcla = (a, b, f) => '#' + [0, 1, 2].map(i => {
  const [x, y] = [a, b].map(h => rgbTexto(h).split(', ').map(Number)[i]);
  return Math.round(x * f + y * (1 - f)).toString(16).padStart(2, '0');
}).join('');
if (esTemaPropio(tema)) {
  fs.mkdirSync(path.join(VENDOR, 'fonts'), { recursive: true });
  for (const [pkg, fichero, licencia] of [
    ['@fontsource-variable/nunito', 'nunito-latin-wght-normal.woff2', 'nunito-LICENSE.txt'],
    ['@fontsource-variable/nunito-sans', 'nunito-sans-latin-wght-normal.woff2', 'nunito-sans-LICENSE.txt'],
  ]) {
    fs.copyFileSync(path.join(NM, pkg, 'files', fichero), path.join(VENDOR, 'fonts', fichero));
    fs.copyFileSync(path.join(NM, pkg, 'LICENSE'), path.join(VENDOR, 'fonts', licencia));
  }
  const bs = { primary: MARCA.acento, dark: MARCA.texto };
  const vars = [
    ...Object.entries(MARCA).map(([k, v]) => `--tienda-${k}: ${v};`),
    ...Object.entries(bs).map(([k, v]) => `--bs-${k}: ${v}; --bs-${k}-rgb: ${rgbTexto(v)};`),
    `--bs-body-bg: ${MARCA.fondo}; --bs-body-bg-rgb: ${rgbTexto(MARCA.fondo)};`,
    `--bs-body-color: ${MARCA.texto}; --bs-body-color-rgb: ${rgbTexto(MARCA.texto)};`,
    `--bs-tertiary-bg: ${mezcla(MARCA.texto, MARCA.fondo, 0.04)}; --bs-tertiary-bg-rgb: ${rgbTexto(mezcla(MARCA.texto, MARCA.fondo, 0.04))};`,
    `--bs-secondary-bg: ${mezcla(MARCA.texto, MARCA.fondo, 0.08)}; --bs-secondary-bg-rgb: ${rgbTexto(mezcla(MARCA.texto, MARCA.fondo, 0.08))};`,
    `--bs-link-color: ${MARCA.acento}; --bs-link-color-rgb: ${rgbTexto(MARCA.acento)};`,
    `--bs-link-hover-color: ${MARCA.texto}; --bs-link-hover-color-rgb: ${rgbTexto(MARCA.texto)};`,
].join('\n  ');
  cssTemaVendor += `\n/* Tema propio «${tema}» — colores de Decap → Ajustes del sitio → Apariencia */\n`
    + `:root, [data-bs-theme=light] {\n  ${vars}\n}\n`
    + fs.readFileSync(path.join('scripts/temas', `${tema}.css`), 'utf8');
}
fs.writeFileSync(path.join(VENDOR, 'tema.css'), cssTemaVendor);
// /vendor/ se guarda una semana en la caché del navegador (public/_headers): la versión en la
// dirección hace que, al cambiar el tema o los colores, se descargue el nuevo al momento
const VERSION_TEMA = huella(cssTemaVendor).slice(0, 10);
fs.copyFileSync(path.join(NM, 'bootstrap/dist/js/bootstrap.bundle.min.js'), path.join(VENDOR, 'bootstrap.bundle.min.js'));
fs.copyFileSync(path.join(NM, 'bootstrap-icons/font/bootstrap-icons.min.css'), path.join(VENDOR, 'bootstrap-icons/bootstrap-icons.min.css'));
fs.cpSync(path.join(NM, 'bootstrap-icons/font/fonts'), path.join(VENDOR, 'bootstrap-icons/fonts'), { recursive: true });

// Color principal propio (opcional) y CSS adicional de los Ajustes
function hexARgb(hex) {
  const m = String(hex || '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}
const aHex = rgb => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const oscurecer = (rgb, f) => rgb.map(v => v * (1 - f));
const aclarar = (rgb, f) => rgb.map(v => v + (255 - v) * f);
const luminancia = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

// Contraste según las pautas de accesibilidad WCAG (mínimo 4,5:1 para texto)
const lumRel = rgb => {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [x, y] = [lumRel(a), lumRel(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// Oscurece (sobre fondo claro) o aclara (sobre fondo oscuro) un color hasta llegar al contraste pedido
function asegurarContraste(color, fondo, minimo = 4.5) {
  let c = [...color];
  const claro = lumRel(fondo) > 0.4;
  for (let i = 0; i < 40 && contraste(c, fondo) < minimo; i++) c = claro ? oscurecer(c, 0.06) : aclarar(c, 0.06);
  return c.map(Math.round);
}
// Variables de color del tema (bloque :root)
const varsTema = {};
for (const m of (cssTemaVendor.match(/:root[^{]*\{([^}]*)\}/) || [, ''])[1].matchAll(/--bs-([\w-]+):\s*([^;]+)/g)) varsTema[m[1]] = m[2].trim();
// Con un tema propio, los colores base son los de la marca (no los de Bootstrap)
if (esTemaPropio(tema)) Object.assign(varsTema, { 'body-bg': MARCA.fondo, 'link-color': MARCA.acento, dark: MARCA.texto });

let cssPersonal = '/* Generado a partir de Decap → Ajustes del sitio → Apariencia. No editar aquí. */\n';
const rgbPrincipal = hexARgb(ap.color_principal);
const rgbFondo = hexARgb(varsTema['body-bg']) || [255, 255, 255];
if (rgbPrincipal) {
  const c = aHex(rgbPrincipal), h = aHex(oscurecer(rgbPrincipal, 0.15)), a = aHex(oscurecer(rgbPrincipal, 0.25));
  const texto = luminancia(rgbPrincipal) > 0.6 ? '#000' : '#fff';
  const rgb = rgbPrincipal.join(', '), rgbH = oscurecer(rgbPrincipal, 0.15).map(Math.round).join(', ');
  cssPersonal += `
:root {
  --bs-primary: ${c}; --bs-primary-rgb: ${rgb};
  --bs-link-color: ${c}; --bs-link-color-rgb: ${rgb};
  --bs-link-hover-color: ${h}; --bs-link-hover-color-rgb: ${rgbH};
  --tienda-texto-sobre-principal: ${texto};
}
.btn-primary {
  --bs-btn-bg: ${c}; --bs-btn-border-color: ${c}; --bs-btn-color: ${texto};
  --bs-btn-hover-bg: ${h}; --bs-btn-hover-border-color: ${h}; --bs-btn-hover-color: ${texto};
  --bs-btn-active-bg: ${a}; --bs-btn-active-border-color: ${a}; --bs-btn-active-color: ${texto};
  --bs-btn-disabled-bg: ${c}; --bs-btn-disabled-border-color: ${c};
}
.btn-outline-primary {
  --bs-btn-color: ${c}; --bs-btn-border-color: ${c};
  --bs-btn-hover-bg: ${c}; --bs-btn-hover-border-color: ${c}; --bs-btn-hover-color: ${texto};
  --bs-btn-active-bg: ${c}; --bs-btn-active-border-color: ${c}; --bs-btn-active-color: ${texto};
}
.dropdown-menu { --bs-dropdown-link-active-bg: ${c}; }
.nav-pills { --bs-nav-pills-link-active-bg: ${c}; }
.bg-primary.text-white, .navbar.bg-primary { color: ${texto} !important; }
`;
}

// Enlaces legibles: color elegido, o el principal, o el del tema; ajustado si no se lee bien
const rgbEnlacePedido = hexARgb(ap.color_enlaces);
const rgbEnlaceBase = rgbEnlacePedido || rgbPrincipal || hexARgb(varsTema['link-color']);
if (rgbEnlaceBase) {
  const c = asegurarContraste(rgbEnlaceBase, rgbFondo);
  const h = lumRel(rgbFondo) > 0.4 ? oscurecer(c, 0.15).map(Math.round) : aclarar(c, 0.2).map(Math.round);
  const ratio = contraste(c, rgbFondo).toFixed(1);
  if (aHex(c) !== aHex(rgbEnlaceBase)) nota(`Contraste: enlaces ${aHex(rgbEnlaceBase)} → ${aHex(c)} (${ratio}:1) para que se lean bien`);
  else if (ratio < 4.5) console.warn(`Aviso: el color de enlaces ${aHex(c)} tiene poco contraste (${ratio}:1, mínimo 4,5:1).`);
  cssPersonal += `
/* Enlaces con contraste suficiente (${ratio}:1) */
:root, [data-bs-theme=light] {
  --bs-link-color: ${aHex(c)}; --bs-link-color-rgb: ${c.join(', ')};
  --bs-link-hover-color: ${aHex(h)}; --bs-link-hover-color-rgb: ${h.join(', ')};
}
`;
}

// Pie: fondo lo bastante oscuro para que el texto blanco se lea
const rgbOscuro = hexARgb(varsTema.dark) || [33, 37, 41];
const rgbPie = asegurarContraste(rgbOscuro, [255, 255, 255], 7);
cssPersonal += `\n/* Pie con contraste suficiente (${contraste(rgbPie, [255, 255, 255]).toFixed(1)}:1) */\n:root { --tienda-pie-bg: ${aHex(rgbPie)}; }\n`;

// Color principal: avisar si el texto encima no se leería bien
if (rgbPrincipal) {
  const texto = luminancia(rgbPrincipal) > 0.6 ? [0, 0, 0] : [255, 255, 255];
  const r = contraste(rgbPrincipal, texto);
  if (r < 4.5) console.warn(`Aviso: el color principal ${aHex(rgbPrincipal)} tiene poco contraste con su texto (${r.toFixed(1)}:1). Elige un tono más oscuro.`);
}

// Colores de la marca: avisar si el texto o el acento no se leen bien sobre el fondo
if (esTemaPropio(tema)) {
  for (const k of ['texto', 'acento']) {
    const r = contraste(hexARgb(MARCA[k]), hexARgb(MARCA.fondo));
    if (r < 4.5) console.warn(`Aviso: el color de marca «${k}» (${MARCA[k]}) tiene poco contraste con el fondo (${r.toFixed(1)}:1; mínimo 4,5). Elige un tono más oscuro en Ajustes del sitio → Apariencia.`);
  }
}

if (ap.css_adicional) cssPersonal += `\n/* CSS adicional */\n${ap.css_adicional}\n`;
fs.writeFileSync(path.join(DIST, 'css/personalizado.css'), cssPersonal);

// /css/tema.css: lo usa la vista previa del panel de Decap (con @import es suficiente)
fs.writeFileSync(path.join(DIST, 'css/tema.css'),
  `@import url("/vendor/tema.css?v=${VERSION_TEMA}");\n@import url("/vendor/bootstrap-icons/bootstrap-icons.min.css");\n`);

// En las páginas publicadas se cargan con <link> directos (más rápido que @import)
const enlacesTema = [
  `<link rel="stylesheet" href="/vendor/tema.css?v=${VERSION_TEMA}">`,
  '<link rel="stylesheet" href="/vendor/bootstrap-icons/bootstrap-icons.min.css">',
].join('\n  ');

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",            // wasm: el buscador (Pagefind)
  `style-src 'self' 'unsafe-inline'${ap.fuentes_google ? ' https://fonts.googleapis.com' : ''}`,
  `font-src 'self' data:${ap.fuentes_google ? ' https://fonts.gstatic.com' : ''}`,
  "img-src 'self' data: https:",                    // https: por si se enlazan imágenes externas en un texto
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// Descripción para Google y redes: si es larga, se acorta sola (~155 caracteres) por el final de
// una frase o, si no se puede, por el final de una palabra, con «…». El texto completo se sigue
// viendo en la web (tarjetas, resúmenes); solo cambia lo que leen Google, WhatsApp y Facebook.
const MAX_DESCRIPCION = 155;
const descripcionesAcortadas = [];
function resumirParaGoogle(texto, ruta) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (t.length <= MAX_DESCRIPCION + 5) return t;
  const corte = t.slice(0, MAX_DESCRIPCION);
  const finFrase = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('! '), corte.lastIndexOf('? '));
  const res = finFrase >= 90 ? corte.slice(0, finFrase + 1)
    : corte.slice(0, corte.lastIndexOf(' ') > 90 ? corte.lastIndexOf(' ') : MAX_DESCRIPCION).replace(/[\s,;:.(—–-]+$/, '') + '…';
  if (ruta && !descripcionesAcortadas.includes(ruta)) descripcionesAcortadas.push(ruta);
  return res;
}

function cabezaSeo({ titulo, descripcion, ruta, imagen, imagenAlt, imagenAuto, tipo = 'website', publicado, jsonld = [], noindex = false }) {
  const url = abs(ruta);
  const img = abs(imagen || imagenAuto || SITIO.imagenCompartir);
  const alt = imagen ? (imagenAlt || titulo) : imagenAuto ? titulo : SITIO.nombre;
  return `
  <title>${ES_PRODUCCION ? '' : `[${esc(ENTORNO)}] `}${esc(titulo)}</title>
  <meta name="description" content="${esc(descripcion)}">
  ${!INDEXABLE ? '<meta name="robots" content="noindex, nofollow">' : noindex ? '<meta name="robots" content="noindex, follow">' : `<link rel="canonical" href="${esc(url)}">`}
  <meta name="theme-color" content="${esc(SITIO.colorTema || '#ffffff')}">
  <link rel="icon" href="/img/iconos/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="icon" href="/img/iconos/icono-192.png" sizes="192x192" type="image/png">
  <link rel="apple-touch-icon" href="/img/iconos/icono-180.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta property="og:site_name" content="${esc(SITIO.nombre)}">
  <meta property="og:locale" content="es_ES">
  <meta property="og:type" content="${tipo}">
  <meta property="og:title" content="${esc(titulo)}">
  <meta property="og:description" content="${esc(descripcion)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(img)}">
  <meta property="og:image:alt" content="${esc(alt)}">
  ${publicado ? `<meta property="article:published_time" content="${publicado.toISOString()}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(titulo)}">
  <meta name="twitter:description" content="${esc(descripcion)}">
  <meta name="twitter:image" content="${esc(img)}">
  ${FEEDS.map(f => `<link rel="alternate" type="application/rss+xml" title="${esc(f.titulo)}" href="${esc(abs(f.ruta))}">`).join('\n  ')}
  ${jsonld.map(ldJson).join('\n  ')}
`;
}

// Añade " | Nombre del sitio" salvo que el título ya lo contenga
const tituloCompleto = t => {
  if (!t) return SITIO.nombre;
  return t.toLowerCase().includes(SITIO.nombre.toLowerCase()) ? t : `${t} | ${SITIO.nombre}`;
};

// Mete cabecera, pie, etiquetas SEO, iconos, estilos y scripts en una página
function completar(html, ruta, seo = {}) {
  const raiz = leerHtml(html, { comment: true });
  const head = raiz.querySelector('head');
  const body = raiz.querySelector('body');

  // Título y descripción: los de seo o los que tenga la propia página
  const tTitulo = raiz.querySelector('title');
  const tDesc = raiz.querySelector('meta[name="description"]');
  if (/noindex/.test(head.querySelector('meta[name="robots"]')?.getAttribute('content') || '')) seo = { ...seo, noindex: true };
  const titulo = seo.titulo || desescapar(tTitulo?.text) || SITIO.nombre;
  const descripcion = resumirParaGoogle(seo.descripcion || desescapar(tDesc?.getAttribute('content')) || SITIO.descripcion, ruta);
  tTitulo?.remove();
  tDesc?.remove();
  head.querySelectorAll('link[rel="canonical"], link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"], meta[name="theme-color"], meta[property^="og:"], meta[name^="twitter:"], meta[name="robots"]')
    .forEach(e => e.remove());

  // Estilos: tema.css → <link> directos; preconexión al CDN
  const linkTema = head.querySelector('link[href="/css/tema.css"]');
  if (linkTema) { linkTema.insertAdjacentHTML('beforebegin', enlacesTema); linkTema.remove(); }
  else head.insertAdjacentHTML('beforeend', enlacesTema);
  const linkEstilos = head.querySelector('link[href="/css/estilos.css"]');
  (linkEstilos || head.querySelectorAll('link[rel="stylesheet"]').at(-1))
    .insertAdjacentHTML('afterend', '\n  <link rel="stylesheet" href="/css/personalizado.css">');
  if (ap.fuentes_google && usaGoogleFonts) {
    head.insertAdjacentHTML('afterbegin', '\n  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
  }

  head.insertAdjacentHTML('beforeend', cabezaSeo({ ...seo, titulo, descripcion, ruta }));
  // Política de seguridad de contenidos: solo se ejecutan los scripts de la propia web
  head.querySelector('meta[http-equiv="Content-Security-Policy"]')?.remove();
  head.insertAdjacentHTML('afterbegin', `\n  <meta http-equiv="Content-Security-Policy" content="${CSP}">`);

  // Cabecera y pie
  const { cabecera, pie } = construir(ruta);
  const hCab = raiz.querySelector('#cabecera');
  const hPie = raiz.querySelector('#pie');
  if (hCab) { hCab.insertAdjacentHTML('afterend', cabecera); hCab.remove(); }
  if (hPie) { hPie.insertAdjacentHTML('afterend', pie); hPie.remove(); }
  ['d-flex', 'flex-column', 'min-vh-100'].forEach(c => body.classList.add(c));

  // Aviso de entorno de pruebas (arriba del todo, fuera de producción)
  if (!ES_PRODUCCION) {
    body.insertAdjacentHTML('afterbegin', `
  <div class="aviso-entorno" role="note">
    <i class="bi bi-cone-striped me-1" aria-hidden="true"></i>Entorno de pruebas: <strong>${esc(ENTORNO)}</strong>.
    No es la web pública: el panel edita la rama «${esc(RAMA_GIT || ENTORNO)}».
    <a href="${esc(URL_BASE)}/">Ir a la web pública</a>
  </div>`);
  }

  // Accesibilidad: enlace "Saltar al contenido" al principio
  const main = raiz.querySelector('main');
  if (main) {
    if (!main.getAttribute('id')) main.setAttribute('id', 'contenido-principal');
    body.insertAdjacentHTML('afterbegin', `\n  <a class="visually-hidden-focusable saltar" href="#${main.getAttribute('id')}">Saltar al contenido</a>`);
  }

  // Scripts comunes
  // Quitar los scripts antiguos (Bootstrap desde CDN, layout.js) y poner los comunes
  raiz.querySelectorAll('script[src]').forEach(sc => {
    const src = sc.getAttribute('src');
    if (/cdn\.jsdelivr\.net\/npm\/bootstrap@/.test(src) || src === '/js/layout.js' || src === '/js/extras.js' || src === '/vendor/bootstrap.bundle.min.js') sc.remove();
  });
  body.insertAdjacentHTML('beforeend', '  <script src="/vendor/bootstrap.bundle.min.js" defer></script>\n  <script src="/js/extras.js" defer></script>\n');
  // Rejillas de productos (paginación, orden al azar y filtro por fabricante)
  if (raiz.querySelector('[data-rejilla]')) body.insertAdjacentHTML('beforeend', '  <script src="/js/catalogo.js" defer></script>\n');
  // Solicitud de presupuesto: contador del menú, botón de las fichas y página /presupuesto/
  if (SOLICITUD.activa) body.insertAdjacentHTML('beforeend', '  <script src="/js/presupuesto.js" defer></script>\n');

  return raiz.toString().replace(/\n[ \t]*\n(?=[ \t]*\n)/g, '\n');
}

const plantilla = fs.readFileSync('plantillas/articulo.html', 'utf8');
function paginaDesdePlantilla(contenidoHtml, { buscable = true, ancho = false } = {}) {
  const raiz = leerHtml(plantilla, { comment: true });
  const main = raiz.querySelector('#contenido');
  main.set_content(contenidoHtml);
  // Catálogo: a todo el ancho del contenedor (la clase «articulo» limita el ancho de lectura)
  if (ancho) main.classList.remove('articulo');
  if (buscable) main.setAttribute('data-pagefind-body', '');
  return raiz.toString();
}
// Datos para el buscador: tipo de contenido como filtro
const metaBuscador = x => `<span hidden data-pagefind-filter="tipo">${esc(x.tipo)}</span>`
  + (x.imagen ? `<span hidden data-pagefind-meta="image:${esc(x.imagen)}"></span>` : '');

const sitemap = []; // { ruta, fecha }

// Imágenes automáticas para lo que no tiene imagen propia
for (const n of noticias) if (!n.imagen) n.imagenAuto = await imagenAutomatica(n, 'Blog');
for (const p of paginas) if (!p.imagen && !p.noindex) p.imagenAuto = await imagenAutomatica(p, SITIO.localidad || SITIO.nombre);
const imagenDe = x => x.imagen || x.imagenAuto || SITIO.imagenCompartir;

/* =========================================================
   7. Entradas del blog
   ========================================================= */
for (const n of noticias) {
  n.html = md(n.cuerpo, n.url);
  const imagenLd = [abs(imagenDe(n))];
  const jsonld = [{
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: n.titulo.slice(0, 110),
    description: n.resumen,
    image: imagenLd,
    datePublished: n.fecha?.toISOString(),
    dateModified: n.fecha?.toISOString(),
    author: REF_ORG,
    publisher: ORGANIZACION,
    mainEntityOfPage: abs(n.url),
  }];
  const cuerpo = `
    <a href="/blog/" class="d-inline-block fw-semibold mb-4">← Volver al blog</a>
    <article>
      ${n.fecha ? `<time class="text-body-secondary" datetime="${n.fecha.toISOString()}">${fechaLarga(n.fecha)}</time>` : ''}
      <h1 class="display-5 fw-bold mt-1">${esc(n.titulo)}</h1>
      ${n.imagen ? imgHtml(n.imagen, n.imagenAlt, { clase: 'img-fluid rounded my-4', diferida: false }) : ''}
      <div class="articulo-cuerpo mt-4">${n.html}</div>
      ${metaBuscador(n)}
      ${botonesCompartir(n.titulo, n.url)}
    </article>
    ${bloqueRelacionado(n)}`;

  escribir(path.join(DIST, n.url, 'index.html'), completar(paginaDesdePlantilla(cuerpo), n.url, {
    titulo: tituloCompleto(n.titulo),
    descripcion: n.descGoogle || n.resumen,
    imagen: n.imagen,
    imagenAlt: n.imagenAlt,
    imagenAuto: n.imagenAuto,
    tipo: 'article',
    publicado: n.fecha,
    jsonld,
  }));
  sitemap.push({ ruta: n.url, fecha: n.fecha });
}

/* =========================================================
   8. Páginas
   ========================================================= */
for (const p of paginas) {
  const cuerpo = `
    <article>
      <h1 class="display-5 fw-bold">${esc(p.titulo)}</h1>
      ${p.meta.description ? `<p class="lead text-body-secondary">${esc(p.meta.description)}</p>` : ''}
      ${p.imagen ? imgHtml(p.imagen, p.imagenAlt, { clase: 'img-fluid rounded my-4', diferida: false }) : ''}
      <div class="articulo-cuerpo mt-4">${md(p.cuerpo, p.url)}</div>
      ${p.noindex ? '' : metaBuscador(p)}
      ${p.noindex ? '' : botonesCompartir(p.titulo, p.url)}
    </article>`;

  escribir(path.join(DIST, p.url, 'index.html'), completar(paginaDesdePlantilla(cuerpo, { buscable: !p.noindex }), p.url, {
    titulo: tituloCompleto(p.titulo),
    descripcion: p.descGoogle || p.resumen,
    imagen: p.imagen,
    imagenAlt: p.imagenAlt,
    imagenAuto: p.imagenAuto,
    noindex: p.noindex,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: p.titulo, description: p.resumen, url: abs(p.url), publisher: REF_ORG }],
  }));
  if (!p.noindex) sitemap.push({ ruta: p.url });
}

/* =========================================================
   9. Catálogo: fichas de producto, categorías y /catalogo/
   ========================================================= */
// Imagen para compartir de cada producto: su primera foto (o la automática)
for (const p of productos) if (!p.imagenes[0]) p.imagenAuto = await imagenAutomatica({ ...p, titulo: tituloProducto(p) }, 'Catálogo');
for (const c of categorias) if (!c.imagen) c.imagenAuto = await imagenAutomatica(c, 'Catálogo');

// Datos para el buscador: filtros de catálogo
const filtrosProducto = p => [
  `<span hidden data-pagefind-filter="tipo">Producto</span>`,
  p.fabricante ? `<span hidden data-pagefind-filter="fabricante">${esc(p.fabricante.nombre)}</span>` : '',
  p.categoria ? `<span hidden data-pagefind-filter="categoría">${esc((p.categoria.padre ? categoriaPorSlug.get(p.categoria.padre) : p.categoria).titulo)}</span>` : '',
  p.enOferta ? '<span hidden data-pagefind-filter="oferta">En oferta</span>' : '',
  p.segundaMano ? '<span hidden data-pagefind-filter="condición">Segunda mano</span>' : '',
  p.imagenes[0] ? `<span hidden data-pagefind-meta="image:${esc(p.imagenes[0].src)}"></span>` : '',
].join('');

for (const p of productos) {
  p.html = md(p.cuerpo, p.url);
  const cat = p.categoria;
  const trozosMigas = cat ? [...migasDe(cat), { texto: p.nombre, url: p.url }] : [{ texto: 'Catálogo', url: '/catalogo/' }, { texto: p.nombre, url: p.url }];
  const [principal, ...resto] = p.imagenes;
  const fotos = principal ? `
      <div class="ficha-fotos">
        <a href="${esc(principal.src)}" class="d-block ficha-foto-principal">${imgHtml(principal.src, principal.alt || p.nombre, { clase: 'img-fluid rounded', tam: '(min-width: 992px) 50vw, 100vw', diferida: false })}</a>
        ${resto.length ? `<ul class="list-unstyled d-flex flex-wrap gap-2 mt-2 mb-0 ficha-miniaturas" aria-label="Más fotos">
          ${resto.map(i => `<li><a href="${esc(i.src)}">${imgHtml(i.src, i.alt || p.nombre, { clase: 'rounded', tam: '120px' })}</a></li>`).join('')}
        </ul>` : ''}
      </div>` : '<div class="producto-sin-foto rounded" aria-hidden="true"><i class="bi bi-image"></i></div>';
  const datos = [
    ['Fabricante', p.fabricante ? `${logoFabricante(p.fabricante, 24)} ${esc(p.fabricante.nombre)}` : esc(p.fabricanteSlug)],
    ['Modelo', esc(p.modelo)],
    p.referencia && ['Referencia', esc(p.referencia)],
    ['Condición', p.segundaMano ? `Segunda mano${p.estadoUso ? ` · ${esc(p.estadoUso)}` : ''}${p.garantia ? ` · garantía de ${p.garantia} meses` : ''}` : 'Nuevo'],
    cat && ['Categoría', `<a href="${cat.url}">${esc(cat.titulo)}</a>`],
  ].filter(Boolean);
  const relacionadosCat = cat ? productos.filter(x => x !== p && x.categoria === cat && !p.accesorios.includes(x)).slice(0, 4) : [];
  const cuerpo = `
    ${migas(trozosMigas)}
    <article class="ficha" data-pagefind-body>
      <div class="row g-4 g-lg-5">
        <div class="col-lg-6">${fotos}</div>
        <div class="col-lg-6">
          <p class="producto-fabricante mb-1">${logoFabricante(p.fabricante, 22)}<span>${esc(fabricanteDe(p))}</span></p>
          <h1 class="display-6 fw-bold mb-2">${esc(p.nombre)}</h1>
          ${p.modelo ? `<p class="lead text-body-secondary">Modelo ${esc(p.modelo)}</p>` : ''}
          ${p.segundaMano ? '<p><span class="badge etiqueta-segunda position-static">Segunda mano</span></p>' : ''}
          <div class="ficha-precio my-3">${precioHtml(p, { ficha: true })}
            <span class="d-block small text-body-secondary mt-1">Precio orientativo, IVA incluido.</span></div>
          ${SOLICITUD.activa ? `<div class="d-flex flex-wrap gap-2 align-items-center" data-pagefind-ignore="all">
            <button type="button" class="btn btn-destacado btn-lg" data-anadir-solicitud="${esc(p.slug)}" hidden>
              <i class="bi bi-clipboard-plus me-2" aria-hidden="true"></i><span>Añadir a la solicitud</span>
            </button>
            <a class="btn btn-outline-primary btn-lg" href="/presupuesto/" data-ver-solicitud hidden>Ver mi solicitud</a>
            <noscript><a class="btn btn-destacado btn-lg" href="/paginas/contacto-y-horario/">Pedir información</a></noscript>
          </div>
          <p class="small text-body-secondary mt-2 mb-0" data-estado-solicitud role="status" aria-live="polite"></p>`
            : '<p data-pagefind-ignore="all"><a class="btn btn-outline-primary btn-lg" href="/paginas/contacto-y-horario/">Pedir información</a></p>'}
          <dl class="row ficha-datos small mt-4 mb-0">
            ${datos.map(([k, v]) => `<dt class="col-4 col-sm-3">${k}</dt><dd class="col-8 col-sm-9">${v}</dd>`).join('')}
          </dl>
        </div>
      </div>
      ${p.html.trim() ? `<section class="mt-5 articulo"><h2 class="h4 fw-bold">Descripción</h2><div class="articulo-cuerpo">${p.html}</div></section>` : ''}
      ${p.caracteristicas.length ? `<section class="mt-5 articulo"><h2 class="h4 fw-bold">Características</h2>
        <table class="table table-sm ficha-caracteristicas"><tbody>
          ${p.caracteristicas.map(c => (c.nombre ? `<tr><th scope="row">${esc(c.nombre)}</th><td>${esc(c.valor)}</td></tr>` : `<tr><td colspan="2">${esc(c.valor)}</td></tr>`)).join('')}
        </tbody></table></section>` : ''}
      ${p.compatibles.length ? `<section class="mt-5" data-pagefind-ignore="all"><h2 class="h4 fw-bold">Compatible con</h2>
        <ul class="list-inline mb-0">${p.compatibles.map(m => `<li class="list-inline-item mb-2"><a class="btn btn-outline-primary btn-sm" href="${m.url}">${esc(tituloProducto(m))}</a></li>`).join('')}</ul></section>` : ''}
      ${filtrosProducto(p)}
      ${botonesCompartir(tituloProducto(p), p.url)}
    </article>
    ${p.accesorios.length ? `<section class="mt-5" aria-labelledby="accesorios-titulo" data-pagefind-ignore="all">
      <h2 class="h4 fw-bold mb-4" id="accesorios-titulo">Accesorios para esta máquina</h2>
      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">${p.accesorios.map(a => tarjetaProducto(a)).join('')}</div>
    </section>` : ''}
    ${relacionadosCat.length ? `<section class="mt-5" aria-labelledby="relacionados-titulo" data-pagefind-ignore="all">
      <h2 class="h4 fw-bold mb-4" id="relacionados-titulo">Más en ${esc(cat.titulo)}</h2>
      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">${relacionadosCat.map(a => tarjetaProducto(a)).join('')}</div>
      <p class="mt-4 mb-0"><a class="btn btn-outline-primary" href="${cat.url}">Ver todo en ${esc(cat.titulo)}</a></p>
    </section>` : ''}`;

  const jsonld = [{
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: tituloProducto(p),
    description: p.resumen || p.nombre,
    image: p.imagenes.map(i => abs(i.src)),
    ...(p.fabricante ? { brand: { '@type': 'Brand', name: p.fabricante.nombre } } : {}),
    ...(p.modelo ? { model: p.modelo } : {}),
    ...(p.referencia ? { sku: p.referencia } : {}),
    itemCondition: p.segundaMano ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
    ...(p.compatibles.length ? { isAccessoryOrSparePartFor: p.compatibles.map(m => ({ '@type': 'Product', name: tituloProducto(m), url: abs(m.url) })) } : {}),
    url: abs(p.url),
    // Sin «offers»: los precios son orientativos (docs/PLAN.md, fase 4)
  }, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trozosMigas.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.texto, item: abs(t.url) })),
  }];

  escribir(path.join(DIST, p.url, 'index.html'), completar(paginaDesdePlantilla(cuerpo, { buscable: false, ancho: true }), p.url, {
    titulo: tituloCompleto(`${p.nombre} · ${tituloProducto(p)}`),
    descripcion: p.resumen || `${p.nombre}: ${tituloProducto(p)}.`,
    imagen: p.imagenes[0]?.src,
    imagenAlt: p.imagenes[0]?.alt || p.nombre,
    imagenAuto: p.imagenAuto,
    tipo: 'product',
    jsonld,
  }));
  sitemap.push({ ruta: p.url, fecha: p.fecha });
}

// Categorías y subcategorías: /catalogo/<categoria>/ y /catalogo/<categoria>/<subcategoria>/
for (const c of categorias) {
  const lista = enCategoria(c);
  const cuerpo = `
    ${migas(migasDe(c))}
    <h1 class="display-5 fw-bold">${esc(c.titulo)}</h1>
    ${c.meta.description ? `<p class="lead text-body-secondary">${esc(c.meta.description)}</p>` : ''}
    ${c.cuerpo.trim() ? `<div class="articulo-cuerpo articulo mt-3">${md(c.cuerpo, c.url)}</div>` : ''}
    ${c.hijos.length ? `<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 mt-2" data-pagefind-ignore="all">${c.hijos.map(tarjetaCategoria).join('')}</div>` : ''}
    <section class="mt-5" aria-labelledby="productos-titulo" data-pagefind-ignore="all">
      <h2 class="h4 fw-bold mb-4" id="productos-titulo">${lista.length ? `${lista.length} ${lista.length === 1 ? 'producto' : 'productos'}` : 'Productos'}</h2>
      ${lista.length ? rejillaProductos(lista, { porPagina: LISTADOS.productosPorPagina, filtro: true, etiqueta: `Productos de ${c.titulo}` })
        : '<p class="text-body-secondary">Todavía no hay productos en esta categoría.</p>'}
    </section>`;
  escribir(path.join(DIST, c.url, 'index.html'), completar(paginaDesdePlantilla(cuerpo, { buscable: false, ancho: true }), c.url, {
    titulo: tituloCompleto(c.titulo),
    descripcion: c.resumen || `${c.titulo} en ${SITIO.nombre}: catálogo con precios orientativos.`,
    imagen: c.imagen, imagenAlt: c.imagenAlt, imagenAuto: c.imagenAuto,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: c.titulo, description: c.resumen, url: abs(c.url), publisher: REF_ORG }],
  }));
  sitemap.push({ ruta: c.url });
}

// Resumen del catálogo (portada y /catalogo/): productos al azar y ofertas
const bloqueResumenCatalogo = (nivel = 'h2') => (productos.length ? `
      ${rejillaProductos(productos, { porPagina: LISTADOS.productosPortada, aleatorio: true, maxSinJs: LISTADOS.productosPortada, etiqueta: 'Productos del catálogo' })}` : '');
const bloqueOfertas = () => (ofertas.length ? rejillaProductos(ofertas, { porPagina: LISTADOS.ofertasPortada, maxSinJs: LISTADOS.ofertasPortada, etiqueta: 'Productos en oferta' }) : '');

/* =========================================================
   9c. Solicitud de presupuesto: /presupuesto/ (Decap → Solicitud de presupuesto)
       La lista se guarda en el navegador (public/js/presupuesto.js), que la pinta con los
       datos de /presupuesto/productos.json. PARTE VISUAL: el envío real (función del
       servidor y hoja de Google) llega en la fase 5, tras el despliegue (docs/PLAN.md).
   ========================================================= */
if (SOLICITUD.activa) {
  // Datos públicos de los productos visibles para pintar la solicitud (nada que no esté ya en las fichas)
  const miniatura = src => optimizadas.get(src)?.fuentes[0]?.url || src;
  escribir(path.join(DIST, 'presupuesto/productos.json'), JSON.stringify(productos.map(p => ({
    id: p.slug,
    nombre: p.nombre,
    modelo: p.modelo,
    fabricante: fabricanteDe(p),
    url: p.url,
    precio: p.precio,
    ...(p.enOferta ? { precioOferta: p.oferta.precio, ofertaHasta: p.oferta.fin } : {}),
    imagen: p.imagenes[0] ? miniatura(p.imagenes[0].src) : '',
  }))));

  const privacidad = '/paginas/politica-de-privacidad/';
  const condiciones = '/paginas/condiciones-solicitud-presupuesto/';
  const cuerpo = `
    <h1 class="display-5 fw-bold">${esc(SOLICITUD.titulo)}</h1>
    ${SOLICITUD.introduccion ? `<p class="lead text-body-secondary">${esc(SOLICITUD.introduccion)}</p>` : ''}
    <div class="solicitud mt-4" data-solicitud data-datos="/presupuesto/productos.json">
      <p class="text-body-secondary" data-solicitud-cargando>Cargando tu solicitud…</p>
      <noscript><div class="alert alert-secondary">Para preparar la solicitud hace falta JavaScript. También puedes llamarnos o escribirnos: <a href="/paginas/contacto-y-horario/">Contacto y horario</a>.</div></noscript>
      <div class="alert alert-warning" data-solicitud-aviso role="status" hidden></div>
      <div class="solicitud-vacia text-center py-5" data-solicitud-vacia hidden>
        <p class="lead mb-3">Tu solicitud está vacía.</p>
        <p class="text-body-secondary">En la ficha de cada producto, pulsa «Añadir a la solicitud».</p>
        <a class="btn btn-destacado btn-lg" href="/catalogo/">Ver el catálogo</a>
      </div>
      <section data-solicitud-lista hidden aria-labelledby="solicitud-productos">
        <h2 class="h4 fw-bold mb-3" id="solicitud-productos">Productos</h2>
        <ul class="list-unstyled solicitud-lista mb-3" data-solicitud-items></ul>
        <p class="solicitud-total mb-1">Total orientativo: <strong data-solicitud-total></strong></p>
        <p class="small text-body-secondary mb-0" data-solicitud-nota>Precios orientativos, IVA incluido: la tienda te confirmará la disponibilidad y el precio final.</p>
        <p class="mt-3 mb-0"><a href="/catalogo/" class="fw-semibold">← Seguir viendo el catálogo</a></p>
      </section>
      <form class="formulario mt-5" data-solicitud-form method="post" action="/api/solicitud" novalidate hidden>
        <h2 class="h4 fw-bold">Tus datos</h2>
        <p class="small text-body-secondary mb-4">Los campos con <span class="text-danger">*</span> son obligatorios.</p>
        <div class="mb-3">
          <label class="form-label fw-semibold" for="s-nombre">Nombre <span class="text-danger" aria-hidden="true">*</span></label>
          <input class="form-control" type="text" id="s-nombre" name="nombre" maxlength="120" autocomplete="name" required>
          <div class="invalid-feedback">Escribe tu nombre.</div>
        </div>
        <div class="mb-3">
          <label class="form-label fw-semibold" for="s-correo">Correo electrónico <span class="text-danger" aria-hidden="true">*</span></label>
          <input class="form-control" type="email" id="s-correo" name="correo" maxlength="160" autocomplete="email" required>
          <div class="invalid-feedback">Escribe un correo válido, p. ej. nombre@ejemplo.es.</div>
        </div>
        <div class="mb-3">
          <label class="form-label fw-semibold" for="s-telefono">Teléfono <span class="text-danger" aria-hidden="true">*</span></label>
          <input class="form-control" type="tel" id="s-telefono" name="telefono" maxlength="20" autocomplete="tel" inputmode="tel" pattern="[0-9+\\(\\)\\s.\\-]{9,20}" required>
          <div class="invalid-feedback">Escribe un teléfono (9 cifras como mínimo).</div>
        </div>
        <div class="mb-3">
          <label class="form-label fw-semibold" for="s-observaciones">Observaciones</label>
          <textarea class="form-control" id="s-observaciones" name="observaciones" rows="4" maxlength="2000" aria-describedby="s-observaciones-ayuda"></textarea>
          <div class="form-text" id="s-observaciones-ayuda">Dudas sobre los productos, horario en que prefieres que te llamemos…</div>
        </div>
        <div class="form-check mb-4">
          <input class="form-check-input" type="checkbox" id="s-acepto" name="acepto" value="si" required>
          <label class="form-check-label" for="s-acepto">${esc(SOLICITUD.aceptacion)}
            (<a href="${condiciones}" target="_blank" rel="noopener">condiciones</a> · <a href="${privacidad}" target="_blank" rel="noopener">protección de datos</a>)
            <span class="text-danger" aria-hidden="true">*</span></label>
          <div class="invalid-feedback">Tienes que aceptar para enviar la solicitud.</div>
        </div>
        <button type="submit" class="btn btn-destacado btn-lg">${esc(SOLICITUD.boton)}</button>
        <div class="mt-3" data-solicitud-resultado role="status" aria-live="polite"></div>
        ${SOLICITUD.infoPrivacidad ? `<p class="small text-body-secondary mt-4 mb-0">${esc(SOLICITUD.infoPrivacidad)} <a href="${privacidad}">Más información</a>.</p>` : ''}
      </form>
    </div>`;
  escribir(path.join(DIST, 'presupuesto/index.html'), completar(paginaDesdePlantilla(cuerpo, { buscable: false }), '/presupuesto/', {
    titulo: tituloCompleto(SOLICITUD.titulo),
    descripcion: 'Revisa los productos de tu solicitud de presupuesto y envíanos tus datos.',
    noindex: true,
  }));
}

// /ofertas/: todas las ofertas vigentes, con los mismos filtros que una categoría
{
  const cuerpo = `
    ${migas([{ texto: 'Catálogo', url: '/catalogo/' }, { texto: 'Ofertas', url: '/ofertas/' }])}
    <h1 class="display-5 fw-bold">Ofertas</h1>
    <p class="lead text-body-secondary">Precios de oferta válidos hasta la fecha indicada en cada producto. Precios orientativos, IVA incluido.</p>
    <section class="mt-4" aria-labelledby="ofertas-titulo" data-pagefind-ignore="all">
      <h2 class="h4 fw-bold mb-4" id="ofertas-titulo">${ofertas.length ? `${ofertas.length} ${ofertas.length === 1 ? 'producto en oferta' : 'productos en oferta'}` : 'Productos en oferta'}</h2>
      ${ofertas.length ? rejillaProductos(ofertas, { porPagina: LISTADOS.productosPorPagina, filtro: true, etiqueta: 'Productos en oferta' })
        : '<p class="text-body-secondary">Ahora mismo no hay ofertas. <a href="/catalogo/">Ver todo el catálogo</a>.</p>'}
    </section>`;
  escribir(path.join(DIST, 'ofertas/index.html'), completar(paginaDesdePlantilla(cuerpo, { buscable: false, ancho: true }), '/ofertas/', {
    titulo: tituloCompleto('Ofertas'),
    descripcion: `Ofertas de ${SITIO.nombre}: máquinas de coser y accesorios con precio rebajado durante unos días.`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Ofertas', url: abs('/ofertas/'), publisher: REF_ORG }],
  }));
  sitemap.push({ ruta: '/ofertas/' });
}

// /catalogo/: categorías y, debajo, las ofertas o, si no hay, el resumen al azar
{
  const cuerpo = `
    <h1 class="display-5 fw-bold">Catálogo</h1>
    <p class="lead text-body-secondary">Precios orientativos, IVA incluido. Elige una categoría o mira ${ofertas.length ? 'las ofertas' : 'algunos de nuestros productos'}.</p>
    ${categoriasPrincipales.length ? `<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 mt-2">${categoriasPrincipales.map(tarjetaCategoria).join('')}</div>` : ''}
    <section class="mt-5" aria-labelledby="catalogo-lista-titulo">
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
        <h2 class="h4 fw-bold mb-0" id="catalogo-lista-titulo">${ofertas.length ? 'Ofertas' : 'Productos'}</h2>
        ${ofertas.length ? '<a href="/ofertas/" class="fw-bold enlace-flecha">Ver todas las ofertas</a>' : ''}
      </div>
      ${ofertas.length ? bloqueOfertas() : productos.length ? bloqueResumenCatalogo() : '<p class="text-body-secondary">Todavía no hay productos en el catálogo.</p>'}
    </section>`;
  escribir(path.join(DIST, 'catalogo/index.html'), completar(paginaDesdePlantilla(cuerpo, { buscable: false, ancho: true }), '/catalogo/', {
    titulo: tituloCompleto('Catálogo'),
    descripcion: `Catálogo de ${SITIO.nombre}: máquinas y accesorios con precios orientativos. Solicita presupuesto sin compromiso.`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Catálogo', url: abs('/catalogo/'), publisher: REF_ORG }],
  }));
  sitemap.push({ ruta: '/catalogo/' });
}

/* =========================================================
   10. Portada, /blog/, 404 y cualquier otra página HTML de public/
   ========================================================= */
// Textos de la portada (Decap → Portada → public/_datos/portada.yml)
const PORTADA = fs.existsSync(`${PUB}/_datos/portada.yml`) ? leerYaml(fs.readFileSync(`${PUB}/_datos/portada.yml`, 'utf8')) || {} : {};
const valorPortada = ruta => ruta.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), PORTADA);
function aplicarPortada(raiz) {
  // Textos: si el campo está vacío se deja el texto de la plantilla
  for (const el of raiz.querySelectorAll('[data-portada]')) {
    const v = valorPortada(el.getAttribute('data-portada'));
    if (typeof v !== 'string' || !v.trim()) continue;
    let html = esc(v.trim());
    const resalte = el.getAttribute('data-resalte') && valorPortada(el.getAttribute('data-resalte'));
    if (typeof resalte === 'string' && resalte.trim()) {
      const r = esc(resalte.trim());
      if (html.includes(r)) html = html.replace(r, `<span class="resalte">${r}</span>`);
      else console.warn(`Aviso (portada): la palabra resaltada «${resalte.trim()}» no aparece en el titular.`);
    }
    el.set_content(html);
  }
  // Botones: sin texto no se muestran; direcciones solo seguras
  for (const a of raiz.querySelectorAll('[data-portada-boton]')) {
    const b = valorPortada(a.getAttribute('data-portada-boton'));
    if (!b || typeof b !== 'object') continue;
    if (!String(b.texto || '').trim()) { a.remove(); continue; }
    const icono = a.getAttribute('data-icono');
    a.set_content(`${icono ? `<i class="bi ${icono} me-2" aria-hidden="true"></i>` : ''}${esc(String(b.texto).trim())}`);
    if (b.enlace && urlSegura(b.enlace)) a.setAttribute('href', urlSegura(b.enlace));
    else if (b.enlace) console.warn(`Aviso (portada): la dirección «${b.enlace}» no es válida; se mantiene la anterior.`);
  }
}

function rellenarDinamico(html, { pagina = 1, base = '/' } = {}) {
  const raiz = leerHtml(html, { comment: true });
  aplicarPortada(raiz);

  // Secciones enlazadas a una página de Decap: data-pagina="slug"
  for (const sec of raiz.querySelectorAll('[data-pagina]')) {
    const slug = sec.getAttribute('data-pagina');
    const p = paginas.find(x => x.slug === slug);
    sec.querySelectorAll('[data-enlace]').forEach(a => a.setAttribute('href', `/paginas/${slug}/`));
    if (!p) continue;
    sec.querySelectorAll('[data-campo]').forEach(el => {
      const valor = p.meta[el.getAttribute('data-campo')];
      if (valor) { el.set_content(esc(valor)); el.removeAttribute('hidden'); }
    });
  }

  const limite = el => parseInt(el.getAttribute('data-limit'), 10) || Infinity;
  // Resumen del catálogo (al azar) y ofertas; sin contenido, la sección no se muestra
  const bCatalogo = raiz.querySelector('#rejilla-catalogo');
  if (bCatalogo) {
    bCatalogo.set_content(bloqueResumenCatalogo());
    if (!productos.length) raiz.querySelector('[data-seccion-catalogo]')?.remove();
  }
  const bOfertas = raiz.querySelector('#rejilla-ofertas');
  if (bOfertas) {
    bOfertas.set_content(bloqueOfertas());
    if (!ofertas.length) raiz.querySelector('[data-seccion-ofertas]')?.remove();
  }
  const bNoticias = raiz.querySelector('#bloque-noticias');
  if (bNoticias && bNoticias.hasAttribute('data-paginar')) {
    // Listado paginado (p. ej. /blog/): N por página, según los Ajustes
    const trozos = trocear(noticias, LISTADOS.noticiasPorPagina);
    bNoticias.set_content(listaNoticias(trozos[pagina - 1] || []));
    bNoticias.insertAdjacentHTML('afterend', navPaginacion(base, pagina, trozos.length));
  } else if (bNoticias) bNoticias.set_content(listaNoticias(noticias.slice(0, limite(bNoticias))));

  return raiz.toString();
}

function htmlsDe(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'admin' ? [] : htmlsDe(p);
    return e.name.endsWith('.html') ? [p] : [];
  });
}

const generadas = new Set([...noticias, ...paginas, ...productos, ...categorias, { url: '/catalogo/' }, { url: '/ofertas/' }, { url: '/presupuesto/' }].map(x => path.join(DIST, x.url, 'index.html')));
for (const fichero of htmlsDe(DIST)) {
  if (generadas.has(fichero)) continue;
  const rel = '/' + path.relative(DIST, fichero).split(path.sep).join('/');
  const es404 = rel === '/404.html';
  const ruta = rel.replace(/index\.html$/, '');
  const jsonld = ruta === '/'
    ? [{ '@context': 'https://schema.org', '@graph': [
        ORGANIZACION,
        { '@type': 'WebSite', '@id': `${URL_BASE}/#web`, name: SITIO.nombre, url: `${URL_BASE}/`, inLanguage: 'es', publisher: REF_ORG },
      ] }]
    : [];
  const fuente = fs.readFileSync(fichero, 'utf8');

  // Plantillas con un listado paginado (data-paginar): una página por cada N entradas
  const totalPaginas = /data-paginar/.test(fuente) && ruta.endsWith('/') ? trocear(noticias, LISTADOS.noticiasPorPagina).length : 1;
  for (let n = 1; n <= totalPaginas; n++) {
    const rutaN = rutaPagina(ruta, n);
    let html = rellenarDinamico(fuente, { pagina: n, base: ruta });
    if (n > 1) html = html.replace(/<title>([^<]*)<\/title>/, (m, t) => `<title>${t.replace(/\s*\|.*$/, '')} (página ${n})${t.includes('|') ? ' |' + t.split('|').slice(1).join('|') : ''}</title>`);
    html = completar(html, es404 ? '/404' : rutaN, { jsonld: n === 1 ? jsonld : [], noindex: es404 });
    escribir(n === 1 ? fichero : path.join(DIST, rutaN, 'index.html'), html);
    if (n === 1 && !es404 && !/<meta name="robots" content="noindex/.test(html)) sitemap.unshift({ ruta, fecha: ruta === '/blog/' ? noticias[0]?.fecha : null });
  }
}

/* =========================================================
   11. sitemap.xml, robots.txt y site.webmanifest
   ========================================================= */
const orden = r => (r === '/' ? 0 : r === '/catalogo/' ? 1 : r.startsWith('/catalogo/') ? 2 : r === '/blog/' ? 3 : 4);
sitemap.sort((a, b) => orden(a.ruta) - orden(b.ruta));
fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map(s => `  <url><loc>${esc(abs(s.ruta))}</loc>${s.fecha ? `<lastmod>${s.fecha.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);

fs.writeFileSync(path.join(DIST, 'robots.txt'), INDEXABLE
  ? `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${URL_BASE}/sitemap.xml
`
  : `# ${ES_PRODUCCION ? 'Producción sin indexar todavía (Ajustes → Avanzado)' : `Entorno de pruebas (${ENTORNO})`}: no indexar nada
User-agent: *
Disallow: /
`);

// Panel de Decap en los entornos de prueba:
//  - develop, staging, dev-*, feature/*…: el panel edita SU rama. El build ajusta
//    /config.yml (rama y prefijo de etiquetas del flujo editorial) y añade un aviso.
//    El login se hace en producción y solo entrega el token a las webs permitidas
//    (lib/origenes.js).
//  - Vistas previas de borradores (cms/…) y de Dependabot: sin panel (aviso).
//  - Local: sin cambios (usa el servidor local de Decap, «npm run panel»).
// Filtros del panel en la lista de productos: uno por fabricante y uno por categoría (las principales
// incluyen sus subcategorías). Se generan con los que hay en este despliegue: uno nuevo aparece en
// los filtros tras el siguiente despliegue (1-2 minutos). Los fijos (ofertas…) están en public/config.yml.
{
  const rutaConfig = path.join(DIST, 'config.yml');
  const doc = parseDocument(fs.readFileSync(rutaConfig, 'utf8'));
  const cols = doc.get('collections');
  const idx = cols?.items?.findIndex(c => c.get('name') === 'productos');
  if (idx >= 0) {
    const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fijos = (doc.getIn(['collections', idx, 'view_filters'])?.toJSON?.() || []);
    const nuevos = [
      ...fabricantes.map(f => ({ label: `Fabricante: ${f.nombre}`, field: 'fabricante', pattern: `^${escRe(f.slug)}$` })),
      ...categoriasPrincipales.flatMap(c => [
        { label: `Categoría: ${c.titulo}`, field: 'categoria', pattern: `^(${[c.slug, ...c.hijos.map(h => h.slug)].map(escRe).join('|')})$` },
        ...c.hijos.map(h => ({ label: `Categoría: ${c.titulo} › ${h.titulo}`, field: 'categoria', pattern: `^${escRe(h.slug)}$` })),
      ]),
    ];
    doc.setIn(['collections', idx, 'view_filters'], doc.createNode([...fijos, ...nuevos]));
    fs.writeFileSync(rutaConfig, doc.toString());
  }
}

if (!ES_PRODUCCION && !ES_LOCAL) {
  if (PANEL_EN_ENTORNO) {
    const rutaConfig = path.join(DIST, 'config.yml');
    const doc = parseDocument(fs.readFileSync(rutaConfig, 'utf8'));
    doc.setIn(['backend', 'branch'], RAMA_GIT);
    // Borradores de cada entorno con etiquetas propias, para no mezclarlos con los de producción
    doc.setIn(['backend', 'cms_label_prefix'], `decap-cms-${RAMA_GIT.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`);
    fs.writeFileSync(rutaConfig, `# GENERADO PARA EL ENTORNO «${RAMA_GIT}»: el panel edita esta rama.\n` + doc.toString());

    const rutaAdmin = path.join(DIST, 'admin/index.html');
    let admin = fs.readFileSync(rutaAdmin, 'utf8');
    admin = admin
      .replace(/<title>([^<]*)<\/title>/, `<title>[${esc(RAMA_GIT)}] $1</title>`)
      .replace('</body>', `  <div style="position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#ffd43b;color:#212529;font:14px system-ui,sans-serif;text-align:center;padding:4px 8px;border-top:2px solid #212529">
    Panel de pruebas: editas la rama <strong>${esc(RAMA_GIT)}</strong>, no la web pública.
    Lo que publiques aquí llegará a producción con la siguiente publicación, salvo lo marcado como «Solo para pruebas».
  </div>
</body>`);
    fs.writeFileSync(rutaAdmin, admin);
  } else {
    fs.writeFileSync(path.join(DIST, 'admin/index.html'), `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Sin panel (${esc(ENTORNO)})</title>
<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;line-height:1.6}</style>
</head><body>
<h1>Esta vista previa no tiene panel</h1>
<p>El panel solo funciona en la <a href="${esc(URL_BASE)}/admin/">web pública</a> y en los entornos de
${RAMAS_CON_PANEL.map(r => `<code>${esc(r)}</code>`).join(', ')}. Esta es la vista previa de la rama
<code>${esc(RAMA_GIT || ENTORNO)}</code> (una tarea, un borrador o una actualización automática).
Para probar el panel con esta rama, hazlo en local con <code>npm run panel</code>.</p>
</body></html>
`);
  }
}

fs.writeFileSync(path.join(DIST, 'site.webmanifest'), JSON.stringify({
  name: SITIO.nombre,
  short_name: SITIO.nombreCorto || 'Tienda',
  description: SITIO.descripcion,
  lang: 'es',
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: SITIO.colorTema || '#ffffff',
  icons: [
    { src: '/img/iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/img/iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/img/iconos/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2));

/* =========================================================
   13. Feed RSS
       /blog/feed.xml        entradas del blog
       Sirven para lectores de noticias y para herramientas que publican
       automáticamente en redes sociales (IFTTT, Zapier, Make, Buffer...).
   ========================================================= */
const cdata = t => `<![CDATA[${String(t ?? '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
const TIPOS_IMG = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
// En el feed, los enlaces e imágenes tienen que ser absolutos (también los srcset)
const absolutizar = html => html
  .replace(/(src|href)="\/(?!\/)/g, `$1="${URL_BASE}/`)
  .replace(/srcset="([^"]*)"/g, (m, v) => `srcset="${v.replace(/(^|,\s*)\/(?!\/)/g, `$1${URL_BASE}/`)}"`);

function itemFeed(x, categoria, extraHtml = '') {
  // Imagen propia o, si no tiene, la automática con el título (para Instagram, etc.)
  const imgRuta = x.imagen || x.imagenAuto;
  const imgFichero = imgRuta ? path.join(DIST, decodeURIComponent(imgRuta)) : '';
  const enclosure = imgFichero && fs.existsSync(imgFichero)
    ? `\n      <enclosure url="${esc(abs(imgRuta))}" length="${fs.statSync(imgFichero).size}" type="${TIPOS_IMG[path.extname(imgFichero).toLowerCase()] || 'image/jpeg'}"/>`
    : '';
  const categorias = [categoria];
  const intro = (x.imagen ? `<p><img src="${esc(abs(x.imagen))}" alt="${esc(x.imagenAlt)}"></p>` : '') + extraHtml;
  return {
    fecha: x.fecha,
    xml: `
    <item>
      <title>${esc(x.titulo)}</title>
      <link>${esc(abs(x.url))}</link>
      <guid isPermaLink="true">${esc(abs(x.url))}</guid>
      ${x.fecha ? `<pubDate>${x.fecha.toUTCString()}</pubDate>` : ''}
      ${categorias.map(c => `<category>${esc(c)}</category>`).join('\n      ')}
      <description>${cdata(x.resumen)}</description>
      <content:encoded>${cdata(intro + absolutizar(x.html || ''))}</content:encoded>${enclosure}
    </item>`,
  };
}

const itemsNoticias = noticias.map(n => itemFeed(n, 'Blog'));

// Más recientes primero; lo que no tiene fecha, al final
const porFecha = (a, b) => (b.fecha || 0) - (a.fecha || 0);

function escribirFeed(feed, items) {
  const lista = [...items].sort(porFecha).slice(0, 30);
  const ultima = lista.find(i => i.fecha)?.fecha;
  escribir(path.join(DIST, feed.ruta),
`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${esc(feed.titulo)}</title>
    <link>${esc(abs(feed.enlace))}</link>
    <atom:link href="${esc(abs(feed.ruta))}" rel="self" type="application/rss+xml"/>
    <description>${esc(SITIO.descripcion)}</description>
    <language>es-ES</language>
    ${ultima ? `<lastBuildDate>${ultima.toUTCString()}</lastBuildDate>` : ''}
    <image>
      <url>${esc(abs(SITIO.logo))}</url>
      <title>${esc(feed.titulo)}</title>
      <link>${esc(abs(feed.enlace))}</link>
    </image>${lista.map(i => i.xml).join('')}
  </channel>
</rss>
`);
}

escribirFeed(FEEDS[0], itemsNoticias);

/* =========================================================
   14. Buscador (Pagefind)
       Crea en /pagefind/ un índice de las entradas del blog y las páginas
       (lo marcado con data-pagefind-body). Funciona sin servidor ni servicios
       externos. La página del buscador es public/buscar/index.html.
   ========================================================= */
let paginasIndexadas = 0;
// Pagefind se comunica con un programa auxiliar; muy de vez en cuando esa comunicación
// falla al primer intento, así que se reintenta hasta 3 veces.
for (let intento = 1; intento <= 3 && !paginasIndexadas; intento++) {
  try {
    fs.rmSync(path.join(DIST, 'pagefind'), { recursive: true, force: true });
    const pagefind = await import('pagefind');
    const { index, errors } = await pagefind.createIndex({ forceLanguage: 'es' });
    if (!index) throw new Error(errors?.join(', ') || 'sin índice');
    await index.addDirectory({ path: DIST });
    await index.writeFiles({ outputPath: path.join(DIST, 'pagefind') });
    await pagefind.close();
    const entrada = JSON.parse(fs.readFileSync(path.join(DIST, 'pagefind/pagefind-entry.json'), 'utf8'));
    paginasIndexadas = Object.values(entrada.languages || {}).reduce((t, l) => t + (l.page_count || 0), 0);
  } catch (e) {
    try { (await import('pagefind')).close(); } catch { /* nada */ }
    if (intento === 3) console.warn(`Aviso: no se pudo crear el índice del buscador: ${e.message}`);
  }
}

/* =========================================================
   15. Comprobación de enlaces internos
       Avisa (sin parar el despliegue) de enlaces a páginas o ficheros que no
       existen: p. ej. una opción del menú que apunta a una página borrada.
   ========================================================= */
// Redirecciones de Cloudflare Pages (public/_redirects: «origen destino [código]» por línea;
// «*» al final del origen vale por cualquier resto de la dirección)
const redirecciones = fs.existsSync(`${PUB}/_redirects`)
  ? fs.readFileSync(`${PUB}/_redirects`, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => l.split(/\s+/)[0])
  : [];
const esRedireccion = ruta => redirecciones.some(src => {
  const base = src.replace(/\/?\*$/, '');
  return ruta === src || ruta === src + '/' || (src.endsWith('*') && (ruta === base || ruta.startsWith(base + '/')));
});
function existeEnDist(ruta) {
  let r;
  try { r = decodeURIComponent(ruta); } catch { r = ruta; }
  const f = path.join(DIST, r);
  if (r.endsWith('/')) return fs.existsSync(path.join(f, 'index.html'));
  return (fs.existsSync(f) && fs.statSync(f).isFile()) || fs.existsSync(path.join(f, 'index.html'));
}
const rotos = [];
for (const fichero of htmlsDe(DIST)) {
  const pagina = '/' + path.relative(DIST, fichero).split(path.sep).join('/').replace(/index\.html$/, '');
  if (pagina.startsWith('/pagefind/')) continue;
  const raiz = leerHtml(fs.readFileSync(fichero, 'utf8'));
  const refs = [
    ...raiz.querySelectorAll('a[href]').map(e => e.getAttribute('href')),
    ...raiz.querySelectorAll('img[src], script[src]').map(e => e.getAttribute('src')),
    ...raiz.querySelectorAll('link[href]').map(e => e.getAttribute('href')),
    ...raiz.querySelectorAll('source[srcset]').flatMap(e => e.getAttribute('srcset').split(',').map(x => x.trim().split(/\s+/)[0])),
  ];
  for (const ref of new Set(refs)) {
    if (!ref || !ref.startsWith('/') || ref.startsWith('//')) continue;
    const ruta = ref.split('#')[0].split('?')[0];
    if (!ruta || /^\/api\//.test(ruta) || esRedireccion(ruta) || existeEnDist(ruta)) continue;
    rotos.push({ pagina, ref });
  }
}
if (rotos.length) {
  // Agrupados por destino: un enlace roto del menú sale en todas las páginas
  const porDestino = new Map();
  for (const r of rotos) porDestino.set(r.ref, [...(porDestino.get(r.ref) || []), r.pagina]);
  INFORME.avisos.push(`${porDestino.size} enlace(s) interno(s) roto(s): `
    + [...porDestino].map(([ref, pags]) => `${ref} (en ${pags.length > 3 ? `${pags.length} páginas: probablemente el menú o el pie` : pags.join(', ')})`).join('; ')
    + '. Revisa el menú (Ajustes del sitio), los enlaces del texto o si se ha borrado alguna página.');
  capturarAvisos = false; // el detalle de abajo ya va en el aviso anterior
  console.warn(`\nAviso: ${porDestino.size} enlace(s) interno(s) roto(s):`);
  for (const [ref, pags] of porDestino) {
    console.warn(`  ${ref}  ←  ${pags.length > 3 ? `${pags.length} páginas (probablemente el menú o el pie)` : pags.join(', ')}`);
  }
  console.warn('  Revisa el menú (Ajustes del sitio), los enlaces del texto o si se ha borrado alguna página.\n');
  capturarAvisos = true;
}

/* =========================================================
   Resumen
   ========================================================= */
if (descripcionesAcortadas.length) nota(`Descripción para Google acortada automáticamente (más de ${MAX_DESCRIPCION} caracteres) en: ${descripcionesAcortadas.join(', ')}`);
if (excluidosPrueba) console.log(`Contenido «Solo para pruebas» no publicado: ${excluidosPrueba}.`);
console.log(`Web generada en ${DIST}/ para «${ENTORNO}»: ${productos.length} productos (${ofertas.length} en oferta, ${productosTodos.length - productos.length} no disponibles), ${categorias.length} categorías, ${fabricantes.length} fabricantes, ${noticias.length} entradas del blog, `
  + `${paginas.length} páginas, ${sitemap.length} URLs en el sitemap, `
  + `${optimizadas.size} imágenes optimizadas, ${paginasIndexadas} páginas en el buscador, ${new Set(rotos.map(r => r.ref)).size} enlaces rotos.`);
for (const [a, b] of mapaImagenes) if (a !== b) nota(`Imagen publicada con nombre descriptivo: ${a} → ${b}`);

// Tamaño de lo publicado (Cloudflare Pages tiene límites de ficheros por despliegue)
let nFicheros = 0, bytes = 0;
(function contar(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) contar(p); else { nFicheros++; bytes += fs.statSync(p).size; }
  }
})(DIST);
console.log(`Publicación: ${nFicheros} ficheros, ${(bytes / 1048576).toFixed(1)} MB. Imágenes: ${generadasNuevas} generadas, ${usosCache} reutilizadas de la caché. Tiempo: ${((Date.now() - INICIO) / 1000).toFixed(1)} s.`);
// El plan gratuito de Cloudflare Pages admite 20.000 ficheros por despliegue (docs/PLAN.md, fase 0)
const AVISO_FICHEROS = 15000;
if (nFicheros > AVISO_FICHEROS) console.warn(`Aviso: la web tiene más de ${AVISO_FICHEROS} ficheros; el plan gratuito de Cloudflare Pages admite 20.000 por despliegue. Ver docs/PLAN.md (fase 0).`);

if (process.env.INFORME_BUILD) {
  fs.writeFileSync(process.env.INFORME_BUILD, JSON.stringify({
    entorno: ENTORNO,
    rama: RAMA_GIT || null,
    contenido: {
      productos: productos.length, ofertas: ofertas.length, categorias: categorias.length, fabricantes: fabricantes.length,
      blog: noticias.length, paginas: paginas.length,
      sinPublicarPorPruebas: excluidosPrueba,
    },
    web: {
      urlsSitemap: sitemap.length, paginasBuscador: paginasIndexadas,
      enlacesRotos: new Set(rotos.map(r => r.ref)).size,
      ficheros: nFicheros, megas: Number((bytes / 1048576).toFixed(1)),
      imagenesNuevas: generadasNuevas, imagenesCache: usosCache,
      segundos: Number(((Date.now() - INICIO) / 1000).toFixed(1)),
    },
    avisos: INFORME.avisos,
    notas: INFORME.notas,
  }, null, 2));
}
