/*
  Exportar, importar y cambiar en bloque desde el panel (docs/PLAN.md, fase 3): el fichero Excel.
  Crea el libro que se descarga y lee el que se sube. La librería ExcelJS se recibe como parámetro
  (en el navegador, /admin/vendor/exceljs.min.js; en Node, el paquete «exceljs»).

  Hojas: «Instrucciones» (la primera que se ve), la de datos (p. ej. «Fabricantes»; en productos,
  «Productos» y «Accesorios»), «Notas» (qué es cada columna), «Listas» (oculta: opciones de los
  desplegables) y «Control» (muy oculta: colección, rama, fecha y la huella de cada ficha al exportar,
  para saber si alguien la cambió después).
*/
import {
  COL_ID, COL_ACCION, ACCION_EDITAR, ACCION_BORRAR, VACIO, SI, NO, IGNORADAS, RE_SOLO_LECTURA,
  aCeldas, opcionesSelect, opcionesCatalogo, nivelElegido, huellaTexto, valorCelda, maxBytes, hojasDe,
} from './nucleo.js';

const FILAS_PREPARADAS = 20;      // filas vacías con «Crear/Editar» para dar de alta
const FILAS_DESPLEGABLES = 2000;  // hasta dónde llegan los desplegables
const GRIS = 'FFE9ECEF';
const GRIS_CABECERA = 'FFD0D5DB';
const AZUL = 'FF1F4E79';

const letra = n => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const sinAsterisco = t => String(t).replace(/\s*\*$/, '');

function textoInstrucciones({ perfil, col, columnas, meta }) {
  const hojas = hojasDe(perfil);
  const nombresHojas = hojas.map(h => `«${h.nombre}»`).join(' y ');
  const ficheros = columnas.campos.some(c => c.widget === 'image' || c.widget === 'file');
  const obligatorios = columnas.grupos.filter(g => g.obligatorio).map(g => `«${g.etiqueta}»`);
  const lectura = hojas.flatMap(h => h.lectura).map(l => `«${l.titulo}»`);
  return [
    [`Cómo usar este Excel · ${col.label || perfil.hoja}`, 'titulo'],
    [`Exportado el ${meta.fecha} · rama ${meta.rama} · ${meta.total} ${meta.total === 1 ? perfil.uno : perfil.varios}${meta.filtro ? ` · ${meta.filtro}` : ''}`, 'gris'],
    ['', ''],
    ['Modificar', 'apartado'],
    [`Cambia las celdas que quieras en ${hojas.length > 1 ? `las hojas ${nombresHojas}` : `la hoja ${nombresHojas}`}. Una celda vacía no cambia nada; para borrar un dato, escribe ${VACIO}.`, ''],
    ...(hojas.length > 1 ? [[`La hoja en la que esté cada fila no decide nada: un accesorio puesto en «${hojas[0].nombre}» se importa igual (manda su categoría).`, '']] : []),
    ['Dar de alta', 'apartado'],
    [`Usa una de las filas vacías del final (o añade filas) y deja «${COL_ID}» en blanco: se crea como en el panel${perfil.idSinColumna ? ' (fabricante y modelo)' : ' (a partir del nombre)'}.`
      + (obligatorios.length ? ` Obligatorio: ${obligatorios.join(', ')}.` : ''), ''],
    ['Borrar', 'apartado'],
    [`Pon «${ACCION_BORRAR}» en «${COL_ACCION}». Que una fila falte en el Excel no borra nada.`
      + (perfil.motivoNoBorrar ? ' No se puede borrar lo que usan otras fichas: el informe te dirá cuáles.' : '')
      + (perfil.estados ? ' Para quitar un producto de la web sin perderlo, mejor «Estado» = «No disponible».' : ''), ''],
    ...(ficheros ? [
      ['Fotos y ficheros', 'apartado'],
      ['Escribe el nombre del fichero (p. ej. brother.png) y súbelo junto al Excel al importar, o dentro de un ZIP con el Excel. Si ya está en la web, basta con su nombre.'
        + (perfil.reducirImagenes ? ' Las fotos se reducen a 1600 píxeles al subirlas.' : ''), ''],
    ] : []),
    ...(columnas.campos.some(c => c.lista?.tipo === 'catalogo3') ? [
      ['Catálogo', 'apartado'],
      ['Elige el tipo de producto y, si hace falta, la categoría y la subcategoría: cada desplegable ofrece lo que cuelga del anterior. Vacías, el producto queda directamente en el nivel de arriba.', ''],
    ] : []),
    ['No toques', 'apartado'],
    [`«${COL_ID}» de las filas que ya existen (cambiarlo crea otra ficha)${lectura.length ? ` ni las columnas en gris (${[...new Set(lectura)].join(', ')}): son informativas y se ignoran al importar` : ''}.`, ''],
    ['Importar', 'apartado'],
    [`Panel → «${col.label || perfil.hoja}» → engranaje → «Importar Excel». Antes de guardar nada verás un informe con lo nuevo, lo modificado, lo que se borra y los errores (con su fila). Con un solo error no se guarda nada.`, ''],
    ['Si alguien cambia una ficha en el panel después de exportar, la importación no la toca y lo avisa: exporta de nuevo para trabajar con la versión actual.', 'gris'],
    ['La hoja «Notas» explica cada columna.', 'gris'],
  ];
}

