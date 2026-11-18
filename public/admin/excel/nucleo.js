/*
  Exportar, importar y cambiar en bloque desde el panel (docs/PLAN.md, fase 3): lógica común.

  Este módulo no usa la red ni la página: recibe los ficheros ya leídos y devuelve un «plan» con lo
  que cambiaría (el informe) y los ficheros que hay que escribir o borrar. Así se puede probar con
  Node (lib/excel-panel.test.mjs) y lo usa el panel (public/admin/excel/panel.js).
  La librería YAML se recibe como parámetro (en el navegador, /admin/vendor/yaml; en Node, «yaml»).

  Reglas (decididas con Víctor el 18-11-2026):
  - «Identificador» = nombre del fichero. Con uno que existe, se modifica esa ficha; vacío, ficha
    nueva con el identificador calculado como en el panel («-2», «-3»… si ya existe); escrito pero
    inexistente, ficha nueva con ese identificador (con aviso si se parece a otra).
  - «Acción»: «Crear/Editar» (o vacía) o «Borrar». Las filas sin datos aparte de «Acción» se ignoran.
  - Celda vacía = no tocar el campo; «(vacío)» = borrar el dato.
  - Lo que no está en el Excel no se borra. Las columnas «(solo lectura)» y las de trabajo de las
    tarifas («Observaciones»…) se ignoran.
  - Si una ficha cambió en el panel después de exportar, no se toca (aviso).
*/

export const COL_ID = 'Identificador';
export const COL_ACCION = 'Acción';
export const ACCION_EDITAR = 'Crear/Editar';
export const ACCION_BORRAR = 'Borrar';
export const VACIO = '(vacío)';
export const SI = 'Sí';
export const NO = 'No';
export const IGNORADAS = ['Observaciones', 'Revisar (avisos)', 'Modificaciones (desde la carga)'];
export const RE_SOLO_LECTURA = /\(solo lectura\)\s*$/i;
const EXT_IMAGEN = /\.(png|jpe?g|webp|gif|svg|avif)$/i;


