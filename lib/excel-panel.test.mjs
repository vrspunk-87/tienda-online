// Pruebas de exportar, importar y cambiar en bloque desde el panel (fase 3): npm test
// Usan la configuración real del panel (public/config.yml) y fichas de ejemplo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ExcelJS from 'exceljs';
import * as YAML from 'yaml';
import {
  PERFILES, columnasDe, leerEntrada, crearContexto, planificarImportacion, planificarAccion,
  ACCION_BORRAR, VACIO, slugificar, nombreImagen, separar, quitarDelOrden,
} from '../public/admin/excel/nucleo.js';
import { crearLibro, leerLibro } from '../public/admin/excel/libro.js';

const cfg = YAML.parse(fs.readFileSync('public/config.yml', 'utf8'));
const col = cfg.collections.find(c => c.name === 'fabricantes');
const perfil = PERFILES.fabricantes;
const columnas = columnasDe(cfg, col, perfil);

const fichas = () => [
  leerEntrada(YAML, 'public/_fabricantes/alfa.md', '---\nprueba: false\ntitle: Alfa\nimagen: /img/fabricantes/alfa.png\n---\n'),
  leerEntrada(YAML, 'public/_fabricantes/elna.md', '---\nprueba: false\ntitle: ELNA\nimagen: /img/fabricantes/elna.png\n---\n'),
  leerEntrada(YAML, 'public/_fabricantes/toyota.md', '---\nprueba: true\ntitle: Toyota\nimagen: /img/fabricantes/toyota.png\n---\n'),
];
const ctx = () => crearContexto({
  productos: [{ slug: 'alfa-1', datos: { fabricante: 'alfa' } }, { slug: 'alfa-2', datos: { fabricante: 'alfa' } }],
  textos: [{ ruta: 'public/_datos/sobre-nosotros.yml', raw: 'logo: /img/fabricantes/elna.png' }],
});
const medios = () => new Map([['public/img/fabricantes', new Map([['alfa.png', 'h1'], ['elna.png', 'h2'], ['toyota.png', 'h3']])]]);

// Exporta, deja cambiar el libro y lo vuelve a leer como si se subiera
async function idaYVuelta(cambiar = () => {}, actuales = fichas(), despues = null) {
  const wb = await crearLibro(ExcelJS, { cfg, col, perfil, columnas, actuales, ctx: ctx(), meta: { fecha: '18-11-2026', rama: 'main', total: actuales.length } });
  cambiar(wb.getWorksheet(perfil.hoja));
  const buf = await wb.xlsx.writeBuffer();
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(buf);
  const leido = leerLibro(wb2, { col, perfil, columnas });
  assert.deepEqual(leido.errores, []);
  return planificarImportacion({ YAML, cfg, col, perfil, columnas, filas: leido.filas, actuales: despues || actuales, huellas: leido.huellas, medios: medios(), subidos: leido.subidos || new Map(), ctx: ctx(), ...(leido.extra || {}) });
}
const filaDe = (ws, slug) => { let r; ws.eachRow((row, n) => { if (row.getCell(1).value === slug) r = row; }); return r; };
const celda = (ws, row, titulo) => row.getCell(ws.getRow(1).values.findIndex(v => String(v).replace(/\s*\*$/, '') === titulo));

test('columnas de Fabricantes: identificador, acción, campos del panel y productos (solo lectura)', () => {
  assert.deepEqual(columnas.todas.map(c => c.titulo), [
    'Identificador', 'Acción', 'Solo para pruebas (no se publica en producción)', 'Nombre *', 'Imagen o logotipo', 'Productos (solo lectura)',
  ]);
});

test('exportar y volver a importar sin tocar nada no cambia nada', async () => {
  const plan = await idaYVuelta();
  assert.equal(plan.errores.length, 0);
  assert.equal(plan.sinCambios, 3);
  assert.equal(plan.escribir.length + plan.borrar.length, 0);
  assert.equal(plan.ignoradas, 20); // las filas preparadas para altas
});