function notaColumna(c, perfil) {
  const partes = [];
  if (c.obligatorio) partes.push('Obligatorio.');
  if (c.widget === 'boolean') partes.push(`«${SI}» o «${NO}».`);
  if (c.lista?.tipo === 'valores') partes.push(`Una de: ${c.lista.valores.join(', ')}.`);
  if (c.lista?.tipo === 'catalogo-nivel') partes.push(`Elige ${({ tipo: 'el tipo de producto', categoria: 'la categoría (con su tipo delante: «Tipo › Categoría»)', subcategoria: 'la subcategoría' })[nivelElegido(c)]} del desplegable. Si cambias una ${perfil.uno} de sitio, revisa después su lugar en Ajustes del sitio → «Orden del catálogo en el menú».`);
  if (c.lista?.tipo === 'catalogo3') partes.push(['Tipo de producto (obligatorio).', 'Categoría del tipo elegido (o vacía).', 'Subcategoría de la categoría elegida (o vacía).'][c.parte]);
  if (c.lista?.tipo === 'relacion') partes.push('Elígelo del desplegable.');
  if (c.widget === 'relacion-varios') partes.push('Identificadores separados por comas (p. ej. «singer-4432, singer-hd9125»). También vale «Fabricante Modelo» o el modelo si no hay otro igual.');
  if (c.widget === 'lineas') partes.push(c.grupo.f.fields?.some(x => x.name === 'nombre') ? 'Un dato por línea: «Característica: valor» (sin «:», la línea entera).' : 'Una por línea.');
  if (c.widget === 'datetime' && (c.f.format === 'YYYY-MM-DD' || c.f.time_format === false)) partes.push('Fecha (27/11/2026).');
  if (c.widget === 'image' || c.widget === 'file') {
    const max = maxBytes(c.f);
    partes.push(`Nombre del fichero${max ? ` (máximo ${Math.round(max / 1e6)} MB)` : ''}.`);
  }
  if (c.parteFoto === 'imagen' && c.indice === 0) partes.push('La 1 es la principal (la de las tarjetas).');
  if (c.f.hint && c.lista?.tipo !== 'catalogo-nivel' && c.parteFoto === undefined && c.lista?.tipo !== 'catalogo3') partes.push(c.f.hint);
  return partes.join(' ');
}

