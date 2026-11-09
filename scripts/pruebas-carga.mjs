/*
  Entorno local de pruebas con carga: llena la web de productos y entradas del blog de prueba
  para verla y probarla con volumen (menús, filtros, paginación, buscador, solicitud…).

  Uso (desde la carpeta del proyecto):
    node scripts/pruebas-carga.mjs pequena     40 productos y 10 entradas
    node scripts/pruebas-carga.mjs media      150 productos y 40 entradas
    node scripts/pruebas-carga.mjs grande     500 productos y 120 entradas (la primera compilación tarda)
    node scripts/pruebas-carga.mjs sin-blog   150 productos y ninguna entrada (prueba «Secciones sin contenido»)
    node scripts/pruebas-carga.mjs solo-blog  ningún producto y 20 entradas (ídem: sin catálogo ni solicitud)
    node scripts/pruebas-carga.mjs limpiar    quita todo lo generado
  y después «npm run web» (http://localhost:3000). Cada escenario borra antes el anterior.

  Lo generado:
  - va marcado «Solo para pruebas» (prueba: true): aunque se subiera, la web de producción no lo
    publica;
  - no se sube a GitHub (.gitignore): public/_productos/prueba-carga-*.md,
    public/_posts/blog/<año>/*-prueba-carga-*.md, public/img/productos/prueba-carga-* y
    public/img/blog/prueba-carga-*;
  - usa las categorías y fabricantes reales del panel, y mezcla todos los casos: de 0 a 5 fotos,
    precios redondos y con céntimos, ofertas, precio a consultar, no disponibles, segunda mano, accesorios con modelos compatibles,
    destacados y ficha técnica;
  - las fotos (dibujos de colores, sin texto) salen de un juego de 48 que se reutiliza, copiadas
    con un nombre por producto: la web tiene los mismos ficheros que con fotos reales, pero la
    compilación solo tiene que optimizar 48. El juego se guarda en node_modules/.cache.
*/
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { parse } from 'yaml';

const ESCENARIOS = {
  pequena: [40, 10], media: [150, 40], grande: [500, 120], 'sin-blog': [150, 0], 'solo-blog': [0, 20], limpiar: [0, 0],
};
const escenario = process.argv[2];
if (!ESCENARIOS[escenario]) {
  console.log(`Uso: node scripts/pruebas-carga.mjs <${Object.keys(ESCENARIOS).join('|')}>`);
  process.exit(1);
}
const [N, M] = ESCENARIOS[escenario];
const PREFIJO = 'prueba-carga';
const DIR_PROD = 'public/_productos';
const DIR_BLOG = 'public/_posts/blog';
// Las mismas carpetas que usa el panel para las fotos
const DIR_IMG = 'public/img/productos';
const DIR_IMG_BLOG = 'public/img/blog';
const JUEGO = 'node_modules/.cache/tienda-pruebas';

/* ---------- Limpiar lo anterior ---------- */
let quitados = 0;
function quitar(dir, filtro) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) quitar(f, filtro);
    else if (filtro(e.name)) { fs.rmSync(f); quitados++; }
  }
}
quitar(DIR_PROD, n => n.startsWith(PREFIJO));
quitar(DIR_BLOG, n => n.includes(`-${PREFIJO}-`));
quitar(DIR_IMG, n => n.startsWith(PREFIJO));
quitar(DIR_IMG_BLOG, n => n.startsWith(PREFIJO));
// Carpetas de años que se han quedado vacías
if (fs.existsSync(DIR_BLOG)) for (const d of fs.readdirSync(DIR_BLOG)) {
  const f = path.join(DIR_BLOG, d);
  if (fs.statSync(f).isDirectory() && !fs.readdirSync(f).length) fs.rmdirSync(f);
}
if (escenario === 'limpiar') {
  console.log(`Contenido de prueba quitado (${quitados} ficheros). Ejecuta «npm run web» para ver la web sin él.`);
  process.exit(0);
}

/* ---------- Azar repetible (mismo escenario = mismo contenido) ---------- */
let semilla = 20261108;
const azar = n => { semilla = (semilla * 9301 + 49297) % 233280; return Math.floor(semilla / 233280 * n); };
const elige = a => a[azar(a.length)];
const pct = p => azar(100) < p;