test('exportar con imágenes (ZIP) y volver a subirlo todo sin tocar nada no cambia nada', async () => {
  const actuales = [leerEntrada(YAML, 'public/_fabricantes/jack.md', '---\nprueba: false\ntitle: Jack\nimagen: /img/fabricantes/Logo_Jack 2.png\n---\n')];
  const wb = await crearLibro(ExcelJS, { cfg, col, perfil, columnas, actuales, ctx: ctx(), meta: { fecha: 'hoy', rama: 'main', total: 1 } });
  const leido = leerLibro(wb, { col, perfil, columnas });
  const bytes = new Uint8Array([9, 9]);
  const medios = new Map([['public/img/fabricantes', new Map([['Logo_Jack 2.png', 'igual']])]]);
  const subidos = new Map([['Logo_Jack 2.png', { nombre: 'Logo_Jack 2.png', bytes, huella: 'igual' }]]);
  const plan = await planificarImportacion({ YAML, cfg, col, perfil, columnas, filas: leido.filas, actuales, huellas: leido.huellas, medios, subidos, ctx: ctx() });
  assert.deepEqual([plan.errores, plan.escribir.length, plan.sinCambios, [...plan.imagenesUsadas]], [[], 0, 1, ['Logo_Jack 2.png']]);
  // La misma imagen con otro contenido: se sustituye en su sitio, sin cambiar la ficha
  subidos.set('Logo_Jack 2.png', { nombre: 'Logo_Jack 2.png', bytes, huella: 'distinta' });
  const plan2 = await planificarImportacion({ YAML, cfg, col, perfil, columnas, filas: leido.filas, actuales, huellas: leido.huellas, medios, subidos, ctx: ctx() });
  assert.deepEqual(plan2.escribir.map(e => e.ruta), ['public/img/fabricantes/Logo_Jack 2.png']);
  assert.equal(plan2.sinCambios, 1);
});

test('el Excel lleva instrucciones, notas, listas ocultas y la columna de solo lectura bloqueada', async () => {
  const wb = await crearLibro(ExcelJS, { cfg, col, perfil, columnas, actuales: fichas(), ctx: ctx(), meta: { fecha: 'hoy', rama: 'main', total: 3 } });
  assert.deepEqual(wb.worksheets.map(h => [h.name, h.state]), [['Instrucciones', 'visible'], ['Fabricantes', 'visible'], ['Listas', 'hidden'], ['Notas', 'visible'], ['Control', 'veryHidden']]);
  const ws = wb.getWorksheet('Fabricantes');
  const alfa = filaDe(ws, 'alfa');
  assert.equal(celda(ws, alfa, 'Productos (solo lectura)').value, 2);
  assert.equal(celda(ws, alfa, 'Productos (solo lectura)').protection.locked, true);
  assert.equal(celda(ws, alfa, 'Nombre').protection.locked, false);
  assert.equal(celda(ws, alfa, 'Imagen o logotipo').value, 'alfa.png');
});

test('modificar: solo cambia el campo tocado; celda vacía no toca; (vacío) borra', async () => {
  const plan = await idaYVuelta(ws => {
    celda(ws, filaDe(ws, 'elna'), 'Nombre').value = 'Elna';
    celda(ws, filaDe(ws, 'alfa'), 'Nombre').value = null;          // vacía: no se toca
    celda(ws, filaDe(ws, 'toyota'), 'Imagen o logotipo').value = VACIO;
  });
  assert.deepEqual(plan.errores, []);
  assert.deepEqual(plan.modificados.map(m => [m.slug, m.cambios]), [
    ['elna', [{ campo: 'Nombre', antes: 'ELNA', despues: 'Elna' }]],
    ['toyota', [{ campo: 'Imagen o logotipo', antes: 'toyota.png', despues: '(vacío)' }]],
  ]);
  assert.equal(plan.escribir.find(e => e.ruta.endsWith('elna.md')).texto, '---\nprueba: false\ntitle: Elna\nimagen: /img/fabricantes/elna.png\n---\n');
  assert.equal(plan.escribir.find(e => e.ruta.endsWith('toyota.md')).texto, '---\nprueba: true\ntitle: Toyota\n---\n');
});

test('(vacío) en un obligatorio es un error', async () => {
  const plan = await idaYVuelta(ws => { celda(ws, filaDe(ws, 'alfa'), 'Nombre').value = VACIO; });
  assert.match(plan.errores[0].texto, /obligatorio/);
});

