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

// Tipos de campo del panel que se pasan a columnas (los demás, en las siguientes colecciones)
const TIPOS = new Set(['string', 'text', 'markdown', 'number', 'boolean', 'select', 'image', 'datetime', 'color']);

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
};
export const coleccionesConExcel = () => Object.keys(PERFILES);

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
  let fm = doc.toString({ lineWidth: 0 });
  if (!fm.endsWith('\n')) fm += '\n';
  const c = cuerpo ?? '';
  const texto = `---\n${fm}---\n${c}`;
  // Si la ficha tenía finales de línea de Windows (copia local), se mantienen
  return actual && String(actual.raw).includes('\r\n') ? texto.replace(/\r?\n/g, '\r\n') : texto;
}

/* ---------- Configuración de la colección ---------- */
export const obligatorio = f => f.required !== false && (f.widget || 'string') !== 'boolean';
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

export function columnasDe(cfg, col, perfil) {
  const campos = [];
  const omitidos = [];
  for (const f of col.fields || []) {
    const w = f.widget || 'string';
    if (w === 'hidden') continue;
    if (!TIPOS.has(w)) { omitidos.push(f.label || f.name); continue; }
    campos.push({
      tipo: 'campo', campo: f.name, widget: w, f,
      titulo: (f.label || f.name) + (obligatorio(f) ? ' *' : ''),
      obligatorio: obligatorio(f),
      imagen: w === 'image' ? carpetasImagen(cfg, col, f) : null,
    });
  }
  return {
    todas: [
      { tipo: 'id', titulo: COL_ID },
      { tipo: 'accion', titulo: COL_ACCION },
      ...campos,
      ...(perfil.lectura || []).map(l => ({ tipo: 'lectura', titulo: l.titulo, l })),
    ],
    campos,
    omitidos,
  };
}

/* ---------- De la ficha a la celda y de la celda al dato ---------- */
export function aCelda(c, datos, cuerpo) {
  const v = c.campo === 'body' ? cuerpo : datos[c.campo];
  switch (c.widget) {
    case 'boolean': return (v ?? c.f.default ?? false) ? SI : NO;
    case 'image': return v ? nombreDeRuta(v) : '';
    case 'select': {
      const o = opcionesSelect(c.f).find(x => x.valor === String(v ?? ''));
      return o ? o.etiqueta : (v ?? '');
    }
    case 'number': return v === undefined || v === null || v === '' ? '' : Number(v);
    default: return v === undefined || v === null ? '' : (typeof v === 'string' ? v.replace(/\s+$/, '') : String(v));
  }
}

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

// Devuelve { nada } (no tocar), { borrar } o { valor } o { error }
export function leerValor(c, bruto) {
  if (vacia(bruto)) return { nada: true };
  const texto = typeof bruto === 'string' ? bruto : String(bruto);
  if (texto.trim().toLowerCase() === VACIO) return { borrar: true };
  switch (c.widget) {
    case 'boolean': {
      const t = slugificar(texto);
      if (['si', 's', 'x', 'true', 'verdadero', '1'].includes(t)) return { valor: true };
      if (['no', 'n', 'false', 'falso', '0'].includes(t)) return { valor: false };
      return { error: `«${texto}» no vale: escribe «Sí» o «No».` };
    }
    case 'number': {
      const n = typeof bruto === 'number' ? bruto : Number(texto.trim().replace(/\./g, '').replace(',', '.'));
      if (!Number.isFinite(n)) return { error: `«${texto}» no es un número.` };
      return { valor: n };
    }
    case 'select': {
      const ops = opcionesSelect(c.f);
      const o = ops.find(x => x.etiqueta.toLowerCase() === texto.trim().toLowerCase() || x.valor.toLowerCase() === texto.trim().toLowerCase());
      if (!o) return { error: `«${texto}» no es una opción válida (${ops.map(x => x.etiqueta).join(', ')}).` };
      return { valor: o.valor };
    }
    case 'image': return { valor: texto.trim().split(/[\\/]/).pop() }; // tal cual: se limpia al subirla
    case 'text': case 'markdown': return { valor: texto.replace(/\r\n/g, '\n').replace(/\s+$/, '') };
    default: return { valor: texto.trim() };
  }
}

const igual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const mostrar = (c, v) => {
  if (v === undefined || v === null || v === '') return '(vacío)';
  if (c.widget === 'boolean') return v ? SI : NO;
  if (c.widget === 'image') return nombreDeRuta(v);
  const t = String(v);
  return t.length > 80 ? t.slice(0, 77) + '…' : t;
};

