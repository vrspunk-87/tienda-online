const { chromium } = require('playwright');
const path = require('path');
// Las capturas se guardan en ../img (docs/manuales/fuentes/img)
const DIR = path.join(__dirname, '..', 'img') + path.sep;
const AZUL = '#1565c0';
async function marcas(p, lista) {
  const cajas = [];
  for (const m of lista) {
    const bb = m.caja || await m.loc.first().boundingBox().catch(() => null);
    if (bb) cajas.push({ ...bb, n: m.n || '', pad: m.pad ?? 6 });
    else console.log('  (sin caja para marca', m.n, ')');
  }
  await p.evaluate(({ cajas, AZUL }) => {
    document.getElementById('marcas-manual')?.remove();
    const raiz = document.createElement('div'); raiz.id = 'marcas-manual';
    raiz.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
    for (const c of cajas) {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:${c.x - c.pad}px;top:${c.y - c.pad}px;width:${c.width + 2 * c.pad}px;height:${c.height + 2 * c.pad}px;border:3px solid ${AZUL};border-radius:10px;box-shadow:0 0 0 2px #fff, 0 0 0 5px rgba(21,101,192,.25)`;
      raiz.appendChild(d);
      if (c.n) {
        const n = document.createElement('div'); n.textContent = c.n;
        const x = Math.max(4, c.x - c.pad - 15), y = Math.max(4, c.y - c.pad - 15);
        n.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:30px;height:30px;border-radius:50%;background:${AZUL};color:#fff;font:700 17px Arial,sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px #fff`;
        raiz.appendChild(n);
      }
    }
    document.body.appendChild(raiz);
  }, { cajas, AZUL });
}
async function quitarMarcas(p) { await p.evaluate(() => document.getElementById('marcas-manual')?.remove()); }
async function foto(p, nombre, op = {}) {
  await p.waitForTimeout(op.espera ?? 400);
  await p.screenshot({ path: DIR + nombre + '.jpg', type: 'jpeg', quality: 82, ...op.extra });
  await quitarMarcas(p);
  console.log('ok', nombre);
}
const OCULTAR_ENTORNO = '.aviso-entorno{display:none!important}';
module.exports = { chromium, marcas, quitarMarcas, foto, OCULTAR_ENTORNO, DIR };
