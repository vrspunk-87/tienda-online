/*
  Exportar, importar y cambiar en bloque desde el panel (docs/PLAN.md, fase 3): el fichero Excel.
  Crea el libro que se descarga y lee el que se sube. La librería ExcelJS se recibe como parámetro
  (en el navegador, /admin/vendor/exceljs.min.js; en Node, el paquete «exceljs»).

  Hojas: «Instrucciones» (la primera que se ve), la de datos (p. ej. «Fabricantes»), «Notas» (qué es
  cada columna), «Listas» (oculta: opciones de los desplegables) y «Control» (muy oculta: colección,
  rama, fecha y la huella de cada ficha al exportar, para saber si alguien la cambió después).
*/
import {
  COL_ID, COL_ACCION, ACCION_EDITAR, ACCION_BORRAR, VACIO, SI, NO, IGNORADAS, RE_SOLO_LECTURA,
  aCelda, opcionesSelect, opcionesCatalogo, nivelElegido, huellaTexto, valorCelda, maxBytes,
} from './nucleo.js';

const FILAS_PREPARADAS = 20;      // filas vacías con «Crear/Editar» para dar de alta
const FILAS_DESPLEGABLES = 2000;  // hasta dónde llegan los desplegables
const GRIS = 'FFE9ECEF';
const GRIS_CABECERA = 'FFD0D5DB';
const AZUL = 'FF1F4E79';

const letra = n => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

function textoInstrucciones({ perfil, col, columnas, meta }) {
  const imagenes = columnas.campos.some(c => c.widget === 'image');
  const obligatorios = columnas.campos.filter(c => c.obligatorio).map(c => `«${c.f.label}»`);
  const lectura = columnas.todas.filter(c => c.tipo === 'lectura').map(c => `«${c.titulo}»`);
  return [
    [`Cómo usar este Excel · ${perfil.hoja}`, 'titulo'],
    [`Exportado el ${meta.fecha} · rama ${meta.rama} · ${meta.total} ${meta.total === 1 ? perfil.uno : perfil.varios}`, 'gris'],
    ['', ''],
    ['Modificar', 'apartado'],
    [`Cambia las celdas que quieras en la hoja «${perfil.hoja}». Una celda vacía no cambia nada; para borrar un dato, escribe ${VACIO}.`, ''],
    ['Dar de alta', 'apartado'],
    [`Usa una de las filas vacías del final (o añade filas) y deja «${COL_ID}» en blanco: se crea a partir del nombre, como en el panel.`
      + (obligatorios.length ? ` Obligatorio: ${obligatorios.join(', ')}.` : ''), ''],
    ['Borrar', 'apartado'],
    [`Pon «${ACCION_BORRAR}» en «${COL_ACCION}». Que una fila falte en el Excel no borra nada.`
      + (perfil.motivoNoBorrar ? ' No se puede borrar lo que usan otras fichas: el informe te dirá cuáles.' : ''), ''],
    ...(imagenes ? [
      ['Imágenes', 'apartado'],
      ['Escribe el nombre del fichero (p. ej. brother.png) y súbelo junto al Excel al importar, o dentro de un ZIP con el Excel. Si la imagen ya está en la web, basta con su nombre.', ''],
    ] : []),
    ['No toques', 'apartado'],
    [`«${COL_ID}» de las filas que ya existen (cambiarlo crea otra ficha)${lectura.length ? ` ni las columnas en gris (${lectura.join(', ')}): son informativas y se ignoran al importar` : ''}.`, ''],
    ['Importar', 'apartado'],
    [`Panel → «${col.label || perfil.hoja}» → engranaje → «Importar Excel». Antes de guardar nada verás un informe con lo nuevo, lo modificado, lo que se borra y los errores (con su fila). Con un solo error no se guarda nada.`, ''],
    ['Si alguien cambia una ficha en el panel después de exportar, la importación no la toca y lo avisa: exporta de nuevo para trabajar con la versión actual.', 'gris'],
    ['La hoja «Notas» explica cada columna.', 'gris'],
  ];
}