test('alta: identificador calculado como el panel, «-2» si ya existe y aviso si falta la imagen', async () => {
  const plan = await idaYVuelta(ws => {
    ws.getRow(5).getCell(4).value = 'Brother Ñandú';
    ws.getRow(6).getCell(4).value = 'Alfa';
    ws.getRow(7).getCell(4).value = 'Juki';
    ws.getRow(7).getCell(5).value = 'Juki Logo.PNG';
  });
  assert.equal(plan.errores.length, 1);
  assert.match(plan.errores[0].texto, /Falta la imagen «Juki Logo\.PNG»/);
  assert.deepEqual(plan.nuevos.map(n => n.slug), ['brother-nandu', 'alfa-2']);
  assert.equal(plan.escribir.find(e => e.ruta === 'public/_fabricantes/brother-nandu.md').texto, '---\nprueba: false\ntitle: Brother Ñandú\n---\n');
  assert.ok(plan.avisos.some(a => /alfa-2/.test(a.texto)));
});

test('alta con imagen subida: se guarda la imagen y la ficha apunta a ella', async () => {
  const wb = await crearLibro(ExcelJS, { cfg, col, perfil, columnas, actuales: fichas(), ctx: ctx(), meta: { fecha: 'hoy', rama: 'main', total: 3 } });
  const ws = wb.getWorksheet('Fabricantes');
  ws.getRow(5).getCell(4).value = 'Juki';
  ws.getRow(5).getCell(5).value = 'juki.png';
  const leido = leerLibro(wb, { col, perfil, columnas });
  const subidos = new Map([['juki.png', { nombre: 'juki.png', bytes: new Uint8Array([1, 2, 3]), huella: 'x' }]]);
  const plan = await planificarImportacion({ YAML, cfg, col, perfil, columnas, filas: leido.filas, actuales: fichas(), huellas: leido.huellas, medios: medios(), subidos, ctx: ctx() });
  assert.deepEqual(plan.errores, []);
  assert.ok(plan.escribir.some(e => e.ruta === 'public/img/fabricantes/juki.png' && e.bytes));
  assert.match(plan.escribir.find(e => e.ruta.endsWith('juki.md')).texto, /imagen: \/img\/fabricantes\/juki\.png/);
});

test('borrar: no si tiene productos; sí si no, con su imagen salvo que la use otra ficha', async () => {
  const plan = await idaYVuelta(ws => {
    celda(ws, filaDe(ws, 'alfa'), 'Acción').value = ACCION_BORRAR;
    celda(ws, filaDe(ws, 'elna'), 'Acción').value = ACCION_BORRAR;
    celda(ws, filaDe(ws, 'toyota'), 'Acción').value = ACCION_BORRAR;
  });
  assert.equal(plan.errores.length, 1);
  assert.match(plan.errores[0].texto, /Alfa.*2 productos/);
  assert.deepEqual(plan.borrados.map(b => b.slug), ['elna', 'toyota']);
  assert.deepEqual(plan.borrar.sort(), ['public/_fabricantes/elna.md', 'public/_fabricantes/toyota.md', 'public/img/fabricantes/toyota.png']);
});

test('una ficha cambiada en el panel después de exportar no se toca', async () => {
  const despues = fichas();
  despues[1] = leerEntrada(YAML, 'public/_fabricantes/elna.md', '---\nprueba: false\ntitle: Elna Suiza\nimagen: /img/fabricantes/elna.png\n---\n');
  const plan = await idaYVuelta(ws => { celda(ws, filaDe(ws, 'elna'), 'Nombre').value = 'Elna'; }, fichas(), despues);
  assert.equal(plan.modificados.length, 0);
  assert.match(plan.avisos[0].texto, /se cambió en el panel/);
});

