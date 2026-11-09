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
  // Frases bajo el resumen (p. ej. «Sin compromiso…»), con su icono
  ventajas: (Array.isArray(DATOS_SOLICITUD.ventajas) ? DATOS_SOLICITUD.ventajas : [
    { texto: 'Sin compromiso: no pagas nada ahora', icono: 'check' },
    { texto: 'Puedes verlo antes en la tienda', icono: 'tienda' },
  ]).map(v => (typeof v === 'string' ? { texto: v } : v || {})).filter(v => String(v.texto || '').trim()),
  // «¿Cómo prefieres que te contestemos?»: si se pregunta y con qué opciones
  preferencia: {
    mostrar: (DATOS_SOLICITUD.preferencia_contacto || {}).mostrar !== false,
    pregunta: (DATOS_SOLICITUD.preferencia_contacto || {}).pregunta || '¿Cómo prefieres que te contestemos?',
    opciones: (() => {
      const o = (DATOS_SOLICITUD.preferencia_contacto || {}).opciones;
      return (Array.isArray(o) && o.length ? o : ['llamada', 'whatsapp', 'correo']).filter(x => ['llamada', 'whatsapp', 'correo'].includes(x));
    })(),
  },
  accesorios: DATOS_SOLICITUD.accesorios !== false,
  notas: DATOS_SOLICITUD.notas !== false,
};
// Contacto y horario y Sobre nosotros (Decap → Contacto y Sobre nosotros): páginas con datos
const leerDatos = f => (fs.existsSync(`${PUB}/_datos/${f}`) ? leerYaml(fs.readFileSync(`${PUB}/_datos/${f}`, 'utf8')) || {} : {});
const DATOS_CONTACTO = leerDatos('contacto.yml');
const DATOS_SOBRE = leerDatos('sobre-nosotros.yml');
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const NOMBRE_DIA = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
const tramo = t => {
  const m = String(t || '').match(/^\s*(\d{1,2})[:.](\d{2})\s*[-–—a]+\s*(\d{1,2})[:.](\d{2})\s*$/);
  if (!m) { if (String(t || '').trim()) console.warn(`Aviso (Contacto y horario): no entiendo el horario «${t}»; escríbelo como 10:00-13:30.`); return null; }
  const h = (a, b) => `${a.padStart(2, '0')}:${b}`;
  return [h(m[1], m[2]), h(m[3], m[4])];
};
// «Lunes a viernes», «Lunes, miércoles y viernes» o «Sábado»
const nombreDias = dias => {
  const k = dias.map(d => DIAS.indexOf(d)).filter(i => i >= 0).sort((a, b) => a - b);
  if (!k.length) return '';
  const seguidos = k.every((v, i) => !i || v === k[i - 1] + 1);
  if (k.length > 2 && seguidos) return `${NOMBRE_DIA[DIAS[k[0]]]} a ${NOMBRE_DIA[DIAS[k.at(-1)]].toLowerCase()}`;
  const n = k.map((i, j) => (j ? NOMBRE_DIA[DIAS[i]].toLowerCase() : NOMBRE_DIA[DIAS[i]]));
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n.at(-1)}` : n[0];
};
const CONTACTO = {
  provisional: !!DATOS_CONTACTO.provisional,
  titulo: DATOS_CONTACTO.titulo || 'Contacto y horario',
  introduccion: DATOS_CONTACTO.introduccion || '',
  telefono: String(DATOS_CONTACTO.telefono || AJUSTES.redes?.telefono || '').trim(),
  whatsapp: String(DATOS_CONTACTO.whatsapp || AJUSTES.redes?.whatsapp || '').replace(/\D/g, ''),
  correo: String(DATOS_CONTACTO.correo || AJUSTES.redes?.email || '').trim(),
  direccion: String(DATOS_CONTACTO.direccion || '').trim(),
  cp: String(DATOS_CONTACTO.codigo_postal || '').trim(),
  localidad: String(DATOS_CONTACTO.localidad || AJUSTES.localidad || '').trim(),
  provincia: String(DATOS_CONTACTO.provincia || AJUSTES.provincia || '').trim(),
  mapaEnlace: String(DATOS_CONTACTO.mapa_enlace || '').trim(),
  horario: (Array.isArray(DATOS_CONTACTO.horario) ? DATOS_CONTACTO.horario : []).map(f => ({
    dias: (Array.isArray(f?.dias) ? f.dias : []).filter(d => DIAS.includes(d)),
    tramos: [tramo(f?.manana), tramo(f?.tarde)].filter(Boolean),
  })).filter(f => f.dias.length),
  nota: String(DATOS_CONTACTO.nota_horario || '').trim(),
  aviso: { texto: String(DATOS_CONTACTO.aviso?.texto || '').trim(), desde: String(DATOS_CONTACTO.aviso?.desde || ''), hasta: String(DATOS_CONTACTO.aviso?.hasta || '') },
  llegar: (Array.isArray(DATOS_CONTACTO.como_llegar) ? DATOS_CONTACTO.como_llegar : []).filter(x => String(x?.texto || '').trim()),
};
CONTACTO.direccionCompleta = [CONTACTO.direccion, [CONTACTO.cp, CONTACTO.localidad].filter(Boolean).join(' '), CONTACTO.provincia && CONTACTO.provincia !== CONTACTO.localidad ? `(${CONTACTO.provincia})` : ''].filter(Boolean).join(', ').replace(', (', ' (');
// Para el pie (scripts/layout.js): dirección, teléfono, WhatsApp, correo y el horario con el que el
// navegador calcula «Abierto / Cerrado · abre…»
SITIO.contacto = {
  lineas: [CONTACTO.direccion, [CONTACTO.cp, CONTACTO.localidad].filter(Boolean).join(' ') + (CONTACTO.provincia && CONTACTO.provincia !== CONTACTO.localidad ? ` (${CONTACTO.provincia})` : '')].filter(x => x && x.trim()),
  telefono: CONTACTO.telefono, whatsapp: CONTACTO.whatsapp, correo: CONTACTO.correo,
  horario: JSON.stringify(CONTACTO.horario.map(f => ({ d: f.dias.map(d => DIAS.indexOf(d) + 1), t: f.tramos }))),
  aviso: CONTACTO.aviso.texto && CONTACTO.aviso.desde && CONTACTO.aviso.hasta ? JSON.stringify(CONTACTO.aviso) : '',
  conHorario: CONTACTO.horario.some(f => f.tramos.length),
};
// El teléfono, el WhatsApp y el correo de Contacto mandan en el pie y en las fichas
SITIO.redes = { ...SITIO.redes, ...(CONTACTO.telefono ? { telefono: CONTACTO.telefono } : {}), ...(CONTACTO.whatsapp ? { whatsapp: CONTACTO.whatsapp } : {}), ...(CONTACTO.correo ? { email: CONTACTO.correo } : {}) };

// Iconos de las ventajas (portada y solicitud de presupuesto)
const ICONOS_VENTAJA = { check: 'bi-check-circle-fill', asesoria: 'bi-chat-dots-fill', precio: 'bi-tag-fill', segunda_mano: 'bi-recycle', tienda: 'bi-shop', envio: 'bi-truck', taller: 'bi-tools', garantia: 'bi-shield-check', telefono: 'bi-telephone-fill' };

SITIO.solicitud = SOLICITUD.activa; // contador del menú (scripts/layout.js)
if (!SOLICITUD.activa) console.log('Solicitud de presupuesto desactivada (Decap → Solicitud de presupuesto): sin botón, contador ni formulario.');
const construir = ruta => construirLayout(SITIO, ruta);

// Bloques de la portada, /catalogo/, /ofertas/ y /blog/: si se muestran y cuántos elementos por
// página (Decap → Ajustes del sitio → Ajustes generales → Portada, Página Catálogo, Página Ofertas
// y Página Blog)
const entero = (v, def, min = 1) => (Number.isFinite(Number(v)) && Number(v) >= min ? Math.floor(Number(v)) : def);
// Siempre múltiplos de «paso» (se redondea al más cercano): productos de 12 en 12, para que las filas
// queden completas en el ordenador (4 por fila), la tableta (3) y el móvil (2); entradas de 3 en 3
const multiplo = (v, paso, def) => Math.max(paso, Math.round(entero(v, def) / paso) * paso);
const bloqueCfg = (o, porPagina, paso = 12) => ({ mostrar: o?.mostrar !== false, porPagina: multiplo(o?.por_pagina, paso, porPagina) });
const cfgPortada = AJUSTES.portada || {};
const cfgCatalogo = AJUSTES.pagina_catalogo || {};
const cfgOfertas = AJUSTES.pagina_ofertas || {};
const BLOQUES = {
  portada: { catalogo: bloqueCfg(cfgPortada.catalogo, 12), ofertas: bloqueCfg(cfgPortada.ofertas, 12), blog: bloqueCfg(cfgPortada.blog, 3, 3) },
  catalogo: { productos: bloqueCfg(cfgCatalogo.productos, 12), ofertas: bloqueCfg(cfgCatalogo.ofertas, 12), blog: bloqueCfg(cfgCatalogo.blog, 3, 3) },
  ofertas: { productos: bloqueCfg(cfgOfertas.productos, 12), blog: bloqueCfg(cfgOfertas.blog, 3, 3) },
  blog: { porPagina: multiplo(AJUSTES.pagina_blog?.por_pagina, 3, 12) },
};
if (AJUSTES.listados) console.warn('Aviso: «listados» de public/_datos/sitio.yml ya no se usa (ahora: Portada, Página Catálogo, Página Ofertas y Página Blog en Ajustes del sitio); bórralo.');

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
  areaServed: CONTACTO.localidad || SITIO.localidad,
  address: { '@type': 'PostalAddress', ...(CONTACTO.direccion && !/\[/.test(CONTACTO.direccion) ? { streetAddress: CONTACTO.direccion } : {}), ...(CONTACTO.cp ? { postalCode: CONTACTO.cp } : {}), addressLocality: CONTACTO.localidad || SITIO.localidad, addressRegion: CONTACTO.provincia || SITIO.provincia, addressCountry: 'ES' },
  ...(CONTACTO.telefono ? { telephone: CONTACTO.telefono } : {}),
  ...(CONTACTO.horario.some(f => f.tramos.length) ? { openingHoursSpecification: CONTACTO.horario.flatMap(f => f.tramos.map(([a, b]) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: f.dias.map(d => ({ lunes: 'Monday', martes: 'Tuesday', miercoles: 'Wednesday', jueves: 'Thursday', viernes: 'Friday', sabado: 'Saturday', domingo: 'Sunday' }[d])),
    opens: a, closes: b,
  }))) } : {}),
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
    tema: String(n.meta.tema || '').trim(),
    // Minutos de lectura (unas 200 palabras por minuto; mínimo 1)
    minutos: Math.max(1, Math.round(n.cuerpo.replace(/[#*_>`\[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length / 200)),
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
    resumen: c.meta.description || resumir(c.cuerpo),
    imagen: c.meta.imagen || '',
    imagenAlt: c.meta.imagen_alt || c.meta.title || '',
  }));
const categoriaPorSlug = new Map(categoriasTodas.map(c => [c.slug, c]));
// Hasta tres niveles: categoría › subcategoría › sub-subcategoría (p. ej. Bordadoras › Industriales
// › 1 Cabezal). Se corrigen los padres imposibles y no se publica lo que pase de tres niveles.
for (const c of categoriasTodas) {
  if (!c.padre) continue;
  if (c.padre === c.slug) { console.warn(`Aviso: la categoría «${c.titulo}» es su propia categoría padre; se trata como principal.`); c.padre = ''; }
  else if (!categoriaPorSlug.has(c.padre)) { console.warn(`Aviso: la categoría padre «${c.padre}» de «${c.titulo}» no existe; se trata como principal.`); c.padre = ''; }
}
const ancestrosDe = c => {
  const r = [];
  for (let x = c, vistos = new Set([c.slug]); x.padre;) {
    x = categoriaPorSlug.get(x.padre);
    if (!x || vistos.has(x.slug)) return null; // ciclo
    vistos.add(x.slug); r.unshift(x);
  }
  return r;
};
for (const c of categoriasTodas) {
  const a = ancestrosDe(c);
  if (!a) { console.warn(`Aviso: la categoría «${c.titulo}» forma un círculo con sus categorías padre; no se publica.`); c.invalida = true; }
  else if (a.length > 2) { console.warn(`Aviso: «${c.titulo}» está en un cuarto nivel (solo hay tres: tipo de producto › categoría › subcategoría); no se publica.`); c.invalida = true; }
}
for (const c of categoriasTodas) if (!c.invalida && ancestrosDe(c).some(x => x.invalida)) c.invalida = true;
const categorias = categoriasTodas.filter(c => !c.invalida);
// Orden del catálogo (Decap → Ajustes del sitio → «Orden del catálogo en el menú»): tipos de
// producto › categorías › subcategorías. Manda en el menú, en las tarjetas y en los filtros del
// panel. Lo que no esté en esa lista sale al final de su nivel, por orden alfabético (con aviso).
const posicionMenu = new Map(); // slug → { padre, pos }
(function leerOrden(lista, padre) {
  (Array.isArray(lista) ? lista : []).forEach((it, pos) => {
    const slug = String((typeof it === 'string' ? it : it?.categoria) || '').trim();
    if (!slug) return;
    const c = categoriaPorSlug.get(slug);
    if (!c || c.invalida) console.warn(`Aviso: «${slug}» está en «Orden del catálogo en el menú» (Ajustes del sitio), pero esa categoría no existe; se ignora.`);
    else if (posicionMenu.has(slug)) console.warn(`Aviso: «${c.titulo}» aparece dos veces en «Orden del catálogo en el menú»; se usa la primera.`);
    else if ((c.padre || '') !== padre) console.warn(`Aviso: en «Orden del catálogo en el menú», «${c.titulo}» está bajo «${categoriaPorSlug.get(padre)?.titulo || 'el primer nivel'}», pero su categoría padre es «${categoriaPorSlug.get(c.padre)?.titulo || 'ninguna'}»; se coloca donde dice su categoría padre.`);
    else posicionMenu.set(slug, { padre, pos });
    if (typeof it === 'object' && it) leerOrden(it.hijos, slug);
  });
})(AJUSTES.catalogo_orden, '');
if (Array.isArray(AJUSTES.catalogo_orden) && AJUSTES.catalogo_orden.length) {
  for (const c of categorias) if (!posicionMenu.has(c.slug)) console.warn(`Aviso: la categoría «${c.titulo}» no está en «Orden del catálogo en el menú» (Ajustes del sitio): sale al final de su nivel, por orden alfabético.`);
}
const posDe = c => posicionMenu.get(c.slug)?.pos ?? Infinity;
const porOrden = (a, b) => posDe(a) - posDe(b) || a.titulo.localeCompare(b.titulo, 'es');
for (const c of categorias) {
  c.ancestros = ancestrosDe(c);
  c.nivel = c.ancestros.length + 1;
  // En el panel, cada nivel es una sección distinta (tipos de producto, categorías, subcategorías)
  // según el campo «nivel» del fichero: si no coincide con su sitio real, no saldría donde toca.
  const nivelPanel = ['tipo', 'categoria', 'subcategoria'][c.nivel - 1];
  if (c.meta.nivel !== nivelPanel) console.warn(`Aviso: «${c.titulo}» (public/_categorias/${c.slug}.md) tiene «nivel: ${c.meta.nivel || '(vacío)'}», pero por su categoría padre es «${nivelPanel}»; corrígelo en el fichero para que salga en la sección correcta del panel.`);
  c.url = `/catalogo/${[...c.ancestros, c].map(x => x.slug).join('/')}/`;
  c.hijos = categorias.filter(h => h.padre === c.slug).sort(porOrden);
}
// Todas las categorías que cuelgan de una (hijas y nietas)
const descendientesDe = c => c.hijos.flatMap(h => [h, ...descendientesDe(h)]);
const categoriasPrincipales = categorias.filter(c => !c.padre).sort(porOrden);
// Tipo de producto con dos precios (Completa y Cabezal): opción «tipo_dos_precios» del campo «precio»
// de los productos en public/config.yml (la misma que usa el panel, public/admin/campos.js)
const TIPO_DOS_PRECIOS = (() => {
  try {
    const cfg = leerYaml(fs.readFileSync(`${PUB}/config.yml`, 'utf8'));
    const col = (cfg.collections || []).find(c => c.name === 'productos');
    return String((col?.fields || []).find(f => f.name === 'precio')?.tipo_dos_precios || '').trim();
  } catch { return ''; }
})();
const TIPO_DOS_PRECIOS_TITULO = categoriaPorSlug.get(TIPO_DOS_PRECIOS)?.titulo || TIPO_DOS_PRECIOS;
if (TIPO_DOS_PRECIOS && !categoriaPorSlug.has(TIPO_DOS_PRECIOS)) console.warn(`Aviso: el tipo con dos precios «${TIPO_DOS_PRECIOS}» (public/config.yml) no existe.`);

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
    precioCabezal: numero(m.precio_cabezal),
    estado: ['disponible', 'oferta', 'no_disponible'].includes(m.estado) ? m.estado : 'disponible',
    oferta: { precio: numero(o.precio), precioCabezal: numero(o.precio_cabezal), inicio: textoDia(o.inicio), fin: textoDia(o.fin) },
    segundaMano: m.condicion === 'segunda_mano',
    estadoUso: String(m.segunda_mano?.estado || '').trim(),
    garantia: numero(m.segunda_mano?.garantia),
    imagenes: imagenes.slice(0, 5),
    resumen: m.description || resumir(p.cuerpo),
    caracteristicas: (Array.isArray(m.caracteristicas) ? m.caracteristicas : [])
      // La característica es opcional: sin ella, el valor ocupa la fila entera
      .map(c => ({ nombre: String(c?.nombre || '').trim(), valor: String(c?.valor || '').trim() })).filter(c => c.valor),
    // Puntos clave (pestaña «Características») y ficha del fabricante en PDF (pestaña «Ficha técnica»)
    destacados: (Array.isArray(m.destacados) ? m.destacados : []).map(d => String((typeof d === 'string' ? d : d?.texto) || '').trim()).filter(Boolean),
    fichaPdf: typeof m.ficha_pdf === 'string' && m.ficha_pdf.trim() ? m.ficha_pdf.trim() : '',
    tipo: 'Producto',
    url: `/productos/${p.slug}/`,
  };
});

// Dos precios (Completa y Cabezal): solo los productos del tipo que dice public/config.yml
// (campo «precio» de los productos, opción «tipo_dos_precios»; lo usa también el panel)
for (const p of productosTodos) {
  const raiz = p.categoria ? ((p.categoria.ancestros || [])[0] || p.categoria) : null;
  p.dosPrecios = !!TIPO_DOS_PRECIOS && raiz?.slug === TIPO_DOS_PRECIOS && p.precioCabezal != null;
}