export async function crearLibro(ExcelJS, { cfg, col, perfil, columnas, actuales, ctx, meta }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Panel de Máquinas de Coser Zafra';
  wb.created = new Date();

  /* Instrucciones */
  const ins = wb.addWorksheet('Instrucciones', { properties: { tabColor: { argb: AZUL } } });
  ins.getColumn(1).width = 110;
  for (const [texto, estilo] of textoInstrucciones({ perfil, col, columnas, meta })) {
    const r = ins.addRow([texto]);
    const c = r.getCell(1);
    c.alignment = { wrapText: true, vertical: 'top' };
    if (estilo === 'titulo') c.font = { size: 15, bold: true, color: { argb: AZUL } };
    if (estilo === 'apartado') c.font = { bold: true };
    if (estilo === 'gris') c.font = { color: { argb: 'FF6C757D' } };
  }

  /* Datos */
  const ws = wb.addWorksheet(perfil.hoja, { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
  const listas = wb.addWorksheet('Listas', { state: 'hidden' });
  let colLista = 0;
  const lista = (titulo, valores) => {
    const L = letra(colLista++);
    listas.getCell(`${L}1`).value = titulo;
    valores.forEach((v, i) => { listas.getCell(`${L}${i + 2}`).value = v; });
    return `Listas!$${L}$2:$${L}$${Math.max(2, valores.length + 1)}`;
  };
  const listaAccion = lista(COL_ACCION, [ACCION_EDITAR, ACCION_BORRAR]);
  const listaSiNo = lista('Sí / No', [SI, NO]);

  ws.columns = columnas.todas.map(c => ({
    header: c.titulo,
    key: c.titulo,
    width: c.tipo === 'id' ? 24 : c.tipo === 'accion' ? 14 : c.tipo === 'lectura' ? 16 : (c.widget === 'text' || c.widget === 'markdown') ? 50 : 28,
    style: { protection: { locked: c.tipo === 'lectura' }, ...(c.tipo === 'lectura' ? { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } }, font: { color: { argb: 'FF495057' } } } : {}) },
  }));

  const clave = a => (perfil.clave ? perfil.clave(a, ctx) : perfil.nombre(a.datos));
  const ordenados = [...actuales].sort((a, b) => clave(a).localeCompare(clave(b), 'es'));
  for (const a of ordenados) {
    const fila = {};
    for (const c of columnas.todas) {
      if (c.tipo === 'id') fila[c.titulo] = a.slug;
      else if (c.tipo === 'accion') fila[c.titulo] = ACCION_EDITAR;
      else if (c.tipo === 'lectura') fila[c.titulo] = c.l.valor(a.slug, ctx);
      else fila[c.titulo] = aCelda(c, a.datos, a.cuerpo, ctx);
    }
    ws.addRow(fila);
  }
  for (let i = 0; i < FILAS_PREPARADAS; i++) ws.addRow({ [COL_ACCION]: ACCION_EDITAR });

  // Cabecera: negrita, gris, bloqueada (no se pueden cambiar los títulos)
  const cab = ws.getRow(1);
  cab.height = 30;
  columnas.todas.forEach((c, i) => {
    const celda = cab.getCell(i + 1);
    celda.font = { bold: true };
    celda.alignment = { vertical: 'middle', wrapText: true };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.tipo === 'lectura' ? GRIS : GRIS_CABECERA } };
    celda.protection = { locked: true };
    if (c.tipo === 'campo' && c.f.hint) celda.note = c.f.hint;
  });
  // Las celdas con datos heredan la protección de su columna
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    columnas.todas.forEach((c, i) => {
      const celda = row.getCell(i + 1);
      celda.protection = { locked: c.tipo === 'lectura' };
      if (c.tipo === 'lectura') celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } };
      if (c.widget === 'text' || c.widget === 'markdown') celda.alignment = { wrapText: true, vertical: 'top' };
    });
  });

  // Desplegables
  const rango = i => `${letra(i)}2:${letra(i)}${FILAS_DESPLEGABLES}`;
  columnas.todas.forEach((c, i) => {
    let formula = null;
    if (c.tipo === 'accion') formula = listaAccion;
    else if (c.widget === 'boolean') formula = listaSiNo;
    else if (c.widget === 'select') formula = lista(c.f.label, opcionesSelect(c.f).map(o => o.etiqueta));
    else if (c.widget === 'categoria-catalogo') formula = lista(c.f.label, opcionesCatalogo(c, ctx).map(o => o.etiqueta));
    if (!formula) return;
    ws.dataValidations.add(rango(i), {
      type: 'list', allowBlank: true, formulae: [formula],
      showErrorMessage: true, errorStyle: 'warning', errorTitle: c.titulo,
      error: c.tipo === 'accion' ? `Elige «${ACCION_EDITAR}» o «${ACCION_BORRAR}».` : 'Elige una opción de la lista.',
    });
  });
  ws.autoFilter = { from: 'A1', to: `${letra(columnas.todas.length - 1)}1` };
  await ws.protect('', {
    selectLockedCells: true, selectUnlockedCells: true, formatCells: true, formatColumns: true,
    formatRows: true, insertRows: true, deleteRows: true, sort: true, autoFilter: true,
  });

  /* Notas */
  const notas = wb.addWorksheet('Notas');
  notas.columns = [{ header: 'Columna', key: 'c', width: 32 }, { header: 'Explicación', key: 'e', width: 100 }];
  notas.getRow(1).font = { bold: true };
  notas.addRow({ c: COL_ID, e: 'Clave interna de la ficha (nombre del fichero). No se cambia: otras fichas la usan. Vacío en las altas.' });
  notas.addRow({ c: COL_ACCION, e: `«${ACCION_EDITAR}» (o vacía) o «${ACCION_BORRAR}».` });
  for (const c of columnas.campos) {
    const partes = [];
    if (c.obligatorio) partes.push('Obligatorio.');
    if (c.widget === 'boolean') partes.push(`«${SI}» o «${NO}».`);
    if (c.widget === 'select') partes.push(`Una de: ${opcionesSelect(c.f).map(o => o.etiqueta).join(', ')}.`);
    if (c.widget === 'categoria-catalogo') partes.push(`Elige ${({ tipo: 'el tipo de producto', categoria: 'la categoría (con su tipo delante: «Tipo › Categoría»)', subcategoria: 'la subcategoría' })[nivelElegido(c)]} del desplegable. Si cambias una ${perfil.uno} de sitio, revisa después su lugar en Ajustes del sitio → «Orden del catálogo en el menú».`);
    if (c.widget === 'image') {
      const max = maxBytes(c.f);
      partes.push(`Nombre del fichero de la imagen${max ? ` (máximo ${Math.round(max / 1e6)} MB)` : ''}.`);
    }
    if (c.f.hint && c.widget !== 'categoria-catalogo') partes.push(c.f.hint);
    notas.addRow({ c: c.titulo, e: partes.join(' ') });
  }
  for (const c of columnas.todas.filter(x => x.tipo === 'lectura')) notas.addRow({ c: c.titulo, e: c.l.nota || 'Informativa: se ignora al importar.' });
  if (columnas.omitidos.length) notas.addRow({ c: '(no incluidos)', e: `Estos campos todavía no se pueden cambiar con Excel; se editan en el panel: ${columnas.omitidos.join(', ')}.` });
  notas.getColumn(2).alignment = { wrapText: true, vertical: 'top' };

  /* Control */
  const control = wb.addWorksheet('Control', { state: 'veryHidden' });
  control.addRow(['colección', col.name]);
  control.addRow(['rama', meta.rama]);
  control.addRow(['exportado', meta.fecha]);
  control.addRow([]);
  control.addRow(['identificador', 'huella']);
  for (const a of ordenados) control.addRow([a.slug, await huellaTexto(a.raw)]);

  wb.views = [{ activeTab: 0 }];
  return wb;
}