test('acciones en bloque: «Solo para pruebas» y eliminar', async () => {
  const actuales = fichas();
  const poner = await planificarAccion({ YAML, col, perfil, columnas, actuales, slugs: ['alfa', 'toyota'], accion: 'prueba-poner', ctx: ctx() });
  assert.equal(poner.modificados.length, 1);
  assert.equal(poner.sinCambios, 1);
  assert.equal(poner.escribir[0].texto, '---\nprueba: true\ntitle: Alfa\nimagen: /img/fabricantes/alfa.png\n---\n');
  const borrar = await planificarAccion({ YAML, col, perfil, columnas, actuales, slugs: ['alfa', 'toyota'], accion: 'borrar', ctx: ctx() });
  assert.equal(borrar.errores.length, 1);
  assert.deepEqual(borrar.borrar, ['public/_fabricantes/toyota.md', 'public/img/fabricantes/toyota.png']);
});

test('utilidades: identificadores y nombres de imagen como el panel; front matter con CRLF', () => {
  assert.equal(slugificar('Husqvarna Viking®'), 'husqvarna-viking');
  assert.equal(nombreImagen('C:\\fotos\\Logo Ñ.PNG'), 'logo-n.png');
  assert.deepEqual(separar('---\r\ntitle: A\r\n---\r\nhola\r\n'), { fm: 'title: A', cuerpo: 'hola\n' });
});

test('todos los fabricantes reales: exportar y volver a importar no cambia nada', async () => {
  const dir = 'public/_fabricantes';
  const reales = fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => leerEntrada(YAML, `${dir}/${f}`, fs.readFileSync(`${dir}/${f}`, 'utf8')));
  const mediosReales = new Map([['public/img/fabricantes', new Map(fs.readdirSync('public/img/fabricantes').map(n => [n, 'x']))]]);
  const wb = await crearLibro(ExcelJS, { cfg, col, perfil, columnas, actuales: reales, ctx: ctx(), meta: { fecha: 'hoy', rama: 'main', total: reales.length } });
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(await wb.xlsx.writeBuffer());
  const leido = leerLibro(wb2, { col, perfil, columnas });
  const plan = await planificarImportacion({ YAML, cfg, col, perfil, columnas, filas: leido.filas, actuales: reales, huellas: leido.huellas, medios: mediosReales, ctx: ctx() });
  assert.deepEqual(plan.errores, []);
  assert.equal(plan.sinCambios, reales.length);
  assert.equal(plan.escribir.length, 0);
});

/* ---------- Catálogo: tipos de producto, categorías y subcategorías (datos reales) ---------- */
const leerCarpeta = dir => fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => leerEntrada(YAML, `${dir}/${f}`, fs.readFileSync(`${dir}/${f}`, 'utf8')));
const todasCat = leerCarpeta('public/_categorias');
const productosReales = leerCarpeta('public/_productos');
const sitio = { ruta: 'public/_datos/sitio.yml', raw: fs.readFileSync('public/_datos/sitio.yml', 'utf8') };
const ctxCat = () => crearContexto({ productos: productosReales, categorias: todasCat, sitio });
const nivelDe = nombre => cfg.collections.find(c => c.name === nombre);

async function idaYVueltaCat(nombre, cambiar = () => {}) {
  const c = nivelDe(nombre);
  const p = PERFILES[nombre];
  const cols = columnasDe(cfg, c, p);
  const actuales = todasCat.filter(a => a.datos.nivel === c.filter.value);
  const wb = await crearLibro(ExcelJS, { cfg, col: c, perfil: p, columnas: cols, actuales, ctx: ctxCat(), meta: { fecha: 'hoy', rama: 'main', total: actuales.length } });
  const ws = wb.getWorksheet(p.hoja);
  cambiar(ws, cols);
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(await wb.xlsx.writeBuffer());
  const leido = leerLibro(wb2, { col: c, perfil: p, columnas: cols });
  assert.deepEqual(leido.errores, []);
  const medios = new Map([['public/img/catalogo', new Map()]]);
  return { plan: await planificarImportacion({ YAML, cfg, col: c, perfil: p, columnas: cols, filas: leido.filas, actuales, ocupados: new Set(todasCat.map(a => a.slug)), huellas: leido.huellas, medios, ctx: ctxCat() }), ws, actuales, cols };
}
const col_ = (ws, titulo) => ws.getRow(1).values.findIndex(v => String(v).replace(/\s*\*$/, '') === titulo);