/* ---------- Juego de fotos ---------- */
const W = 1600, H = 1200, N_JUEGO = 48;
fs.mkdirSync(JUEGO, { recursive: true });
async function fotoJuego(k) {
  const f = path.join(JUEGO, `foto-${k}.jpg`);
  if (fs.existsSync(f)) return f;
  let s = 7919 * (k + 1);
  const r = n => { s = (s * 9301 + 49297) % 233280; return Math.floor(s / 233280 * n); };
  const tono = r(360);
  const c = (dt, l) => `hsl(${(tono + dt) % 360},${35 + r(30)}%,${l}%)`;
  let formas = '';
  for (let i = 0; i < 10; i++) formas += `<circle cx="${r(W)}" cy="${r(H)}" r="${80 + r(260)}" fill="${c(r(80), 55 + r(25))}" opacity="0.45"/>`;
  // Silueta sencilla de una máquina de coser: brazo, cabezal, aguja y base
  const m = `<g fill="#ffffff" opacity="0.92">
    <rect x="380" y="820" width="840" height="90" rx="24"/>
    <rect x="420" y="430" width="140" height="400" rx="40"/>
    <rect x="420" y="400" width="700" height="150" rx="60"/>
    <rect x="1020" y="400" width="140" height="300" rx="40"/>
    <rect x="1075" y="690" width="16" height="110"/>
    <circle cx="560" cy="475" r="38" fill="${c(0, 40)}"/>
  </g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c(0, 70)}"/><stop offset="1" stop-color="${c(40, 45)}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>${formas}${m}</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 80, mozjpeg: true }).toFile(f);
  return f;
}
const juego = [];
for (let k = 0; k < N_JUEGO; k++) juego.push(await fotoJuego(k));
fs.mkdirSync(DIR_IMG, { recursive: true });
fs.mkdirSync(DIR_IMG_BLOG, { recursive: true });
let nFotos = 0;
function foto(nombre, dir = DIR_IMG) {
  fs.copyFileSync(elige(juego), path.join(dir, nombre));
  nFotos++;
  return `/${path.relative('public', dir).split(path.sep).join('/')}/${nombre}`;
}

/* ---------- Catálogo real: categorías y fabricantes ---------- */
const frontmatter = t => parse(t.replace(/\r/g, '').match(/^---\n([\s\S]*?)\n---/)?.[1] || '') || {};
const leerDir = dir => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.md'))
  .map(f => ({ slug: f.slice(0, -3), ...frontmatter(fs.readFileSync(path.join(dir, f), 'utf8')) })) : []);
const cats = leerDir('public/_categorias').filter(c => !c.prueba);
const fabs = leerDir('public/_fabricantes').filter(f => !f.prueba);
if (N && (!cats.length || !fabs.length)) {
  console.error('Faltan categorías o fabricantes en el panel (public/_categorias, public/_fabricantes).');
  process.exit(1);
}
const tipoDe = c => { let x = c; for (let i = 0; x?.padre && i < 5; i++) x = cats.find(y => y.slug === x.padre) || null; return x?.slug; };
const hojas = cats.filter(c => !cats.some(x => x.padre === c.slug));

const hoy = new Date();
const dia = d => new Date(hoy.getTime() + d * 864e5).toISOString().slice(0, 10);
const yaml = t => JSON.stringify(String(t)); // texto entre comillas, válido en YAML

const DESTACADOS = ['Enhebrador automático', 'Motor reforzado', 'Luz LED', 'Brazo libre', 'Incluye funda', 'Arrastre superior', '23 puntadas', 'Pedal electrónico', 'Velocidad regulable', 'Cortahilos automático'];
const FICHA = [['Puntadas', () => `${8 + azar(200)}`], ['Peso', () => `${(4 + azar(120) / 10).toFixed(1).replace('.', ',')} kg`], ['Potencia', () => `${50 + azar(500)} W`],
  ['Velocidad', () => `${600 + azar(50) * 100} ppm`], ['Garantía', () => `${1 + azar(5)} años`], ['Dimensiones', () => `${30 + azar(40)} x ${15 + azar(20)} x ${25 + azar(20)} cm`]];
const TEXTO = [
  'Pensada para coser con comodidad tejidos finos y gruesos, con un arrastre uniforme y una puntada regular.',
  'Incluye los accesorios básicos, el manual en español y la garantía del fabricante.',
  'En la tienda te la enseñamos funcionando y te explicamos su mantenimiento antes de llevártela.',
  'Admite prensatelas opcionales para cremalleras, dobladillos, botones y acolchado.',
  'Es una opción equilibrada para quien empieza y para quien ya cose a menudo y busca algo más robusto.',
];
const parrafos = n => Array.from({ length: n }, () => elige(TEXTO) + ' ' + elige(TEXTO)).join('\n\n');

/* ---------- Productos ---------- */
const lista = [];
for (let i = 1; i <= N; i++) {
  const c = elige(hojas), fab = elige(fabs);
  const num = String(i).padStart(4, '0');
  lista.push({ i, c, fab, num, slug: `${PREFIJO}-${num}`, modelo: `${fab.title.slice(0, 2).toUpperCase()}-${100 + i}`, esAcc: tipoDe(c) === 'accesorios' });
}
const maquinas = lista.filter(x => !x.esAcc).map(x => x.slug);
const cuenta = { oferta: 0, consultar: 0, noDisp: 0, segunda: 0, sinFoto: 0, accesorios: 0 };
fs.mkdirSync(DIR_PROD, { recursive: true });
for (const x of lista) {
  const noDisp = pct(3), oferta = !noDisp && pct(15), segunda = !x.esAcc && pct(10), consultar = !oferta && pct(8);
  const nImg = pct(4) ? 0 : 1 + azar(5);
  // Algunos con céntimos (la mitad de los accesorios y 1 de cada 5 máquinas), para ver los dos formatos
  const centimos = pct(x.esAcc ? 50 : 20) ? elige([0.5, 0.95, 0.99, 0.9, 0.25]) : 0;
  const precio = (x.esAcc ? 5 + azar(150) : 120 + azar(3800)) + centimos;
  const imgs = Array.from({ length: nImg }, (_, k) => `  - imagen: ${foto(`${x.slug}-${k + 1}.jpg`)}\n    alt: ${yaml(`${x.c.title} ${x.fab.title} ${x.modelo}, foto ${k + 1}`)}`);
  const compat = x.esAcc && maquinas.length ? [...new Set(Array.from({ length: 1 + azar(4) }, () => elige(maquinas)))] : [];
  Object.entries({ oferta, consultar, noDisp, segunda, sinFoto: !nImg, accesorios: x.esAcc }).forEach(([k, v]) => { if (v) cuenta[k]++; });
  const destacados = [...new Set(Array.from({ length: 3 + azar(3) }, () => elige(DESTACADOS)))];
  fs.writeFileSync(path.join(DIR_PROD, `${x.slug}.md`), `---
prueba: true
title: ${yaml(`${x.c.title} ${x.fab.title} ${x.modelo}`)}
fabricante: ${x.fab.slug}
modelo: ${yaml(x.modelo)}
referencia: ${yaml(`PC-${x.num}`)}
categoria: ${x.c.slug}
${compat.length ? `compatible_con:\n${compat.map(s => `  - ${s}`).join('\n')}\n` : ''}date: ${dia(-azar(700))}T10:00:00.000+01:00
${consultar ? '' : `precio: ${precio}\n`}estado: ${noDisp ? 'no_disponible' : oferta ? 'oferta' : 'disponible'}
${oferta ? `oferta:\n  precio: ${centimos ? (Math.floor(precio * (0.7 + azar(25) / 100)) + 0.95).toFixed(2) : Math.round(precio * (0.7 + azar(25) / 100))}\n  inicio: ${dia(-azar(10))}\n  fin: ${dia(3 + azar(40))}\n` : ''}condicion: ${segunda ? 'segunda_mano' : 'nuevo'}
${segunda ? 'segunda_mano:\n  estado: Muy buen estado\n  garantia: 12\n' : ''}${imgs.length ? `imagenes:\n${imgs.join('\n')}\n` : ''}description: ${yaml(`${x.c.title} de ${x.fab.title}, modelo ${x.modelo}. Producto de prueba.`)}
destacados:
${destacados.map(t => `  - texto: ${yaml(t)}`).join('\n')}
caracteristicas:
${FICHA.slice(0, 3 + azar(4)).map(([n, v]) => `  - nombre: ${yaml(n)}\n    valor: ${yaml(v())}`).join('\n')}
---
${parrafos(2 + azar(3))}
`);
}

/* ---------- Entradas del blog ---------- */
const TEMAS = ['Consejos', 'Mantenimiento', 'Novedades', 'Accesorios', 'Tutoriales'];
const TITULOS = ['Cómo elegir tu primera máquina de coser', 'Cinco trucos para enhebrar sin esfuerzo', 'Qué aceite usar y cada cuánto', 'Overlock o recubridora: diferencias',
  'Prensatelas que todo taller debería tener', 'Cómo coser tejidos elásticos', 'Guía rápida de agujas', 'Mantenimiento antes del verano'];
for (let j = 1; j <= M; j++) {
  const fecha = dia(-j * 4 - azar(3));
  const dir = path.join(DIR_BLOG, fecha.slice(0, 4));
  fs.mkdirSync(dir, { recursive: true });
  const conFoto = !pct(10);
  fs.writeFileSync(path.join(dir, `${fecha}-${PREFIJO}-${j}.md`), `---
prueba: true
layout: blog
title: ${yaml(`${elige(TITULOS)} (prueba ${j})`)}
date: ${fecha}T09:00:00.000Z
tema: ${elige(TEMAS)}
description: ${yaml('Entrada de prueba para ver el blog, el buscador y la portada con volumen.')}
${conFoto ? `thumbnail: ${foto(`${PREFIJO}-${j}.jpg`, DIR_IMG_BLOG)}\nthumbnail_alt: ${yaml(`Imagen de la entrada de prueba ${j}`)}\n` : ''}---
${Array.from({ length: 3 + azar(5) }, (_, k) => `${k && pct(40) ? `## Apartado ${k}\n\n` : ''}${parrafos(1)}`).join('\n\n')}
`);
}

console.log(`Escenario «${escenario}»: ${N} productos y ${M} entradas de prueba, ${nFotos} fotos.`);
if (N) console.log(`  ${cuenta.oferta} en oferta, ${cuenta.consultar} con precio a consultar, ${cuenta.noDisp} no disponibles, ${cuenta.segunda} de segunda mano, ${cuenta.accesorios} accesorios, ${cuenta.sinFoto} sin fotos.`);
console.log('Ahora: «npm run web» y abre http://localhost:3000. Para quitarlo: «node scripts/pruebas-carga.mjs limpiar».');