// Validaciones (avisos para quien edita: el producto se publica igualmente salvo que se diga)
const refsVistas = new Map();
let productosFotosSinAlt = 0; // se avisa en una sola línea al final (si no, una por producto)
const productosSinFotos = []; // ídem
for (const p of productosTodos) {
  const donde = `el producto «${p.nombre}» (${p.fichero})`;
  const del = `del producto «${p.nombre}» (${p.fichero})`;
  if (!p.modelo) console.warn(`Aviso: falta el modelo en ${donde}.`);
  if (!p.fabricante) console.warn(`Aviso: ${p.fabricanteSlug ? `el fabricante «${p.fabricanteSlug}» no existe` : 'falta el fabricante'} en ${donde}.`);
  if (!p.categoria) console.warn(`Aviso: ${p.categoriaSlug ? `la categoría «${p.categoriaSlug}» no existe` : 'falta la categoría'} en ${donde}; solo saldrá en «Todo el catálogo».`);
  else if (p.categoria.hijos.length) nota(`${donde} está en «${p.categoria.titulo}», que tiene subcategorías: mejor elegir una subcategoría.`);
  if (p.estado !== 'no_disponible' && !p.imagenes.length) productosSinFotos.push(p);
  if (p.imagenes.some(i => !i.alt)) productosFotosSinAlt++;
  if ((Array.isArray(p.meta.imagenes) ? p.meta.imagenes.length : 0) > 5) console.warn(`Aviso: ${donde} tiene más de 5 fotos; solo se publican las 5 primeras.`);
  if (p.meta.precio != null && p.meta.precio !== '' && p.precio == null) console.warn(`Aviso: el precio ${del} no es un número.`);
  if (p.segundaMano && (p.garantia == null || p.garantia < 12)) console.warn(`Aviso: la garantía ${del} (segunda mano) es ${p.garantia ?? 'vacía'}: tiene que ser de 12 meses como mínimo.`);
  if (p.referencia) {
    if (refsVistas.has(p.referencia)) console.warn(`Aviso: la referencia «${p.referencia}» se repite en «${refsVistas.get(p.referencia)}» y en «${p.nombre}».`);
    refsVistas.set(p.referencia, p.nombre);
  }
  if (p.compatibleCon.includes(p.slug)) console.warn(`Aviso: ${donde} es «compatible con» sí mismo.`);
  if (p.precioCabezal != null && !p.dosPrecios) console.warn(`Aviso: ${donde} tiene «Precio Cabezal» pero no está en «${TIPO_DOS_PRECIOS_TITULO}»; no se muestra.`);
  if (p.dosPrecios && p.precio == null) console.warn(`Aviso: ${donde} tiene «Precio Cabezal» pero no «Precio Completa»; la completa sale como «a consultar».`);
  if (p.estado === 'oferta') {
    const o = p.oferta;
    const conPrecioOferta = o.precio != null || (p.dosPrecios && o.precioCabezal != null);
    if (!conPrecioOferta || !o.inicio || !o.fin) console.warn(`Aviso: ${donde} está «En oferta» pero le falta el precio de oferta o alguna fecha; se muestra con su precio normal.`);
    else if (o.precio != null && p.precio != null && o.precio >= p.precio) console.warn(`Aviso: el precio de oferta ${p.dosPrecios ? '(completa) ' : ''}${del} (${o.precio} €) no es menor que el normal (${p.precio} €); no se muestra como oferta.`);
    else if (p.dosPrecios && o.precioCabezal != null && o.precioCabezal >= p.precioCabezal) console.warn(`Aviso: el precio de oferta del cabezal ${del} (${o.precioCabezal} €) no es menor que el normal (${p.precioCabezal} €); no se muestra como oferta.`);
    else if (o.fin < o.inicio) console.warn(`Aviso: la oferta ${del} acaba antes de empezar.`);
    // Oferta terminada: no es un error. La web ya lo trata como disponible, con su precio normal
    // (ver p.enOferta); en el panel sigue «En oferta» hasta que alguien lo cambie o ponga fechas nuevas.
    else if (o.fin < HOY) nota(`Oferta terminada el ${o.fin} ${del}: se muestra como disponible, con su precio normal.`);
  }
}
if (productosSinFotos.length) {
  const n = productosSinFotos.length;
  const ej = productosSinFotos.slice(0, 3).map(p => p.fichero).join(', ');
  console.warn(`Aviso: ${n} producto${n === 1 ? ' no tiene' : 's no tienen'} fotos (p. ej. ${ej}${n > 3 ? '…' : ''}).`);
}
if (productosFotosSinAlt) nota(`${productosFotosSinAlt} producto${productosFotosSinAlt === 1 ? ' tiene' : 's tienen'} alguna foto sin descripción (texto alternativo); se usa el nombre del producto.`);
// Oferta vigente hoy (fechas incluidas, hora de Madrid). Con dos precios (máquinas industriales:
// completa y cabezal) cada uno puede tener su precio de oferta; basta con uno para estar en oferta.
for (const p of productosTodos) {
  const o = p.oferta;
  const enFechas = p.estado === 'oferta' && !!o.inicio && !!o.fin && o.inicio <= HOY && HOY <= o.fin;
  p.ofertaCompleta = enFechas && o.precio != null && (p.precio == null || o.precio < p.precio);
  p.ofertaCabezal = enFechas && p.dosPrecios && o.precioCabezal != null && o.precioCabezal < p.precioCabezal;
  p.enOferta = p.ofertaCompleta || p.ofertaCabezal;
  p.descuento = p.ofertaCompleta && p.precio ? Math.round((1 - o.precio / p.precio) * 100)
    : p.ofertaCabezal ? Math.round((1 - o.precioCabezal / p.precioCabezal) * 100) : 0;
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
// Productos de una categoría, incluidos los de sus subcategorías (todos los niveles)
const enCategoria = c => { const dentro = new Set([c, ...descendientesDe(c)]); return productos.filter(p => dentro.has(p.categoria)); };
// Ajustes del sitio → «Tipos y categorías sin productos»: con «Ocultarlos», los tipos de producto,
// categorías y subcategorías sin ningún producto (contando los de lo que cuelga de ellos) no salen
// en ningún sitio: menús, barra del catálogo, inicio, pie, tarjetas, ofertas, buscador ni sitemap,
// y su página no se publica. En el panel siguen disponibles para asignarles productos.
const OCULTAR_VACIAS = AJUSTES.catalogo_vacias === 'ocultar';
if (OCULTAR_VACIAS) {
  const vacias = new Set(categorias.filter(c => !enCategoria(c).length));
  if (vacias.size) {
    for (let i = categorias.length - 1; i >= 0; i--) if (vacias.has(categorias[i])) categorias.splice(i, 1);
    for (let i = categoriasPrincipales.length - 1; i >= 0; i--) if (vacias.has(categoriasPrincipales[i])) categoriasPrincipales.splice(i, 1);
    for (const c of categorias) c.hijos = c.hijos.filter(h => !vacias.has(h));
    console.log(`Tipos, categorías y subcategorías sin productos ocultos (Ajustes → «Tipos y categorías sin productos»): ${vacias.size} de ${vacias.size + categorias.length}.`);
  }
}
const ofertas = productos.filter(p => p.enOferta).sort((a, b) => b.oferta.inicio.localeCompare(a.oferta.inicio) || a.nombre.localeCompare(b.nombre, 'es'));
// Con «Ocultarlos de toda la web»: sin ningún tipo con productos no hay catálogo (ni /catalogo/, ni la
// segunda fila del menú, ni su columna en el pie) y sin ofertas no hay Ofertas (ni sus páginas ni
// sus enlaces); con ofertas, solo se navega por los tipos y categorías que tienen alguna
const SIN_CATALOGO = OCULTAR_VACIAS && !categoriasPrincipales.length;
const SIN_OFERTAS = OCULTAR_VACIAS && !ofertas.length;
SITIO.sinCatalogo = SIN_CATALOGO;
SITIO.sinOfertas = SIN_OFERTAS;
// Sin catálogo tampoco hay nada que pedir: fuera la solicitud de presupuesto (página, botón y contador)
if (SIN_CATALOGO && SOLICITUD.activa) { SOLICITUD.activa = false; SITIO.solicitud = false; }
if (SIN_CATALOGO) console.log('Catálogo vacío y «Ocultarlos de toda la web»: no se publican /catalogo/, /ofertas/ ni /presupuesto/, ni la barra del catálogo ni «Mi solicitud».');
else if (SIN_OFERTAS) console.log('Sin ofertas y «Ocultarlos de toda la web»: no se publica /ofertas/ ni sus enlaces.');
// Y sin entradas, sin blog: ni /blog/ ni su RSS, ni «Blog» en el menú y el pie
const SIN_BLOG = OCULTAR_VACIAS && !noticias.length;
const esBlog = h => /^\/blog(\/|$)/.test(h || '');
if (SIN_BLOG) {
  SITIO.sinBlog = true;
  SITIO.menu = SITIO.menu.filter(m => !esBlog(m.enlace)).map(m => (m.hijos?.length ? { ...m, hijos: m.hijos.filter(h => !esBlog(h.enlace)) } : m));
  console.log('Sin entradas y «Ocultarlos de toda la web»: no se publica /blog/ ni su RSS, ni «Blog» en el menú y el pie.');
}
// Enlaces escritos en el panel a partes que no se publican: se quedan sin enlace
const enlaceVisible = h => !(SIN_CATALOGO && /^\/(catalogo|ofertas|productos|presupuesto)(\/|$)/.test(h || '')) && !(SIN_OFERTAS && /^\/ofertas(\/|$)/.test(h || '')) && !(SIN_BLOG && esBlog(h));

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

// Formatos de imagen que los navegadores habituales no muestran (p. ej. JPEG XL en Chrome y
// Firefox, HEIC de las fotos del iPhone): aviso para volver a subirlas en JPG, PNG, WebP o SVG
const FORMATOS_NO_WEB = /\.(jxl|heic|heif|tiff?|bmp|psd|raw)$/i;
for (const [ruta, donde] of [
  ...fabricantes.map(f => [f.imagen, `el fabricante «${f.nombre}»`]),
  ...categorias.map(c => [c.imagen, `la categoría «${c.titulo}»`]),
  ...productosTodos.flatMap(p => p.imagenes.map(i => [i.src, `el producto «${p.nombre}»`])),
  ...noticias.map(n => [n.imagen, `la entrada «${n.titulo}»`]),
  ...paginas.map(p => [p.imagen, `la página «${p.titulo}»`]),
]) {
  if (ruta && FORMATOS_NO_WEB.test(ruta)) console.warn(`Aviso: la imagen ${ruta} de ${donde} está en un formato que muchos navegadores no muestran; súbela en JPG, PNG, WebP o SVG.`);
}

// Fotos que pesan más de lo configurado (Ajustes del sitio → Compresión de imágenes): la web
// no cambia (se publican sus versiones WebP), pero hacen crecer el repositorio. Se reducen con
// «node scripts/comprimir-imagenes.js» (en la instalación real, una acción de GitHub; docs/PLAN.md)
{
  const limiteKb = Number(AJUSTES.imagenes?.peso_maximo_kb) || 400;
  const pesadas = [...new Set([...productosTodos.flatMap(p => p.imagenes.map(i => i.src)), ...noticias.map(n => n.imagen), ...paginas.map(p => p.imagen), ...categorias.map(c => c.imagen)])]
    .filter(r => r && r.startsWith('/img/'))
    .map(r => { try { return [r, fs.statSync(path.join(PUB, decodeURIComponent(r))).size]; } catch { return [r, 0]; } })
    .filter(([, b]) => b > limiteKb * 1024 * 1.1);
  if (pesadas.length) {
    const mb = pesadas.reduce((t, [, b]) => t + b, 0) / 1048576;
    nota(`${pesadas.length} foto(s) pesan más de ${limiteKb} KB (${mb.toFixed(1)} MB en total): no afecta a la web, pero conviene reducirlas con «node scripts/comprimir-imagenes.js». Por ejemplo: ${pesadas.slice(0, 3).map(([r]) => r).join(', ')}.`);
  }
}

// Menú «Catálogo» (lo usa scripts/layout.js)
// Los tres niveles: tipos de producto › categorías › subcategorías, en el orden de los Ajustes
// Cada uno con su número de productos (con los de lo que cuelga de él) y de ofertas; los tipos,
// además, con su descripción breve y su página de ofertas (para el panel de la barra del catálogo)
const nodoMenu = c => {
  const lista = enCategoria(c);
  return {
    texto: c.titulo, enlace: c.url, n: lista.length, nOfertas: lista.filter(p => p.enOferta).length,
    ...(c.padre ? {} : { resumen: c.meta.description || '', ofertas: urlOfertas(c) }),
    hijos: c.hijos.map(nodoMenu),
  };
};
SITIO.catalogo = categoriasPrincipales.map(nodoMenu);
SITIO.nOfertas = ofertas.length;
// Ajustes → «Número de productos en insignias»: con «no», la clase sin-insignias en <body> oculta
// (estilos.css) todas las insignias con números de productos u ofertas: barra y menús del catálogo,
// inicio, tarjetas de categoría, pie, buscador y sugerencias. Los contadores de los filtros no
SITIO.insignias = AJUSTES.insignias_productos !== false;
// Categoría de cada ficha, para que el menú se abra por la rama del producto que se está viendo
SITIO.categoriaDeRuta = Object.fromEntries(productos.filter(p => p.categoria).map(p => [p.url.replace(/\/+$/, ''), p.categoria.url]));

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
const optimizadas = new Map(); // ruta → { ancho, alto, fuentes: [{ url, w }], h, base }
// La versión WebP más grande y la más pequeña de una foto (o la original, si no se pudo optimizar).
// La web publica solo las versiones; el original no (ver «13b»)
const webpGrande = src => optimizadas.get(src)?.fuentes.at(-1)?.url || src;
const webpPequena = src => optimizadas.get(src)?.fuentes[0]?.url || src;

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
    optimizadas.set(ruta, { ancho: meta.width, alto: meta.height, fuentes, h, base });
  } catch (e) {
    console.warn(`Aviso: no se pudo optimizar ${ruta}: ${e.message}`);
  }
}

for (const ruta of usadas) await optimizar(ruta);
for (const x of [...noticias, ...paginas]) if (x.imagen) await optimizar(x.imagen);
for (const x of [...categorias, ...fabricantes]) if (x.imagen) await optimizar(x.imagen);
for (const p of productos) for (const i of p.imagenes) await optimizar(i.src);

// Para compartir en redes (og:image), en los datos para Google y en el RSS: un JPG de 1200 px de la
// foto principal de cada contenido (algunas redes no aceptan WebP). Uno por contenido, no por foto
const paraCompartir = new Map();
async function prepararCompartir(src) {
  const o = optimizadas.get(src);
  if (!sharp || !o || paraCompartir.has(src)) return;
  const w = Math.min(o.ancho, 1200);
  const url = `/img/opt/${o.base}-${w}.jpg`;
  const enCache = path.join(CACHE, `${o.h}-${w}.jpg`);
  try {
    if (fs.existsSync(enCache)) usosCache++;
    else {
      await sharp(path.join(DIST, decodeURIComponent(src))).rotate().resize({ width: w }).flatten({ background: '#ffffff' }).jpeg({ quality: 82 }).toFile(enCache);
      generadasNuevas++;
    }
    fs.copyFileSync(enCache, path.join(DIST, url));
    paraCompartir.set(src, url);
  } catch (e) {
    console.warn(`Aviso: no se pudo preparar ${src} para compartir: ${e.message}`);
  }
}
const compartible = src => (src && paraCompartir.get(src)) || src;
for (const x of [...noticias, ...paginas, ...categorias, ...fabricantes]) if (x.imagen) await prepararCompartir(x.imagen);
for (const p of productos) if (p.imagenes[0]) await prepararCompartir(p.imagenes[0].src);

const TAM_TARJETA = '(min-width: 992px) 33vw, (min-width: 768px) 50vw, 100vw';
const TAM_ARTICULO = '(min-width: 800px) 760px, 100vw';

