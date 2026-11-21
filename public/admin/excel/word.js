/*
  Páginas a Word (docs/PLAN.md, fase 3): un .docx por página, para pasárselas a la asesoría.
  Solo se exportan (decidido por Víctor el 18-11-2026). Se escribe el .docx a mano (es un ZIP con XML)
  con JSZip y el analizador de Markdown «marked» (los dos ya están en el proyecto): sin librerías nuevas.

  Contenido: título, descripción breve, el texto (encabezados, párrafos, negritas, cursivas, enlaces,
  listas, citas, tablas y líneas) con los datos de la tienda puestos en los marcadores ({titular},
  {nif}…), como en la web. Lo que falta sale como «[NIF]» resaltado en amarillo, para verlo de un vistazo.
*/

const xml = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/><w:szCs w:val="40"/><w:color w:val="1F4E79"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:i/><w:color w:val="595959"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="1F4E79"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/><w:color w:val="1F4E79"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="567"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="BFBFBF"/></w:pBdr></w:pPr><w:rPr><w:i/><w:color w:val="404040"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Nota"><w:name w:val="Nota"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="18"/><w:color w:val="7F7F7F"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="Tabla"><w:name w:val="Tabla"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="4" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:color="BFBFBF"/></w:tblBorders><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;

/* Convierte el Markdown en párrafos de Word. web: dirección de la web, para los enlaces relativos */
function cuerpoWord(marked, markdown, web, rels) {
  const enlace = href => {
    let url = String(href || '');
    if (url.startsWith('/')) url = web.replace(/\/+$/, '') + url;
    let id = rels.get(url);
    if (!id) { id = `rEnlace${rels.size + 1}`; rels.set(url, id); }
    return id;
  };
  // Texto con los huecos «[…]» resaltados en amarillo
  const texto = (t, rPr = '') => String(t).split(/(\[[^\]\n]{1,60}\])/).filter(Boolean).map(trozo => {
    const hueco = /^\[[^\]]+\]$/.test(trozo) ? '<w:highlight w:val="yellow"/>' : '';
    const props = rPr + hueco;
    return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(trozo)}</w:t></w:r>`;
  }).join('');
  const lineas = (tokens, rPr = '') => (tokens || []).map(tk => {
    switch (tk.type) {
      case 'strong': return lineas(tk.tokens, rPr + '<w:b/>');
      case 'em': return lineas(tk.tokens, rPr + '<w:i/>');
      case 'del': return lineas(tk.tokens, rPr + '<w:strike/>');
      case 'codespan': return texto(tk.text, rPr + '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>');
      case 'br': return '<w:r><w:br/></w:r>';
      case 'link': return `<w:hyperlink r:id="${enlace(tk.href)}">${lineas(tk.tokens, rPr + '<w:rStyle w:val="Hyperlink"/>')}</w:hyperlink>`;
      case 'image': return texto(`[Imagen: ${tk.text || tk.href}]`, rPr + '<w:i/>');
      case 'html': return ''; // las etiquetas HTML sueltas no se pasan
      case 'escape': case 'text': return tk.tokens ? lineas(tk.tokens, rPr) : texto(tk.text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"), rPr);
      default: return tk.text ? texto(tk.text, rPr) : '';
    }
  }).join('');
  const parrafo = (contenido, pPr = '') => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${contenido}</w:p>`;
  const bloques = (tokens, nivelLista = 0, cita = false) => (tokens || []).map(tk => {
    const estiloCita = cita ? '<w:pStyle w:val="Quote"/>' : '';
    switch (tk.type) {
      case 'heading': return parrafo(lineas(tk.tokens), `<w:pStyle w:val="Heading${Math.min(4, tk.depth)}"/>`);
      case 'paragraph': return parrafo(lineas(tk.tokens), estiloCita);
      case 'text': return parrafo(lineas(tk.tokens || [{ type: 'text', text: tk.text }]), estiloCita);
      case 'blockquote': return bloques(tk.tokens, nivelLista, true);
      case 'hr': return parrafo('', '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BFBFBF"/></w:pBdr>');
      case 'code': return tk.text.split('\n').map(l => parrafo(texto(l, '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/>'), '<w:spacing w:after="0"/>')).join('');
      case 'list': return tk.items.map((it, i) => {
        const marca = tk.ordered ? `${(Number(tk.start) || 1) + i}.` : '•';
        const sangria = `<w:ind w:left="${720 * (nivelLista + 1)}" w:hanging="360"/>`;
        const [primero, ...resto] = it.tokens || [];
        const inicio = primero && (primero.type === 'text' || primero.type === 'paragraph') ? lineas(primero.tokens || [{ type: 'text', text: primero.text }]) : '';
        return parrafo(`<w:r><w:t xml:space="preserve">${marca}</w:t></w:r><w:r><w:tab/></w:r>${inicio}`, `${estiloCita}<w:spacing w:after="60"/><w:tabs><w:tab w:val="left" w:pos="${720 * (nivelLista + 1)}"/></w:tabs>${sangria}`)
          + bloques(primero && inicio ? resto : it.tokens, nivelLista + 1, cita);
      }).join('');
      case 'table': {
        const celda = (c, cab) => `<w:tc><w:p>${lineas(c.tokens, cab ? '<w:b/>' : '')}</w:p></w:tc>`;
        return `<w:tbl><w:tblPr><w:tblStyle w:val="Tabla"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr>`
          + `<w:tr>${tk.header.map(c => celda(c, true)).join('')}</w:tr>`
          + tk.rows.map(r => `<w:tr>${r.map(c => celda(c, false)).join('')}</w:tr>`).join('') + '</w:tbl>' + parrafo('');
      }
      case 'space': case 'html': case 'def': return '';
      default: return tk.text ? parrafo(texto(tk.text)) : '';
    }
  }).join('');
  return bloques(marked.lexer(String(markdown || '')));
}

// .docx de una página
export async function crearDocx({ JSZip, marked, titulo, descripcion, cuerpo, web, nota }) {
  const rels = new Map();
  const contenido = [
    `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t xml:space="preserve">${xml(titulo)}</w:t></w:r></w:p>`,
    descripcion ? `<w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr><w:r><w:t xml:space="preserve">${xml(descripcion)}</w:t></w:r></w:p>` : '',
    cuerpoWord(marked, cuerpo, web, rels),
    nota ? `<w:p><w:pPr><w:pStyle w:val="Nota"/><w:pBdr><w:top w:val="single" w:sz="4" w:space="6" w:color="BFBFBF"/></w:pBdr><w:spacing w:before="480"/></w:pPr><w:r><w:t xml:space="preserve">${xml(nota)}</w:t></w:r></w:p>` : '',
  ].join('');
  const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${contenido}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const z = new JSZip();
  z.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  z.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  z.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(titulo)}</dc:title><dc:language>es-ES</dc:language><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>`);
  z.file('word/document.xml', documento);
  z.file('word/styles.xml', ESTILOS);
  z.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rEstilos" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${[...rels].map(([url, id]) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xml(url)}" TargetMode="External"/>`).join('')}</Relationships>`);
  return z.generateAsync({ type: 'uint8array', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// Marcadores de los textos legales ({titular}, {nif}…) con los datos de la tienda, como en la web
export function rellenarDatos(texto, legales = {}, huecos = {}) {
  return String(texto ?? '').replace(/\{(titular|nif|nombre_comercial|direccion|correo|telefono|conservacion)\}/g, (m, k) => legales[k] || `[${huecos[k] || k}]`);
}