/*
  Lee el Excel subido. Devuelve { filas, huellas, coleccion, errores, avisos }.
  - filas: [{ n, celdas: { <título>: valor } }] con las columnas conocidas
  - huellas: Map (o null si el Excel no trae la hoja «Control»)
*/
export function leerLibro(wb, { col, perfil, columnas }) {
  const errores = [];
  const avisos = [];
  const ws = wb.getWorksheet(perfil.hoja)
    || wb.worksheets.find(h => h.state === 'visible' && [...(h.getRow(1).values || [])].some(v => String(valorCelda(v)).trim() === COL_ID));
  if (!ws) return { filas: [], huellas: null, errores: [{ fila: 0, texto: `No encuentro la hoja «${perfil.hoja}» (ni otra con la columna «${COL_ID}»).` }], avisos };

  let coleccion = '';
  let huellas = null;
  const control = wb.getWorksheet('Control');
  if (control) {
    huellas = new Map();
    let enLista = false;
    control.eachRow(row => {
      const a = String(valorCelda(row.getCell(1).value)).trim();
      const b = String(valorCelda(row.getCell(2).value)).trim();
      if (a === 'colección') coleccion = b;
      if (enLista && a) huellas.set(a, b);
      if (a === 'identificador') enLista = true;
    });
    if (coleccion && coleccion !== col.name) errores.push({ fila: 0, texto: `Este Excel es de otra sección del panel («${coleccion}»): impórtalo desde allí.` });
  }

  // Cabecera: título de columna → posición
  const conocidas = new Map(columnas.todas.filter(c => c.tipo !== 'lectura').map(c => [c.titulo.replace(/\s*\*$/, ''), c]));
  const pos = new Map();
  ws.getRow(1).eachCell((celda, i) => {
    const t = String(valorCelda(celda.value)).trim();
    const limpio = t.replace(/\s*\*$/, '');
    if (!t || RE_SOLO_LECTURA.test(t) || IGNORADAS.includes(limpio)) return;
    const c = conocidas.get(limpio);
    if (!c) { avisos.push({ fila: 1, texto: `La columna «${t}» no es de esta sección: se ignora.` }); return; }
    pos.set(c.titulo, i);
  });
  if (!pos.has(COL_ID)) errores.push({ fila: 1, texto: `Falta la columna «${COL_ID}».` });

  const filas = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const celdas = {};
    for (const [titulo, i] of pos) celdas[titulo] = valorCelda(row.getCell(i).value);
    filas.push({ n, celdas });
  });
  return { filas, huellas, coleccion, errores, avisos };
}