// <picture> con WebP (la <img> también apunta a la versión WebP grande: el original no se publica)
function imgHtml(src, alt, { clase = '', tam = TAM_ARTICULO, diferida = true } = {}) {
  const o = optimizadas.get(src);
  const carga = diferida ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"';
  const img = `<img src="${esc(o ? o.fuentes.at(-1).url : src)}"${clase ? ` class="${clase}"` : ''} alt="${esc(alt)}"${o ? ` width="${o.ancho}" height="${o.alto}"` : ''}${carga}>`;
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
// Tarjeta de una entrada del blog: pespunte, foto con margen (la propia o la imagen automática
// con el título), fecha en «calendario» que asoma por arriba, píldoras con el tema (opcional) y el
// tiempo de lectura, título, resumen y, tras una línea, «Leer más →».
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const diaMes = fecha => {
  const [d, m] = fecha.toLocaleDateString('en-CA', { timeZone: ZONA, day: '2-digit', month: '2-digit' }).split('-').reverse();
  return { dia: String(parseInt(d, 10)), mes: MESES_CORTOS[parseInt(m, 10) - 1] };
};
const tarjetaNoticia = (n, { item = false, oculta = false } = {}) => {
  const dm = n.fecha ? diaMes(n.fecha) : null;
  return `
  <div class="col"${item ? ' role="listitem" data-item' : ''}${oculta ? ' hidden' : ''}>
    <article class="tarjeta-entrada h-100">
      ${dm ? `<time class="tarjeta-entrada-fecha" datetime="${n.fecha.toISOString()}"><b>${dm.dia}</b><span>${dm.mes}</span><span class="visually-hidden"> ${fechaLarga(n.fecha)}</span></time>` : ''}
      <div class="tarjeta-entrada-foto">
        ${n.imagen ? imgHtml(n.imagen, n.imagenAlt, { tam: TAM_TARJETA })
          : n.imagenAuto ? `<img src="${esc(n.imagenAuto)}" alt="" width="1200" height="630" loading="lazy" decoding="async">` : ''}
      </div>
      <div class="tarjeta-entrada-cuerpo">
        <div class="tarjeta-entrada-pildoras">
          ${n.tema ? `<span class="pildora pildora-tema">${esc(n.tema)}</span>` : ''}
          <span class="pildora"><i class="bi bi-clock" aria-hidden="true"></i> ${n.minutos} min de lectura</span>
        </div>
        <h3 class="tarjeta-entrada-titulo"><a class="stretched-link" href="${n.url}">${esc(n.titulo)}</a></h3>
        ${n.resumen ? `<p class="tarjeta-entrada-texto">${esc(n.resumen)}</p>` : ''}
        <span class="tarjeta-entrada-leer" aria-hidden="true">Leer más <i class="bi bi-arrow-right"></i></span>
      </div>
    </article>
  </div>`;
};

/* ---------- Catálogo: precio, tarjetas y rejillas de productos ---------- */
// useGrouping «always»: en español, Intl no separa los miles en números de 4 cifras (3813 €); así sale 3.813 €
const EUROS = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
// Sin céntimos cuando el precio es redondo (3.813 €); con ellos si no (19,95 €)
const EUROS_REDONDO = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const euros = v => (Math.abs(v - Math.round(v)) < 0.005 ? EUROS_REDONDO : EUROS).format(v).replace(/ /g, ' ');
const fechaCorta = dia => new Date(`${dia}T12:00:00Z`).toLocaleDateString('es-ES', { timeZone: ZONA, day: 'numeric', month: 'long' });
const fabricanteDe = p => p.fabricante?.nombre || p.fabricanteSlug || '';
const tituloProducto = p => [fabricanteDe(p), p.modelo].filter(Boolean).join(' ') || p.nombre;

// Ficha de un producto con dos precios: unidades (− / +) y una fila por versión (Completa y
// Cabezal) con su precio (y el de oferta) y su botón «Añadir» (public/js/presupuesto.js)
function fichaVersiones(p) {
  const filas = versionesProducto(p).map(v => {
    const precio = v.oferta != null && v.precio == null ? `<span class="precio precio-oferta">${euros(v.oferta)}</span>`
      : v.precio == null ? '<span class="precio precio-consultar">A consultar</span>'
      : v.oferta != null ? `<span class="precio precio-oferta">${euros(v.oferta)}</span> <del class="precio-anterior">${euros(v.precio)}</del> <span class="badge descuento">-${Math.round((1 - v.oferta / v.precio) * 100)} %</span>`
      : `<span class="precio">${euros(v.precio)}</span>`;
    return `<div class="ficha-version">
                <span class="ficha-version-nombre">${v.nombre}</span>
                <span class="ficha-version-precio">${precio}</span>
                ${SOLICITUD.activa ? `<button type="button" class="btn ${v.nombre === 'Completa' ? 'btn-destacado' : 'btn-outline-primary'} ficha-version-anadir" data-anadir-solicitud="${esc(v.id)}" data-version="${v.nombre}" hidden
                  aria-label="Añadir «${esc(p.nombre)}» (${v.nombre.toLowerCase()}) a la solicitud"><i class="bi bi-clipboard-plus" aria-hidden="true"></i><span>Añadir</span></button>` : ''}
              </div>`;
  }).join('');
  return `<div class="ficha-versiones">
              ${SOLICITUD.activa ? `<div class="ficha-versiones-unidades" data-pagefind-ignore="all" data-cantidad-ficha hidden>
                <span>Unidades</span>
                <div class="solicitud-cantidad ficha-cantidad" role="group" aria-label="Unidades">
                  <button type="button" class="solicitud-cantidad-boton" data-cantidad-menos aria-label="Una unidad menos" disabled>−</button>
                  <span class="solicitud-cantidad-num" data-cantidad-num aria-live="polite">1</span>
                  <button type="button" class="solicitud-cantidad-boton" data-cantidad-mas aria-label="Una unidad más">+</button>
                </div>
              </div>` : ''}
              ${filas}
              ${SOLICITUD.activa ? '<noscript><a class="btn btn-destacado" href="/paginas/contacto-y-horario/">Pedir información</a></noscript>' : ''}
            </div>`;
}

// Precio: normal, a consultar u oferta (precio anterior tachado y porcentaje). Con dos precios
// (máquinas industriales), el de la completa y debajo, más pequeño, «Cabezal: …».
function precioHtml(p, { ficha = false } = {}) {
  if (p.dosPrecios) {
    const completa = p.ofertaCompleta
      ? `<span class="precio precio-oferta">${euros(p.oferta.precio)}</span>` + (p.precio != null ? ` <del class="precio-anterior">${euros(p.precio)}</del> <span class="badge descuento">-${Math.round((1 - p.oferta.precio / p.precio) * 100)} %</span>` : '')
      : p.precio != null ? `<span class="precio">${euros(p.precio)}</span>` : '<span class="precio precio-consultar">Precio a consultar</span>';
    const cabezal = p.ofertaCabezal
      ? `<b class="precio-oferta">${euros(p.oferta.precioCabezal)}</b> <del class="precio-anterior">${euros(p.precioCabezal)}</del>`
      : `<b>${euros(p.precioCabezal)}</b>`;
    return `${completa}<span class="precio-cabezal">Cabezal: ${cabezal}</span>`;
  }
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
// Tarjeta de producto: pespunte (como las de categoría), foto con margen, logo del fabricante
// sobre la foto, nombre y modelo, y debajo de una línea el precio y el botón «+» para añadir a la
// solicitud de presupuesto (lo activa public/js/presupuesto.js; sin solicitud activa no sale).
const tarjetaProducto = (p, { oculta = false } = {}) => `
  <div class="col" data-producto data-fabricante="${esc(p.fabricanteSlug)}"${p.segundaMano ? ' data-segunda-mano' : ''}${p.enOferta ? ' data-oferta' : ''}
    data-precio="${precioEfectivo(p) ?? ''}" data-nombre="${esc(p.nombre)}" data-modelo="${esc(p.modelo || '')}" data-fecha="${p.fecha ? p.fecha.toISOString().slice(0, 10) : ''}"${oculta ? ' hidden' : ''}>
    <article class="card producto tarjeta-producto h-100">
      <div class="producto-foto">
        ${p.imagenes[0] ? imgHtml(p.imagenes[0].src, p.imagenes[0].alt || p.nombre, { clase: 'card-img-top', tam: TAM_PRODUCTO }) : '<div class="producto-sin-foto" aria-hidden="true"><i class="bi bi-image"></i></div>'}
        ${p.enOferta ? `<span class="badge etiqueta-oferta">Oferta${p.descuento ? ` -${p.descuento} %` : ''}</span>` : ''}
        ${p.segundaMano ? '<span class="badge etiqueta-segunda">Segunda mano</span>' : ''}
        ${fabricanteDe(p) ? `<span class="tarjeta-producto-marca">${p.fabricante?.imagen
          ? `<img src="${esc(p.fabricante.imagen)}" alt="${esc(fabricanteDe(p))}" loading="lazy" decoding="async">`
          : esc(fabricanteDe(p))}</span>` : ''}
      </div>
      <div class="card-body d-flex flex-column">
        <h3 class="card-title producto-nombre"><a class="stretched-link" href="${p.url}">${esc(p.nombre)}</a></h3>
        ${p.modelo ? `<p class="tarjeta-producto-modelo">Modelo ${esc(p.modelo)}</p>` : ''}
        <div class="tarjeta-producto-pie mt-auto">
          <p class="producto-precio mb-0">${precioHtml(p)}</p>
          ${SOLICITUD.activa ? `<button type="button" class="tarjeta-anadir" data-anadir-rapido="${esc(p.slug)}" hidden
            aria-label="Añadir «${esc(p.nombre)}»${p.dosPrecios ? ' (completa)' : ''} a la solicitud de presupuesto" title="Añadir${p.dosPrecios ? ' la completa' : ''} a la solicitud de presupuesto"><i class="bi bi-plus-lg" aria-hidden="true"></i></button>` : ''}
        </div>
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
// opcionalmente barajada en cada visita y con filtros en forma de botones que se marcan y
// desmarcan: uno por fabricante, con su logo (si hay más de uno; varios marcados = cualquiera
// de ellos) y «Segunda mano» (si hay productos nuevos y de segunda mano). Sin JavaScript se ven
// los N primeros (o todos, si no hay máximo) y el enlace «Ver todo».
// Versiones de un producto con dos precios: completa y cabezal (id en la solicitud, nombre, precio, oferta)
const versionesProducto = p => (p.dosPrecios ? [
  { id: p.slug, nombre: 'Completa', precio: p.precio, oferta: p.ofertaCompleta ? p.oferta.precio : null },
  { id: `${p.slug}~cabezal`, nombre: 'Cabezal', precio: p.precioCabezal, oferta: p.ofertaCabezal ? p.oferta.precioCabezal : null },
] : []);
// Precio que se paga (el de oferta, si la hay); null = «Precio a consultar»
const precioEfectivo = p => (p.dosPrecios ? (p.ofertaCompleta ? p.oferta.precio : p.precio) : (p.enOferta ? p.oferta.precio : p.precio)) ?? null;
// Redondeo «bonito» para los rangos rápidos de precio
const redondoBonito = v => { const paso = v < 20 ? 5 : v < 100 ? 10 : v < 500 ? 50 : v < 2000 ? 100 : 500; return Math.round(v / paso) * paso; };
const eurosEnteros = v => `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' }).format(v)} €`;

// Listas largas (más de TARJETAS_EN_HTML productos: portada, /catalogo/, buscador, ofertas o una
// categoría grande): en el HTML solo van las tarjetas de la primera página; el resto las añade
// public/js/catalogo.js desde /catalogo/tarjetas-<huella>.json (un fichero con la tarjeta de cada
// producto, compartido por todas las páginas y guardado por el navegador). Así la portada pesa lo
// mismo con 50 productos que con 900. Sin JavaScript se ve igual la primera página.
const TARJETAS_EN_HTML = 48;
let tarjetasJson = null;
function datosTarjetas() {
  if (tarjetasJson) return tarjetasJson;
  const html = productos.map(p => tarjetaProducto(p).replace('<div class="col" data-producto', '<div class="col" role="listitem" data-producto').trim().replace(/\n\s+/g, '\n'));
  const texto = JSON.stringify(html);
  const url = `/catalogo/tarjetas-${huella(texto).slice(0, 10)}.json`;
  escribir(path.join(DIST, url), texto);
  return (tarjetasJson = { url, indice: new Map(productos.map((p, i) => [p.url, i])) });
}

function rejillaProductos(lista, { porPagina = 8, aleatorio = false, filtro = false, maxSinJs = 0, etiqueta = 'Productos' } = {}) {
  const orden = aleatorio ? barajarDelDia(lista) : lista;
  const T = orden.length > TARJETAS_EN_HTML ? datosTarjetas() : null;
  const enHtml = [], resto = [];
  orden.forEach((p, i) => (T && i >= porPagina && T.indice.has(p.url) ? resto.push(T.indice.get(p.url)) : enHtml.push(p)));
  const fabs = [...new Map(orden.filter(p => p.fabricante).map(p => [p.fabricanteSlug, p.fabricante])).values()]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const id = `rejilla-${huella(etiqueta, String(lista.length), String(porPagina)).slice(0, 6)}`;
  const conFabricante = filtro && fabs.length > 1;
  const conSegunda = filtro && lista.some(p => p.segundaMano) && lista.some(p => !p.segundaMano);
  const conOferta = filtro && lista.some(p => p.enOferta) && lista.some(p => !p.enOferta);
  const nOfertas = lista.filter(p => p.enOferta).length;
  // Precio: deslizador entre el mínimo y el máximo de esta lista y rangos rápidos por cuartiles
  const precios = lista.map(precioEfectivo).filter(v => v != null).sort((a, b) => a - b);
  const conPrecio = filtro && new Set(precios).size > 1;
  const hayConsultar = lista.some(p => precioEfectivo(p) == null);
  // Paso del deslizador «bonito» (1, 5, 10, 50…) y extremos alineados a él (p. ej. 0–900 €, no 4–890 €)
  const pasoPrecio = conPrecio ? Math.max(1, redondoBonito((precios.at(-1) - precios[0]) / 100) || 1) : 1;
  const pMin = conPrecio ? Math.floor(precios[0] / pasoPrecio) * pasoPrecio : 0;
  const pMax = conPrecio ? Math.ceil(precios.at(-1) / pasoPrecio) * pasoPrecio : 0;
  const cortes = conPrecio ? [...new Set([.25, .5, .75].map(f => redondoBonito(precios[Math.floor(f * (precios.length - 1))])))]
    .filter(v => v > pMin && v < pMax).sort((a, b) => a - b) : [];
  const rangos = cortes.length ? [[null, cortes[0]], ...cortes.slice(1).map((v, i) => [cortes[i], v]), [cortes.at(-1), null]] : [];
  const textoRango = ([a, b]) => (a == null ? `Hasta ${eurosEnteros(b)}` : b == null ? `Más de ${eurosEnteros(a)}` : `${new Intl.NumberFormat('es-ES', { useGrouping: 'always' }).format(a)}–${eurosEnteros(b)}`);
  // Ordenar
  const conOrden = filtro && lista.length > 1;
  const opcionesOrden = [
    ['', 'Recomendados'],
    ...(conPrecio ? [['precio-asc', 'Precio: de menor a mayor', 'Precio ↑'], ['precio-desc', 'Precio: de mayor a menor', 'Precio ↓']] : []),
    ['nombre', 'Nombre (A–Z)', 'Nombre'],
    ...(lista.some(p => p.modelo) ? [['modelo', 'Modelo (A–Z)', 'Modelo']] : []),
    ...(new Set(lista.map(p => p.fecha?.getTime()).filter(Boolean)).size > 1 ? [['novedades', 'Novedades']] : []),
  ];
  const conBarra = conFabricante || conSegunda || conOferta || conPrecio || conOrden;
  return `
    <div class="rejilla" data-rejilla data-por-pagina="${porPagina}" data-unidad="producto|productos"${aleatorio ? ' data-aleatorio' : ''}${resto.length ? ` data-tarjetas="${T.url}" data-tarjetas-resto="${resto.join(',')}"` : ''} id="${id}">
      ${conBarra ? `<div class="filtros-barra mb-3" data-rejilla-filtro hidden>
        <div class="filtros-fila">
          <div class="filtros-grupo" role="group" aria-label="Filtros">
            <span class="filtros-titulo"><i class="bi bi-funnel" aria-hidden="true"></i> Filtrar</span>
            ${conFabricante ? `<button type="button" class="filtros-boton" aria-expanded="false" aria-controls="${id}-fabricantes" data-filtro-abrir>Fabricante <span class="filtros-num">(${fabs.length})</span> <i class="bi bi-chevron-down" aria-hidden="true"></i></button>` : ''}
            ${conPrecio ? `<button type="button" class="filtros-boton" aria-expanded="false" aria-controls="${id}-precio" data-boton-precio>Precio <i class="bi bi-chevron-down" aria-hidden="true"></i></button>` : ''}
            ${conSegunda ? '<button type="button" class="filtros-boton" aria-pressed="false" data-filtro-segunda>Segunda mano</button>' : ''}
            ${conOferta ? `<button type="button" class="filtros-boton filtros-oferta" aria-pressed="false" data-filtro-oferta><i class="bi bi-tag-fill" aria-hidden="true"></i> En oferta <span class="filtros-num">(${nOfertas})</span></button>` : ''}
          </div>
          <span class="filtros-total" data-filtro-total aria-live="polite"></span>
          ${conOrden ? `<div class="filtros-orden">
            <button type="button" class="filtros-boton" aria-haspopup="true" aria-expanded="false" aria-controls="${id}-orden"><i class="bi bi-sort-down" aria-hidden="true"></i> Ordenar: <span class="filtros-orden-actual" data-orden-actual>Recomendados</span> <i class="bi bi-chevron-down" aria-hidden="true"></i></button>
            <ul class="filtros-orden-menu" id="${id}-orden" role="menu" aria-label="Ordenar por" hidden>
              ${opcionesOrden.map(([v, t, corto], i) => `<li role="none"><button type="button" role="menuitemradio" aria-checked="${i === 0}" data-orden="${v}"${corto ? ` data-corto="${esc(corto)}"` : ''}>${esc(t)}<i class="bi bi-check-lg" aria-hidden="true"></i></button></li>`).join('')}
            </ul>
          </div>` : ''}
        </div>
        <div class="filtros-estado" data-filtro-estado hidden>
          <span class="filtros-elegidos" data-filtro-elegidos></span>
          <button type="button" class="btn btn-link btn-sm px-1" data-filtro-quitar hidden>Quitar filtros</button>
        </div>
        ${conFabricante ? `<div class="filtros-panel" id="${id}-fabricantes" role="group" aria-label="Fabricantes" hidden>
          ${fabs.map(f => `<button type="button" class="btn btn-filtro" aria-pressed="false" data-filtro-fabricante="${esc(f.slug)}" data-nombre="${esc(f.nombre)}" title="${esc(f.nombre)}">${f.imagen
            ? `<img src="${esc(f.imagen)}" alt="${esc(f.nombre)}" loading="lazy" decoding="async">`
            : esc(f.nombre)}</button>`).join('')}
        </div>` : ''}
        ${conPrecio ? `<div class="filtros-panel filtros-panel-precio" id="${id}-precio" role="group" aria-label="Precio" data-panel-precio data-alinear data-precio-min="${pMin}" data-precio-max="${pMax}" hidden>
          <div class="precio-deslizador">
            <p class="precio-etiqueta">Precio</p>
            <div class="precio-rango">
              <div class="precio-rango-riel"></div><div class="precio-rango-tramo" data-precio-tramo></div>
              <input type="range" min="${pMin}" max="${pMax}" step="${pasoPrecio}" value="${pMin}" aria-label="Precio mínimo" data-precio-lo>
              <input type="range" min="${pMin}" max="${pMax}" step="${pasoPrecio}" value="${pMax}" aria-label="Precio máximo" data-precio-hi>
            </div>
            <div class="precio-valores"><span data-precio-lo-txt>${eurosEnteros(pMin)}</span><span data-precio-hi-txt>${eurosEnteros(pMax)}</span></div>
          </div>
          <div class="precio-campos">
            <div class="precio-desde-hasta">
              <label>Desde<span class="precio-input"><input type="number" inputmode="decimal" min="0" placeholder="${pMin}" data-precio-desde> €</span></label>
              <span aria-hidden="true">—</span>
              <label>Hasta<span class="precio-input"><input type="number" inputmode="decimal" min="0" placeholder="${pMax}" data-precio-hasta> €</span></label>
            </div>
            ${rangos.length ? `<div class="precio-rapidos">${rangos.map(r => `<button type="button" class="precio-rapido" aria-pressed="false" data-desde="${r[0] ?? ''}" data-hasta="${r[1] ?? ''}">${textoRango(r)}</button>`).join('')}</div>` : ''}
          </div>
          ${hayConsultar ? '<label class="precio-consultar"><input type="checkbox" checked data-precio-consultar> Incluir «Precio a consultar»</label>' : ''}
          <div class="precio-acciones">
            <button type="button" class="btn btn-link btn-sm px-0" data-precio-borrar>Borrar</button>
            <button type="button" class="btn btn-destacado btn-sm" data-precio-aplicar>Aplicar</button>
          </div>
        </div>` : ''}
      </div>` : ''}
      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3" data-rejilla-items aria-label="${esc(etiqueta)}" role="list">
        ${enHtml.map((p, i) => tarjetaProducto(p, { oculta: maxSinJs && i >= maxSinJs })).join('').replace(/<div class="col" data-producto/g, '<div class="col" role="listitem" data-producto')}
      </div>
      <p class="text-body-secondary mt-3 mb-0" data-rejilla-vacio hidden>No hay productos con estos filtros.</p>
      <nav class="mt-4" aria-label="Páginas de ${esc(etiqueta.toLowerCase())}" data-rejilla-nav hidden></nav>
    </div>`;
}

// Rejilla de entradas del blog paginada en el navegador (public/js/catalogo.js), de la más reciente
// a la más antigua. Sin JavaScript se ven las N primeras.
// Igual que con los productos: con muchas entradas, el resto llegan de /blog/entradas-<huella>.json
let entradasJson = null;
function datosEntradas() {
  if (entradasJson) return entradasJson;
  const texto = JSON.stringify(noticias.map(n => tarjetaNoticia(n, { item: true }).trim().replace(/\n\s+/g, '\n')));
  const url = `/blog/entradas-${huella(texto).slice(0, 10)}.json`;
  escribir(path.join(DIST, url), texto);
  return (entradasJson = { url, indice: new Map(noticias.map((n, i) => [n.url, i])) });
}
function rejillaNoticias(lista, { porPagina = 3, etiqueta = 'Entradas del blog' } = {}) {
  const id = `rejilla-${huella(etiqueta, String(lista.length), String(porPagina)).slice(0, 6)}`;
  const T = lista.length > TARJETAS_EN_HTML ? datosEntradas() : null;
  const enHtml = [], resto = [];
  lista.forEach((n, i) => (T && i >= porPagina && T.indice.has(n.url) ? resto.push(T.indice.get(n.url)) : enHtml.push(n)));
  return `
    <div class="rejilla" data-rejilla data-por-pagina="${porPagina}" data-unidad="entrada|entradas"${resto.length ? ` data-tarjetas="${T.url}" data-tarjetas-resto="${resto.join(',')}"` : ''} id="${id}">
      <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4" data-rejilla-items aria-label="${esc(etiqueta)}" role="list">
        ${enHtml.map((n, i) => tarjetaNoticia(n, { item: true, oculta: i >= porPagina })).join('')}
      </div>
      <nav class="mt-4" aria-label="Páginas de ${esc(etiqueta.toLowerCase())}" data-rejilla-nav hidden></nav>
    </div>`;
}

// Bloques de lista con la misma cabecera y estilos que los de la portada (public/index.html):
// antetítulo, título y enlace «Ver …»; las ofertas, en una franja de fondo gris a todo el ancho.
// Se usan en /catalogo/, /ofertas/ y las categorías (páginas con «secciones», ver
// paginaDesdePlantilla).
const TEXTOS_BLOQUE = {
  productos: { antetitulo: 'Catálogo', titulo: 'Nuestros productos', enlace: '/catalogo/', textoEnlace: 'Ver todo el catálogo' },
  ofertas: { antetitulo: 'Ofertas', titulo: 'Productos en oferta', enlace: '/ofertas/', textoEnlace: 'Ver todas las ofertas', fondo: true },
  blog: { antetitulo: 'Blog', titulo: 'Últimas entradas del blog', enlace: '/blog/', textoEnlace: 'Ver todo el blog' },
};
// Número de productos junto al título del bloque («13 productos»)
const conteoProductos = n => `<span class="conteo-bloque">${n} ${n === 1 ? 'producto' : 'productos'}</span>`;
// En las páginas del catálogo y de ofertas, el título va sin antetítulo y con un pespunte del
// color de la marca de lado a lado; el número solo sale junto al título si no hay barra de
// filtros (si la hay, el número está en la barra y cambia al filtrar).
function seccionBloque(tipo, { id, contenido, sinEnlace = false, conteo = null, enlace = null, textoEnlace = null, titulo = null }) {
  const t = { ...TEXTOS_BLOQUE[tipo], ...(enlace ? { enlace, textoEnlace } : {}), ...(titulo ? { titulo } : {}) };
  const verConteo = conteo != null && !contenido.includes('data-rejilla-filtro');
  const dentro = `
      <div class="titulo-bloque">
        <h2 id="${id}-titulo">${esc(t.titulo)}${verConteo ? ` ${conteoProductos(conteo)}` : ''}</h2>
        ${sinEnlace ? '' : `<a href="${t.enlace}" class="fw-bold enlace-flecha">${esc(t.textoEnlace)}</a>`}
      </div>
      ${contenido}`;
  return t.fondo
    ? `
    <section class="bg-body-tertiary" id="${id}" aria-labelledby="${id}-titulo" data-pagefind-ignore="all">
      <div class="container seccion">${dentro}
      </div>
    </section>`
    : `
    <section class="container seccion" id="${id}" aria-labelledby="${id}-titulo" data-pagefind-ignore="all">${dentro}
    </section>`;
}
// Introducción de las páginas del catálogo y de ofertas: el «Texto» del panel en un recuadro
// blanco con doble pespunte del color de la marca y unas tijeras en la esquina, con la primera
// frase destacada (hasta los primeros dos puntos o el primer punto; si el texto ya empieza en
// negrita, se respeta) y una nota al pie («Precios orientativos…»)
const introPagina = (texto, ruta, nota = '') => {
  let html = String(texto || '').trim() ? md(texto, ruta) : '';
  if (!html && !nota) return '';
  html = html.replace(/^(\s*<p>)([^<]{8,}?[:.])(?=\s|<)/, '$1<strong class="intro-destacado">$2</strong>');
  return `
    <div class="intro-pagina mt-5">
      <i class="bi bi-scissors intro-tijeras" aria-hidden="true"></i>
      ${html ? `<div class="intro-pagina-texto">${html}</div>` : ''}
      ${nota ? `<p class="intro-pagina-nota"><i class="bi bi-info-circle" aria-hidden="true"></i> ${esc(nota)}</p>` : ''}
    </div>`;
};
// Cabecera de una página con secciones (migas, título, entradilla…), en su contenedor
const cabeceraPagina = html => `
    <div class="container seccion pb-0 cabecera-pagina">${html}
    </div>`;

// Tarjeta de un tipo, categoría o subcategoría, con pespunte (a juego con la introducción), el
// número de productos u ofertas en una insignia y «Ver productos →» / «Ver ofertas →». En las
// páginas de ofertas lleva a sus ofertas (url).
const tarjetaCategoria = (c, { url = c.url, n = null, que = 'productos' } = {}) => {
  const unidad = que === 'ofertas' ? ['oferta', 'ofertas'] : ['producto', 'productos'];
  const textoN = n == null ? '' : n ? `${n} ${unidad[n === 1 ? 0 : 1]}` : `Sin ${unidad[1]} ahora mismo`;
  return `
  <div class="col">
    <article class="tarjeta-categoria h-100">
      ${n != null ? `<span class="tarjeta-categoria-n${n ? '' : ' vacia'}" aria-hidden="true">${n}</span>` : ''}
      ${c.imagen ? imgHtml(c.imagen, c.imagenAlt, { clase: 'tarjeta-categoria-img', tam: TAM_TARJETA }) : ''}
      <h3 class="tarjeta-categoria-titulo"><a class="stretched-link" href="${url}">${esc(c.titulo)}${textoN ? `<span class="visually-hidden"> (${esc(textoN)})</span>` : ''}</a></h3>
      ${c.resumen ? `<p class="tarjeta-categoria-texto">${esc(c.resumen)}</p>` : ''}
      <span class="tarjeta-categoria-ver" aria-hidden="true">Ver ${unidad[1]} <i class="bi bi-arrow-right"></i></span>
    </article>
  </div>`;
};

// Migas: Inicio (casita) › Catálogo › Categoría › … › página actual. En el ordenador, el recorrido
// en una línea con «›» (las largas se recortan con «…» y el nombre entero sale al pasar el ratón);
// en el móvil, solo un botón «← <página anterior>» (estilos.css, «Migas de pan»)
function migas(trozos) {
  const lista = [{ texto: 'Inicio', url: '/', casa: true }, ...trozos];
  const ultimaActual = !lista.at(-1).enlazar;
  const anterior = (ultimaActual ? lista.slice(0, -1) : lista).at(-1);
  const contenido = t => (t.casa ? '<i class="bi bi-house-door-fill migas-casa" aria-hidden="true"></i><span class="visually-hidden">Inicio</span>'
    : `<span class="migas-t">${esc(t.texto)}</span>`);
  return `
    <nav aria-label="Estás en" class="migas mb-3" data-pagefind-ignore="all">
      <a class="migas-volver" href="${anterior.url}"><i class="bi bi-arrow-left" aria-hidden="true"></i><span><span class="visually-hidden">Volver a </span>${esc(anterior.texto)}</span></a>
      <ol class="breadcrumb mb-0">
        ${lista.map((t, i) => (i === lista.length - 1 && ultimaActual
          ? `<li class="breadcrumb-item active" aria-current="page" title="${esc(t.texto)}">${contenido(t)}</li>`
          : `<li class="breadcrumb-item"><a href="${t.url}"${t.casa ? '' : ` title="${esc(t.texto)}"`}>${contenido(t)}</a></li>`)).join('')}
      </ol>
    </nav>`;
}
const migasDe = c => [{ texto: 'Catálogo', url: '/catalogo/' }, ...[...c.ancestros, c].map(x => ({ texto: x.titulo, url: x.url }))];

const vacio = texto => `<p class="text-body-secondary w-100" data-vacio>${texto}</p>`;

const listaNoticias = lista => lista.length ? lista.map(tarjetaNoticia).join('') : vacio('Todavía no hay entradas en el blog.');
// Paginación: /blog/, /blog/pagina/2/, ...
const rutaPagina = (base, n) => (n === 1 ? base : `${base}pagina/${n}/`);
const trocear = (lista, porPagina) => {
  const paginas = [];
  for (let i = 0; i < lista.length; i += porPagina) paginas.push(lista.slice(i, i + porPagina));
  return paginas.length ? paginas : [[]];
};
// Paginación con enlaces (una página por URL), con el mismo aspecto que la de las rejillas del
// catálogo (public/js/catalogo.js): «Mostrando 1–12 de 40 entradas» y números en círculos
function navPaginacion(base, actual, total, { desde = 0, hasta = 0, de = 0, unidad = ['entrada', 'entradas'] } = {}) {
  if (total <= 1) return '';
  const ver = new Set([1, total, actual - 1, actual, actual + 1].filter(x => x >= 1 && x <= total));
  if (actual <= 3) [2, 3, 4].forEach(x => x <= total && ver.add(x));
  if (actual >= total - 2) [total - 1, total - 2, total - 3].forEach(x => x >= 1 && ver.add(x));
  [...ver].forEach(x => { if (ver.has(x + 2) && !ver.has(x + 1)) ver.add(x + 1); });
  const nums = [...ver].sort((a, b) => a - b);
  const items = [];
  nums.forEach((x, i) => {
    if (i && x - nums[i - 1] > 1) items.push('<li class="paginacion-puntos" aria-hidden="true">…</li>');
    items.push(x === actual
      ? `<li><span class="paginacion-num actual" aria-current="page">${x}</span></li>`
      : `<li><a class="paginacion-num" href="${rutaPagina(base, x)}" aria-label="Página ${x}">${x}</a></li>`);
  });
  const flecha = (n, icono, etiqueta, rel) => (n < 1 || n > total
    ? `<li><span class="paginacion-num flecha desactivada" aria-hidden="true"><i class="bi ${icono}"></i></span></li>`
    : `<li><a class="paginacion-num flecha" href="${rutaPagina(base, n)}" rel="${rel}" aria-label="${etiqueta}"><i class="bi ${icono}" aria-hidden="true"></i></a></li>`);
  return `
    <nav class="mt-5" aria-label="Páginas" data-pagefind-ignore="all">
      <div class="paginacion">
        ${de ? `<p class="paginacion-info">Mostrando <b>${desde}–${hasta}</b> de ${de} ${unidad[de === 1 ? 0 : 1]}</p>` : ''}
        <ul class="paginacion-nums">${flecha(actual - 1, 'bi-chevron-left', 'Página anterior', 'prev')}${items.join('')}${flecha(actual + 1, 'bi-chevron-right', 'Página siguiente', 'next')}</ul>
      </div>
    </nav>`;
}

// Bloque «Más del blog» al final de cada entrada
// Logos de «Marcas con las que trabajamos»: columnas según cuántos hay, para que la última fila
// quede lo más llena posible (17 logos: 6 + 6 + 5 en el ordenador y 3 por fila en el móvil)
function columnasEquilibradas(n, min, max) {
  let mejor = Math.min(max, Math.max(n, 1)), hueco = Infinity;
  for (let c = Math.min(max, n); c >= Math.min(min, n); c--) {
    const h = n % c ? c - (n % c) : 0;
    if (h < hueco) { hueco = h; mejor = c; }
  }
  return mejor;
}
const columnasMarcas = n => `--cols-pc: ${columnasEquilibradas(n, 5, 8)}; --cols-tab: ${columnasEquilibradas(n, 4, 6)}; --cols-mov: ${columnasEquilibradas(n, 3, 4)}`;

// Primero las del mismo tema (las más recientes) y, si faltan, las últimas del blog
function bloqueRelacionado(item) {
  const mismoTema = item.tema ? noticias.filter(x => x !== item && x.temaSlug === item.temaSlug) : [];
  const nots = [...mismoTema, ...noticias.filter(x => x !== item && !mismoTema.includes(x))].slice(0, 3);
  if (!nots.length) return '';
  const titulo = item.tema && mismoTema.length >= nots.length ? `Más sobre ${item.tema}` : 'Más del blog';
  return `
    <section class="mt-5" aria-labelledby="relacionado-titulo" data-pagefind-ignore="all">
      <h2 class="h4 fw-bold mb-4" id="relacionado-titulo">${esc(titulo)}</h2>
      <div class="row row-cols-1 row-cols-md-3 g-4">${nots.map(tarjetaNoticia).join('')}</div>
    </section>`;
}

function botonesCompartir(titulo, ruta, { clase = '' } = {}) {
  // Botones redondos solo con el icono: WhatsApp, Facebook, Telegram, X, copiar el enlace y, en el
  // móvil, el menú de compartir del sistema (public/js/extras.js)
  const url = abs(ruta);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(titulo);
  const boton = (href, icono, texto) =>
    `<a class="compartir-icono" href="${href}" target="_blank" rel="noopener noreferrer" title="Compartir por ${texto}" aria-label="Compartir por ${texto}"><i class="bi ${icono}" aria-hidden="true"></i></a>`;
  return `
    <div class="compartir compartir-iconos${clase ? ' ' + clase : ''}" data-pagefind-ignore="all" data-url="${esc(url)}" data-titulo="${esc(titulo)}">
      <span>Compartir</span>
      ${boton(`https://wa.me/?text=${t}%20${u}`, 'bi-whatsapp', 'WhatsApp')}
      ${boton(`https://www.facebook.com/sharer/sharer.php?u=${u}`, 'bi-facebook', 'Facebook')}
      ${boton(`https://t.me/share/url?url=${u}&text=${t}`, 'bi-telegram', 'Telegram')}
      ${boton(`https://twitter.com/intent/tweet?url=${u}&text=${t}`, 'bi-twitter-x', 'X')}
      <button type="button" class="compartir-icono" data-copiar title="Copiar el enlace" aria-label="Copiar el enlace"><i class="bi bi-link-45deg" aria-hidden="true"></i></button>
      <button type="button" class="compartir-icono d-none" data-compartir-nativo title="Más opciones" aria-label="Más opciones para compartir"><i class="bi bi-share" aria-hidden="true"></i></button>
    </div>`;
}

/* =========================================================
   6. <head>: SEO, redes, iconos y estilos
   ========================================================= */
const FEEDS = SIN_BLOG ? [] : [
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

// Barra del catálogo con color personalizado (Ajustes → Menú superior: diseño → Barra del catálogo):
// texto blanco u oscuro, el que mejor se lea sobre el color elegido
const cfgBarra = (AJUSTES.navbar || {}).barra_catalogo || {};
if (cfgBarra.color === 'personalizado') {
  const rgb = hexARgb(cfgBarra.color_personalizado);
  if (!rgb) console.warn('Aviso: la barra del catálogo tiene «Color personalizado» pero no hay un color elegido; se usa el gris.');
  else {
    const oscura = contraste(rgb, [255, 255, 255]) >= contraste(rgb, [31, 41, 51]);
    const r = contraste(rgb, oscura ? [255, 255, 255] : [31, 41, 51]);
    if (r < 4.5) console.warn(`Aviso: el color de la barra del catálogo ${aHex(rgb)} tiene poco contraste con su texto (${r.toFixed(1)}:1). Elige un tono más claro o más oscuro.`);
    cssPersonal += `\n/* Barra del catálogo: color personalizado (${r.toFixed(1)}:1) */\n.barra-catalogo.barra-personalizado { --barra-fondo: ${aHex(rgb)}; ${oscura
      ? '--barra-texto: #fff; --barra-pespunte: rgba(255, 255, 255, .4); --barra-insignia-fondo: #fff; --barra-insignia-texto: var(--bs-primary); --barra-vacia-fondo: rgba(255, 255, 255, .25); --barra-vacia-texto: #fff; --barra-activo-fondo: #fff; --barra-activo-texto: var(--bs-primary);'
      : '--barra-texto: #1f2933; --barra-activo-fondo: rgba(255, 255, 255, .85);'} }\n`;
  }
}

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
  "frame-src https://www.google.com",              // el mapa de Contacto (solo se carga si se pulsa «Ver el mapa»)
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
  const img = abs(compartible(imagen) || imagenAuto || SITIO.imagenCompartir);
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
  if (!SITIO.insignias) body.classList.add('sin-insignias');
  // Rejillas de productos (paginación, orden al azar y filtro por fabricante)
  if (raiz.querySelector('[data-rejilla]')) body.insertAdjacentHTML('beforeend', '  <script src="/js/catalogo.js" defer></script>\n');
  // Solicitud de presupuesto: contador del menú, botón de las fichas y página /presupuesto/
  if (SOLICITUD.activa) body.insertAdjacentHTML('beforeend', '  <script src="/js/presupuesto.js" defer></script>\n');

  return raiz.toString().replace(/\n[ \t]*\n(?=[ \t]*\n)/g, '\n');
}

const plantilla = fs.readFileSync('plantillas/articulo.html', 'utf8');
function paginaDesdePlantilla(contenidoHtml, { buscable = true, ancho = false, secciones = false } = {}) {
  const raiz = leerHtml(plantilla, { comment: true });
  const main = raiz.querySelector('#contenido');
  main.set_content(contenidoHtml);
  // Catálogo: a todo el ancho del contenedor (la clase «articulo» limita el ancho de lectura)
  if (ancho) main.classList.remove('articulo');
  // Con secciones (como la portada): cada parte trae su contenedor y las franjas van a todo el ancho
  if (secciones) ['container', 'seccion', 'articulo'].forEach(k => main.classList.remove(k));
  if (buscable) main.setAttribute('data-pagefind-body', '');
  return raiz.toString();
}
// Datos para el buscador: tipo de contenido como filtro
const metaBuscador = x => `<span hidden data-pagefind-filter="tipo">${esc(x.tipo)}</span>`
  + (x.imagen ? `<span hidden data-pagefind-meta="image:${esc(webpPequena(x.imagen))}"></span>` : '')
  + (x.fecha ? `<span hidden data-pagefind-meta="fecha:${esc(fechaLarga(x.fecha))}"></span>` : '');
// Tipos, categorías y subcategorías en el buscador: de qué cuelgan y cuántos productos tienen
const metaBuscadorCategoria = c => `<span hidden data-pagefind-filter="tipo">Categoría</span>`
  + `<span hidden data-pagefind-meta="productos:${enCategoria(c).length}"></span>`
  + (c.ancestros?.length ? `<span hidden data-pagefind-meta="ruta:${esc(c.ancestros.map(a => a.titulo).join(' › '))}"></span>` : '');

const sitemap = []; // { ruta, fecha }

// Imágenes automáticas para lo que no tiene imagen propia
for (const n of noticias) if (!n.imagen) n.imagenAuto = await imagenAutomatica(n, 'Blog');
for (const p of paginas) if (!p.imagen && !p.noindex) p.imagenAuto = await imagenAutomatica(p, SITIO.localidad || SITIO.nombre);
const imagenDe = x => compartible(x.imagen) || x.imagenAuto || SITIO.imagenCompartir;

/* =========================================================
   7. Entradas del blog
      Migas (Inicio › Blog › Tema › entrada), píldoras de tema (enlace a su página), fecha y
      minutos, título, entradilla (el «Resumen» del panel), compartir arriba y abajo, foto con
      pespunte, recuadro final hacia el catálogo (ctaEntrada) y «Más sobre <tema>» / «Más del blog»
   ========================================================= */
const cfgBlog = AJUSTES.pagina_blog || {};
for (const n of noticias) n.temaSlug = n.tema ? slugify(n.tema) : '';
const urlTema = slug => `/blog/tema/${slug}/`;
// Temas con su número de entradas (el nombre, como se escribió en la entrada más reciente)
const temasBlog = [...noticias.reduce((m, n) => {
  if (n.temaSlug) m.set(n.temaSlug, { slug: n.temaSlug, nombre: m.get(n.temaSlug)?.nombre || n.tema, n: (m.get(n.temaSlug)?.n || 0) + 1 });
  return m;
}, new Map()).values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

// Recuadro al final de la entrada (Decap → Blog → «Recuadro final»): lleva a una categoría del
// catálogo (o al catálogo) y a WhatsApp (o a llamar). Sin nada elegido, un texto general
function ctaEntrada(n) {
  const cta = n.meta.cta || {};
  if (cta.mostrar === false) return '';
  const cat = !SIN_CATALOGO && cta.categoria ? categorias.find(c => c.slug === cta.categoria) : null;
  const destino = cat ? { url: cat.url, texto: cta.boton || `Ver ${cat.titulo.toLowerCase()}` }
    : !SIN_CATALOGO ? { url: '/catalogo/', texto: cta.boton || 'Ver el catálogo' } : null;
  const wa = String(SITIO.redes?.whatsapp || '').replace(/\D/g, '');
  const tel = String(SITIO.redes?.telefono || '').replace(/[^\d+]/g, '');
  if (!destino && !wa && !tel) return '';
  const texto = String(cta.texto || '').trim() || (cat
    ? `¿Buscas ${cat.titulo.toLowerCase()}? Mira lo que tenemos o pregúntanos cuál te conviene.`
    : destino ? '¿Buscas máquina o accesorios? Mira el catálogo o pregúntanos: te asesoramos sin compromiso.'
      : '¿Tienes dudas? Pregúntanos: te asesoramos sin compromiso.');
  return `
    <aside class="intro-pagina entrada-cta" data-pagefind-ignore="all">
      <i class="bi bi-scissors intro-tijeras" aria-hidden="true"></i>
      <div class="intro-pagina-texto">
        <p>${esc(texto).replace(/^([^?.!:]{4,}[?.!:])/, '<strong class="intro-destacado">$1</strong>')}</p>
        <p class="entrada-cta-botones">
          ${destino ? `<a class="btn btn-destacado" href="${destino.url}">${esc(destino.texto)} <i class="bi bi-arrow-right" aria-hidden="true"></i></a>` : ''}
          ${wa ? `<a class="btn btn-outline-primary" href="https://wa.me/${wa}?text=${encodeURIComponent(`Hola, he leído «${n.titulo}» en vuestro blog y quería preguntar…`)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-whatsapp" aria-hidden="true"></i> Preguntar por WhatsApp</a>`
            : tel ? `<a class="btn btn-outline-primary" href="tel:${esc(tel)}"><i class="bi bi-telephone" aria-hidden="true"></i> Llamar</a>` : ''}
        </p>
      </div>
    </aside>`;
}

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
  const trozosMigas = [{ texto: 'Blog', url: '/blog/' }, ...(n.tema ? [{ texto: n.tema, url: urlTema(n.temaSlug) }] : []), { texto: n.titulo }];
  const cuerpo = `
    <article class="entrada">
      ${migas(trozosMigas)}
      <div class="tarjeta-entrada-pildoras entrada-meta">
        ${n.tema ? `<a class="pildora pildora-tema" href="${urlTema(n.temaSlug)}">${esc(n.tema)}</a>` : ''}
        ${n.fecha ? `<span class="pildora"><i class="bi bi-calendar3" aria-hidden="true"></i> <time datetime="${n.fecha.toISOString()}">${fechaLarga(n.fecha)}</time></span>` : ''}
        <span class="pildora"><i class="bi bi-clock" aria-hidden="true"></i> ${n.minutos} min de lectura</span>
      </div>
      <h1 class="display-5 fw-bold entrada-titulo">${esc(n.titulo)}</h1>
      ${n.meta.description ? `<p class="lead text-body-secondary entrada-entradilla">${esc(n.meta.description)}</p>` : ''}
      ${botonesCompartir(n.titulo, n.url, { clase: 'compartir-arriba' })}
      ${n.imagen ? `<figure class="entrada-foto">${imgHtml(n.imagen, n.imagenAlt, { diferida: false })}</figure>` : ''}
      <div class="articulo-cuerpo mt-4">${n.html}</div>
      ${metaBuscador(n)}
      ${botonesCompartir(n.titulo, n.url, { clase: 'compartir-pie' })}
    </article>
    ${ctaEntrada(n)}
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
   7b. Listado del blog: /blog/ (/blog/pagina/2/…) y una página por tema (/blog/tema/<tema>/)
       Migas, título, descripción y recuadro con tijeras (Ajustes → Página Blog), compartir, temas
       como botones y «Buscar en el blog…» (lleva a /buscar/), la última entrada destacada en
       grande (solo en la primera página) y, debajo, las demás con paginación en círculos.
   ========================================================= */
const paginasBlog = [];
const entradaDestacada = n => `
      <article class="entrada-destacada">
        <div class="entrada-destacada-foto">${n.imagen ? imgHtml(n.imagen, n.imagenAlt, { tam: '(min-width: 992px) 640px, 100vw', diferida: false })
          : n.imagenAuto ? `<img src="${esc(n.imagenAuto)}" alt="" width="1200" height="630">` : ''}</div>
        <div class="entrada-destacada-cuerpo">
          <div class="tarjeta-entrada-pildoras">
            <span class="pildora pildora-ultimo">Lo último</span>
            ${n.tema ? `<span class="pildora pildora-tema">${esc(n.tema)}</span>` : ''}
            <span class="pildora"><i class="bi bi-clock" aria-hidden="true"></i> ${n.minutos} min de lectura</span>
          </div>
          ${n.fecha ? `<time class="entrada-destacada-fecha" datetime="${n.fecha.toISOString()}">${fechaLarga(n.fecha)}</time>` : ''}
          <h2 class="entrada-destacada-titulo"><a class="stretched-link" href="${n.url}">${esc(n.titulo)}</a></h2>
          ${n.resumen ? `<p class="entrada-destacada-texto">${esc(n.resumen)}</p>` : ''}
          <span class="btn btn-destacado entrada-destacada-boton" aria-hidden="true">Leer la entrada <i class="bi bi-arrow-right"></i></span>
        </div>
      </article>`;
const barraBlog = actual => `
    <div class="blog-barra" data-pagefind-ignore="all">
      ${temasBlog.length > 1 ? `<nav class="blog-temas" aria-label="Temas del blog">
        <span class="filtros-titulo"><i class="bi bi-tags" aria-hidden="true"></i> Temas</span>
        <a class="filtros-boton${actual ? '' : ' activo'}" href="/blog/"${actual ? '' : ' aria-current="page"'}>Todos <span class="filtros-num">(${noticias.length})</span></a>
        ${temasBlog.map(t => `<a class="filtros-boton${actual === t.slug ? ' activo' : ''}" href="${urlTema(t.slug)}"${actual === t.slug ? ' aria-current="page"' : ''}>${esc(t.nombre)} <span class="filtros-num">(${t.n})</span></a>`).join('')}
      </nav>` : ''}
      ${noticias.length ? `<form class="blog-buscar" action="/buscar/" method="get" role="search">
        <i class="bi bi-search" aria-hidden="true"></i>
        <input type="search" name="q" class="form-control" placeholder="Buscar en el blog…" aria-label="Buscar en el blog" required>
      </form>` : ''}
    </div>`;
function publicarListadoBlog({ lista, base, titulo, entradilla, descripcion, tema = '' }) {
  const porPagina = BLOQUES.blog.porPagina;
  const destacada = cfgBlog.destacada !== false && lista.length > 1 ? lista[0] : null;
  const resto = destacada ? lista.slice(1) : lista;
  const trozos = trocear(resto, porPagina);
  trozos.forEach((trozo, i) => {
    const n = i + 1;
    const ruta = rutaPagina(base, n);
    const extra = destacada ? 1 : 0;
    const desde = n === 1 ? 1 : i * porPagina + 1 + extra;
    const hasta = i * porPagina + trozo.length + extra;
    const cuerpo = cabeceraPagina(`
    ${migas(tema ? [{ texto: 'Blog', url: '/blog/' }, { texto: titulo }] : [{ texto: 'Blog' }])}
    <h1 class="display-5 fw-bold">${esc(titulo)}${n > 1 ? ` <span class="blog-pagina-n">· página ${n}</span>` : ''}</h1>
    ${entradilla ? `<p class="lead text-body-secondary">${esc(entradilla)}</p>` : ''}
    ${!tema && n === 1 ? introPagina(cfgBlog.texto, '/blog/') : ''}
    ${botonesCompartir(titulo, base)}
    ${barraBlog(tema)}`) + `
    <div class="container seccion pt-4">
      ${n === 1 && destacada ? entradaDestacada(destacada) : ''}
      <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">${listaNoticias(trozo)}</div>
      ${navPaginacion(base, n, trozos.length, { desde, hasta, de: lista.length })}
    </div>`;
    const fichero = path.join(DIST, ruta, 'index.html');
    escribir(fichero, completar(paginaDesdePlantilla(cuerpo, { buscable: false, secciones: true }), ruta, {
      titulo: tituloCompleto(n > 1 ? `${titulo} (página ${n})` : titulo),
      descripcion,
      jsonld: n === 1 ? [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: titulo, url: abs(base), publisher: REF_ORG }] : [],
    }));
    paginasBlog.push(fichero);
    if (n === 1) sitemap.push({ ruta: base, fecha: lista[0]?.fecha || null });
  });
}
if (!SIN_BLOG) {
  const entradillaBlog = String(cfgBlog.descripcion || 'Novedades, consejos y noticias de la tienda.').trim();
  publicarListadoBlog({ lista: noticias, base: '/blog/', titulo: String(cfgBlog.titulo || 'Blog').trim(), entradilla: entradillaBlog, descripcion: `${entradillaBlog} Blog de ${SITIO.nombre}.` });
  for (const t of temasBlog) {
    publicarListadoBlog({
      lista: noticias.filter(x => x.temaSlug === t.slug), base: urlTema(t.slug), titulo: t.nombre, tema: t.slug,
      entradilla: `Entradas del blog sobre ${t.nombre.toLowerCase()}.`,
      descripcion: `${t.nombre}: entradas del blog de ${SITIO.nombre}.`,
    });
  }
}

/* =========================================================
   8. Páginas
   ========================================================= */
const PAGINAS_CON_DATOS = ['contacto-y-horario', 'sobre-nosotros'];
for (const p of paginas.filter(x => PAGINAS_CON_DATOS.includes(x.slug))) console.warn(`Aviso: public/_paginas/${p.slug}.md ya no se usa (la página sale de «Contacto y Sobre nosotros»); bórrala.`);
for (const p of paginas.filter(x => !PAGINAS_CON_DATOS.includes(x.slug))) {
  const cuerpo = `
    <article>
      ${migas([{ texto: p.titulo }])}
      <h1 class="display-5 fw-bold">${esc(p.titulo)}</h1>
      ${p.meta.description ? `<p class="lead text-body-secondary">${esc(p.meta.description)}</p>` : ''}
      ${p.imagen ? imgHtml(p.imagen, p.imagenAlt, { clase: 'img-fluid rounded my-4', diferida: false }) : ''}
      <div class="articulo-cuerpo mt-4">${md(p.cuerpo, p.url)}</div>
      ${p.noindex ? '' : metaBuscador(p)}
      ${p.noindex ? '' : botonesCompartir(p.titulo, p.url, { clase: 'compartir-pie' })}
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
   8b. Contacto y horario, y Sobre nosotros (Decap → Contacto y Sobre nosotros)
   ========================================================= */
// Horario para el navegador: «Abierto ahora · cierra a las 13:30» (public/js/extras.js)
const horarioJson = JSON.stringify(CONTACTO.horario.map(f => ({ d: f.dias.map(d => DIAS.indexOf(d) + 1), t: f.tramos })));
const avisoJson = CONTACTO.aviso.texto && CONTACTO.aviso.desde && CONTACTO.aviso.hasta ? JSON.stringify(CONTACTO.aviso) : '';
const hayHorario = CONTACTO.horario.some(f => f.tramos.length);
const insigniaAbierto = () => (hayHorario ? `<p class="estado-tienda" data-abierto data-horario="${esc(horarioJson)}"${avisoJson ? ` data-aviso="${esc(avisoJson)}"` : ''} aria-live="polite" hidden></p>` : '');
const avisoProvisional = (que) => `<div class="aviso-provisional" data-pagefind-ignore="all"><i class="bi bi-pencil-square" aria-hidden="true"></i>${que} de ejemplo: cámbialos en el panel (Contacto y Sobre nosotros) y desmarca «Textos de ejemplo».</div>`;
const ICONOS_LLEGAR = { aparcamiento: 'bi-p-square-fill', referencia: 'bi-signpost-2-fill', accesible: 'bi-universal-access', autobus: 'bi-bus-front-fill', tren: 'bi-train-front-fill', coche: 'bi-car-front-fill' };
const URL_CONTACTO = '/paginas/contacto-y-horario/';
const URL_SOBRE = '/paginas/sobre-nosotros/';
{
  const C = CONTACTO;
  const telHref = C.telefono.replace(/[^\d+]/g, '');
  const vias = [
    C.telefono && { clase: '', icono: 'bi-telephone-fill', titulo: 'Llámanos', dato: C.telefono, accion: 'Llamar', href: `tel:${telHref}` },
    C.whatsapp && { clase: ' whatsapp', icono: 'bi-whatsapp', titulo: 'WhatsApp', dato: C.whatsapp.replace(/^34(?=\d{9}$)/, '').replace(/(\d{3})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4'), accion: 'Escribir', href: `https://wa.me/${C.whatsapp}`, externo: true },
    C.correo && { clase: '', icono: 'bi-envelope-fill', titulo: 'Correo', dato: C.correo, accion: 'Escribir', href: `mailto:${C.correo}` },
    (C.direccion || C.localidad) && { clase: '', icono: 'bi-geo-alt-fill', titulo: 'Dirección', dato: [C.direccion, C.localidad].filter(Boolean).join(', '), accion: 'Cómo llegar', href: '#como-llegar' },
  ].filter(Boolean);
  const consulta = encodeURIComponent([SITIO.nombre, C.direccion.replace(/\[[^\]]*\]/g, ''), C.cp, C.localidad, C.provincia].filter(x => x && x.trim()).join(', '));
  const mapaInsertar = `https://www.google.com/maps?q=${consulta}&output=embed`;
  const mapaEnlace = C.mapaEnlace || `https://www.google.com/maps/search/?api=1&query=${consulta}`;
  const hoyIso = new Date().toLocaleDateString('en-CA', { timeZone: ZONA });
  const avisoVisible = C.aviso.texto && (!C.aviso.hasta || C.aviso.hasta >= hoyIso);
  const cuerpo = `
    <section class="pagina-cabecera">
      <div class="container">
        ${migas([{ texto: C.titulo }])}
        ${C.provisional ? avisoProvisional('Datos') : ''}
        <h1 class="pagina-titulo">${esc(C.titulo)}</h1>
        ${C.introduccion ? `<p class="pagina-intro">${esc(C.introduccion)}</p>` : ''}
        ${insigniaAbierto()}
        ${botonesCompartir(C.titulo, URL_CONTACTO)}
      </div>
    </section>
    <div class="container contacto">
      ${vias.length ? `<ul class="contacto-vias" data-pagefind-ignore="all">${vias.map(v => `<li><a class="contacto-via${v.clase}" href="${esc(v.href)}"${v.externo ? ' target="_blank" rel="noopener noreferrer"' : ''}>
          <span class="contacto-via-icono"><i class="bi ${v.icono}" aria-hidden="true"></i></span>
          <b>${v.titulo}</b><span class="contacto-via-dato">${esc(v.dato)}</span><span class="contacto-via-accion">${v.accion} <i class="bi bi-arrow-right" aria-hidden="true"></i></span>
        </a></li>`).join('')}</ul>` : ''}
      <div class="contacto-rejilla">
        ${C.horario.length ? `<section class="caja-pespunte" aria-labelledby="horario-titulo">
          <h2 class="caja-pespunte-titulo" id="horario-titulo"><i class="bi bi-clock-fill" aria-hidden="true"></i>Horario</h2>
          ${avisoVisible ? `<p class="horario-aviso" data-aviso-cierre${C.aviso.hasta ? ` data-hasta="${esc(C.aviso.hasta)}"` : ''}><i class="bi bi-calendar-event" aria-hidden="true"></i>${esc(C.aviso.texto)}</p>` : ''}
          <table class="horario-tabla"><tbody>
            ${C.horario.map(f => `<tr data-dias="${f.dias.map(d => DIAS.indexOf(d) + 1).join(',')}"><th scope="row">${nombreDias(f.dias)}<span class="horario-hoy" hidden>Hoy</span></th><td>${f.tramos.length ? f.tramos.map(([a, b]) => `<span class="horario-tramo">${a}–${b}</span>`).join('<span class="horario-sep"> · </span>') : 'Cerrado'}</td></tr>`).join('')}
          </tbody></table>
          ${C.nota ? `<p class="horario-nota">${esc(C.nota)}</p>` : ''}
        </section>` : ''}
        <section class="caja-pespunte" id="como-llegar" aria-labelledby="llegar-titulo">
          <h2 class="caja-pespunte-titulo" id="llegar-titulo"><i class="bi bi-map-fill" aria-hidden="true"></i>Cómo llegar</h2>
          <div class="mapa" data-mapa="${esc(mapaInsertar)}" data-pagefind-ignore="all">
            <div class="mapa-tarjeta">
              <i class="bi bi-geo-alt-fill mapa-pin" aria-hidden="true"></i>
              <b>${esc(SITIO.nombre)}</b>
              ${C.direccionCompleta ? `<span>${esc(C.direccionCompleta)}</span>` : ''}
              <p>El mapa de Google se carga al pulsar «Ver el mapa»: así Google no instala sus cookies sin tu permiso.</p>
              <div class="mapa-botones">
                <button type="button" class="btn btn-destacado btn-sm" data-mapa-cargar><i class="bi bi-map me-1" aria-hidden="true"></i>Ver el mapa</button>
                <a class="btn btn-outline-primary btn-sm" href="${esc(mapaEnlace)}" target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a>
              </div>
            </div>
          </div>
          ${C.llegar.length ? `<ul class="contacto-llegar">${C.llegar.map(x => `<li><i class="bi ${ICONOS_LLEGAR[x.icono] || ICONOS_LLEGAR.referencia}" aria-hidden="true"></i>${esc(String(x.texto).trim())}</li>`).join('')}</ul>` : ''}
        </section>
      </div>
      ${SIN_CATALOGO ? '' : `<section class="caja-pespunte contacto-cta" data-pagefind-ignore="all">
        <div>
          <h2 class="contacto-cta-titulo">¿Ya sabes lo que buscas?</h2>
          <p>Mira el catálogo y prepara tu solicitud de presupuesto: te contestamos con la disponibilidad y el precio final, sin compromiso.</p>
        </div>
        <div class="contacto-cta-botones">
          <a class="btn btn-outline-primary" href="/catalogo/">Ver el catálogo</a>
          ${SOLICITUD.activa ? '<a class="btn btn-destacado" href="/presupuesto/"><i class="bi bi-clipboard-check me-1" aria-hidden="true"></i>Mi solicitud</a>' : ''}
        </div>
      </section>`}
      <span hidden data-pagefind-filter="tipo">Página</span>
    </div>`;
  escribir(path.join(DIST, URL_CONTACTO, 'index.html'), completar(paginaDesdePlantilla(cuerpo, { buscable: true, secciones: true }), URL_CONTACTO, {
    titulo: tituloCompleto(C.titulo),
    descripcion: C.introduccion || `Dirección, teléfono y horario de ${SITIO.nombre}.`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'ContactPage', name: C.titulo, url: abs(URL_CONTACTO), about: REF_ORG }, { '@context': 'https://schema.org', ...ORGANIZACION }],
  }));
  sitemap.push({ ruta: URL_CONTACTO });
}
{
  const S = DATOS_SOBRE;
  const anio = parseInt(S.desde, 10);
  const anos = Number.isFinite(anio) ? new Date().getFullYear() - anio : null;
  const conLogo = fabricantes.filter(f => f.imagen);
  const valorCifra = n => String(n ?? '').replace('{años}', anos != null ? `+${anos}` : '').replace('{marcas}', String(fabricantes.length)).trim();
  const cifras = (Array.isArray(S.cifras) ? S.cifras : []).map(c => ({ numero: valorCifra(c?.numero), texto: String(c?.texto || '').trim() })).filter(c => c.numero);
  const servicios = (Array.isArray(S.servicios) ? S.servicios : []).filter(x => x?.titulo);
  const razones = (Array.isArray(S.porque?.lista) ? S.porque.lista : []).filter(x => x?.titulo);
  const historia = (Array.isArray(S.historia) ? S.historia : []).filter(x => x?.texto);
  const marcas = S.marcas?.mostrar !== false && conLogo.length;
  const titulo = S.titulo || 'Sobre nosotros';
  const tarjetaIcono = (x, conEnlace) => `<div class="caja-icono">
          <span class="caja-icono-icono"><i class="bi ${ICONOS_VENTAJA[x.icono] || ICONOS_VENTAJA.check}" aria-hidden="true"></i></span>
          <h3>${esc(x.titulo)}</h3>
          ${x.texto ? `<p>${esc(x.texto)}</p>` : ''}
          ${conEnlace && x.enlace && x.enlace_texto && enlaceVisible(x.enlace) ? `<a href="${esc(x.enlace)}">${esc(x.enlace_texto)} <i class="bi bi-arrow-right" aria-hidden="true"></i></a>` : ''}
        </div>`;
  const cuerpo = `
    <section class="container sobre-cabecera">
      ${migas([{ texto: 'Sobre nosotros' }])}
      ${S.provisional ? avisoProvisional('Textos') : ''}
      <div class="sobre-rejilla">
        <div>
          ${S.antetitulo ? `<p class="antetitulo">${esc(S.antetitulo)}</p>` : ''}
          <h1 class="sobre-titulo">${esc(titulo)}</h1>
          ${S.texto ? `<div class="sobre-texto">${md(S.texto, URL_SOBRE)}</div>` : ''}
          ${cifras.length ? `<ul class="sobre-cifras">${cifras.map(c => `<li><b>${esc(c.numero)}</b><span>${esc(c.texto)}</span></li>`).join('')}</ul>` : ''}
          ${botonesCompartir(titulo, URL_SOBRE, { clase: 'mt-4' })}
        </div>
        <div class="sobre-foto">
          ${S.foto ? imgHtml(S.foto, S.foto_alt || `La tienda ${SITIO.nombre}`, { tam: '(min-width: 992px) 45vw, 100vw', diferida: false }) : `<div class="sobre-foto-vacia" aria-hidden="true"><i class="bi bi-scissors"></i><span>${esc(SITIO.nombre)}</span></div>`}
          ${Number.isFinite(anio) ? `<span class="sobre-sello"><span>desde</span><b>${anio}</b></span>` : ''}
        </div>
      </div>
    </section>
    ${servicios.length ? `<section class="container seccion pt-0" aria-labelledby="servicios-titulo">
      <div class="titulo-bloque"><h2 id="servicios-titulo">Qué hacemos</h2></div>
      <div class="cajas-icono">${servicios.map(x => tarjetaIcono(x, true)).join('')}</div>
    </section>` : ''}
    ${razones.length ? `<section class="bg-body-tertiary seccion" aria-labelledby="porque-titulo">
      <div class="container">
        <div class="titulo-bloque"><h2 id="porque-titulo">${esc(S.porque?.titulo || 'Por qué comprar con nosotros')}</h2></div>
        <div class="cajas-icono">${razones.map(x => tarjetaIcono(x, false)).join('')}</div>
      </div>
    </section>` : ''}
    ${historia.length ? `<section class="container seccion" aria-labelledby="historia-titulo">
      <div class="titulo-bloque"><h2 id="historia-titulo">Nuestra historia</h2></div>
      <ol class="sobre-historia">${historia.map(h => `<li><b>${esc(String(h.año ?? ''))}</b><span>${esc(h.texto)}</span></li>`).join('')}</ol>
    </section>` : ''}
    ${marcas ? `<section class="container seccion${historia.length ? ' pt-0' : ''}" aria-labelledby="marcas-titulo" data-pagefind-ignore="all">
      <div class="titulo-bloque"><h2 id="marcas-titulo">${esc(S.marcas?.titulo || 'Marcas con las que trabajamos')}</h2></div>
      <ul class="sobre-marcas" style="${columnasMarcas(conLogo.length)}">${conLogo.map(f => `<li title="${esc(f.nombre)}"><img src="${esc(f.imagen)}" alt="${esc(f.nombre)}" loading="lazy" decoding="async"></li>`).join('')}</ul>
    </section>` : ''}
    <section class="container seccion pt-0" data-pagefind-ignore="all">
      <div class="caja-pespunte sobre-visita">
        <div>
          <p class="caja-pespunte-titulo"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i>Ven a conocernos</p>
          <p class="sobre-visita-direccion">${esc(CONTACTO.direccionCompleta || CONTACTO.localidad || SITIO.nombre)}</p>
          ${insigniaAbierto()}
        </div>
        <a class="btn btn-destacado btn-lg" href="${URL_CONTACTO}">${esc(CONTACTO.titulo)} <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
      </div>
    </section>
    <span hidden data-pagefind-filter="tipo">Página</span>`;
  escribir(path.join(DIST, URL_SOBRE, 'index.html'), completar(paginaDesdePlantilla(cuerpo, { buscable: true, secciones: true }), URL_SOBRE, {
    titulo: tituloCompleto(S.antetitulo && S.antetitulo !== titulo ? S.antetitulo : titulo),
    descripcion: resumir(S.texto || '') || `Quiénes somos en ${SITIO.nombre}.`,
    imagen: S.foto || undefined,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'AboutPage', name: titulo, url: abs(URL_SOBRE), about: REF_ORG }],
  }));
  sitemap.push({ ruta: URL_SOBRE });
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
  p.categoria ? `<span hidden data-pagefind-filter="categoría">${esc(((p.categoria.ancestros || [])[0] || p.categoria).titulo)}</span>` : '',
  p.enOferta ? '<span hidden data-pagefind-filter="oferta">En oferta</span>' : '',
  p.segundaMano ? '<span hidden data-pagefind-filter="condición">Segunda mano</span>' : '',
  p.imagenes[0] ? `<span hidden data-pagefind-meta="image:${esc(optimizadas.get(p.imagenes[0].src)?.fuentes[0]?.url || p.imagenes[0].src)}"></span>` : '',
  // Para las sugerencias del buscador de la cabecera: precio y fabricante
  `<span hidden data-pagefind-meta="precio:${esc(precioEfectivo(p) != null ? euros(precioEfectivo(p)) : 'Precio a consultar')}"></span>`,
  p.fabricante ? `<span hidden data-pagefind-meta="fabricante:${esc(p.fabricante.nombre)}"></span>` : '',
].join('');