export async function crearLibro(ExcelJS, { cfg, col, perfil, columnas, actuales, ctx, meta }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Panel de Máquinas de Coser Zafra';
  wb.created = new Date();
  const hojas = hojasDe(perfil);

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

  /* Listas (oculta): opciones de los desplegables */
  const hojasDatos = hojas.map(h => wb.addWorksheet(h.nombre, { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] }));
  const listas = wb.addWorksheet('Listas', { state: 'hidden' });
  let colLista = 0;
  const lista = (titulo, valores, nombre) => {
    const L = letra(colLista++);
    listas.getCell(`${L}1`).value = titulo;
    valores.forEach((v, i) => { listas.getCell(`${L}${i + 2}`).value = v; });
    const rango = `Listas!$${L}$2:$${L}$${Math.max(2, valores.length + 1)}`;
    if (nombre) wb.definedNames.add(rango, nombre);
    return rango;
  };
  const formulas = new Map();
  const formulaDe = c => {
    const l = c.lista;
    if (!l) return null;
    const clave = l.tipo === 'valores' ? `v:${c.titulo}` : l.tipo === 'catalogo-nivel' ? `n:${c.titulo}` : l.tipo === 'relacion' ? `r:${l.coleccion}` : l.tipo;
    if (formulas.has(clave)) return formulas.get(clave);
    let f = null;
    if (l.tipo === 'sino') f = lista('Sí / No', [SI, NO]);
    else if (l.tipo === 'valores') f = lista(sinAsterisco(c.titulo), l.valores);
    else if (l.tipo === 'catalogo-nivel') f = lista(sinAsterisco(c.titulo), opcionesCatalogo(c, ctx).map(o => o.etiqueta));
    else if (l.tipo === 'relacion') f = lista(sinAsterisco(c.titulo), (ctx.relaciones?.[l.coleccion] || []).map(o => o.etiqueta));
    formulas.set(clave, f);
    return f;
  };
  const listaAccion = lista(COL_ACCION, [ACCION_EDITAR, ACCION_BORRAR]);

  // Catálogo en tres columnas: desplegables dependientes con nombres de rango (como las Excel de tarifas)
  let colCatalogo = null;
  if (columnas.campos.some(c => c.lista?.tipo === 'catalogo3') && ctx.catalogo) {
    const cat = ctx.catalogo;
    const orden = (a, b) => a.titulo.localeCompare(b.titulo, 'es');
    const tipos = cat.deNivel('tipo').sort(orden);
    lista('Tipos de producto', tipos.map(t => t.titulo), 'Tipos');
    const claves = [];
    const nombres = [];
    let n = 0;
    for (const t of tipos) {
      const cats = cat.hijas(t.slug).map(s => cat.porSlug.get(s)).filter(Boolean).sort(orden);
      if (cats.length) { const nombre = `L_${++n}`; lista(t.titulo, cats.map(x => x.titulo), nombre); claves.push(t.titulo); nombres.push(nombre); }
      for (const c1 of cats) {
        const subs = cat.hijas(c1.slug).map(s => cat.porSlug.get(s)).filter(Boolean).sort(orden);
        if (!subs.length) continue;
        const nombre = `L_${++n}`;
        lista(`${t.titulo} › ${c1.titulo}`, subs.map(x => x.titulo), nombre);
        claves.push(`${t.titulo}|${c1.titulo}`); nombres.push(nombre);
      }
    }
    const L1 = letra(colLista++);
    const L2 = letra(colLista++);
    listas.getCell(`${L1}1`).value = 'Clave';
    listas.getCell(`${L2}1`).value = 'Lista';
    claves.forEach((k, i) => { listas.getCell(`${L1}${i + 2}`).value = k; listas.getCell(`${L2}${i + 2}`).value = nombres[i]; });
    wb.definedNames.add(`Listas!$${L1}$2:$${L2}$${Math.max(2, claves.length + 1)}`, 'Mapa');
    colCatalogo = true;
  }

  const clave = a => (perfil.clave ? perfil.clave(a, ctx) : perfil.nombre(a.datos));
  const ordenados = [...actuales].sort((a, b) => clave(a).localeCompare(clave(b), 'es'));

  for (const [k, h] of hojas.entries()) {
    const ws = hojasDatos[k];
    const todas = [...columnas.todas.filter(c => c.tipo !== 'lectura'), ...h.lectura.map(l => ({ tipo: 'lectura', titulo: l.titulo, l }))];
    ws.columns = todas.map(c => ({
      header: c.titulo,
      key: c.titulo,
      width: c.tipo === 'id' ? 26 : c.tipo === 'accion' ? 14 : c.tipo === 'lectura' ? 16 : c.multilinea ? 50 : c.parteFoto ? 22 : 24,
      style: { protection: { locked: c.tipo === 'lectura' }, ...(c.tipo === 'lectura' ? { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } }, font: { color: { argb: 'FF495057' } } } : {}) },
    }));
    const lasDeHoja = ordenados.filter(a => h.filtro(a, ctx));
    for (const a of lasDeHoja) {
      const celdas = aCeldas(columnas, a.datos, a.cuerpo, ctx);
      const fila = { [COL_ID]: a.slug, [COL_ACCION]: ACCION_EDITAR, ...celdas };
      for (const l of h.lectura) fila[l.titulo] = l.valor(a.slug, ctx);
      ws.addRow(fila);
    }
    for (let i = 0; i < FILAS_PREPARADAS; i++) ws.addRow({ [COL_ACCION]: ACCION_EDITAR });

    // Cabecera: negrita, gris, bloqueada (no se pueden cambiar los títulos)
    const cab = ws.getRow(1);
    cab.height = 32;
    todas.forEach((c, i) => {
      const celda = cab.getCell(i + 1);
      celda.font = { bold: true };
      celda.alignment = { vertical: 'middle', wrapText: true };
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.tipo === 'lectura' ? GRIS : GRIS_CABECERA } };
      celda.protection = { locked: true };
      const nota = c.tipo === 'campo' ? notaColumna(c, perfil) : '';
      if (nota) celda.note = nota;
    });
    // Las celdas con datos heredan la protección de su columna
    ws.eachRow({ includeEmpty: false }, (row, n) => {
      if (n === 1) return;
      todas.forEach((c, i) => {
        const celda = row.getCell(i + 1);
        celda.protection = { locked: c.tipo === 'lectura' };
        if (c.tipo === 'lectura') celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } };
        if (c.multilinea) celda.alignment = { wrapText: true, vertical: 'top' };
      });
    });

    // Desplegables
    const pos = t => todas.findIndex(c => c.titulo === t);
    const rango = i => `${letra(i)}2:${letra(i)}${FILAS_DESPLEGABLES}`;
    todas.forEach((c, i) => {
      let formula = null;
      let error = 'Elige una opción de la lista.';
      if (c.tipo === 'accion') { formula = listaAccion; error = `Elige «${ACCION_EDITAR}» o «${ACCION_BORRAR}».`; }
      else if (c.lista?.tipo === 'catalogo3' && colCatalogo) {
        const tipoCol = letra(pos(todas.find(x => x.lista?.tipo === 'catalogo3' && x.parte === 0).titulo));
        const catCol = letra(pos(todas.find(x => x.lista?.tipo === 'catalogo3' && x.parte === 1).titulo));
        formula = c.parte === 0 ? 'Tipos' : c.parte === 1 ? `INDIRECT(VLOOKUP($${tipoCol}2,Mapa,2,FALSE))` : `INDIRECT(VLOOKUP($${tipoCol}2&"|"&$${catCol}2,Mapa,2,FALSE))`;
        error = ['Elige un tipo de producto de la lista.', 'Elige una categoría del tipo de producto (o déjala vacía).', 'Elige una subcategoría de la categoría (o déjala vacía). Si no despliega nada, esa categoría no tiene subcategorías.'][c.parte];
      } else if (c.tipo === 'campo') formula = formulaDe(c);
      if (!formula) return;
      ws.dataValidations.add(rango(i), {
        type: 'list', allowBlank: true, formulae: [formula],
        showErrorMessage: true, errorStyle: c.lista?.tipo === 'catalogo3' ? 'information' : 'warning', errorTitle: sinAsterisco(c.titulo), error,
      });
    });
    ws.autoFilter = { from: 'A1', to: `${letra(todas.length - 1)}1` };
    await ws.protect('', {
      selectLockedCells: true, selectUnlockedCells: true, formatCells: true, formatColumns: true,
      formatRows: true, insertRows: true, deleteRows: true, sort: true, autoFilter: true,
    });
  }

  /* Notas */
  const notas = wb.addWorksheet('Notas');
  notas.columns = [{ header: 'Columna', key: 'c', width: 36 }, { header: 'Explicación', key: 'e', width: 100 }];
  notas.getRow(1).font = { bold: true };
  notas.addRow({ c: COL_ID, e: 'Clave interna de la ficha (nombre del fichero). No se cambia: otras fichas la usan. Vacío en las altas.' });
  notas.addRow({ c: COL_ACCION, e: `«${ACCION_EDITAR}» (o vacía) o «${ACCION_BORRAR}».` });
  for (const c of columnas.campos) {
    if (c.parteFoto && c.indice > 0) continue;
    notas.addRow({ c: c.parteFoto ? c.titulo.replace(/ 1(?=$|:)/, ' 1…5') : c.titulo, e: notaColumna(c, perfil) });
  }
  for (const l of [...new Map(hojas.flatMap(h => h.lectura).map(l => [l.titulo, l])).values()]) notas.addRow({ c: l.titulo, e: l.nota || 'Informativa: se ignora al importar.' });
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
  - filas: [{ n, hoja, conColumnaId, celdas: { <título>: valor } }] de todas las hojas de datos
  - huellas: Map (o null si el Excel no trae la hoja «Control»)
  Admite los títulos de columna de las Excel de tarifas (iguales) y sin «Identificador» si la
  colección sabe emparejar por sus datos (productos: fabricante y modelo).