/* Informe descargable */
export function libroInforme(ExcelJS, plan, titulo) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Informe');
  ws.columns = [
    { header: 'Tipo', key: 't', width: 14 }, { header: 'Fila', key: 'f', width: 6 },
    { header: 'Identificador', key: 'i', width: 26 }, { header: 'Nombre', key: 'n', width: 28 },
    { header: 'Campo', key: 'c', width: 22 }, { header: 'Antes', key: 'a', width: 30 },
    { header: 'Después / detalle', key: 'd', width: 60 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.addRow({ t: titulo });
  for (const e of plan.errores) ws.addRow({ t: 'Error', f: e.fila || '', d: e.texto });
  for (const x of plan.nuevos) ws.addRow({ t: 'Nuevo', f: x.fila || '', i: x.slug, n: x.nombre });
  for (const x of plan.modificados) for (const c of x.cambios) ws.addRow({ t: 'Modificado', f: x.fila || '', i: x.slug, n: x.nombre, c: c.campo, a: c.antes, d: c.despues });
  for (const x of plan.borrados) ws.addRow({ t: 'Borrado', f: x.fila || '', i: x.slug, n: x.nombre, d: x.arrastra.join('; ') });
  for (const a of plan.avisos) ws.addRow({ t: 'Aviso', f: a.fila || '', d: a.texto });
  ws.addRow({ t: 'Sin cambios', d: String(plan.sinCambios) });
  return wb;
}