for (const p of productos) {
  p.html = md(p.cuerpo, p.url);
  const cat = p.categoria;
  const trozosMigas = cat ? [...migasDe(cat), { texto: p.nombre, url: p.url }] : [{ texto: 'Catálogo', url: '/catalogo/' }, { texto: p.nombre, url: p.url }];
  // Galería: las fotos en un carril que se desliza (con el dedo en el móvil), miniaturas a la
  // izquierda en el ordenador, contador, etiqueta de oferta o segunda mano y «ver a pantalla
  // completa» (ventana con las fotos grandes). La mueve public/js/extras.js
  const nFotos = p.imagenes.length;
  const etiquetaFoto = p.enOferta && p.descuento ? `<span class="ficha-etiqueta oferta">Oferta −${p.descuento} %</span>`
    : p.segundaMano ? '<span class="ficha-etiqueta segunda">Segunda mano</span>' : '';
  const idGaleria = `galeria-${p.slug}`;
  const fotos = nFotos ? `
      <div class="ficha-galeria${nFotos > 1 ? ' con-miniaturas' : ''}" data-galeria>
        ${nFotos > 1 ? `<ul class="ficha-miniaturas" aria-label="Fotos del producto">
          ${p.imagenes.map((im, k) => `<li><button type="button" class="ficha-miniatura${k ? '' : ' activa'}" data-galeria-ir="${k}" aria-label="Ver la foto ${k + 1} de ${nFotos}"${k ? '' : ' aria-current="true"'}>${imgHtml(im.src, '', { tam: '80px' })}</button></li>`).join('')}
        </ul>` : ''}
        <div class="ficha-visor">
          <div class="ficha-carril" data-galeria-carril>
            ${p.imagenes.map((im, k) => `<figure class="ficha-diapositiva">${imgHtml(im.src, im.alt || p.nombre, { tam: '(min-width: 992px) 45vw, 100vw', diferida: k > 0 })}</figure>`).join('')}
          </div>
          ${etiquetaFoto}
          ${nFotos > 1 ? `<span class="ficha-contador" data-galeria-contador aria-hidden="true">1 / ${nFotos}</span>` : ''}
          <button type="button" class="ficha-ampliar" data-bs-toggle="modal" data-bs-target="#${idGaleria}" data-galeria-ampliar aria-label="Ver las fotos a pantalla completa"><i class="bi bi-arrows-fullscreen" aria-hidden="true"></i></button>
        </div>
        ${nFotos > 1 ? `<div class="ficha-puntos" aria-hidden="true">${p.imagenes.map((_, k) => `<span${k ? '' : ' class="activo"'}></span>`).join('')}</div>` : ''}
      </div>
      <div class="modal fade galeria-ventana" id="${idGaleria}" tabindex="-1" aria-label="Fotos de ${esc(p.nombre)}" aria-hidden="true" data-galeria-ventana>
        <div class="modal-dialog modal-fullscreen">
          <div class="modal-content">
            <div class="galeria-ventana-cabecera">
              <span data-galeria-ventana-contador>${nFotos > 1 ? `1 / ${nFotos}` : ''}</span>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="galeria-ventana-carril" data-galeria-ventana-carril tabindex="0">
              ${p.imagenes.map(im => `<figure><img src="${esc(webpGrande(im.src))}" alt="${esc(im.alt || p.nombre)}" loading="lazy" decoding="async"></figure>`).join('')}
            </div>
            ${nFotos > 1 ? `<button type="button" class="galeria-ventana-flecha anterior" data-galeria-ventana-mover="-1" aria-label="Foto anterior"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
            <button type="button" class="galeria-ventana-flecha siguiente" data-galeria-ventana-mover="1" aria-label="Foto siguiente"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>` : ''}
          </div>
        </div>
      </div>` : '<div class="producto-sin-foto ficha-sin-foto" aria-hidden="true"><i class="bi bi-image"></i></div>';
  // Ficha técnica: los datos del producto y la tabla del panel
  const datos = [
    ['Fabricante', p.fabricante ? esc(p.fabricante.nombre) : esc(p.fabricanteSlug)],
    p.modelo && ['Modelo', esc(p.modelo)],
    p.referencia && ['Referencia', esc(p.referencia)],
    ['Condición', p.segundaMano ? `Segunda mano${p.estadoUso ? ` · ${esc(p.estadoUso)}` : ''}${p.garantia ? ` · garantía de ${p.garantia} meses` : ''}` : 'Nuevo'],
    cat && ['Categoría', `<a href="${cat.url}">${esc(cat.titulo)}</a>`],
    ...p.caracteristicas.map(c => [c.nombre ? esc(c.nombre) : '', esc(c.valor)]),
  ].filter(Boolean);
  const relacionadosCat = cat ? productos.filter(x => x !== p && x.categoria === cat && !p.accesorios.includes(x)).slice(0, 4) : [];
  // Contacto directo (Ajustes → Redes sociales y contacto): WhatsApp con el producto ya escrito y llamar
  const wa = String(SITIO.redes?.whatsapp || '').replace(/\D/g, '');
  const tel = String(SITIO.redes?.telefono || '').replace(/[^\d+]/g, '');
  const contactoDirecto = wa || tel ? `<div class="ficha-contacto" data-pagefind-ignore="all">
            ${wa ? `<a class="ficha-contacto-boton whatsapp" href="https://wa.me/${wa}?text=${encodeURIComponent(`Hola, quería preguntar por: ${tituloProducto(p)} (${abs(p.url)})`)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-whatsapp" aria-hidden="true"></i>Preguntar por WhatsApp</a>` : ''}
            ${tel ? `<a class="ficha-contacto-boton" href="tel:${esc(tel)}"><i class="bi bi-telephone" aria-hidden="true"></i>Llamar</a>` : ''}
          </div>` : '';
  // Pestañas: Descripción, Características (puntos clave), Ficha técnica y Accesorios (en una
  // máquina) o Modelos compatibles (en un accesorio). Las que no tienen contenido no salen
  const pestanas = [
    p.html.trim() && { id: 'descripcion', titulo: 'Descripción', html: `<div class="articulo-cuerpo ficha-descripcion">${p.html}</div>` },
    p.destacados.length && { id: 'caracteristicas', titulo: 'Características', html: `<ul class="ficha-destacados">${p.destacados.map(d => `<li><i class="bi bi-check-circle-fill" aria-hidden="true"></i>${esc(d)}</li>`).join('')}</ul>` },
    { id: 'ficha-tecnica', titulo: 'Ficha técnica', html: `<table class="ficha-tabla"><tbody>
          ${datos.map(([k, v]) => (k ? `<tr><th scope="row">${k}</th><td>${v}</td></tr>` : `<tr><td colspan="2">${v}</td></tr>`)).join('')}
        </tbody></table>
        ${p.fichaPdf ? `<a class="btn btn-outline-primary mt-3" href="${esc(p.fichaPdf)}" target="_blank" rel="noopener"><i class="bi bi-file-earmark-pdf me-2" aria-hidden="true"></i>Descargar la ficha técnica (PDF)</a>` : ''}` },
    p.accesorios.length && { id: 'accesorios', titulo: 'Accesorios', n: p.accesorios.length, ignorar: true, html: `<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">${p.accesorios.map(a => tarjetaProducto(a)).join('')}</div>` },
    p.compatibles.length && { id: 'compatibles', titulo: 'Modelos compatibles', n: p.compatibles.length, ignorar: true, html: `<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">${p.compatibles.map(a => tarjetaProducto(a)).join('')}</div>` },
  ].filter(Boolean);
  const cuerpo = `
    ${migas(trozosMigas)}
    <article class="ficha" data-pagefind-body>
      <div class="ficha-rejilla">
        <div class="ficha-medios">${fotos}</div>
        <div class="ficha-info">
          <div class="ficha-marca">${p.fabricante?.imagen ? `${logoFabricante(p.fabricante, 26)}<span class="visually-hidden">${esc(p.fabricante.nombre)}</span>` : `<span class="ficha-marca-nombre">${esc(fabricanteDe(p))}</span>`}
            <span class="pildora${p.segundaMano ? ' pildora-segunda' : ''}">${p.segundaMano ? 'Segunda mano' : 'Nuevo'}</span></div>
          <h1 class="ficha-titulo">${esc(p.nombre)}</h1>
          ${p.modelo || p.referencia ? `<p class="ficha-subtitulo">${[p.modelo && `Modelo ${esc(p.modelo)}`, p.referencia && `Ref. ${esc(p.referencia)}`].filter(Boolean).join(' · ')}</p>` : ''}
          <div class="caja-pespunte ficha-compra" data-ficha-compra>
            ${p.dosPrecios ? fichaVersiones(p) : `<div class="ficha-precio">${precioHtml(p)}</div>`}
            ${p.enOferta ? `<p class="ficha-oferta" data-oferta-fin="${esc(p.oferta.fin)}"><i class="bi bi-clock-history" aria-hidden="true"></i>Oferta hasta el ${fechaCorta(p.oferta.fin)}<span data-oferta-quedan></span></p>` : ''}
            <p class="ficha-iva">Precio orientativo, IVA incluido. Te confirmamos la disponibilidad y el precio final.</p>
            ${SOLICITUD.activa && !p.dosPrecios ? `<div class="ficha-accion" data-pagefind-ignore="all">
              <div class="solicitud-cantidad ficha-cantidad" role="group" aria-label="Unidades" data-cantidad-ficha hidden>
                <button type="button" class="solicitud-cantidad-boton" data-cantidad-menos aria-label="Una unidad menos" disabled>−</button>
                <span class="solicitud-cantidad-num" data-cantidad-num aria-live="polite">1</span>
                <button type="button" class="solicitud-cantidad-boton" data-cantidad-mas aria-label="Una unidad más">+</button>
              </div>
              <button type="button" class="btn btn-destacado btn-lg ficha-anadir" data-anadir-solicitud="${esc(p.slug)}" hidden>
                <i class="bi bi-clipboard-plus me-2" aria-hidden="true"></i><span>Añadir a la solicitud</span>
              </button>
              <noscript><a class="btn btn-destacado btn-lg" href="/paginas/contacto-y-horario/">Pedir información</a></noscript>
            </div>` : ''}${SOLICITUD.activa ? `
            <p class="ficha-estado" data-pagefind-ignore="all"><span data-estado-solicitud role="status" aria-live="polite"></span> <a href="/presupuesto/" data-ver-solicitud hidden>Ver mi solicitud <i class="bi bi-arrow-right" aria-hidden="true"></i></a></p>`
              : '<p data-pagefind-ignore="all"><a class="btn btn-destacado btn-lg" href="/paginas/contacto-y-horario/">Pedir información</a></p>'}
            ${contactoDirecto}
            ${SOLICITUD.activa && SOLICITUD.ventajas.length ? `<ul class="ficha-ventajas" data-pagefind-ignore="all">${SOLICITUD.ventajas.map(v => `<li><i class="bi ${ICONOS_VENTAJA[v.icono] || ICONOS_VENTAJA.check}" aria-hidden="true"></i>${esc(String(v.texto).trim())}</li>`).join('')}</ul>` : ''}
          </div>
          ${botonesCompartir(tituloProducto(p), p.url)}
        </div>
      </div>
      <div class="ficha-pestanas">
        <div class="ficha-pestanas-nav" role="tablist" aria-label="Información del producto">
          ${pestanas.map((t, k) => `<button class="ficha-pestana${k ? '' : ' active'}" type="button" role="tab" id="tab-${t.id}" data-bs-toggle="tab" data-bs-target="#panel-${t.id}" aria-controls="panel-${t.id}" aria-selected="${!k}">${t.titulo}${t.n ? ` <span class="insignia-menu">${t.n}</span>` : ''}</button>`).join('')}
        </div>
        <div class="tab-content">
          ${pestanas.map((t, k) => `<section class="tab-pane fade${k ? '' : ' show active'} ficha-panel" id="panel-${t.id}" role="tabpanel" aria-labelledby="tab-${t.id}" tabindex="0"${t.ignorar ? ' data-pagefind-ignore="all"' : ''}>
            <h2 class="visually-hidden">${t.titulo}</h2>
            ${t.html}
          </section>`).join('')}
        </div>
      </div>
      ${filtrosProducto(p)}
    </article>
    ${relacionadosCat.length ? `<section class="mt-5" aria-labelledby="relacionados-titulo" data-pagefind-ignore="all">
      <div class="titulo-bloque"><h2 id="relacionados-titulo">Más en ${esc(cat.titulo)}</h2><a href="${cat.url}" class="fw-bold enlace-flecha">Ver todo en ${esc(cat.titulo)}</a></div>
      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">${relacionadosCat.map(a => tarjetaProducto(a)).join('')}</div>
    </section>` : ''}
    ${SOLICITUD.activa && p.dosPrecios ? `<div class="ficha-barra ficha-barra-versiones" data-ficha-barra data-pagefind-ignore="all" hidden>
      ${versionesProducto(p).map(v => `<button type="button" class="btn ${v.nombre === 'Completa' ? 'btn-destacado' : 'btn-outline-primary'}" data-anadir-solicitud="${esc(v.id)}" data-version="${v.nombre}" data-anadir-barra hidden>
        <i class="bi bi-clipboard-plus" aria-hidden="true"></i><span>${v.nombre}</span><b${v.oferta != null ? ' class="precio-oferta"' : ''}>${(v.oferta ?? v.precio) != null ? euros(v.oferta ?? v.precio) : 'A consultar'}</b></button>`).join('')}
    </div>` : ''}${SOLICITUD.activa && !p.dosPrecios ? `<div class="ficha-barra" data-ficha-barra data-pagefind-ignore="all" hidden>
      <span><small>${p.enOferta ? 'Precio de oferta' : 'Precio orientativo'}</small><b class="${p.enOferta ? 'precio-oferta' : ''}">${precioEfectivo(p) != null ? euros(precioEfectivo(p)) : 'A consultar'}</b></span>
      <button type="button" class="btn btn-destacado" data-anadir-solicitud="${esc(p.slug)}" data-anadir-barra hidden><i class="bi bi-clipboard-plus me-1" aria-hidden="true"></i><span>Añadir a la solicitud</span></button>
    </div>` : ''}`;

  const jsonld = [{
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: tituloProducto(p),
    description: p.resumen || p.nombre,
    image: p.imagenes.map((i, k) => abs(k ? webpGrande(i.src) : compartible(i.src))),
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

// Bloques de /catalogo/ y de cada tipo, categoría y subcategoría (Ajustes → Página Catálogo):
// «Nuestros productos» (en /catalogo/, todos al azar; en una categoría, los suyos y los de las
// que cuelgan de ella), «Productos en oferta» (las ofertas de esa misma selección) y el blog.
// Productos y ofertas llevan los mismos filtros (fabricante y segunda mano, cuando tienen sentido).
// Tarjeta del catálogo con cuántos productos tiene (con los de lo que cuelga de ella)
function tarjetaCatalogo(c) {
  const n = enCategoria(c).length;
  return tarjetaCategoria(c, { n });
}
// Página de ofertas de una selección (o todas): /ofertas/<tipo>/<categoria>/…
function urlOfertas(c) { return c ? `/ofertas/${c.url.slice('/catalogo/'.length)}` : '/ofertas/'; }
function bloquesCatalogo({ lista, ofertasLista, nombre = '', raiz = false, cat = null }) {
  const B = BLOQUES.catalogo;
  let html = '';
  if (B.productos.mostrar && (lista.length || !raiz)) {
    html += seccionBloque('productos', { id: 'catalogo', sinEnlace: raiz, conteo: lista.length, titulo: raiz ? 'Todos los productos' : `Productos de ${nombre}`, contenido: lista.length
      ? rejillaProductos(lista, { porPagina: B.productos.porPagina, aleatorio: raiz, filtro: true, maxSinJs: B.productos.porPagina, etiqueta: nombre ? `Productos de ${nombre}` : 'Productos del catálogo' })
      : '<p class="text-body-secondary mb-0">Todavía no hay productos en esta categoría.</p>' });
  }
  if (B.ofertas.mostrar && ofertasLista.length) {
    html += seccionBloque('ofertas', { id: 'ofertas', conteo: ofertasLista.length, enlace: urlOfertas(cat), textoEnlace: 'Ver todas las ofertas', titulo: raiz ? 'Productos en oferta' : `Ofertas de ${nombre}`,
      contenido: rejillaProductos(ofertasLista, { porPagina: B.ofertas.porPagina, filtro: true, maxSinJs: B.ofertas.porPagina, etiqueta: nombre ? `Ofertas de ${nombre}` : 'Productos en oferta' }) });
  }
  if (B.blog.mostrar && noticias.length) html += seccionBloque('blog', { id: 'ultimas-entradas', contenido: rejillaNoticias(noticias.slice(0, B.blog.porPagina), { porPagina: B.blog.porPagina }) });
  return html;
}

// Categorías y subcategorías: /catalogo/<categoria>/ y /catalogo/<categoria>/<subcategoria>/
for (const c of categorias) {
  const lista = enCategoria(c);
  const ofertasLista = ofertas.filter(p => lista.includes(p));
  const cuerpo = cabeceraPagina(`
    ${migas(migasDe(c))}
    <h1 class="display-5 fw-bold">${esc(c.titulo)}</h1>
    ${c.meta.description ? `<p class="lead text-body-secondary">${esc(c.meta.description)}</p>` : ''}
    ${introPagina(c.cuerpo, c.url, 'Precios orientativos, IVA incluido.')}
    ${botonesCompartir(c.titulo, c.url)}
    ${metaBuscadorCategoria(c)}
    ${c.hijos.length ? `<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 mt-4" data-pagefind-ignore="all">${c.hijos.map(tarjetaCatalogo).join('')}</div>` : ''}`)
    + bloquesCatalogo({ lista, ofertasLista, nombre: c.titulo, cat: c });
  // En el buscador entran el título, la descripción y el texto (los bloques de productos, no)
  escribir(path.join(DIST, c.url, 'index.html'), completar(paginaDesdePlantilla(cuerpo, { buscable: true, secciones: true }), c.url, {
    titulo: tituloCompleto(c.titulo),
    descripcion: c.resumen || `${c.titulo} en ${SITIO.nombre}: catálogo con precios orientativos.`,
    imagen: c.imagen, imagenAlt: c.imagenAlt, imagenAuto: c.imagenAuto,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: c.titulo, description: c.resumen, url: abs(c.url), publisher: REF_ORG }],
  }));
  sitemap.push({ ruta: c.url });
}

// Bloques de la portada y de /catalogo/: productos al azar, ofertas y blog (N por página)
const bloqueResumenCatalogo = (porPagina, filtro = false) => rejillaProductos(productos, { porPagina, aleatorio: true, filtro, maxSinJs: porPagina, etiqueta: 'Productos del catálogo' });
const bloqueOfertas = porPagina => rejillaProductos(ofertas, { porPagina, filtro: true, maxSinJs: porPagina, etiqueta: 'Productos en oferta' });
// Bloque «Blog» de la portada, /catalogo/, categorías y ofertas: las N más recientes, sin pasar de
// página (la cabecera del bloque lleva «Ver todo el blog»)
const bloqueBlog = porPagina => rejillaNoticias(noticias.slice(0, porPagina), { porPagina });

/* =========================================================
   9c. Solicitud de presupuesto: /presupuesto/ (Decap → Solicitud de presupuesto)
       La lista se guarda en el navegador (public/js/presupuesto.js), que la pinta con los
       datos de /presupuesto/productos.json. PARTE VISUAL: el envío real (función del
       servidor y hoja de Google) llega en la fase 5, tras el despliegue (docs/PLAN.md).
   ========================================================= */
if (SOLICITUD.activa) {
  // Datos públicos de los productos visibles para pintar la solicitud (nada que no esté ya en las fichas)
  const miniatura = src => optimizadas.get(src)?.fuentes[0]?.url || src;
  // Los productos con dos precios van dos veces: la completa (su identificador) y el cabezal
  // («<identificador>~cabezal»), cada uno con su precio, para pedirlos por separado
  const datoSolicitud = (p, v) => ({
    id: v ? v.id : p.slug,
    nombre: p.nombre,
    ...(v ? { version: v.nombre } : {}),
    modelo: p.modelo,
    fabricante: fabricanteDe(p),
    url: p.url,
    precio: v ? v.precio : p.precio,
    ...(v ? (v.oferta != null ? { precioOferta: v.oferta, ofertaHasta: p.oferta.fin } : {})
      : p.enOferta ? { precioOferta: p.oferta.precio, ofertaHasta: p.oferta.fin } : {}),
    imagen: p.imagenes[0] ? miniatura(p.imagenes[0].src) : '',
    ...(SOLICITUD.accesorios && p.accesorios.length ? { accesorios: p.accesorios.map(a => a.slug) } : {}),
  });
  escribir(path.join(DIST, 'presupuesto/productos.json'), JSON.stringify(productos.flatMap(p => (p.dosPrecios
    ? versionesProducto(p).map(v => datoSolicitud(p, v)) : [datoSolicitud(p)]))));

  const privacidad = '/paginas/politica-de-privacidad/';
  const condiciones = '/paginas/condiciones-solicitud-presupuesto/';
  // Condiciones y protección de datos: se leen en una ventana (pestañas) antes de aceptar
  const legales = [
    { id: 'condiciones', texto: 'Condiciones', url: condiciones, pagina: paginas.find(x => x.url === condiciones) },
    { id: 'privacidad', texto: 'Protección de datos', url: privacidad, pagina: paginas.find(x => x.url === privacidad) },
  ].filter(l => l.pagina);
  for (const l of [condiciones, privacidad]) if (!paginas.some(x => x.url === l)) console.warn(`Aviso: falta la página ${l}; en la solicitud de presupuesto queda solo el enlace (no se obliga a leerla).`);
  const pagContacto = paginas.find(x => /contacto/i.test(x.slug));
  const contacto = pagContacto ? pagContacto.url : '/paginas/contacto-y-horario/';
  const OPCIONES_CONTACTO = { llamada: ['Llamada', 'bi-telephone'], whatsapp: ['WhatsApp', 'bi-whatsapp'], correo: ['Correo', 'bi-envelope'] };
  const pref = SOLICITUD.preferencia;
  const campo = (id, etiqueta, entrada, error, clase = '') => `
            <div class="${clase}">
              <label class="form-label" for="${id}">${etiqueta} <span class="text-danger" aria-hidden="true">*</span></label>
              ${entrada}
              <div class="invalid-feedback">${error}</div>
            </div>`;
  const cuerpo = `
    <section class="solicitud-cabecera">
      <div class="container">
        ${migas([{ texto: SOLICITUD.titulo }])}
        <h1 class="solicitud-titulo">${esc(SOLICITUD.titulo)}</h1>
        ${SOLICITUD.introduccion ? `<p class="solicitud-intro">${esc(SOLICITUD.introduccion)}</p>` : ''}
        <ol class="solicitud-pasos" data-solicitud-pasos>
          <li class="actual" data-paso="1"><b>1</b>Revisa tu solicitud</li>
          <li data-paso="2"><b>2</b>Tus datos</li>
          <li data-paso="3"><b>3</b>Te contestamos</li>
        </ol>
      </div>
    </section>
    <div class="container solicitud" data-solicitud data-datos="/presupuesto/productos.json"${SOLICITUD.notas ? ' data-notas' : ''}>
      <p class="text-body-secondary py-4" data-solicitud-cargando>Cargando tu solicitud…</p>
      <noscript><div class="alert alert-secondary my-4">Para preparar la solicitud hace falta JavaScript. También puedes llamarnos o escribirnos: <a href="${contacto}">Contacto y horario</a>.</div></noscript>
      <div class="alert alert-warning mt-4" data-solicitud-aviso role="status" hidden></div>

      <div class="busqueda-vacio seccion" data-solicitud-vacia hidden>
        <div>
          <h2 class="busqueda-vacio-titulo">Tu solicitud está vacía</h2>
          <p class="text-body-secondary">Añade productos con el botón <span class="solicitud-mas-ejemplo" aria-hidden="true"><i class="bi bi-plus-lg"></i></span> de las tarjetas o con «Añadir a la solicitud» en cada ficha. Puedes pedir presupuesto de varios productos a la vez.</p>
          <div class="busqueda-ayuda">
            <p class="busqueda-ayuda-titulo"><i class="bi bi-chat-dots-fill" aria-hidden="true"></i>¿Prefieres hablar con nosotros?</p>
            <p>Llámanos o ven a la tienda y te asesoramos.</p>
            <a class="btn btn-destacado" href="${contacto}">Contacto y horario</a>
          </div>
        </div>
        <div>${heroCatalogo()}</div>
      </div>

      <div class="solicitud-rejilla" data-solicitud-contenido hidden>
        <div class="solicitud-principal">
          <section class="caja-pespunte" aria-labelledby="solicitud-productos">
            <h2 class="caja-pespunte-titulo" id="solicitud-productos"><i class="bi bi-scissors" aria-hidden="true"></i>Productos</h2>
            <ul class="list-unstyled solicitud-lista mb-0" data-solicitud-items></ul>
            ${SIN_CATALOGO ? '' : '<a href="/catalogo/" class="solicitud-seguir"><i class="bi bi-arrow-left" aria-hidden="true"></i>Seguir viendo el catálogo</a>'}
          </section>
          ${SOLICITUD.accesorios ? `<section class="caja-pespunte" aria-labelledby="solicitud-accesorios" data-solicitud-accesorios hidden>
            <h2 class="caja-pespunte-titulo" id="solicitud-accesorios"><i class="bi bi-plus-circle" aria-hidden="true"></i>Accesorios para tus máquinas</h2>
            <div class="solicitud-sugerencias" data-solicitud-sugerencias></div>
          </section>` : ''}
          <form class="caja-pespunte solicitud-form" id="tus-datos" data-solicitud-form method="post" action="/api/solicitud" novalidate aria-labelledby="solicitud-datos">
            <h2 class="caja-pespunte-titulo" id="solicitud-datos"><i class="bi bi-person-fill" aria-hidden="true"></i>Tus datos</h2>
            <div class="solicitud-campos">
              ${campo('s-nombre', 'Nombre', '<input class="form-control" type="text" id="s-nombre" name="nombre" maxlength="120" autocomplete="name" required>', 'Escribe tu nombre.')}
              ${campo('s-telefono', 'Teléfono', '<input class="form-control" type="tel" id="s-telefono" name="telefono" maxlength="20" autocomplete="tel" inputmode="tel" required>', 'Escribe un teléfono (9 cifras como mínimo).')}
              ${campo('s-correo', 'Correo electrónico', '<input class="form-control" type="email" id="s-correo" name="correo" maxlength="160" autocomplete="email" required>', 'Escribe un correo válido, p. ej. nombre@ejemplo.es.', 'ancho')}
              ${pref.mostrar && pref.opciones.length > 1 ? `<fieldset class="ancho">
                <legend class="form-label">${esc(pref.pregunta)}</legend>
                <div class="solicitud-chips">${pref.opciones.map((o, k) => `<label class="solicitud-chip"><input type="radio" name="preferencia" value="${o}"${k === 0 ? ' checked' : ''}><span><i class="bi ${OPCIONES_CONTACTO[o][1]}" aria-hidden="true"></i>${OPCIONES_CONTACTO[o][0]}</span></label>`).join('')}</div>
              </fieldset>` : ''}
              <div class="ancho">
                <label class="form-label" for="s-observaciones">Observaciones</label>
                <textarea class="form-control" id="s-observaciones" name="observaciones" rows="3" maxlength="2000" placeholder="Dudas sobre los productos, horario en que prefieres que te llamemos…"></textarea>
              </div>
              <div class="ancho form-check solicitud-acepto">
                <input class="form-check-input" type="checkbox" id="s-acepto" name="acepto" value="si" required${legales.length ? ' data-legal-casilla' : ''}>
                <label class="form-check-label" for="s-acepto">${esc(SOLICITUD.aceptacion)}
                  (<a href="${condiciones}" target="_blank" rel="noopener" data-legal-abrir="condiciones">condiciones</a> · <a href="${privacidad}" target="_blank" rel="noopener" data-legal-abrir="privacidad">protección de datos</a>)
                  <span class="text-danger" aria-hidden="true">*</span></label>
                <div class="invalid-feedback">${legales.length ? 'Abre y lee las condiciones y la protección de datos, y acéptalas para enviar la solicitud.' : 'Tienes que aceptar para enviar la solicitud.'}</div>
              </div>
              <div class="ancho">
                <button type="submit" class="btn btn-destacado btn-lg"><i class="bi bi-send me-2" aria-hidden="true"></i>${esc(SOLICITUD.boton)}</button>
                <div class="mt-3" data-solicitud-resultado role="status" aria-live="polite"></div>
              </div>
              ${SOLICITUD.infoPrivacidad ? `<p class="ancho solicitud-legal">${esc(SOLICITUD.infoPrivacidad)} <a href="${privacidad}">Más información</a>.</p>` : ''}
            </div>
          </form>
        </div>
        <aside class="solicitud-lateral" aria-labelledby="solicitud-resumen">
          <div class="caja-pespunte solicitud-resumen">
            <h2 class="caja-pespunte-titulo" id="solicitud-resumen"><i class="bi bi-clipboard-check" aria-hidden="true"></i>Resumen</h2>
            <div class="solicitud-resumen-fila"><span data-resumen-productos></span><span data-resumen-suma></span></div>
            <div class="solicitud-resumen-fila" data-resumen-consultar-fila hidden><span>Precio a consultar</span><span data-resumen-consultar></span></div>
            <div class="solicitud-resumen-total"><span>Total orientativo</span><b data-solicitud-total></b></div>
            <p class="solicitud-resumen-nota">Precios orientativos, IVA incluido. La tienda te confirma la disponibilidad y el precio final.</p>
            <a class="btn btn-destacado btn-lg w-100" href="#tus-datos" data-ir-datos>Continuar con mis datos <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
            ${SOLICITUD.ventajas.length ? `<ul class="solicitud-ventajas">${SOLICITUD.ventajas.map(v => `<li><i class="bi ${ICONOS_VENTAJA[v.icono] || ICONOS_VENTAJA.check}" aria-hidden="true"></i>${esc(String(v.texto).trim())}</li>`).join('')}</ul>` : ''}
          </div>
        </aside>
      </div>

      <div class="solicitud-barra" data-solicitud-barra hidden>
        <span><small data-barra-productos></small><b data-barra-total></b></span>
        <a class="btn btn-destacado" href="#tus-datos" data-ir-datos>Continuar <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
      </div>
      <div class="solicitud-deshacer" data-solicitud-deshacer role="status" aria-live="polite" hidden>
        <span data-deshacer-texto></span><button type="button" data-deshacer-boton>Deshacer</button>
      </div>

      ${legales.length ? `<div class="modal fade" id="modal-legal" tabindex="-1" aria-labelledby="modal-legal-titulo" aria-hidden="true" data-legal-ventana>
        <div class="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down">
          <div class="modal-content">
            <div class="modal-header">
              <h2 class="modal-title h5 fw-bold" id="modal-legal-titulo">Antes de enviar tu solicitud</h2>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="legal-pestanas" role="tablist">
              ${legales.map((l, k) => `<button class="legal-pestana${k === 0 ? ' active' : ''}" type="button" role="tab" id="legal-tab-${l.id}" data-bs-toggle="tab" data-bs-target="#legal-${l.id}" aria-controls="legal-${l.id}" aria-selected="${k === 0}" data-legal-pestana="${l.id}">${esc(l.texto)}<i class="bi bi-check-circle-fill" aria-hidden="true"></i><span class="visually-hidden" data-legal-leido> (leído)</span></button>`).join('')}
            </div>
            <div class="modal-body">
              <div class="tab-content">
                ${legales.map((l, k) => `<div class="tab-pane fade${k === 0 ? ' show active' : ''} articulo-cuerpo legal-texto" id="legal-${l.id}" role="tabpanel" aria-labelledby="legal-tab-${l.id}" tabindex="0">
                  <h3 class="h4 fw-bold">${esc(l.pagina.titulo)}</h3>
                  ${md(l.pagina.cuerpo, l.url)}
                </div>`).join('')}
              </div>
            </div>
            <div class="modal-footer">
              <span class="legal-pista" data-legal-pista>${legales.length > 1 ? 'Abre las dos pestañas para poder aceptar.' : ''}</span>
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
              <button type="button" class="btn btn-destacado" data-legal-aceptar${legales.length > 1 ? ' disabled' : ''}>He leído y acepto</button>
            </div>
          </div>
        </div>
      </div>` : ''}
    </div>`;
  escribir(path.join(DIST, 'presupuesto/index.html'), completar(paginaDesdePlantilla(cuerpo, { buscable: false, secciones: true }), '/presupuesto/', {
    titulo: tituloCompleto(SOLICITUD.titulo),
    descripcion: 'Revisa los productos de tu solicitud de presupuesto y envíanos tus datos.',
    noindex: true,
  }));
}

// Ofertas: /ofertas/ (todas) y /ofertas/<tipo>/<categoria>/<subcategoria>/ (las de esa selección,
// con lo que cuelga de ella). Se navega como el catálogo: arriba, las tarjetas del nivel siguiente
// (que llevan a sus ofertas y dicen cuántas tienen); debajo, «Productos en oferta» con sus filtros
// y el blog (Ajustes → Página Ofertas). Una selección sin ofertas no se indexa.
const ofertasDe = c => (c ? ofertas.filter(p => enCategoria(c).includes(p)) : ofertas);
for (const c of [null, ...categorias]) {
  const lista = ofertasDe(c);
  if (OCULTAR_VACIAS && !lista.length) continue;
  const hijos = (c ? c.hijos : categoriasPrincipales).filter(h => !OCULTAR_VACIAS || ofertasDe(h).length);
  const ruta = urlOfertas(c);
  const trozosMigas = [{ texto: 'Catálogo', url: '/catalogo/' }, { texto: 'Ofertas', url: '/ofertas/' },
    ...(c ? [...c.ancestros, c].map(x => ({ texto: x.titulo, url: urlOfertas(x) })) : [])];
  const cuerpo = cabeceraPagina(`
    ${migas(trozosMigas)}
    <h1 class="display-5 fw-bold">${c ? `Ofertas: ${esc(c.titulo)}` : 'Ofertas'}</h1>
    ${!c && cfgOfertas.descripcion ? `<p class="lead text-body-secondary">${esc(cfgOfertas.descripcion)}</p>` : ''}
    ${c || !cfgOfertas.descripcion ? `<p class="lead text-body-secondary">${hijos.length ? `Elige ${c ? (c.nivel === 1 ? 'una categoría' : 'una subcategoría') : 'un tipo de producto'} para ver sus ofertas.` : 'Estas son sus ofertas vigentes.'}</p>` : ''}
    ${introPagina(c ? '' : cfgOfertas.texto, '/ofertas/', 'Precios de oferta válidos hasta la fecha indicada en cada producto. Precios orientativos, IVA incluido.')}
    ${botonesCompartir(c ? `Ofertas: ${c.titulo}` : 'Ofertas', ruta)}
    ${hijos.length ? `<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 mt-4" data-pagefind-ignore="all">${hijos.map(h => tarjetaCategoria(h, { url: urlOfertas(h), n: ofertasDe(h).length, que: 'ofertas' })).join('')}</div>` : ''}`)
    + seccionBloque('ofertas', { id: 'ofertas', sinEnlace: !c, conteo: lista.length,
      ...(c ? { enlace: c.url, textoEnlace: `Ver ${c.titulo} en el catálogo` } : {}),
      contenido: lista.length
        ? rejillaProductos(lista, { porPagina: BLOQUES.ofertas.productos.porPagina, filtro: true, maxSinJs: BLOQUES.ofertas.productos.porPagina, etiqueta: c ? `Ofertas de ${c.titulo}` : 'Productos en oferta' })
        : `<p class="text-body-secondary mb-0">Ahora mismo no hay ofertas${c ? ` en ${esc(c.titulo)}` : ''}. <a href="${c ? c.url : '/catalogo/'}">Ver ${c ? esc(c.titulo) + ' en el catálogo' : 'todo el catálogo'}</a>.</p>` })
    + (BLOQUES.ofertas.blog.mostrar && noticias.length ? seccionBloque('blog', { id: 'ultimas-entradas', contenido: bloqueBlog(BLOQUES.ofertas.blog.porPagina) }) : '');
  const nombre = c ? `Ofertas: ${c.titulo}` : 'Ofertas';
  escribir(path.join(DIST, ruta, 'index.html'), completar(paginaDesdePlantilla(cuerpo, { buscable: false, secciones: true }), ruta, {
    titulo: tituloCompleto(nombre),
    descripcion: c ? `Ofertas de ${c.titulo} en ${SITIO.nombre}: precios rebajados durante unos días.` : (cfgOfertas.descripcion || `Ofertas de ${SITIO.nombre}: máquinas de coser y accesorios con precio rebajado durante unos días.`),
    noindex: !!c && !lista.length,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: nombre, url: abs(ruta), publisher: REF_ORG }],
  }));
  if (!c || lista.length) sitemap.push({ ruta });
}

// /catalogo/: tipos de producto y, debajo, los bloques de Ajustes → Página Catálogo
// (bloquesCatalogo: productos al azar, ofertas y blog). No se publica si el catálogo está oculto
if (!SIN_CATALOGO) {
  const verProductos = BLOQUES.catalogo.productos.mostrar && productos.length;
  const cuerpo = cabeceraPagina(`
    ${migas([{ texto: 'Catálogo' }])}
    <h1 class="display-5 fw-bold">Catálogo</h1>
    <p class="lead text-body-secondary">${cfgCatalogo.descripcion ? esc(cfgCatalogo.descripcion) : `Elige un tipo de producto${verProductos ? ' o mira nuestros productos' : ''}.`}</p>
    ${introPagina(cfgCatalogo.texto, '/catalogo/', 'Precios orientativos, IVA incluido.')}
    ${botonesCompartir('Catálogo', '/catalogo/')}
    ${categoriasPrincipales.length ? `<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 mt-4">${categoriasPrincipales.map(tarjetaCatalogo).join('')}</div>` : `<p class="text-body-secondary mt-4 mb-0">Todavía no hay productos en el catálogo. Vuelve pronto o <a href="/paginas/contacto-y-horario/">pregúntanos</a> por lo que buscas.</p>`}
`)
    + bloquesCatalogo({ lista: productos, ofertasLista: ofertas, raiz: true });
  escribir(path.join(DIST, 'catalogo/index.html'), completar(paginaDesdePlantilla(cuerpo, { buscable: false, secciones: true }), '/catalogo/', {
    titulo: tituloCompleto('Catálogo'),
    descripcion: cfgCatalogo.descripcion || `Catálogo de ${SITIO.nombre}: máquinas y accesorios con precios orientativos. Solicita presupuesto sin compromiso.`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Catálogo', url: abs('/catalogo/'), publisher: REF_ORG }],
  }));
  sitemap.push({ ruta: '/catalogo/' });
}

/* =========================================================
   10. Portada, /blog/, 404 y cualquier otra página HTML de public/
   ========================================================= */
// Textos de la portada (Decap → Ajustes del sitio → Ajustes generales, apariencia y menú → Portada)
const PORTADA = (AJUSTES.portada && typeof AJUSTES.portada === 'object') ? AJUSTES.portada : {};
if (fs.existsSync(`${PUB}/_datos/portada.yml`)) console.warn('Aviso: public/_datos/portada.yml ya no se usa (la portada está en Ajustes del sitio → Portada); bórralo.');
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
  // Bloque principal: ventajas, tipos de producto y último artículo del blog
  const poner = (sel, html) => { const el = raiz.querySelector(sel); if (!el) return; if (html) el.insertAdjacentHTML('afterend', html); el.remove(); };
  poner('[data-hero-ventajas]', heroVentajas());
  poner('[data-hero-catalogo]', heroCatalogo());
  poner('[data-hero-blog]', heroBlog());
}

// Ventajas bajo el texto del bloque principal (Ajustes → Portada → Bloque principal → Ventajas)
function heroVentajas() {
  const lista = (Array.isArray(PORTADA.hero?.ventajas) ? PORTADA.hero.ventajas : [])
    .map(v => (typeof v === 'string' ? { texto: v } : v || {}))
    .filter(v => String(v.texto || '').trim());
  if (!lista.length) return '';
  return `<ul class="hero-ventajas">${lista.map(v => `<li><i class="bi ${ICONOS_VENTAJA[v.icono] || ICONOS_VENTAJA.check}" aria-hidden="true"></i>${esc(String(v.texto).trim())}</li>`).join('')}</ul>`;
}
// «Explora el catálogo»: los tipos de producto, en el orden de Ajustes, con su número de productos
function heroCatalogo() {
  if (!categoriasPrincipales.length) return '';
  const tarjeta = c => {
    const n = enCategoria(c).length;
    return `<li><a class="hero-tipo" href="${c.url}"><span class="hero-tipo-nombre">${esc(c.titulo)}</span><span class="hero-insignia${n ? '' : ' vacia'}">${n}<span class="visually-hidden"> ${n === 1 ? 'producto' : 'productos'}</span></span><i class="bi bi-arrow-right hero-flecha" aria-hidden="true"></i></a></li>`;
  };
  return `<nav class="hero-catalogo" aria-labelledby="hero-catalogo-titulo">
            <p class="hero-cabecera" id="hero-catalogo-titulo"><i class="bi bi-scissors" aria-hidden="true"></i>Explora el catálogo</p>
            <ul class="hero-tipos">${categoriasPrincipales.map(tarjeta).join('')}</ul>
          </nav>`;
}
// Último artículo del blog (se puede ocultar en Ajustes → Portada → Bloque principal)
function heroBlog() {
  const n = noticias[0];
  if (!n || PORTADA.hero?.ultimo_articulo === false) return '';
  const dm = n.fecha ? diaMes(n.fecha) : null;
  return `<article class="hero-articulo">
            ${dm ? `<time class="tarjeta-entrada-fecha" datetime="${n.fecha.toISOString()}"><b>${dm.dia}</b><span>${dm.mes}</span><span class="visually-hidden"> ${fechaLarga(n.fecha)}</span></time>` : ''}
            <div class="hero-articulo-cuerpo">
              <div class="tarjeta-entrada-pildoras">
                <span class="hero-articulo-etiqueta">Del blog</span>
                ${n.tema ? `<span class="pildora pildora-tema">${esc(n.tema)}</span>` : ''}
                <span class="pildora"><i class="bi bi-clock" aria-hidden="true"></i> ${n.minutos} min de lectura</span>
              </div>
              <h2 class="hero-articulo-titulo"><a class="stretched-link" href="${n.url}">${esc(n.titulo)}</a></h2>
            </div>
            <i class="bi bi-arrow-right hero-flecha" aria-hidden="true"></i>
          </article>`;
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
  // Bloques de la portada (Ajustes → Portada): «Nuestros productos» al azar con la barra de
  // filtros (fabricante, segunda mano y «En oferta», así el bloque de ofertas se puede ocultar),
  // «Productos en oferta» y «Últimas entradas del blog», con el mismo estilo que en el catálogo.
  // Si están desactivados o no tienen contenido, no se muestran.
  const hueco = raiz.querySelector('[data-bloques-portada]');
  if (hueco) {
    const P = BLOQUES.portada;
    const html = (P.catalogo.mostrar && productos.length ? seccionBloque('productos', { id: 'catalogo', titulo: 'Nuestros productos', conteo: productos.length, contenido: bloqueResumenCatalogo(P.catalogo.porPagina, true) }) : '')
      + (P.ofertas.mostrar && ofertas.length ? seccionBloque('ofertas', { id: 'ofertas', conteo: ofertas.length, contenido: bloqueOfertas(P.ofertas.porPagina) }) : '')
      + (P.blog.mostrar && noticias.length ? seccionBloque('blog', { id: 'ultimas-entradas', contenido: bloqueBlog(P.blog.porPagina) }) : '');
    hueco.insertAdjacentHTML('afterend', html);
    hueco.remove();
  }
  // Página de resultados del buscador (/buscar/): todas las tarjetas de productos con la barra de
  // filtros (public/js/buscar.js deja solo las que encuentra, por orden de relevancia), el bloque
  // del blog y las páginas, y lo que se ve sin resultados (sugerencias, «Pregúntanos» y los tipos)
  const huecoBuscador = raiz.querySelector('[data-buscador]');
  if (huecoBuscador) {
    const rejilla = rejillaProductos(productos, { porPagina: 12, filtro: true, maxSinJs: productos.length, etiqueta: 'Productos encontrados' })
      .replace('<div class="rejilla" data-rejilla', '<div class="rejilla" data-rejilla data-esperar');
    const pagContacto = paginas.find(x => /contacto/i.test(x.slug));
    const contacto = pagContacto ? pagContacto.url : '/paginas/contacto-y-horario/';
    huecoBuscador.insertAdjacentHTML('afterend', `
    <div data-busqueda-productos hidden>${seccionBloque('productos', { id: 'resultados-productos', titulo: 'Productos', sinEnlace: true, contenido: rejilla })}</div>
    <div data-busqueda-otros hidden>${seccionBloque('blog', { id: 'resultados-otros', titulo: 'En el blog y otras páginas', sinEnlace: true, contenido: '<div class="busqueda-lista" data-busqueda-lista></div>' })}</div>
    <section class="container seccion" data-busqueda-vacio hidden>
      <div class="busqueda-vacio">
        <div>
          <h2 class="busqueda-vacio-titulo" data-busqueda-vacio-titulo>¿Qué estás buscando?</h2>
          <ul class="busqueda-consejos">
            <li data-busqueda-solo-sin-resultados>Revisa cómo está escrito o prueba con menos palabras.</li>
            <li>Busca por el tipo de máquina, el fabricante o el modelo (p. ej. «remalladora», «Brother» o «R 50»).</li>
          </ul>
          <div class="busqueda-ayuda">
            <p class="busqueda-ayuda-titulo"><i class="bi bi-chat-dots-fill" aria-hidden="true"></i>¿No lo encuentras? Pregúntanos</p>
            <p>Muchas cosas no están en la web: te decimos si lo tenemos o si podemos conseguirlo.</p>
            <a class="btn btn-destacado" href="${esc(contacto)}">Contacto y horario</a>
          </div>
        </div>
        <div>${heroCatalogo()}</div>
      </div>
    </section>`);
    huecoBuscador.remove();
  }

  // Partes que solo tienen sentido con blog o con catálogo (p. ej. en la página 404)
  if (!noticias.length) raiz.querySelectorAll('[data-si-blog]').forEach(el => el.remove());
  if (SIN_CATALOGO || !categoriasPrincipales.length) raiz.querySelectorAll('[data-si-catalogo]').forEach(el => el.remove());
  raiz.querySelectorAll('[data-si-blog], [data-si-catalogo]').forEach(el => { el.removeAttribute('data-si-blog'); el.removeAttribute('data-si-catalogo'); });
  const bNoticias = raiz.querySelector('#bloque-noticias');
  if (bNoticias && bNoticias.hasAttribute('data-paginar')) {
    // Listado paginado (p. ej. /blog/): N por página, según los Ajustes
    const trozos = trocear(noticias, BLOQUES.blog.porPagina);
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

const generadas = new Set([...paginasBlog, ...[...noticias, ...paginas, ...productos, ...categorias, ...[null, ...categorias].map(c => ({ url: urlOfertas(c) })), { url: '/catalogo/' }, { url: '/presupuesto/' }, { url: URL_CONTACTO }, { url: URL_SOBRE }].map(x => path.join(DIST, x.url, 'index.html'))]);
for (const fichero of htmlsDe(DIST)) {
  if (generadas.has(fichero)) continue;
  const rel = '/' + path.relative(DIST, fichero).split(path.sep).join('/');
  // Sin entradas (y «Ocultarlos de toda la web»): la plantilla del blog no se publica
  if (SIN_BLOG && esBlog(rel)) { fs.rmSync(fichero); continue; }
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
  const totalPaginas = /data-paginar/.test(fuente) && ruta.endsWith('/') ? trocear(noticias, BLOQUES.blog.porPagina).length : 1;
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
      // Una categoría incluye todas las que cuelgan de ella; en el orden de Ajustes del sitio
      ...(function filtros(lista) {
        return lista.flatMap(c => [
          { label: `Categoría: ${[...c.ancestros, c].map(x => x.titulo).join(' › ')}`, field: 'categoria', pattern: `^(${[c, ...descendientesDe(c)].map(x => escRe(x.slug)).join('|')})$` },
          ...filtros(c.hijos),
        ]);
      })(categoriasPrincipales),
    ];
    doc.setIn(['collections', idx, 'view_filters'], doc.createNode([...fijos, ...nuevos]));
    fs.writeFileSync(rutaConfig, doc.toString());
  }
}
// Números del panel, con todos los ficheros tal como los ve el panel (también los «no disponibles»
// y los «solo para pruebas»), calculados en este despliegue:
//  - en el menú de la izquierda, cuántos elementos tiene cada sección «Catálogo: …»;
//  - en las listas de tipos, categorías y subcategorías, cuántos productos tiene cada una, contando
//    los de las que cuelgan de ella (dist/admin/conteos.json; lo pinta public/admin/campos.js).
{
  const metasDe = dir => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.md')) : []).map(f => {
    const m = fs.readFileSync(path.join(dir, f), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
    let meta = {};
    try { meta = m ? (leerYaml(m[1]) || {}) : {}; } catch { /* ya avisado al leer la colección */ }
    return { slug: f.replace(/\.md$/, ''), meta };
  });
  const rutaConfig = path.join(DIST, 'config.yml');
  const doc = parseDocument(fs.readFileSync(rutaConfig, 'utf8'));
  for (const col of doc.get('collections')?.items || []) {
    const etiqueta = String(col.get('label') || '');
    const carpeta = col.get('folder');
    if (!etiqueta.startsWith('Catálogo:') || !carpeta || col.get('hide') === true) continue;
    const filtro = col.get('filter')?.toJSON?.();
    const n = metasDe(carpeta).filter(x => !filtro || String(x.meta[filtro.field] ?? '') === String(filtro.value)).length;
    col.set('label', `${etiqueta} (${n})`);
  }
  fs.writeFileSync(rutaConfig, doc.toString());

  const cats = new Map(metasDe(`${PUB}/_categorias`).map(c => [c.slug, String(c.meta.padre || '').trim()]));
  const productosPorCategoria = Object.fromEntries([...cats.keys()].map(k => [k, 0]));
  for (const p of metasDe(`${PUB}/_productos`)) {
    // El producto cuenta en su categoría y en todas las de encima
    for (let c = String(p.meta.categoria || '').trim(), vistos = new Set(); c && cats.has(c) && !vistos.has(c); c = cats.get(c)) {
      vistos.add(c); productosPorCategoria[c]++;
    }
  }
  fs.writeFileSync(path.join(DIST, 'admin/conteos.json'), JSON.stringify({ productosPorCategoria }));
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
  const imgRuta = compartible(x.imagen) || x.imagenAuto;
  const imgFichero = imgRuta ? path.join(DIST, decodeURIComponent(imgRuta)) : '';
  const enclosure = imgFichero && fs.existsSync(imgFichero)
    ? `\n      <enclosure url="${esc(abs(imgRuta))}" length="${fs.statSync(imgFichero).size}" type="${TIPOS_IMG[path.extname(imgFichero).toLowerCase()] || 'image/jpeg'}"/>`
    : '';
  const categorias = [categoria];
  const intro = (x.imagen ? `<p><img src="${esc(abs(compartible(x.imagen)))}" alt="${esc(x.imagenAlt)}"></p>` : '') + extraHtml;
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

if (FEEDS[0]) escribirFeed(FEEDS[0], itemsNoticias);
if (SIN_BLOG) fs.rmSync(path.join(DIST, 'blog'), { recursive: true, force: true });

/* =========================================================
   13b. Fotos originales: no se publican
        De cada foto se publican sus versiones WebP (480, 960 y 1600 px) y, de la principal, un JPG
        de 1200 px para compartir. El original que sube el panel se queda en el repositorio, pero no
        en la web, salvo que algo generado lo siga usando (se busca su ruta en todo el HTML, JSON,
        CSS, JS y XML). Ahorra unos 5 ficheros y 1,4 MB por producto.
   ========================================================= */
const referenciasImg = new Set();
(function leerRefs(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { if (!(dir === DIST && ['pagefind', 'img'].includes(e.name))) leerRefs(f); continue; }
    if (!/\.(html?|xml|json|js|css|webmanifest|txt)$/i.test(e.name)) continue;
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/\/img\/[^"'<>()\\\n]+/g)) {
      for (let r of m[0].split(/,\s+/)) {
        r = r.replace(/^.*?(?=\/img\/)/, '').replace(/\s+\d+(\.\d+)?[wx]$/, '').replace(/&amp;/g, '&').trim();
        referenciasImg.add(r);
        try { referenciasImg.add(decodeURIComponent(r)); } catch { /* nada */ }
      }
    }
  }
})(DIST);
let originalesQuitados = 0, bytesQuitados = 0;
for (const ruta of new Set([...optimizadas.keys(), ...[...mapaImagenes].filter(([a, b]) => a !== b && optimizadas.has(b)).map(([a]) => a)])) {
  if (RESERVADAS.has(ruta) || referenciasImg.has(ruta) || referenciasImg.has(encodeURI(ruta))) continue;
  const f = path.join(DIST, decodeURIComponent(ruta));
  if (!fs.existsSync(f)) continue;
  bytesQuitados += fs.statSync(f).size;
  fs.rmSync(f);
  originalesQuitados++;
}

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
if (descripcionesAcortadas.length) nota(`${descripcionesAcortadas.length} página${descripcionesAcortadas.length === 1 ? '' : 's'} con la descripción para Google acortada automáticamente (más de ${MAX_DESCRIPCION} caracteres); en la web se sigue viendo el texto completo.`);
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
if (originalesQuitados) console.log(`Fotos originales no publicadas (se publican sus versiones WebP): ${originalesQuitados}, ${(bytesQuitados / 1048576).toFixed(1)} MB.`);
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