/* ---------- Contexto: lo que hace falta de otras colecciones ---------- */
// productos: [{ slug, datos }]; textos: [{ ruta, raw }] de todas las colecciones (para saber si una
// imagen la usa otra ficha)
export function crearContexto({ productos = [], textos = [] } = {}) {
  const productosPorFabricante = new Map();
  for (const p of productos) {
    const f = String(p.datos?.fabricante || '').trim();
    if (!f) continue;
    if (!productosPorFabricante.has(f)) productosPorFabricante.set(f, []);
    productosPorFabricante.get(f).push(p.slug);
  }
  return { productos, textos, productosPorFabricante };
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
  filas: [{ n, celdas: { <título de columna>: valor } }] (de libro.leerLibro)
  actuales: [leerEntrada(...)] de la colección
  huellas: Map slug → huella al exportar (hoja oculta «Control»), o null si el Excel no la tiene
  medios: Map <carpeta del repositorio> → Map nombre → huella (imágenes que ya hay)
  subidos: Map nombre del fichero → { nombre, bytes, huella } (imágenes subidas con el Excel)
*/
export async function planificarImportacion({ YAML, cfg, col, perfil, columnas, filas, actuales, huellas, medios = new Map(), subidos = new Map(), ctx }) {
  const plan = planVacio();
  const porSlug = new Map(actuales.map(a => [a.slug, a]));
  const usados = new Set(porSlug.keys());
  const vistos = new Map();
  const campos = columnas.campos;
  const ordenCampos = campos.map(c => c.campo);
  const borrando = new Set();
  const subidasUsadas = new Set();

  const huellasActuales = new Map();
  for (const a of actuales) huellasActuales.set(a.slug, await huellaTexto(a.raw));
  const cambiadaEnPanel = slug => huellas && huellas.has(slug) && huellas.get(slug) !== huellasActuales.get(slug);

  for (const fila of filas) {
    const err = t => plan.errores.push({ fila: fila.n, texto: t });
    const idTexto = String(valorCelda(fila.celdas[COL_ID]) ?? '').trim();
    const accionTexto = String(valorCelda(fila.celdas[COL_ACCION]) ?? '').trim();
    const conDatos = campos.some(c => !vacia(valorCelda(fila.celdas[c.titulo])));
    if (!idTexto && !conDatos) { plan.ignoradas++; continue; }

    let accion = ACCION_EDITAR;
    if (accionTexto && slugificar(accionTexto) === slugificar(ACCION_BORRAR)) accion = ACCION_BORRAR;
    else if (accionTexto && slugificar(accionTexto) !== slugificar(ACCION_EDITAR)) { err(`«Acción» no vale «${accionTexto}»: elige «${ACCION_EDITAR}» o «${ACCION_BORRAR}».`); continue; }

    const slugEscrito = idTexto ? slugificar(idTexto) : '';
    if (idTexto && slugEscrito !== idTexto) plan.avisos.push({ fila: fila.n, texto: `El identificador «${idTexto}» se usa como «${slugEscrito}» (sin tildes, espacios ni mayúsculas).` });
    if (slugEscrito && vistos.has(slugEscrito)) { err(`El identificador «${slugEscrito}» se repite (también en la fila ${vistos.get(slugEscrito)}).`); continue; }
    if (slugEscrito) vistos.set(slugEscrito, fila.n);
    const actual = slugEscrito ? porSlug.get(slugEscrito) : null;

    if (actual && cambiadaEnPanel(actual.slug)) {
      plan.avisos.push({ fila: fila.n, texto: `«${perfil.nombre(actual.datos) || actual.slug}» se cambió en el panel después de exportar el Excel: no se toca. Exporta de nuevo para trabajar con la versión actual.` });
      continue;
    }

    /* Borrar */
    if (accion === ACCION_BORRAR) {
      if (!actual) { err(`No se puede borrar «${idTexto || '(sin identificador)'}»: no existe.`); continue; }
      const motivo = perfil.motivoNoBorrar ? perfil.motivoNoBorrar(actual.slug, ctx) : '';
      if (motivo) { err(`No se puede borrar «${perfil.nombre(actual.datos) || actual.slug}»: ${motivo}`); continue; }
      plan.borrados.push({ fila: fila.n, slug: actual.slug, nombre: perfil.nombre(actual.datos) || actual.slug, arrastra: [] });
      borrando.add(actual.slug);
      continue;
    }

    /* Crear o modificar */
    const nuevos = {};
    let erroneo = false;
    for (const c of campos) {
      const r = leerValor(c, valorCelda(fila.celdas[c.titulo]));
      if (r.error) { err(`«${c.f.label || c.campo}»: ${r.error}`); erroneo = true; continue; }
      if (r.nada) continue;
      if (r.borrar) {
        if (c.obligatorio) { err(`«${c.f.label || c.campo}» es obligatorio: no se puede dejar «${VACIO}».`); erroneo = true; continue; }
        nuevos[c.campo] = undefined;
        continue;
      }
      let valor = r.valor;
      if (c.widget === 'image') {
        const actualRuta = actual ? actual.datos[c.campo] || '' : '';
        const limpio = nombreImagen(valor);
        const carpeta = medios.get(c.imagen.repo) || new Map();
        const subida = subidos.get(valor) || subidos.get(limpio) || [...subidos.values()].find(x => nombreImagen(x.nombre) === limpio);
        if (subida) {
          plan.imagenesUsadas.add(subida.nombre);
          const max = maxBytes(c.f);
          if (max && subida.bytes.length > max) { err(`La imagen «${subida.nombre}» pesa más de ${Math.round(max / 1e6)} MB.`); erroneo = true; continue; }
          if (/\.(jxl|heic|heif)$/i.test(limpio)) plan.avisos.push({ fila: fila.n, texto: `La imagen «${limpio}» está en un formato que muchos navegadores no muestran.` });
          // Si ya hay una imagen con ese nombre exacto, se respeta; si no, se guarda con el nombre limpio
          const destino = carpeta.has(valor) ? valor : limpio;
          const enCarpeta = carpeta.get(destino);
          if (enCarpeta !== subida.huella && !subidasUsadas.has(destino)) {
            plan.escribir.push({ ruta: `${c.imagen.repo}/${destino}`, bytes: subida.bytes });
            subidasUsadas.add(destino);
            if (enCarpeta !== undefined) plan.avisos.push({ fila: fila.n, texto: `Se sustituye la imagen «${destino}», que ya existía.` });
          }
          valor = nombreDeRuta(actualRuta) === destino ? actualRuta : `${c.imagen.publica}/${destino}`;
        } else if (nombreDeRuta(actualRuta) === valor) {
          valor = actualRuta; // la misma de antes
        } else if (carpeta.has(valor) || carpeta.has(limpio)) {
          valor = `${c.imagen.publica}/${carpeta.has(valor) ? valor : limpio}`; // ya está en la web
        } else {
          err(`Falta la imagen «${valor}»: súbela junto al Excel (o dentro del ZIP).`); erroneo = true; continue;
        }
      }
      nuevos[c.campo] = valor;
    }
    if (erroneo) continue;

    if (!actual) {
      // Ficha nueva
      for (const c of campos) {
        if (c.obligatorio && (nuevos[c.campo] === undefined || nuevos[c.campo] === '')) { err(`Falta «${c.f.label || c.campo}», que es obligatorio.`); erroneo = true; }
      }
      if (erroneo) continue;
      for (const c of campos) if (nuevos[c.campo] === undefined && c.f.default !== undefined) nuevos[c.campo] = c.f.default;
      let slug = slugEscrito;
      if (slug) {
        if (usados.has(slug)) { err(`El identificador «${slug}» ya existe.`); continue; }
        const parecido = actuales.find(a => slugificar(perfil.nombre(a.datos)) === slugificar(perfil.nombre(nuevos)));
        if (parecido) plan.avisos.push({ fila: fila.n, texto: `«${slug}» no existe y se creará nuevo, pero «${parecido.slug}» tiene el mismo nombre: ¿querías decir «${parecido.slug}»?` });
      } else {
        const base = perfil.identificar(nuevos) || perfil.uno;
        slug = base;
        for (let i = 2; usados.has(slug); i++) slug = `${base}-${i}`;
        if (slug !== base) plan.avisos.push({ fila: fila.n, texto: `Ya había un «${base}»: el nuevo se crea como «${slug}».` });
      }
      usados.add(slug);
      const cuerpo = 'body' in nuevos ? (nuevos.body ?? '') : '';
      plan.nuevos.push({ fila: fila.n, slug, nombre: perfil.nombre(nuevos) || slug });
      plan.escribir.push({ ruta: `${col.folder}/${slug}.md`, texto: componer(YAML, null, nuevos, cuerpo ? cuerpo + '\n' : '', ordenCampos) });
      continue;
    }

    // Ficha que ya existe: solo lo que cambia
    const cambios = {};
    const lista = [];
    for (const c of campos) {
      if (!(c.campo in nuevos)) continue;
      const antes = c.campo === 'body' ? actual.cuerpo.replace(/\s+$/, '') : actual.datos[c.campo];
      let despues = nuevos[c.campo];
      if (c.widget === 'boolean' && (antes ?? false) === (despues ?? false)) continue;
      if (igual(antes, despues) || (vacia(antes) && despues === undefined)) continue;
      cambios[c.campo] = despues;
      lista.push({ campo: c.f.label || c.campo, antes: mostrar(c, antes), despues: mostrar(c, despues) });
    }
    if (!lista.length) { plan.sinCambios++; continue; }
    const cuerpo = 'body' in cambios ? (cambios.body ? cambios.body + '\n' : '') : actual.cuerpo;
    plan.modificados.push({ fila: fila.n, slug: actual.slug, nombre: perfil.nombre({ ...actual.datos, ...cambios }) || actual.slug, cambios: lista });
    plan.escribir.push({ ruta: actual.ruta, texto: componer(YAML, actual, cambios, cuerpo, ordenCampos) });
  }

  if (huellas === null && filas.length) plan.avisos.unshift({ fila: 0, texto: 'Este Excel no viene de «Exportar a Excel» del panel: no se puede comprobar si alguna ficha cambió en el panel después.' });
  completarBorrados(plan, { col, columnas, actuales, ctx, borrando });
  return plan;
}

// Ficheros que se borran con cada ficha: la propia ficha y sus imágenes que no use otra
function completarBorrados(plan, { columnas, actuales, ctx, borrando }) {
  const porSlug = new Map(actuales.map(a => [a.slug, a]));
  const excluir = new Set([...borrando].map(s => porSlug.get(s).ruta));
  const reescritas = new Set(plan.escribir.filter(e => e.texto).map(e => e.ruta));
  for (const b of plan.borrados) {
    const a = porSlug.get(b.slug);
    plan.borrar.push(a.ruta);
    for (const c of columnas.campos.filter(x => x.widget === 'image')) {
      const ruta = a.datos[c.campo];
      if (!ruta || /^https?:/i.test(ruta)) continue;
      // Si otra ficha la usa (o la usará tras esta importación), se queda
      const enUso = imagenEnUso(ctx, ruta, new Set([...excluir, ...reescritas]))
        || plan.escribir.some(e => e.texto && e.texto.includes(ruta));
      if (enUso) { b.arrastra.push(`la imagen ${nombreDeRuta(ruta)} se queda (la usa otra ficha)`); continue; }
      const repo = ruta.startsWith(c.imagen.publica + '/') ? c.imagen.repo + ruta.slice(c.imagen.publica.length) : 'public' + ruta;
      if (!plan.borrar.includes(repo)) plan.borrar.push(repo);
      b.arrastra.push(`se borra su imagen ${nombreDeRuta(ruta)}`);
    }
  }
}

/* Plan de una acción en bloque sin Excel (Eliminar, «Solo para pruebas»…) sobre los elegidos */
export async function planificarAccion({ YAML, col, perfil, columnas, actuales, slugs, accion, ctx }) {
  const plan = planVacio();
  const porSlug = new Map(actuales.map(a => [a.slug, a]));
  const ordenCampos = columnas.campos.map(c => c.campo);
  const borrando = new Set();
  for (const slug of slugs) {
    const a = porSlug.get(slug);
    if (!a) { plan.errores.push({ fila: 0, texto: `«${slug}» ya no existe.` }); continue; }
    const nombre = perfil.nombre(a.datos) || a.slug;
    if (accion === 'borrar') {
      const motivo = perfil.motivoNoBorrar ? perfil.motivoNoBorrar(slug, ctx) : '';
      if (motivo) { plan.errores.push({ fila: 0, texto: `No se puede borrar «${nombre}»: ${motivo}` }); continue; }
      plan.borrados.push({ fila: 0, slug, nombre, arrastra: [] });
      borrando.add(slug);
    } else if (accion === 'prueba-quitar' || accion === 'prueba-poner') {
      const valor = accion === 'prueba-poner';
      if (Boolean(a.datos.prueba) === valor) { plan.sinCambios++; continue; }
      plan.modificados.push({ fila: 0, slug, nombre, cambios: [{ campo: 'Solo para pruebas', antes: valor ? NO : SI, despues: valor ? SI : NO }] });
      plan.escribir.push({ ruta: a.ruta, texto: componer(YAML, a, { prueba: valor }, a.cuerpo, ordenCampos) });
    } else throw new Error(`Acción desconocida: ${accion}`);
  }
  completarBorrados(plan, { col, columnas, actuales, ctx, borrando });
  return plan;
}

export const hayCambios = plan => plan.escribir.length + plan.borrar.length > 0;

export function resumenPlan(plan, perfil) {
  const partes = [];
  if (plan.nuevos.length) partes.push(plural(plan.nuevos.length, 'nuevo', 'nuevos'));
  if (plan.modificados.length) partes.push(plural(plan.modificados.length, 'modificado', 'modificados'));
  if (plan.borrados.length) partes.push(plural(plan.borrados.length, 'borrado', 'borrados'));
  return partes.length ? `${perfil.varios[0].toUpperCase()}${perfil.varios.slice(1)}: ${partes.join(', ')}` : 'Sin cambios';
}
