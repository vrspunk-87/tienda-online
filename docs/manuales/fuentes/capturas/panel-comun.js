const { chromium, marcas, foto } = require('./comun');
const A = 'http://localhost:3000/admin/';
async function abrirPanel() {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 820 }, deviceScaleFactor: 1.4 });
  await ctx.addInitScript(() => { const f = () => { const s = document.createElement('style'); s.textContent = '.xl-ajustes{display:none!important}'; document.head.appendChild(s); }; document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', f) : f(); });
  const p = await ctx.newPage();
  await p.goto(A, { waitUntil: 'networkidle' });
  await foto(p, 'panel-entrar', { espera: 800 });
  await p.getByText('Iniciar sesión').click(); await p.waitForTimeout(4000);
  const ir = async (h, espera = 4500) => { await p.goto(A + h, { waitUntil: 'networkidle' }); await p.waitForTimeout(espera); };
  return { b, p, ir };
}
module.exports = { abrirPanel, marcas, foto };
