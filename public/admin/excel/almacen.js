/*
  Exportar, importar y cambiar en bloque desde el panel (docs/PLAN.md, fase 3): leer y guardar.

  Dos formas, como el propio panel:
  - En local (localhost con «npm run panel»): el servidor local de Decap (http://localhost:8081/api/v1)
    escribe en tu copia del repositorio.
  - En la web: la API de GitHub con la sesión del panel (el token que guarda Decap al iniciar sesión).
    Lee con una sola consulta por carpeta (GraphQL) y guarda TODO en un único commit en la rama que
    edita el panel (backend.branch de /config.yml, que el build ajusta en cada entorno).
  No hace falta ninguna función en Cloudflare ni ninguna clave nueva.
*/

const aBase64 = bytes => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const deBase64 = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

export async function crearAlmacen(cfg) {
  const local = cfg.local_backend && ['localhost', '127.0.0.1'].includes(location.hostname)
    ? await almacenLocal(cfg) : null;
  return local || almacenGitHub(cfg);
}

/* ---------- Local: servidor de Decap ---------- */
async function almacenLocal(cfg) {
  const url = (typeof cfg.local_backend === 'object' && cfg.local_backend.url) || 'http://localhost:8081/api/v1';
  const rama = cfg.backend?.branch || 'main';
  const pedir = async (action, params = {}) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, params: { branch: rama, ...params } }) });
    if (!r.ok) throw new Error(`El servidor local del panel ha respondido ${r.status} a «${action}».`);
    return r.json();
  };
  try { await pedir('info'); } catch { return null; }
  // sha256 de los bytes, como el servidor local
  const huella = async bytes => hex(await crypto.subtle.digest('SHA-256', bytes));
  return {
    tipo: 'local', rama, descripcion: 'tu copia local (npm run panel)',
    async leerCarpeta(carpeta, profundidad = 1) {
      const lista = await pedir('entriesByFolder', { folder: carpeta, extension: 'md', depth: profundidad });
      return lista.filter(e => e.data !== null).map(e => ({ ruta: e.file.path, raw: e.data }));
    },
    async leerFicheros(rutas) {
      const lista = await pedir('entriesByFiles', { files: rutas.map(path => ({ path })) });
      return lista.filter(e => e.data !== null).map(e => ({ ruta: e.file.path, raw: e.data }));
    },
    // Con «nombres», solo esos (getMedia lee el contenido de toda la carpeta: con cientos de fotos, pesa)
    async listarMedios(carpeta, nombres = null) {
      if (nombres) {
        const mapa = new Map();
        for (const n of nombres) {
          try { const m = await pedir('getMediaFile', { path: `${carpeta}/${n}` }); if (m?.id) mapa.set(n, m.id); } catch { /* no existe */ }
        }
        return mapa;
      }
      const lista = await pedir('getMedia', { mediaFolder: carpeta });
      return new Map(lista.map(m => [m.name, m.id]));
    },
    async leerBinario(ruta) {
      const m = await pedir('getMediaFile', { path: ruta });
      return deBase64(m.content);
    },
    huella,
    async guardar({ escribir = [], borrar = [], mensaje }) {
      const textos = escribir.filter(e => e.texto !== undefined);
      const binarios = escribir.filter(e => e.bytes);
      if (textos.length || binarios.length) {
        await pedir('persistEntry', {
          dataFiles: textos.map(e => ({ slug: e.ruta.split('/').pop().replace(/\.[^.]+$/, ''), path: e.ruta, raw: e.texto })),
          assets: binarios.map(e => ({ path: e.ruta, content: aBase64(e.bytes), encoding: 'base64' })),
          options: { commitMessage: mensaje, useWorkflow: false, status: 'published' },
        });
      }
      if (borrar.length) await pedir('deleteFiles', { paths: borrar, options: { commitMessage: mensaje } });
      return { commit: null };
    },
  };
}