*/
export function leerLibro(wb, { col, perfil, columnas }) {
  const errores = [];
  const avisos = [];
  const conocidas = new Map(columnas.todas.filter(c => c.tipo !== 'lectura').map(c => [sinAsterisco(c.titulo), c]));
  const esDeDatos = h => h.state === 'visible' && [...(h.getRow(1).values || [])].some(v => {
    const t = sinAsterisco(String(valorCelda(v)).trim());
    return t === COL_ID || (perfil.idSinColumna && conocidas.has(t) && conocidas.get(t).tipo === 'campo');
  });
  const nombres = hojasDe(perfil).map(h => h.nombre);
  let hojas = wb.worksheets.filter(h => nombres.includes(h.name) && h.state === 'visible');
  if (!hojas.length) hojas = wb.worksheets.filter(esDeDatos);
  if (!hojas.length) return { filas: [], huellas: null, errores: [{ fila: 0, texto: `No encuentro la hoja «${nombres.join('» ni «')}» (ni otra con la columna «${COL_ID}»).` }], avisos };

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

  const filas = [];
  for (const ws of hojas) {
    const pos = new Map();
    ws.getRow(1).eachCell((celda, i) => {
      const t = String(valorCelda(celda.value)).trim();
      const limpio = sinAsterisco(t);
      if (!t || RE_SOLO_LECTURA.test(t) || IGNORADAS.includes(limpio)) return;
      const c = conocidas.get(limpio);
      if (!c) { avisos.push({ fila: 1, hoja: ws.name, texto: `La columna «${t}» de «${ws.name}» no es de esta sección: se ignora.` }); return; }
      pos.set(c.titulo, i);
    });
    const conColumnaId = pos.has(COL_ID);
    if (!conColumnaId && !perfil.idSinColumna) { errores.push({ fila: 1, hoja: ws.name, texto: `Falta la columna «${COL_ID}» en «${ws.name}».` }); continue; }
    ws.eachRow({ includeEmpty: false }, (row, n) => {
      if (n === 1) return;
      const celdas = {};
      for (const [titulo, i] of pos) celdas[titulo] = valorCelda(row.getCell(i).value);
      filas.push({ n, hoja: ws.name, conColumnaId, celdas });
    });
  }
  return { filas, huellas, coleccion, errores, avisos };
}