test('catálogo: exportar y volver a importar los tres niveles reales no cambia nada', async () => {
  for (const nombre of ['tipos', 'categorias', 'subcategorias']) {
    const { plan, actuales } = await idaYVueltaCat(nombre);
    assert.deepEqual(plan.errores, [], nombre);
    assert.equal(plan.escribir.length, 0, nombre);
    assert.equal(plan.sinCambios, actuales.length, nombre);
  }
});

test('catálogo: el padre se ve y se elige por su ruta («Tipo › Categoría»)', async () => {
  const { ws } = await idaYVueltaCat('subcategorias');
  const fila = (() => { let r; ws.eachRow((row, n) => { if (row.getCell(1).value === '1-cabezal') r = row; }); return r; })();
  assert.equal(fila.getCell(col_(ws, 'Categoría')).value, 'Bordadoras › Industriales');
});

test('catálogo: alta de una subcategoría con su categoría y nivel; mover de sitio; padre inexistente', async () => {
  const { plan } = await idaYVueltaCat('subcategorias', (ws) => {
    const libre = ws.rowCount - 19;
    ws.getRow(libre).getCell(col_(ws, 'Nombre')).value = 'Bordadoras industriales'; // ese identificador ya es de una categoría
    ws.getRow(libre).getCell(col_(ws, 'Categoría')).value = 'Bordadoras › Industriales';
    ws.getRow(libre + 1).getCell(col_(ws, 'Nombre')).value = 'Rara';
    ws.getRow(libre + 1).getCell(col_(ws, 'Categoría')).value = 'No existe';
  });
  assert.equal(plan.errores.length, 1);
  assert.match(plan.errores[0].texto, /«No existe» no es una categoría/);
  const nueva = plan.escribir.find(e => e.ruta.startsWith('public/_categorias/bordadoras-industriales'));
  assert.equal(nueva.ruta, 'public/_categorias/bordadoras-industriales-2.md');
  assert.match(nueva.texto, /nivel: subcategoria/);
  assert.match(nueva.texto, /padre: bordadoras-industriales/);
  assert.ok(plan.avisos.some(a => /Orden del catálogo/.test(a.texto)));
});

test('catálogo: no se borra un tipo con categorías; al borrar una subcategoría vacía sale del orden del menú', async () => {
  const ctx = ctxCat();
  const vacia = todasCat.find(a => a.datos.nivel === 'subcategoria' && !ctx.catalogo.productosTotal(a.slug) && new RegExp(`- (categoria: )?${a.slug}\\r?$`, 'm').test(sitio.raw));
  assert.ok(vacia, 'hay alguna subcategoría sin productos en el orden del menú');
  const { plan } = await idaYVueltaCat('subcategorias', (ws) => {
    ws.eachRow(row => { if (row.getCell(1).value === vacia.slug) row.getCell(2).value = ACCION_BORRAR; });
  });
  assert.deepEqual(plan.errores, []);
  assert.deepEqual(plan.borrados.map(b => b.slug), [vacia.slug]);
  const nuevoSitio = plan.escribir.find(e => e.ruta === sitio.ruta).texto;
  const antes = sitio.raw.replace(/\r\n/g, '\n').split('\n');
  const despues = nuevoSitio.replace(/\r\n/g, '\n').split('\n');
  assert.equal(antes.length - despues.length, 1);
  assert.deepEqual(antes.filter(l => !despues.includes(l)).map(l => l.trim().replace('categoria: ', '')), [`- ${vacia.slug}`]);
  const tipos = await idaYVueltaCat('tipos', (ws) => { ws.getRow(2).getCell(2).value = ACCION_BORRAR; });
  assert.match(tipos.plan.errores[0].texto, /Tiene \d+ categor/);
});

test('quitarDelOrden: quita también las anidadas y conserva lo demás', () => {
  const raw = 'a: 1\ncatalogo_orden:\n  - categoria: t\n    hijos:\n      - categoria: c1\n      - categoria: c2\n  - categoria: u\nb: 2\n';
  assert.equal(quitarDelOrden(YAML, raw, new Set(['c1', 'u'])), 'a: 1\ncatalogo_orden:\n  - categoria: t\n    hijos:\n      - categoria: c2\nb: 2\n');
  assert.equal(quitarDelOrden(YAML, raw, new Set(['zz'])), null);
});