/* ---------- GitHub ---------- */
function almacenGitHub(cfg) {
  const [duenno, repo] = String(cfg.backend?.repo || '').split('/');
  const rama = cfg.backend?.branch || 'main';
  const api = (cfg.backend?.api_root || 'https://api.github.com').replace(/\/+$/, '');
  const token = () => {
    try { return JSON.parse(localStorage.getItem('decap-cms-user') || 'null')?.token || ''; } catch { return ''; }
  };
  const cabeceras = (extra = {}) => {
    const t = token();
    if (!t) throw new Error('No hay sesión del panel: vuelve a iniciar sesión con GitHub y repite.');
    return { Authorization: `token ${t}`, Accept: 'application/vnd.github+json', ...extra };
  };
  const rest = async (metodo, ruta, cuerpo, extra) => {
    const r = await fetch(`${api}${ruta}`, { method: metodo, headers: cabeceras(cuerpo ? { 'Content-Type': 'application/json', ...extra } : extra), body: cuerpo ? JSON.stringify(cuerpo) : undefined, cache: 'no-store' });
    if (!r.ok) {
      const e = new Error(`GitHub ha respondido ${r.status} (${metodo} ${ruta.split('?')[0]}).`);
      e.estado = r.status;
      throw e;
    }
    return r;
  };
  const graphql = async (query, variables) => {
    const r = await rest('POST', '/graphql', { query, variables });
    const j = await r.json();
    if (j.errors?.length) throw new Error('GitHub: ' + j.errors.map(e => e.message).join('; '));
    return j.data;
  };
  const ARBOL = `query($o:String!,$n:String!,$e:String!){repository(owner:$o,name:$n){object(expression:$e){... on Tree{entries{name type oid object{... on Blob{text isBinary} ... on Tree{entries{name type oid object{... on Blob{text isBinary}}}}}}}}}}`;
  const huella = async bytes => {
    const cab = new TextEncoder().encode(`blob ${bytes.length}\0`);
    const todo = new Uint8Array(cab.length + bytes.length);
    todo.set(cab); todo.set(bytes, cab.length);
    return hex(await crypto.subtle.digest('SHA-1', todo));
  };
  const ruta = p => p.split('/').map(encodeURIComponent).join('/');

  return {
    tipo: 'github', rama, descripcion: `la rama ${rama} de ${duenno}/${repo}`,
    async leerCarpeta(carpeta, profundidad = 1) {
      const d = await graphql(ARBOL, { o: duenno, n: repo, e: `${rama}:${carpeta.replace(/\/+$/, '')}` });
      const salida = [];
      (function recorrer(entradas, base, nivel) {
        for (const x of entradas || []) {
          if (x.type === 'blob' && x.name.endsWith('.md') && x.object && !x.object.isBinary && x.object.text !== null) salida.push({ ruta: `${base}/${x.name}`, raw: x.object.text });
          else if (x.type === 'tree' && nivel < profundidad) recorrer(x.object?.entries, `${base}/${x.name}`, nivel + 1);
        }
      })(d.repository?.object?.entries, carpeta.replace(/\/+$/, ''), 1);
      return salida;
    },
    async leerFicheros(rutas) {
      const salida = [];
      for (const p of rutas) {
        try {
          const r = await rest('GET', `/repos/${duenno}/${repo}/contents/${ruta(p)}?ref=${encodeURIComponent(rama)}`, null, { Accept: 'application/vnd.github.raw' });
          salida.push({ ruta: p, raw: await r.text() });
        } catch (e) { if (e.estado !== 404) throw e; }
      }
      return salida;
    },
    async listarMedios(carpeta) {
      const d = await graphql(ARBOL, { o: duenno, n: repo, e: `${rama}:${carpeta.replace(/\/+$/, '')}` });
      return new Map((d.repository?.object?.entries || []).filter(x => x.type === 'blob').map(x => [x.name, x.oid]));
    },
    async leerBinario(p) {
      const r = await rest('GET', `/repos/${duenno}/${repo}/contents/${ruta(p)}?ref=${encodeURIComponent(rama)}`, null, { Accept: 'application/vnd.github.raw' });
      return new Uint8Array(await r.arrayBuffer());
    },
    huella,
    // Un único commit con todo. Si otra persona guarda a la vez, se reintenta sobre su cambio
    async guardar({ escribir = [], borrar = [], mensaje }, progreso = () => {}) {
      const blobs = [];
      let i = 0;
      for (const e of escribir.filter(x => x.bytes)) {
        progreso(`Subiendo imágenes ${++i}/${escribir.filter(x => x.bytes).length}`);
        const r = await rest('POST', `/repos/${duenno}/${repo}/git/blobs`, { content: aBase64(e.bytes), encoding: 'base64' });
        blobs.push({ path: e.ruta, mode: '100644', type: 'blob', sha: (await r.json()).sha });
      }
      const arbolNuevo = [
        ...blobs,
        ...escribir.filter(x => x.texto !== undefined).map(e => ({ path: e.ruta, mode: '100644', type: 'blob', content: e.texto })),
        ...borrar.map(p => ({ path: p, mode: '100644', type: 'blob', sha: null })),
      ];
      for (let intento = 1; ; intento++) {
        progreso('Guardando el cambio');
        const ref = await (await rest('GET', `/repos/${duenno}/${repo}/git/ref/heads/${ruta(rama)}`)).json();
        const padre = ref.object.sha;
        const commitPadre = await (await rest('GET', `/repos/${duenno}/${repo}/git/commits/${padre}`)).json();
        const arbol = await (await rest('POST', `/repos/${duenno}/${repo}/git/trees`, { base_tree: commitPadre.tree.sha, tree: arbolNuevo })).json();
        const commit = await (await rest('POST', `/repos/${duenno}/${repo}/git/commits`, { message: mensaje, tree: arbol.sha, parents: [padre] })).json();
        try {
          await rest('PATCH', `/repos/${duenno}/${repo}/git/refs/heads/${ruta(rama)}`, { sha: commit.sha, force: false });
          return { commit: commit.sha, url: `https://github.com/${duenno}/${repo}/commit/${commit.sha}` };
        } catch (e) {
          if (e.estado !== 422 || intento >= 3) throw e;
        }
      }
    },
  };
}