/* ---------- Perfiles: lo propio de cada colección ---------- */
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
export const PERFILES = {
  fabricantes: {
    hoja: 'Fabricantes',
    uno: 'fabricante', varios: 'fabricantes',
    nombre: d => d.title || '',
    // Como el panel: «slug: {{slug}}» a partir del nombre
    identificar: d => slugificar(d.title),
    lectura: [{
      titulo: 'Productos (solo lectura)',
      nota: 'Productos de este fabricante al exportar (también los «Solo para pruebas»). Se ignora al importar.',
      valor: (slug, ctx) => (ctx.productosPorFabricante.get(slug) || []).length,
    }],
    motivoNoBorrar: (slug, ctx) => {
      const n = (ctx.productosPorFabricante.get(slug) || []).length;
      return n ? `Tiene ${plural(n, 'producto', 'productos')}: bórralos o cámbialos de fabricante antes.` : '';
    },
    // Logotipos: se suben tal cual (PNG, SVG…), sin reducirlos ni pasarlos a JPG
    reducirImagenes: false,
  },
  productos: {
    hoja: 'Productos',
    uno: 'producto', varios: 'productos',
    // Dos hojas, como las Excel de tarifas: la hoja no decide nada al importar (manda la categoría)
    hojas: [
      {
        nombre: 'Productos', filtro: (a, ctx) => !esAccesorio(a, ctx),
        lectura: [{
          titulo: 'Accesorios asociados (solo lectura)',
          nota: 'Cuántos accesorios tienen este producto en «Compatible con», al exportar. Se ignora al importar.',
          valor: (slug, ctx) => (ctx.accesoriosDe.get(slug) || []).length,
        }],
      },
      {
        nombre: 'Accesorios', filtro: (a, ctx) => esAccesorio(a, ctx),
        lectura: [{
          titulo: 'Productos compatibles (solo lectura)',
          nota: 'Cuántos productos (que existen) tiene este accesorio en «Compatible con», al exportar. Se ignora al importar.',
          valor: (slug, ctx) => lista(ctx.porSlugProducto.get(slug)?.datos.compatible_con).filter(s => ctx.porSlugProducto.has(s)).length,
        }],
      },
    ],
    nombre: d => d.title || '',
    // Como el panel: «slug: {{fields.fabricante}}-{{fields.modelo}}»
    identificar: d => slugificar(`${d.fabricante || ''}-${d.modelo || ''}`),
    // Excel de tarifas, sin «Identificador»: el que daría el panel con su fabricante y modelo
    idSinColumna: (celdas, columnas, ctx) => {
      const col = campo => columnas.grupos.find(g => g.campo === campo)?.cols[0].titulo;
      const fab = String(valorCelda(celdas[col('fabricante')]) ?? '').trim();
      const modelo = String(valorCelda(celdas[col('modelo')]) ?? '').trim();
      if (!fab || !modelo) return '';
      const f = (ctx.relaciones?.fabricantes || []).find(x => x.etiqueta.toLowerCase() === fab.toLowerCase() || x.valor === slugificar(fab));
      return slugificar(`${f ? f.valor : fab}-${modelo}`);
    },
    modeloDeFila: celdas => String(valorCelda(celdas['Modelo *']) ?? '').trim(),
    clave: (a, ctx) => [ctx.catalogo?.etiqueta(a.datos.categoria) || '', ctx.nombreFabricante?.(a.datos.fabricante) || '', a.datos.modelo || ''].join(' · '),
    // Títulos de columna iguales que en las Excel de tarifas de input/
    titulos: {
      prueba: 'Solo para pruebas',
      precio: 'Precio orientativo / Precio Completa (€, IVA incluido)',
      'oferta.precio': 'Oferta: precio de oferta / Completa (€)',
      'oferta.precio_cabezal': 'Oferta: precio de oferta Cabezal (€)',
      'oferta.inicio': 'Oferta: desde',
      'oferta.fin': 'Oferta: hasta',
      'segunda_mano.estado': 'Segunda mano: estado del producto',
      'segunda_mano.garantia': 'Segunda mano: garantía (meses)',
      body: 'Descripción',
    },
    // Avisos que no impiden guardar
    comprobar: (d, ctx) => {
      const avisos = [];
      const tipo = ctx.catalogo?.tipoDe(d.categoria);
      const dosPrecios = ctx.tipoDosPrecios;
      if (dosPrecios && tipo !== dosPrecios && (d.precio_cabezal !== undefined || d.oferta?.precio_cabezal !== undefined)) avisos.push(`«${d.title || d.modelo}» tiene precio de cabezal pero no es del tipo de dos precios: no se mostrará.`);
      if (d.estado === 'oferta' && (d.oferta?.precio === undefined || !d.oferta?.inicio || !d.oferta?.fin)) avisos.push(`«${d.title || d.modelo}» está «En oferta» pero le falta el precio o las fechas de la oferta.`);
      if (d.condicion !== 'segunda_mano' && d.segunda_mano && Object.keys(d.segunda_mano).length) avisos.push(`«${d.title || d.modelo}» tiene datos de segunda mano pero su condición es «Nuevo».`);
      return avisos;
    },
    sinAvisos: (d, ctx) => {
      const faltas = [];
      if (!Array.isArray(d.imagenes) || !d.imagenes.length) faltas.push('sin foto');
      if (d.precio === undefined || d.precio === null || d.precio === '') faltas.push('sin precio');
      return faltas;
    },
    filtros: true,
    estados: true,
    // Fotos: se reducen a 1600 px y se recomprimen al subirlas (como la carga del 18-11-2026)
    reducirImagenes: true,
  },
  blog: {
    hoja: 'Blog',
    uno: 'entrada', varios: 'entradas', femenino: true,
    nombre: d => d.title || '',
    // Como el panel: «slug: {{year}}-{{month}}-{{day}}-{{slug}}» y «path: {{year}}/{{slug}}»
    identificar: d => `${fechaMadrid(d.date)}-${slugificar(d.title)}`,
    rutaNueva: (col, slug) => `${col.folder}/${slug.slice(0, 4)}/${slug}.md`,
    // En el Excel, las más recientes primero
    clave: a => String(9e15 - (Date.parse(a.datos.date) || 0)).padStart(16, '0'),
    reducirImagenes: true,
  },
  paginas: {
    hoja: 'Páginas',
    uno: 'página', varios: 'páginas', femenino: true,
    nombre: d => d.title || '',
    identificar: d => slugificar(d.title),
    // No se borra una página que enlaza la web: menú, pie (Ajustes del sitio) o la solicitud de presupuesto
    motivoNoBorrar: (slug, ctx) => {
      if (['politica-de-privacidad', 'condiciones-solicitud-presupuesto'].includes(slug)) return 'la enlaza la solicitud de presupuesto.';
      const raw = String(ctx.sitio?.raw || '');
      const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(pagina:\\s*['"]?${esc}['"]?\\s*$|/paginas/${esc}/)`, 'm').test(raw)) return 'está en el menú o en el pie (Ajustes del sitio): quítala de ahí antes.';
      return '';
    },
    // Además del Excel, «Exportar a Word» (un .docx por página, para la asesoría)
    word: true,
    reducirImagenes: true,
  },
  tipos: perfilCatalogo('tipo', 'Tipos de producto', 'tipo de producto', 'tipos de producto'),
  categorias: perfilCatalogo('categoria', 'Categorías', 'categoría', 'categorías'),
  subcategorias: perfilCatalogo('subcategoria', 'Subcategorías', 'subcategoría', 'subcategorías'),
};

/* Tipos de producto, categorías y subcategorías: comparten carpeta (public/_categorias) y se
   distinguen por el campo oculto «nivel». No se borra uno con hijas o con productos; al borrarlo, se
   quita de Ajustes del sitio → «Orden del catálogo en el menú». */
function perfilCatalogo(nivel, hoja, uno, varios) {
  const HIJOS = { tipo: 'categorías', categoria: 'subcategorías', subcategoria: '' };
  return {
    hoja, uno, varios, nivel, femenino: nivel !== 'tipo',
    nombre: d => d.title || '',
    identificar: d => slugificar(d.title),
    // En el Excel, en el orden del árbol (Tipo › Categoría › Subcategoría)
    clave: (a, ctx) => (ctx.catalogo?.ruta(a.slug) || [a.datos.title || a.slug]).join(' › '),
    lectura: [{
      titulo: 'Productos (solo lectura)',
      nota: `Productos ${({ tipo: 'de este tipo de producto y de todo lo que cuelga de él', categoria: 'de esta categoría y de sus subcategorías', subcategoria: 'de esta subcategoría' })[nivel]} al exportar (también los «Solo para pruebas»), como en la lista del panel. Se ignora al importar.`,
      valor: (slug, ctx) => ctx.catalogo?.productosTotal(slug) || 0,
    }],
    motivoNoBorrar: (slug, ctx, borrando = new Set()) => {
      const cat = ctx.catalogo;
      if (!cat) return '';
      const hijas = cat.hijas(slug).filter(h => !borrando.has(h));
      const prods = cat.productosDirectos(slug);
      const partes = [];
      if (hijas.length) partes.push(plural(hijas.length, HIJOS[nivel].replace(/s$/, ''), HIJOS[nivel]));
      if (prods.length) partes.push(plural(prods.length, 'producto', 'productos'));
      if (!partes.length) return '';
      const seccion = { tipo: '«Categorías»', categoria: '«Subcategorías»' }[nivel];
      return `Tiene ${partes.join(' y ')}: ${hijas.length ? `bórra${hijas.length === 1 ? 'la' : 'las'} antes en ${seccion}` : ''}${hijas.length && prods.length ? ' y ' : ''}${prods.length ? 'cambia sus productos de categoría o bórralos antes' : ''}.`;
    },
    quitarDelOrden: true,
    reducirImagenes: false,
  };
}
export const coleccionesConExcel = () => Object.keys(PERFILES);
// Fecha (AAAA-MM-DD) en hora de Madrid
const fechaMadrid = v => { const t = Date.parse(v); return Number.isNaN(t) ? new Date().toLocaleDateString('sv-SE', { timeZone: globalThis.XL_ZONA || 'Europe/Madrid' }) : new Date(t).toLocaleDateString('sv-SE', { timeZone: globalThis.XL_ZONA || 'Europe/Madrid' }); };
// Los accesorios: los del tipo «Accesorios» o los que tienen «Compatible con»
export const esAccesorio = (a, ctx) => ctx?.catalogo?.tipoDe(a.datos?.categoria) === 'accesorios' || lista(a.datos?.compatible_con).length > 0;
// Hojas de datos del Excel de una colección
export const hojasDe = perfil => perfil.hojas || [{ nombre: perfil.hoja, filtro: () => true, lectura: perfil.lectura || [] }];

/* ---------- Utilidades ---------- */
// Como el panel (slug: encoding ascii, clean_accents): sin tildes, minúsculas y guiones
export function slugificar(t) {
  return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
// Nombre de fichero de imagen limpio, como lo dejaría el panel al subirlo
export function nombreImagen(t) {
  const base = String(t ?? '').trim().split(/[\\/]/).pop();
  const m = base.match(/^(.*?)(\.[a-z0-9]+)?$/i);
  const nombre = slugificar(m[1]) || 'imagen';
  return nombre + (m[2] || '').toLowerCase();
}
export const esImagen = nombre => EXT_IMAGEN.test(nombre);
const nombreDeRuta = r => String(r || '').split('/').pop();
const sinBarra = r => String(r || '').replace(/^\/+/, '');

export async function huellaTexto(texto) {
  const datos = new TextEncoder().encode(String(texto ?? '').replace(/\r\n/g, '\n'));
  const h = await globalThis.crypto.subtle.digest('SHA-1', datos);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Separa el front matter («---» … «---») del cuerpo
export function separar(raw) {
  const t = String(raw ?? '').replace(/\r\n/g, '\n');
  const m = t.match(/^---\n([\s\S]*?)\n?---(?:\n|$)([\s\S]*)$/);
  return m ? { fm: m[1], cuerpo: m[2] } : { fm: '', cuerpo: t };
}

export function leerEntrada(YAML, ruta, raw) {
  const { fm, cuerpo } = separar(raw);
  let datos = {};
  let error = '';
  try { datos = (fm.trim() ? YAML.parse(fm) : {}) || {}; } catch (e) { error = e.message; }
  return { ruta, raw, datos, cuerpo, error, slug: nombreDeRuta(ruta).replace(/\.md$/, '') };
}

// YAML a texto como lo dejaría el panel (Decap parte las líneas largas a 80 caracteres). Si el fichero
// ya existía, se elige la forma que menos líneas cambia (los creados con scripts no las parten).
function yamlATexto(doc, original) {
  const decap = doc.toString();
  if (original === undefined) return decap;
  // Se prueban las formas posibles (líneas partidas o no; listas con sangría o sin ella) y se queda la
  // que deja igual más líneas del fichero original
  const antes = new Set(String(original).replace(/\r\n/g, '\n').split('\n'));
  const distintas = t => t.split('\n').filter(l => !antes.has(l)).length;
  let mejor = decap;
  let menos = distintas(decap);
  for (const op of [{ lineWidth: 0 }, { indentSeq: false }, { lineWidth: 0, indentSeq: false }]) {
    const t = doc.toString(op);
    const n = distintas(t);
    if (n < menos) { mejor = t; menos = n; }
  }
  return mejor;
}

// Escribe la ficha. Si ya existía, solo cambia los campos tocados (el resto queda igual que estaba)
export function componer(YAML, actual, cambios, cuerpo, ordenCampos) {
  let doc;
  if (actual) {
    doc = YAML.parseDocument(separar(actual.raw).fm || '{}');
    if (!YAML.isMap(doc.contents)) doc = new YAML.Document({});
    for (const [k, v] of Object.entries(cambios)) {
      if (k === 'body') continue;
      if (v === undefined) doc.delete(k); else doc.set(k, v);
    }
  } else {
    const obj = {};
    for (const k of ordenCampos) if (k !== 'body' && cambios[k] !== undefined) obj[k] = cambios[k];
    for (const [k, v] of Object.entries(cambios)) if (k !== 'body' && !(k in obj) && v !== undefined) obj[k] = v;
    doc = new YAML.Document(obj);
  }
  let fm = yamlATexto(doc, actual ? separar(actual.raw).fm : undefined);
  if (!fm.endsWith('\n')) fm += '\n';
  const c = cuerpo ?? '';
  const texto = `---\n${fm}---\n${c}`;
  // Si la ficha tenía finales de línea de Windows (copia local), se mantienen
  return actual && String(actual.raw).includes('\r\n') ? texto.replace(/\r?\n/g, '\r\n') : texto;
}

/* ---------- Configuración de la colección ---------- */
export const obligatorio = f => f.required !== false && !['boolean', 'list', 'object', 'hidden'].includes(f.widget || 'string');
export function opcionesSelect(f) {
  return (f.options || []).map(o => (typeof o === 'object' ? { valor: String(o.value), etiqueta: String(o.label ?? o.value) } : { valor: String(o), etiqueta: String(o) }));
}
// Carpetas de imágenes del campo (como el panel: la del campo, la de la colección o la general)
export function carpetasImagen(cfg, col, f) {
  const media = f.media_folder || col.media_folder;
  const pub = f.public_folder || col.public_folder;
  const repo = media ? (media.startsWith('/') ? sinBarra(media) : `${col.folder}/${media}`) : sinBarra(cfg.media_folder || 'public/img');
  const publica = pub || (media ? '/' + sinBarra(media).replace(/^public\//, '') : (cfg.public_folder || '/img'));
  return { repo: repo.replace(/\/+$/, ''), publica: publica.replace(/\/+$/, '') };
}
export function maxBytes(f) {
  const n = Number(f?.media_library?.config?.max_file_size);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* ---------- Valor de una celda ---------- */
// Valor de una celda de ExcelJS como texto o número
export function valorCelda(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map(t => t.text).join('');
    if ('result' in v) return valorCelda(v.result);
    if ('text' in v) return valorCelda(v.text);
    if ('error' in v) return '';
    return String(v);
  }
  if (typeof v === 'boolean') return v ? SI : NO;
  return v;
}
const vacia = v => v === '' || v === null || v === undefined || (typeof v === 'string' && !v.trim());
const esVacio = t => String(t ?? '').trim().toLowerCase() === VACIO;
// Igualdad sin importar el orden de las claves
const ordenar = v => (Array.isArray(v) ? v.map(ordenar) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, ordenar(v[k])])) : v);
const igual = (a, b) => JSON.stringify(ordenar(a ?? null)) === JSON.stringify(ordenar(b ?? null));
const recortar = t => (t.length > 80 ? t.slice(0, 77) + '…' : t);

/* ---------- Campos sencillos: una columna ---------- */
// Nivel que se elige en un campo «categoria-catalogo» de 1 o 2 niveles (el padre de una categoría o subcategoría)
export const nivelElegido = c => ['tipo', 'categoria', 'subcategoria'][Math.min(3, Math.max(1, Number(c.f.niveles) || 3)) - 1];
export function opcionesCatalogo(c, ctx) {
  const cat = ctx?.catalogo;
  if (!cat) return [];
  return [...cat.porSlug.values()].filter(x => x.nivel === nivelElegido(c)).map(x => ({ valor: x.slug, etiqueta: cat.etiqueta(x.slug) }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
}
// «18/11/2026 10:30» (hora de Madrid) → ISO en UTC, como lo guarda el panel. Si ya es ISO, igual
function aIsoMadrid(t) {
  const s = String(t).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s) && !Number.isNaN(Date.parse(s))) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/) || s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = m[0].includes('/') ? [m[3], m[2], m[1]] : [m[1], m[2], m[3]];
  const h = Number(m[0].includes('/') ? m[4] || 9 : 9);
  const mi = Number(m[0].includes('/') ? m[5] || 0 : 0);
  const guess = Date.UTC(+y, +mo - 1, +d, h, mi);
  // Diferencia de Madrid con UTC ese día (1 o 2 horas)
  const local = new Date(new Date(guess).toLocaleString('en-US', { timeZone: globalThis.XL_ZONA || 'Europe/Madrid' }));
  const utc = new Date(new Date(guess).toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(guess - (local - utc)).toISOString();
}
const fechaCorta = t => {
  const s = String(t).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
};

// De la ficha a la celda (campos sencillos)
function aCeldaSimple(w, f, v, ctx) {
  switch (w) {
    case 'boolean': return (v ?? f.default ?? false) ? SI : NO;
    case 'image': case 'file': return v ? nombreDeRuta(v) : '';
    case 'select': {
      const o = opcionesSelect(f).find(x => x.valor === String(v ?? ''));
      return o ? o.etiqueta : (v ?? '');
    }
    case 'number': case 'precio-producto': return v === undefined || v === null || v === '' ? '' : Number(v);
    case 'categoria-catalogo': return v ? (ctx?.catalogo?.porSlug.has(v) ? ctx.catalogo.etiqueta(v) : String(v)) : '';
    case 'relation': {
      const o = (ctx?.relaciones?.[f.collection] || []).find(x => x.valor === String(v ?? ''));
      return o ? o.etiqueta : (v ?? '');
    }
    default: return v === undefined || v === null ? '' : (typeof v === 'string' ? v.replace(/\s+$/, '') : String(v));
  }
}

// De la celda al dato. Devuelve { valor } o { error } (lo vacío y «(vacío)» se tratan antes)
function leerSimple(w, f, texto, bruto, ctx) {
  switch (w) {
    case 'boolean': {
      const t = slugificar(texto);
      if (['si', 's', 'x', 'true', 'verdadero', '1'].includes(t)) return { valor: true };
      if (['no', 'n', 'false', 'falso', '0'].includes(t)) return { valor: false };
      return { error: `«${texto}» no vale: escribe «Sí» o «No».` };
    }
    case 'number': case 'precio-producto': {
      const n = typeof bruto === 'number' ? bruto : Number(texto.trim().replace(/\s|€/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
      if (!Number.isFinite(n)) return { error: `«${texto}» no es un número.` };
      if (f.min !== undefined && n < f.min) return { error: `${n} es menos del mínimo (${f.min}).` };
      return { valor: f.value_type === 'int' ? Math.round(n) : n };
    }
    case 'select': {
      const ops = opcionesSelect(f);
      const t = texto.trim().toLowerCase();
      const o = ops.find(x => x.etiqueta.toLowerCase() === t || x.valor.toLowerCase() === t)
        || ops.find(x => x.etiqueta.toLowerCase().startsWith(t + ' ('));
      if (!o) return { error: `«${texto}» no es una opción válida (${ops.map(x => x.etiqueta).join(', ')}).` };
      return { valor: o.valor };
    }
    case 'datetime': {
      if (f.format === 'YYYY-MM-DD' || f.time_format === false) {
        const d = fechaCorta(texto);
        if (!d) return { error: `«${texto}» no es una fecha (escríbela como 27/11/2026).` };
        return { valor: d };
      }
      // Fecha y hora: tal cual si ya es ISO (como la guarda el panel); «18/11/2026 10:30», hora de Madrid
      const iso = aIsoMadrid(texto);
      if (!iso) return { error: `«${texto}» no es una fecha (escríbela como 18/11/2026 o 18/11/2026 10:30).` };
      return { valor: iso };
    }
    case 'categoria-catalogo': {
      const ops = opcionesCatalogo({ f }, ctx);
      const t = texto.trim().toLowerCase().replace(/\s*[›>|]\s*/g, ' › ');
      let o = ops.find(x => x.valor === texto.trim() || x.etiqueta.toLowerCase() === t);
      if (!o) { const fin = ops.filter(x => x.etiqueta.toLowerCase().endsWith(' › ' + t)); if (fin.length === 1) o = fin[0]; }
      if (!o) return { error: `«${texto}» no es ${({ tipo: 'un tipo de producto', categoria: 'una categoría', subcategoria: 'una subcategoría' })[nivelElegido({ f })]} que exista (elígelo del desplegable).` };
      return { valor: o.valor };
    }
    case 'relation': {
      const ops = ctx?.relaciones?.[f.collection] || [];
      const t = texto.trim().toLowerCase();
      const o = ops.find(x => x.valor === texto.trim() || x.etiqueta.toLowerCase() === t) || ops.find(x => x.valor === slugificar(texto));
      if (!o) return { error: `«${texto}» no existe en «${f.collection}» (elígelo del desplegable).` };
      return { valor: o.valor };
    }
    case 'image': case 'file': return { valor: texto.trim().split(/[\\/]/).pop() }; // el fichero se resuelve aparte
    case 'text': case 'markdown': return { valor: texto.replace(/\r\n/g, '\n').replace(/\s+$/, '') };
    default: return { valor: texto.trim() };
  }
}
function mostrarSimple(w, f, v, ctx) {
  if (v === undefined || v === null || v === '') return VACIO;
  if (w === 'boolean') return v ? SI : NO;
  if (w === 'image' || w === 'file') return nombreDeRuta(v);
  if (w === 'categoria-catalogo' && ctx?.catalogo?.porSlug.has(v)) return ctx.catalogo.etiqueta(v);
  if (w === 'select' || w === 'relation') return String(aCeldaSimple(w, f, v, ctx));
  return recortar(String(v));
}

/* ---------- Columnas de cada campo del panel ----------
   Cada campo es un «grupo» con una o varias columnas y sabe pasar su valor a celdas (aCeldas), leerlo
   de las celdas (leer) y mostrarlo en el informe (mostrar).
   leer(celdas, ayuda) → { nada } (no tocar) | { valor } (undefined = borrar el dato) | { error } */
const TIPOS = new Set(['string', 'text', 'markdown', 'number', 'boolean', 'select', 'image', 'file', 'datetime', 'color', 'categoria-catalogo', 'precio-producto', 'relation', 'list', 'object']);
const MULTILINEA = new Set(['text', 'markdown']);
const listaDe = (w, f) => (w === 'boolean' ? { tipo: 'sino' } : w === 'select' ? { tipo: 'valores', valores: opcionesSelect(f).map(o => o.etiqueta) }
  : w === 'categoria-catalogo' ? { tipo: 'catalogo-nivel', f } : w === 'relation' && !f.multiple ? { tipo: 'relacion', coleccion: f.collection } : null);

function columna(titulo, f, w, extra = {}) {
  return { tipo: 'campo', titulo, f, widget: w, multilinea: MULTILINEA.has(w), lista: listaDe(w, f), ...extra };
}

function grupoDe(cfg, col, perfil, f) {
  const w = f.widget || 'string';
  if (w === 'hidden') return null;
  if (!TIPOS.has(w)) return undefined;
  const T = perfil.titulos || {};
  const oblig = obligatorio(f);
  const base = { campo: f.name, f, obligatorio: oblig, etiqueta: f.label || f.name };

  // Catálogo de 3 niveles (productos): tres columnas con desplegables dependientes
  if (w === 'categoria-catalogo' && (Number(f.niveles) || 3) >= 3) {
    const titulos = T[`${f.name}.*`] || ['Catálogo: tipo de producto', 'Catálogo: categoría', 'Catálogo: subcategoría'];
    const cols = titulos.map((t, i) => columna(t + (i === 0 && oblig ? ' *' : ''), f, 'catalogo3', { parte: i, lista: { tipo: 'catalogo3', parte: i } }));
    return {
      ...base, cols,
      aCeldas: (d, cuerpo, ctx) => {
        const ruta = ctx?.catalogo?.rutaSlugs(d[f.name]) || [];
        return Object.fromEntries(cols.map((c, i) => [c.titulo, ruta[i] ? ctx.catalogo.porSlug.get(ruta[i]).titulo : (i === 0 && d[f.name] ? String(d[f.name]) : '')]));
      },
      leer: (celdas, { ctx }) => {
        const v = cols.map(c => String(valorCelda(celdas[c.titulo]) ?? '').trim());
        if (v.every(x => !x)) return { nada: true };
        if (v.some(esVacio)) return oblig ? { error: `el catálogo es obligatorio: no se puede dejar «${VACIO}».` } : { valor: undefined };
        const cat = ctx.catalogo;
        if (!v[0]) return { error: 'falta el tipo de producto.' };
        const buscar = (lista, t) => lista.map(s => cat.porSlug.get(s)).find(x => x && (x.titulo.toLowerCase() === t.toLowerCase() || x.slug === t || x.slug === slugificar(t)));
        const tipo = buscar(cat.deNivel('tipo').map(x => x.slug), v[0]);
        if (!tipo) return { error: `«${v[0]}» no es un tipo de producto que exista.` };
        if (!v[1]) { if (v[2]) return { error: 'hay subcategoría pero falta la categoría.' }; return { valor: tipo.slug }; }
        const c1 = buscar(cat.hijas(tipo.slug), v[1]);
        if (!c1) return { error: `«${v[1]}» no es una categoría de «${tipo.titulo}».` };
        if (!v[2]) return { valor: c1.slug };
        const c2 = buscar(cat.hijas(c1.slug), v[2]);
        if (!c2) return { error: `«${v[2]}» no es una subcategoría de «${tipo.titulo} › ${c1.titulo}».` };
        return { valor: c2.slug };
      },
      mostrar: (v, ctx) => mostrarSimple('categoria-catalogo', f, v, ctx),
    };
  }

  // Relación con varios (p. ej. «Compatible con»): identificadores separados por comas
  if (w === 'relation' && f.multiple) {
    const c = columna(T[f.name] || f.label + (oblig ? ' *' : ''), f, 'relacion-varios', { multilinea: true });
    return {
      ...base, cols: [c],
      aCeldas: d => ({ [c.titulo]: (Array.isArray(d[f.name]) ? d[f.name] : d[f.name] ? [d[f.name]] : []).join(', ') }),
      leer: (celdas, { ctx, fila }) => {
        const t = String(valorCelda(celdas[c.titulo]) ?? '').trim();
        if (!t) return { nada: true };
        if (esVacio(t)) return { valor: undefined };
        const res = [];
        for (const parte of t.split(/\s*[,;\n]\s*/).filter(Boolean)) {
          const r = ctx.resolverRelacion ? ctx.resolverRelacion(f.collection, parte, fila) : { valor: slugificar(parte) };
          if (r.error) return r;
          if (!res.includes(r.valor)) res.push(r.valor);
        }
        return { valor: res };
      },
      mostrar: v => (Array.isArray(v) && v.length ? recortar(v.join(', ')) : VACIO),
    };
  }

  if (w === 'object') {
    const subs = (f.fields || []).filter(x => (x.widget || 'string') !== 'hidden').map(x => ({ x, w: x.widget || 'string' }));
    if (subs.some(s => !TIPOS.has(s.w) || ['list', 'object', 'image', 'file'].includes(s.w))) return undefined;
    const cols = subs.map(s => columna(T[`${f.name}.${s.x.name}`] || `${f.label}: ${s.x.label}`, s.x, s.w, { padre: f }));
    return {
      ...base, cols, obligatorio: false,
      // Sin el grupo en la ficha, columnas vacías (no los valores por defecto)
      aCeldas: (d, cuerpo, ctx) => Object.fromEntries(cols.map((c, i) => [c.titulo, d[f.name] && typeof d[f.name] === 'object' && (d[f.name][subs[i].x.name] !== undefined || subs[i].w !== 'boolean') ? aCeldaSimple(subs[i].w, subs[i].x, d[f.name][subs[i].x.name], ctx) : ''])),
      leer: (celdas, { ctx, actual }) => {
        const nuevo = { ...(actual && typeof actual === 'object' ? actual : {}) };
        let tocado = false;
        for (let i = 0; i < cols.length; i++) {
          const bruto = valorCelda(celdas[cols[i].titulo]);
          if (vacia(bruto)) continue;
          tocado = true;
          const texto = String(bruto);
          if (esVacio(texto)) { delete nuevo[subs[i].x.name]; continue; }
          const r = leerSimple(subs[i].w, subs[i].x, texto, bruto, ctx);
          if (r.error) return { error: `«${cols[i].titulo}»: ${r.error}` };
          // Un sí/no igual a su valor por defecto en un grupo que no lo tenía no cuenta como cambio
          if (subs[i].w === 'boolean' && actual?.[subs[i].x.name] === undefined && r.valor === (subs[i].x.default ?? false)) continue;
          nuevo[subs[i].x.name] = r.valor;
        }
        if (!tocado) return { nada: true };
        return { valor: Object.keys(nuevo).length ? nuevo : undefined };
      },
      mostrar: v => (v && typeof v === 'object' && Object.keys(v).length ? recortar(subs.filter(s => v[s.x.name] !== undefined).map(s => `${s.x.label}: ${mostrarSimple(s.w, s.x, v[s.x.name])}`).join(' · ')) : VACIO),
    };
  }

  if (w === 'list') {
    const subs = (f.fields || []).map(x => ({ x, w: x.widget || 'string' }));
    const img = subs.find(s => s.w === 'image');
    // Fotos: «Foto 1», «Foto 1: descripción…» … hasta el máximo
    if (img && subs.length <= 2) {
      const alt = subs.find(s => s !== img);
      const max = Number(f.max) || 5;
      const carpetas = carpetasImagen(cfg, col, img.x);
      const cols = [];
      for (let i = 1; i <= max; i++) {
        cols.push(columna(`${T[`${f.name}.imagen`] || 'Foto'} ${i}`, img.x, 'image', { indice: i - 1, parteFoto: 'imagen', imagen: carpetas }));
        if (alt) cols.push(columna(`${T[`${f.name}.imagen`] || 'Foto'} ${i}: ${T[`${f.name}.alt`] || 'descripción (texto alternativo)'}`, alt.x, 'string', { indice: i - 1, parteFoto: 'alt' }));
      }
      return {
        ...base, cols, obligatorio: false, imagen: carpetas, fotos: true,
        aCeldas: d => {
          const l = Array.isArray(d[f.name]) ? d[f.name] : [];
          const o = {};
          for (const c of cols) {
            const it = l[c.indice] || {};
            o[c.titulo] = c.parteFoto === 'imagen' ? (it[img.x.name] ? nombreDeRuta(it[img.x.name]) : '') : (it[alt.x.name] || '');
          }
          return o;
        },
        leer: (celdas, { actual, resolverFichero }) => {
          const antes = Array.isArray(actual) ? actual : [];
          if (cols.every(c => vacia(valorCelda(celdas[c.titulo])))) return { nada: true };
          const res = [];
          for (let i = 0; i < max; i++) {
            const ci = cols.find(c => c.indice === i && c.parteFoto === 'imagen');
            const ca = cols.find(c => c.indice === i && c.parteFoto === 'alt');
            const ti = String(valorCelda(celdas[ci.titulo]) ?? '').trim();
            const ta = ca ? String(valorCelda(celdas[ca.titulo]) ?? '').trim() : '';
            const previa = antes[i] || {};
            if (esVacio(ti)) continue; // se quita esa foto
            let ruta = previa[img.x.name];
            if (ti) {
              const r = resolverFichero(ti, img.x, carpetas, previa[img.x.name] || '');
              if (r.error) return r;
              ruta = r.valor;
            }
            if (!ruta) { if (ta && !esVacio(ta)) return { error: `«${ca.titulo}» tiene texto pero no hay foto.` }; continue; }
            const it = { [img.x.name]: ruta };
            const textoAlt = ta ? (esVacio(ta) ? '' : ta) : (previa[alt?.x.name] || '');
            if (alt && textoAlt) it[alt.x.name] = textoAlt;
            res.push(it);
          }
          return { valor: res.length ? res : undefined };
        },
        mostrar: v => (Array.isArray(v) && v.length ? recortar(v.map(x => nombreDeRuta(x[img.x.name])).join(', ')) : VACIO),
      };
    }
    // Lista de textos (un campo): una línea por elemento
    if (subs.length === 1 && ['string', 'text'].includes(subs[0].w)) {
      const k = subs[0].x.name;
      const c = columna(T[f.name] || f.label, f, 'lineas', { multilinea: true });
      return {
        ...base, cols: [c], obligatorio: false,
        aCeldas: d => ({ [c.titulo]: (Array.isArray(d[f.name]) ? d[f.name] : []).map(x => String(x?.[k] ?? '')).filter(Boolean).join('\n') }),
        leer: celdas => {
          const t = String(valorCelda(celdas[c.titulo]) ?? '');
          if (!t.trim()) return { nada: true };
          if (esVacio(t)) return { valor: undefined };
          const l = t.replace(/\r\n/g, '\n').split('\n').map(x => x.trim()).filter(Boolean).map(x => ({ [k]: x }));
          return { valor: l.length ? l : undefined };
        },
        mostrar: v => (Array.isArray(v) && v.length ? `${v.length} ${v.length === 1 ? 'línea' : 'líneas'}` : VACIO),
      };
    }
    // Datos «nombre: valor» (Ficha técnica): una línea por dato
    const nom = subs.find(s => s.x.name === 'nombre');
    const val = subs.find(s => s.x.name === 'valor');
    if (subs.length === 2 && nom && val) {
      const c = columna(T[f.name] || f.label, f, 'lineas', { multilinea: true });
      return {
        ...base, cols: [c], obligatorio: false,
        aCeldas: d => ({ [c.titulo]: (Array.isArray(d[f.name]) ? d[f.name] : []).map(x => (x?.nombre ? `${x.nombre}: ${x.valor ?? ''}` : String(x?.valor ?? ''))).filter(Boolean).join('\n') }),
        leer: (celdas, { actual }) => {
          const t = String(valorCelda(celdas[c.titulo]) ?? '');
          if (!t.trim()) return { nada: true };
          if (esVacio(t)) return { valor: undefined };
          // Las líneas que ya eran una frase entera (sin característica) se quedan así aunque lleven «: »
          const frases = new Set((Array.isArray(actual) ? actual : []).filter(x => !x?.nombre).map(x => String(x?.valor ?? '').trim()));
          const l = t.replace(/\r\n/g, '\n').split('\n').map(x => x.trim()).filter(Boolean).map(x => {
            if (frases.has(x)) return { valor: x };
            const i = x.indexOf(': ');
            return i > 0 ? { nombre: x.slice(0, i).trim(), valor: x.slice(i + 2).trim() } : { valor: x };
          });
          return { valor: l.length ? l : undefined };
        },
        mostrar: v => (Array.isArray(v) && v.length ? `${v.length} ${v.length === 1 ? 'dato' : 'datos'}` : VACIO),
      };
    }
    return undefined;
  }

  // Sencillos: una columna
  const c = columna(T[f.name] || (f.label || f.name) + (oblig ? ' *' : ''), f, w, (w === 'image' || w === 'file') ? { imagen: carpetasImagen(cfg, col, f) } : {});
  return {
    ...base, cols: [c], imagen: c.imagen,
    aCeldas: (d, cuerpo, ctx) => ({ [c.titulo]: aCeldaSimple(w, f, f.name === 'body' ? cuerpo : d[f.name], ctx) }),
    leer: (celdas, { ctx, actual, resolverFichero }) => {
      const bruto = valorCelda(celdas[c.titulo]);
      if (vacia(bruto)) return { nada: true };
      const texto = String(bruto);
      if (esVacio(texto)) return { valor: undefined };
      const r = leerSimple(w, f, texto, bruto, ctx);
      if (r.error || !(w === 'image' || w === 'file')) return r;
      return resolverFichero(r.valor, f, c.imagen, actual || '');
    },
    mostrar: (v, ctx) => mostrarSimple(w, f, v, ctx),
  };
}

export function columnasDe(cfg, col, perfil) {
  const grupos = [];
  const omitidos = [];
  for (const f of col.fields || []) {
    const g = grupoDe(cfg, col, perfil, f);
    if (g === null) continue;
    if (!g) { omitidos.push(f.label || f.name); continue; }
    for (const c of g.cols) { c.grupo = g; c.campo = f.name; c.obligatorio = g.obligatorio && (c.parte === undefined || c.parte === 0); }
    grupos.push(g);
  }
  const campos = grupos.flatMap(g => g.cols);
  return {
    grupos, campos, omitidos,
    ordenCampos: (col.fields || []).map(f => f.name),
    // Campos ocultos con valor fijo (p. ej. «nivel» de las categorías): se ponen en las altas
    ocultos: (col.fields || []).filter(f => f.widget === 'hidden' && f.default !== undefined).map(f => ({ campo: f.name, valor: f.default })),
    todas: [
      { tipo: 'id', titulo: COL_ID },
      { tipo: 'accion', titulo: COL_ACCION },
      ...campos,
      ...(perfil.lectura || []).map(l => ({ tipo: 'lectura', titulo: l.titulo, l })),
    ],
  };
}
// Celdas de una ficha (todas las columnas de sus campos)
export function aCeldas(columnas, datos, cuerpo, ctx) {
  return Object.assign({}, ...columnas.grupos.map(g => g.aCeldas(datos, cuerpo, ctx)));
}

/* ---------- Contexto: lo que hace falta de otras colecciones ---------- */
// productos: [{ slug, datos }]; textos: [{ ruta, raw }] de todas las colecciones (para saber si una
// imagen la usa otra ficha)
export function crearContexto({ productos = [], textos = [], categorias = [], fabricantes = [], sitio = null, tipoDosPrecios = '' } = {}) {
  const productosPorFabricante = new Map();
  for (const p of productos) {
    const f = String(p.datos?.fabricante || '').trim();
    if (!f) continue;
    if (!productosPorFabricante.has(f)) productosPorFabricante.set(f, []);
    productosPorFabricante.get(f).push(p.slug);
  }
  // «Compatible con»: qué accesorios tiene cada producto
  const accesoriosDe = new Map();
  for (const p of productos) for (const s of lista(p.datos?.compatible_con)) {
    if (!accesoriosDe.has(s)) accesoriosDe.set(s, []);
    accesoriosDe.get(s).push(p.slug);
  }
  const porSlugProducto = new Map(productos.map(p => [p.slug, p]));
  const nombreFab = new Map(fabricantes.map(f => [f.slug, String(f.datos.title || f.slug)]));
  const ctx = {
    productos, textos, productosPorFabricante, accesoriosDe, porSlugProducto, sitio, tipoDosPrecios,
    catalogo: crearCatalogo(categorias, productos),
    relaciones: {
      fabricantes: fabricantes.map(f => ({ valor: f.slug, etiqueta: String(f.datos.title || f.slug) })).sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es')),
      // Colección oculta «catalogo» (tipos, categorías y subcategorías), con su ruta
      catalogo: [],
    },
    nombreFabricante: s => nombreFab.get(s) || s || '',
    nuevosProductos: new Map(), // modelo/identificador → identificador de las altas del mismo Excel
    // «Compatible con»: por identificador, por «Fabricante Modelo» o por modelo (si solo hay uno)
    resolverRelacion(coleccion, texto) {
      if (coleccion !== 'productos') return { valor: slugificar(texto) };
      const t = texto.trim();
      const s = slugificar(t);
      if (porSlugProducto.has(t) || porSlugProducto.has(s)) return { valor: porSlugProducto.has(t) ? t : s };
      if (ctx.nuevosProductos.has(s)) return { valor: ctx.nuevosProductos.get(s) };
      const candidatos = [...productos, ...[...ctx.nuevosProductos.values()].map(x => ({ slug: x, datos: {} }))]
        .filter(p => slugificar(p.datos?.modelo) === s || slugificar(`${nombreFab.get(p.datos?.fabricante) || p.datos?.fabricante || ''} ${p.datos?.modelo || ''}`) === s);
      const unicos = [...new Set(candidatos.map(p => p.slug))];
      if (unicos.length === 1) return { valor: unicos[0] };
      if (unicos.length > 1) return { error: `«${t}» puede ser ${unicos.slice(0, 4).join(', ')}${unicos.length > 4 ? '…' : ''}: escribe su identificador.` };
      return { error: `«${t}» no es ningún producto (escribe su identificador, p. ej. «singer-4432»).` };
    },
  };
  ctx.relaciones.catalogo = [...ctx.catalogo.porSlug.keys()].map(s => ({ valor: s, etiqueta: ctx.catalogo.etiqueta(s) })).sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
  return ctx;
}
const lista = v => (Array.isArray(v) ? v : v ? [v] : []).map(x => String(x).trim()).filter(Boolean);

// El árbol del catálogo: niveles, hijas, rutas y productos de cada categoría
export function crearCatalogo(categorias, productos = []) {
  const porSlug = new Map(categorias.map(c => [c.slug, { slug: c.slug, titulo: String(c.datos.title || c.slug), nivel: c.datos.nivel || '', padre: String(c.datos.padre || '').trim() }]));
  const hijas = new Map();
  for (const c of porSlug.values()) {
    if (!c.padre) continue;
    if (!hijas.has(c.padre)) hijas.set(c.padre, []);
    hijas.get(c.padre).push(c.slug);
  }
  const directos = new Map();
  for (const p of productos) {
    const c = String(p.datos?.categoria || '').trim();
    if (!c) continue;
    if (!directos.has(c)) directos.set(c, []);
    directos.get(c).push(p.slug);
  }
  const ruta = slug => {
    const r = [];
    for (let x = porSlug.get(slug), vistos = new Set(); x && !vistos.has(x.slug); x = porSlug.get(x.padre)) { vistos.add(x.slug); r.unshift(x.titulo); }
    return r;
  };
  const rutaSlugs = slug => {
    const r = [];
    for (let x = porSlug.get(slug), vistos = new Set(); x && !vistos.has(x.slug); x = porSlug.get(x.padre)) { vistos.add(x.slug); r.unshift(x.slug); }
    return r;
  };
  const productosTotal = slug => (directos.get(slug) || []).length + (hijas.get(slug) || []).reduce((n, h) => n + productosTotal(h), 0);
  const deNivel = nivel => [...porSlug.values()].filter(c => c.nivel === nivel);
  return {
    porSlug, ruta, rutaSlugs, productosTotal, deNivel,
    tipoDe: slug => rutaSlugs(slug)[0] || '',
    hijas: slug => hijas.get(slug) || [],
    productosDirectos: slug => directos.get(slug) || [],
    etiqueta: slug => ruta(slug).join(' › '),
  };
}

// Quita del «Orden del catálogo en el menú» (Ajustes del sitio) las categorías borradas. Se quitan
// solo sus líneas del texto, sin volver a escribir el resto del fichero (así no cambia nada más).
export function quitarDelOrden(YAML, raw, borradas) {
  const crlf = String(raw).includes('\r\n');
  const texto = String(raw).replace(/\r\n/g, '\n');
  const doc = YAML.parseDocument(texto);
  const lista = doc.get('catalogo_orden', true);
  if (!lista || !YAML.isSeq(lista)) return null;
  const tramos = [];
  (function buscar(seq) {
    for (const it of seq.items) {
      const slug = YAML.isMap(it) ? String(it.get('categoria') ?? '') : String(YAML.isScalar(it) ? it.value : it ?? '');
      if (borradas.has(slug.trim()) && it.range) {
        const ini = texto.lastIndexOf('\n', it.range[0] - 1) + 1;
        let fin = texto.indexOf('\n', Math.max(it.range[0], it.range[2] - 1));
        fin = fin === -1 ? texto.length : fin + 1;
        tramos.push([ini, fin]);
        continue;
      }
      const h = YAML.isMap(it) ? it.get('hijos', true) : null;
      if (h && YAML.isSeq(h)) buscar(h);
    }
  })(lista);
  if (!tramos.length) return null;
  let salida = texto;
  for (const [ini, fin] of tramos.sort((a, b) => b[0] - a[0])) salida = salida.slice(0, ini) + salida.slice(fin);
  return crlf ? salida.replace(/\n/g, '\r\n') : salida;
}

// ¿Usa alguna otra ficha esta imagen? (busca su dirección pública en el texto de las demás)
function imagenEnUso(ctx, rutaPublica, excluir) {
  return ctx.textos.some(t => !excluir.has(t.ruta) && String(t.raw).includes(rutaPublica));
}

/* ---------- El plan ---------- */
function planVacio() {
  return { nuevos: [], modificados: [], sinCambios: 0, borrados: [], avisos: [], errores: [], escribir: [], borrar: [], ignoradas: 0, imagenesUsadas: new Set() };
}

/*
  Plan de una importación.
  filas: [{ n, hoja, celdas: { <título de columna>: valor } }] (de libro.leerLibro)
  actuales: [leerEntrada(...)] de la colección
  ocupados: identificadores ya usados en la carpeta (en el catálogo, también los de otros niveles)
  huellas: Map slug → huella al exportar (hoja oculta «Control»), o null si el Excel no la tiene
  medios: Map <carpeta del repositorio> → Map nombre → huella (imágenes y ficheros que ya hay)
  subidos: Map nombre del fichero → { nombre, bytes, huella } (imágenes subidas con el Excel)
*/
export async function planificarImportacion({ YAML, cfg, col, perfil, columnas, filas, actuales, ocupados, huellas, medios = new Map(), subidos = new Map(), ctx }) {
  const plan = planVacio();
  const porSlug = new Map(actuales.map(a => [a.slug, a]));
  const usados = new Set([...(ocupados || []), ...porSlug.keys()]);
  const vistos = new Map();
  const campos = columnas.campos;
  const ordenCampos = columnas.ordenCampos || campos.map(c => c.campo);
  const celdaTexto = (fila, t) => String(valorCelda(fila.celdas[t]) ?? '').trim();
  const esBorrar = fila => slugificar(celdaTexto(fila, COL_ACCION)) === slugificar(ACCION_BORRAR);
  // Sin «Identificador» (Excel de tarifas): se empareja por el identificador que daría el panel
  const idDe = fila => {
    const escrito = celdaTexto(fila, COL_ID);
    if (escrito || !perfil.idSinColumna) return slugificar(escrito);
    return perfil.idSinColumna(fila.celdas, columnas, ctx) || '';
  };
  // Lo que se quiere borrar en este Excel (para dejar borrar algo junto con lo que cuelga de ello)
  const intencion = new Set(filas.filter(esBorrar).map(idDe).filter(Boolean));
  // Altas de este mismo Excel que pueden aparecer en «Compatible con» de otras filas
  if (perfil.idSinColumna && ctx.nuevosProductos) {
    for (const f of filas) {
      const id = celdaTexto(f, COL_ID) ? slugificar(celdaTexto(f, COL_ID)) : perfil.idSinColumna(f.celdas, columnas, ctx);
      if (!id || porSlug.has(id) || esBorrar(f)) continue;
      ctx.nuevosProductos.set(id, id);
      const modelo = slugificar(perfil.modeloDeFila?.(f.celdas) || '');
      if (modelo && !ctx.nuevosProductos.has(modelo)) ctx.nuevosProductos.set(modelo, id);
    }
  }
  const borrando = new Set();
  const subidasUsadas = new Set();

  const huellasActuales = new Map();
  for (const a of actuales) huellasActuales.set(a.slug, await huellaTexto(a.raw));
  const cambiadaEnPanel = slug => huellas && huellas.has(slug) && huellas.get(slug) !== huellasActuales.get(slug);

  for (const fila of filas) {
    const err = t => plan.errores.push({ fila: fila.n, hoja: fila.hoja, texto: t });
    const aviso = t => plan.avisos.push({ fila: fila.n, hoja: fila.hoja, texto: t });
    const idTexto = celdaTexto(fila, COL_ID);
    const accionTexto = celdaTexto(fila, COL_ACCION);
    const conDatos = campos.some(c => !vacia(valorCelda(fila.celdas[c.titulo])));
    if (!idTexto && !conDatos) { plan.ignoradas++; continue; }

    let accion = ACCION_EDITAR;
    if (accionTexto && slugificar(accionTexto) === slugificar(ACCION_BORRAR)) accion = ACCION_BORRAR;
    else if (accionTexto && slugificar(accionTexto) !== slugificar(ACCION_EDITAR)) { err(`«Acción» no vale «${accionTexto}»: elige «${ACCION_EDITAR}» o «${ACCION_BORRAR}».`); continue; }

    let slugEscrito = idTexto ? slugificar(idTexto) : '';
    if (idTexto && slugEscrito !== idTexto) aviso(`El identificador «${idTexto}» se usa como «${slugEscrito}» (sin tildes, espacios ni mayúsculas).`);
    let emparejado = false;
    if (!idTexto && perfil.idSinColumna && !fila.conColumnaId) {
      const calc = idDe(fila);
      if (calc && porSlug.has(calc)) { slugEscrito = calc; emparejado = true; }
    }
    if (slugEscrito && vistos.has(slugEscrito)) { err(`El identificador «${slugEscrito}» se repite (también en la fila ${vistos.get(slugEscrito)}).`); continue; }
    if (slugEscrito) vistos.set(slugEscrito, fila.n);
    const actual = slugEscrito ? porSlug.get(slugEscrito) : null;
    if (emparejado) aviso(`Sin «${COL_ID}»: se empareja con «${perfil.nombre(actual.datos) || actual.slug}» (${actual.slug}) por fabricante y modelo.`);

    if (actual && cambiadaEnPanel(actual.slug)) {
      aviso(`«${perfil.nombre(actual.datos) || actual.slug}» se cambió en el panel después de exportar el Excel: no se toca. Exporta de nuevo para trabajar con la versión actual.`);
      continue;
    }

    /* Borrar */
    if (accion === ACCION_BORRAR) {
      if (!actual) { err(`No se puede borrar «${idTexto || '(sin identificador)'}»: no existe.`); continue; }
      const motivo = perfil.motivoNoBorrar ? perfil.motivoNoBorrar(actual.slug, ctx, intencion) : '';
      if (motivo) { err(`No se puede borrar «${perfil.nombre(actual.datos) || actual.slug}»: ${motivo}`); continue; }
      plan.borrados.push({ fila: fila.n, hoja: fila.hoja, slug: actual.slug, nombre: perfil.nombre(actual.datos) || actual.slug, arrastra: [] });
      borrando.add(actual.slug);
      continue;
    }

    /* Crear o modificar */
    // Ficheros (fotos, PDF): subidos con el Excel, los que ya están en la web o los de antes
    const resolverFichero = (valor, f, carpetas, actualRuta) => {
      const limpio = nombreImagen(valor);
      const carpeta = medios.get(carpetas.repo) || new Map();
      const subida = subidos.get(valor) || subidos.get(limpio) || [...subidos.values()].find(x => nombreImagen(x.nombre) === limpio);
      if (subida) {
        plan.imagenesUsadas.add(subida.nombre);
        const max = maxBytes(f);
        if (max && subida.bytes.length > max) return { error: `«${subida.nombre}» pesa más de ${Math.round(max / 1e6)} MB.` };
        if (/\.(jxl|heic|heif)$/i.test(limpio)) aviso(`La imagen «${limpio}» está en un formato que muchos navegadores no muestran.`);
        // Si ya hay un fichero con ese nombre exacto, se respeta; si no, se guarda con el nombre limpio
        const destino = carpeta.has(valor) ? valor : limpio;
        const enCarpeta = carpeta.get(destino);
        if (enCarpeta !== subida.huella && !subidasUsadas.has(destino)) {
          plan.escribir.push({ ruta: `${carpetas.repo}/${destino}`, bytes: subida.bytes, reducir: Boolean(perfil.reducirImagenes) && esImagen(destino) });
          subidasUsadas.add(destino);
          if (enCarpeta !== undefined) aviso(`Se sustituye «${destino}», que ya existía.`);
        }
        return { valor: nombreDeRuta(actualRuta) === destino ? actualRuta : `${carpetas.publica}/${destino}` };
      }
      if (nombreDeRuta(actualRuta) === valor) return { valor: actualRuta }; // el mismo de antes
      if (carpeta.has(valor) || carpeta.has(limpio)) return { valor: `${carpetas.publica}/${carpeta.has(valor) ? valor : limpio}` }; // ya está en la web
      return { error: `falta «${valor}»: súbelo junto al Excel (o dentro del ZIP).` };
    };

    const nuevos = {};
    let erroneo = false;
    for (const g of columnas.grupos) {
      const actualValor = actual ? (g.campo === 'body' ? actual.cuerpo.replace(/\s+$/, '') : actual.datos[g.campo]) : undefined;
      const r = g.leer(fila.celdas, { ctx, actual: actualValor, resolverFichero, fila });
      if (r.error) { err(`«${g.etiqueta}»: ${r.error}`); erroneo = true; continue; }
      if (r.nada) continue;
      if (r.valor === undefined && g.obligatorio) { err(`«${g.etiqueta}» es obligatorio: no se puede dejar «${VACIO}».`); erroneo = true; continue; }
      nuevos[g.campo] = r.valor;
    }
    if (erroneo) continue;
    for (const t of perfil.comprobar?.({ ...(actual?.datos || {}), ...nuevos }, ctx) || []) aviso(t);

    if (!actual) {
      // Ficha nueva
      for (const g of columnas.grupos) {
        if (g.obligatorio && (nuevos[g.campo] === undefined || nuevos[g.campo] === '')) { err(`Falta «${g.etiqueta}», que es obligatorio.`); erroneo = true; }
      }
      if (erroneo) continue;
      for (const g of columnas.grupos) if (nuevos[g.campo] === undefined && g.f.default !== undefined && !['object', 'list'].includes(g.f.widget)) nuevos[g.campo] = g.f.default;
      for (const o of columnas.ocultos || []) nuevos[o.campo] = o.valor;
      for (const k of Object.keys(nuevos)) if (nuevos[k] === undefined) delete nuevos[k];
      let slug = slugEscrito;
      if (slug) {
        if (usados.has(slug)) { err(`El identificador «${slug}» ya existe.`); continue; }
        const parecido = actuales.find(a => slugificar(perfil.nombre(a.datos)) === slugificar(perfil.nombre(nuevos)));
        if (parecido) aviso(`«${slug}» no existe y se creará nuevo, pero «${parecido.slug}» tiene el mismo nombre: ¿querías decir «${parecido.slug}»?`);
      } else {
        const base = perfil.identificar(nuevos) || perfil.uno;
        slug = base;
        for (let i = 2; usados.has(slug); i++) slug = `${base}-${i}`;
        if (slug !== base) aviso(`Ya había un «${base}»: el nuevo se crea como «${slug}».`);
      }
      usados.add(slug);
      const cuerpo = 'body' in nuevos ? (nuevos.body ?? '') : '';
      plan.nuevos.push({ fila: fila.n, hoja: fila.hoja, slug, nombre: perfil.nombre(nuevos) || slug });
      if (perfil.quitarDelOrden) aviso(`«${perfil.nombre(nuevos) || slug}» es ${perfil.uno === 'tipo de producto' ? 'nuevo' : 'nueva'}: ponle su lugar en Ajustes del sitio → «Orden del catálogo en el menú» (si no, sale al final, en orden alfabético).`);
      plan.escribir.push({ ruta: perfil.rutaNueva ? perfil.rutaNueva(col, slug, nuevos) : `${col.folder}/${slug}.md`, texto: componer(YAML, null, nuevos, cuerpo ? cuerpo + '\n' : '', ordenCampos) });
      continue;
    }

    // Ficha que ya existe: solo lo que cambia
    const cambios = {};
    const lista = [];
    for (const g of columnas.grupos) {
      if (!(g.campo in nuevos)) continue;
      const antes = g.campo === 'body' ? actual.cuerpo.replace(/\s+$/, '') : actual.datos[g.campo];
      const despues = nuevos[g.campo];
      if (g.f.widget === 'boolean' && (antes ?? false) === (despues ?? false)) continue;
      if (igual(antes, despues) || (vacia(antes) && despues === undefined) || (Array.isArray(antes) && !antes.length && despues === undefined)) continue;
      cambios[g.campo] = despues;
      lista.push({ campo: g.etiqueta, antes: g.mostrar(antes, ctx), despues: g.mostrar(despues, ctx) });
      if (g.f.widget === 'categoria-catalogo' && perfil.quitarDelOrden) aviso(`«${perfil.nombre(actual.datos) || actual.slug}» cambia de sitio en el catálogo: revisa su lugar en Ajustes del sitio → «Orden del catálogo en el menú».`);
    }
    if (!lista.length) { plan.sinCambios++; continue; }
    const cuerpo = 'body' in cambios ? (cambios.body ? cambios.body + '\n' : '') : actual.cuerpo;
    plan.modificados.push({ fila: fila.n, hoja: fila.hoja, slug: actual.slug, nombre: perfil.nombre({ ...actual.datos, ...cambios }) || actual.slug, cambios: lista });
    plan.escribir.push({ ruta: actual.ruta, texto: componer(YAML, actual, cambios, cuerpo, ordenCampos) });
  }

  if (huellas === null && filas.length) plan.avisos.unshift({ fila: 0, texto: 'Este Excel no viene de «Exportar a Excel» del panel: no se puede comprobar si alguna ficha cambió en el panel después.' });
  completarBorrados(plan, { YAML, col, columnas, actuales, ctx, borrando });
  quitarBorradosDelOrden(plan, { YAML, perfil, ctx, borrando });
  return plan;
}

// Fotos y ficheros de una ficha: [{ ruta (pública), repo (en el repositorio), carpetas }]
export function ficherosDe(columnas, datos) {
  return columnas.grupos.flatMap(g => {
    if (g.fotos) return (Array.isArray(datos[g.campo]) ? datos[g.campo] : []).map(x => ({ ruta: x?.[g.cols[0].f.name], carpetas: g.imagen }));
    if (g.imagen) return [{ ruta: datos[g.campo], carpetas: g.imagen }];
    return [];
  }).filter(x => x.ruta && typeof x.ruta === 'string' && !/^https?:/i.test(x.ruta))
    .map(x => ({ ...x, repo: x.ruta.startsWith(x.carpetas.publica + '/') ? x.carpetas.repo + x.ruta.slice(x.carpetas.publica.length) : 'public' + x.ruta }));
}
export const esSubible = nombre => EXT_IMAGEN.test(nombre) || /\.pdf$/i.test(nombre);

// Ficheros que se borran con cada ficha: la propia ficha, sus imágenes y PDF que no use otra ficha y,
// en los productos, su referencia en «Compatible con» de los accesorios
function completarBorrados(plan, { YAML, columnas, actuales, ctx, borrando }) {
  if (!borrando.size) return;
  const porSlug = new Map(actuales.map(a => [a.slug, a]));
  const excluir = new Set([...borrando].map(s => porSlug.get(s).ruta));
  const reescritas = new Set(plan.escribir.filter(e => e.texto).map(e => e.ruta));
  const ficheros = a => ficherosDe(columnas, a.datos);
  for (const b of plan.borrados) {
    const a = porSlug.get(b.slug);
    plan.borrar.push(a.ruta);
    for (const { ruta, repo } of ficheros(a)) {
      // Si otra ficha lo usa (o lo usará tras esta importación), se queda
      const enUso = imagenEnUso(ctx, ruta, new Set([...excluir, ...reescritas]))
        || plan.escribir.some(e => e.texto && e.texto.includes(ruta));
      if (enUso) { b.arrastra.push(`${nombreDeRuta(ruta)} se queda (lo usa otra ficha)`); continue; }
      if (!plan.borrar.includes(repo)) plan.borrar.push(repo);
      b.arrastra.push(`se borra ${nombreDeRuta(ruta)}`);
    }
  }
  // «Compatible con» de los accesorios que siguen (decidido el 18-11-2026: se quita y se avisa)
  if (!ctx.accesoriosDe) return;
  const afectados = new Map();
  for (const s of borrando) for (const acc of ctx.accesoriosDe.get(s) || []) if (!borrando.has(acc)) {
    if (!afectados.has(acc)) afectados.set(acc, []);
    afectados.get(acc).push(s);
  }
  for (const [acc, quitar] of afectados) {
    const p = ctx.porSlugProducto.get(acc);
    if (!p) continue;
    const previo = plan.escribir.find(e => e.ruta === p.ruta && e.texto !== undefined);
    const base = previo ? leerEntrada(YAML, p.ruta, previo.texto) : p;
    const quedan = lista(base.datos.compatible_con).filter(x => !quitar.includes(x));
    const texto = componer(YAML, base, { compatible_con: quedan.length ? quedan : undefined }, base.cuerpo, columnas.ordenCampos);
    if (previo) previo.texto = texto; else plan.escribir.push({ ruta: p.ruta, texto });
    const nombre = String(p.datos.title || acc);
    for (const s of quitar) plan.borrados.find(b => b.slug === s)?.arrastra.push(`se quita de «Compatible con» de ${nombre}`);
    if (!previo) plan.modificados.push({ fila: 0, slug: acc, nombre, cambios: [{ campo: 'Compatible con', antes: lista(p.datos.compatible_con).join(', '), despues: quedan.join(', ') || VACIO }] });
  }
}

/* Plan de una acción en bloque sin Excel (Eliminar, «Solo para pruebas», disponible…) sobre los elegidos */
const ACCIONES_CAMPO = {
  'prueba-quitar': { campo: 'prueba', valor: false, etiqueta: 'Solo para pruebas', ver: v => (v ? SI : NO), igual: (a, b) => Boolean(a) === b },
  'prueba-poner': { campo: 'prueba', valor: true, etiqueta: 'Solo para pruebas', ver: v => (v ? SI : NO), igual: (a, b) => Boolean(a) === b },
  'no-disponible': { campo: 'estado', valor: 'no_disponible', etiqueta: 'Estado', ver: v => ({ disponible: 'Disponible', oferta: 'En oferta', no_disponible: 'No disponible' })[v || 'disponible'] || v, igual: (a, b) => (a || 'disponible') === b },
  disponible: { campo: 'estado', valor: 'disponible', etiqueta: 'Estado', ver: v => ({ disponible: 'Disponible', oferta: 'En oferta', no_disponible: 'No disponible' })[v || 'disponible'] || v, igual: (a, b) => (a || 'disponible') === b },
};
export async function planificarAccion({ YAML, col, perfil, columnas, actuales, slugs, accion, ctx }) {
  const plan = planVacio();
  const porSlug = new Map(actuales.map(a => [a.slug, a]));
  const ordenCampos = columnas.ordenCampos || columnas.campos.map(c => c.campo);
  const borrando = new Set();
  const intencion = new Set(accion === 'borrar' ? slugs : []);
  for (const slug of slugs) {
    const a = porSlug.get(slug);
    if (!a) { plan.errores.push({ fila: 0, texto: `«${slug}» ya no existe.` }); continue; }
    const nombre = perfil.nombre(a.datos) || a.slug;
    if (accion === 'borrar') {
      const motivo = perfil.motivoNoBorrar ? perfil.motivoNoBorrar(slug, ctx, intencion) : '';
      if (motivo) { plan.errores.push({ fila: 0, texto: `No se puede borrar «${nombre}»: ${motivo}` }); continue; }
      plan.borrados.push({ fila: 0, slug, nombre, arrastra: [] });
      borrando.add(slug);
    } else if (ACCIONES_CAMPO[accion]) {
      const A = ACCIONES_CAMPO[accion];
      if (A.igual(a.datos[A.campo], A.valor)) { plan.sinCambios++; continue; }
      plan.modificados.push({ fila: 0, slug, nombre, cambios: [{ campo: A.etiqueta, antes: A.ver(a.datos[A.campo]), despues: A.ver(A.valor) }] });
      plan.escribir.push({ ruta: a.ruta, texto: componer(YAML, a, { [A.campo]: A.valor }, a.cuerpo, ordenCampos) });
    } else throw new Error(`Acción desconocida: ${accion}`);
  }
  completarBorrados(plan, { YAML, col, columnas, actuales, ctx, borrando });
  quitarBorradosDelOrden(plan, { YAML, perfil, ctx, borrando });
  return plan;
}

// Al borrar tipos o categorías, también salen de «Orden del catálogo en el menú»
function quitarBorradosDelOrden(plan, { YAML, perfil, ctx, borrando }) {
  if (!perfil.quitarDelOrden || !borrando.size || !ctx?.sitio) return;
  const nuevo = quitarDelOrden(YAML, ctx.sitio.raw, borrando);
  if (!nuevo) return;
  plan.escribir.push({ ruta: ctx.sitio.ruta, texto: nuevo });
  for (const b of plan.borrados) b.arrastra.push('se quita de «Orden del catálogo en el menú»');
}

export const hayCambios = plan => plan.escribir.length + plan.borrar.length > 0;

export function resumenPlan(plan, perfil) {
  const partes = [];
  if (plan.nuevos.length) partes.push(plural(plan.nuevos.length, 'nuevo', 'nuevos'));
  if (plan.modificados.length) partes.push(plural(plan.modificados.length, 'modificado', 'modificados'));
  if (plan.borrados.length) partes.push(plural(plan.borrados.length, 'borrado', 'borrados'));
  return partes.length ? `${perfil.varios[0].toUpperCase()}${perfil.varios.slice(1)}: ${partes.join(', ')}` : 'Sin cambios';
}