/* Informe descargable */
export function libroInforme(ExcelJS, plan, titulo) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Informe');
  ws.columns = [
    { header: 'Tipo', key: 't', width: 14 }, { header: 'Hoja', key: 'h', width: 12 }, { header: 'Fila', key: 'f', width: 6 },
    { header: 'Identificador', key: 'i', width: 26 }, { header: 'Nombre', key: 'n', width: 28 },
    { header: 'Campo', key: 'c', width: 22 }, { header: 'Antes', key: 'a', width: 30 },
    { header: 'Después / detalle', key: 'd', width: 60 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.addRow({ t: titulo });
  for (const e of plan.errores) ws.addRow({ t: 'Error', h: e.hoja || '', f: e.fila || '', d: e.texto });
  for (const x of plan.nuevos) ws.addRow({ t: 'Nuevo', h: x.hoja || '', f: x.fila || '', i: x.slug, n: x.nombre });
  for (const x of plan.modificados) for (const c of x.cambios) ws.addRow({ t: 'Modificado', h: x.hoja || '', f: x.fila || '', i: x.slug, n: x.nombre, c: c.campo, a: c.antesTodo ?? c.antes, d: c.despuesTodo ?? c.despues });
  for (const x of plan.borrados) ws.addRow({ t: 'Borrado', h: x.hoja || '', f: x.fila || '', i: x.slug, n: x.nombre, d: x.arrastra.join('; ') });
  for (const a of plan.avisos) ws.addRow({ t: 'Aviso', h: a.hoja || '', f: a.fila || '', d: a.texto });
  ws.addRow({ t: 'Sin cambios', d: String(plan.sinCambios) });
  return wb;
}
