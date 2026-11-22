const { chromium, marcas, foto, OCULTAR_ENTORNO } = require('./comun');
const W = 'http://localhost:3000';
(async () => {
  const { nuevoDesafio } = await import(require('url').pathToFileURL(require('path').join(process.env.TIENDA || require('path').join(__dirname, '..', '..', '..', '..'), 'lib', 'verificacion.js')).href);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
  await ctx.addInitScript(css => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }); }, OCULTAR_ENTORNO + ' .modal blockquote{display:none!important}');
  await ctx.route('**/api/desafio**', async r => r.fulfill({ json: await nuevoDesafio({ ALTCHA_SECRETO: 'x'.repeat(32) }) }));
  await ctx.route('**/api/solicitud**', r => r.fulfill({ json: { ok: true, numero: 'S-2026-0001', acuse: true } }));
  const p = await ctx.newPage();
  const ir = async u => { await p.goto(W + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(700); };
  for (const u of ['/productos/alfa-525/', '/productos/janome-423s/']) {
    await ir(u); await p.locator('button[data-anadir-solicitud]:visible').first().click(); await p.waitForTimeout(800);
  }
  await ir('/presupuesto/');
  await marcas(p, [
    { loc: p.locator('.solicitud-lista li').first().locator('.solicitud-cantidad, [class*="cantidad"]').first(), n: 1, pad: 4 },
    { loc: p.getByText('Quitar').first(), n: 2, pad: 3 },
    { loc: p.getByText('Añadir una nota').first(), n: 3, pad: 3 },
    { loc: p.getByText('Continuar con mis datos').first(), n: 4, pad: 4 },
  ]);
  await foto(p, 'web-solicitud-lista');
  await p.locator('.solicitud-form').scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  await p.fill('input[name="nombre"]', 'María López');
  await p.fill('input[name="correo"]', 'maria@ejemplo.com').catch(async () => p.fill('input[type="email"]', 'maria@ejemplo.com'));
  await p.fill('input[name="telefono"]', '600 000 000').catch(async () => p.fill('input[type="tel"]', '600 000 000'));
  await p.getByText('WhatsApp', { exact: true }).last().click().catch(() => {});
  await p.locator('textarea[name="observaciones"]').fill('Me interesa probarlas en la tienda el sábado por la mañana.');
  await p.locator('altcha-widget input[type="checkbox"], altcha-widget').first().click(); await p.waitForTimeout(4000);
  await p.locator('input[name="nombre"]').scrollIntoViewIfNeeded(); await p.mouse.wheel(0, -60); await p.waitForTimeout(400);
  await marcas(p, [
    { loc: p.locator('.solicitud-campos').first(), n: 1, pad: 4 },
    { loc: p.locator('.solicitud-chips').first(), n: 2, pad: 4 },
    { loc: p.locator('textarea[name="observaciones"]'), n: 3, pad: 4 },
    { loc: p.locator('altcha-widget').first(), n: 4, pad: 4 },
  ]);
  await foto(p, 'web-solicitud-formulario');
  await p.locator('.solicitud-acepto').scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  await p.locator('.solicitud-acepto a').first().click(); await p.waitForTimeout(1200);
  await marcas(p, [{ loc: p.locator('.legal-pestanas'), n: 1, pad: 4 }, { loc: p.getByRole('button', { name: /He leído y acepto/ }), n: 2, pad: 4 }]);
  await foto(p, 'web-solicitud-condiciones');
  await p.locator('.legal-pestana').nth(1).click(); await p.waitForTimeout(600);
  await p.getByRole('button', { name: /He leído y acepto/ }).click(); await p.waitForTimeout(800);
  await marcas(p, [{ loc: p.locator('.solicitud-acepto'), n: 1, pad: 6 }, { loc: p.getByRole('button', { name: /Enviar solicitud/ }), n: 2, pad: 4 }]);
  await foto(p, 'web-solicitud-acepto');
  await p.getByRole('button', { name: /Enviar solicitud/ }).click(); await p.waitForTimeout(2000);
  await foto(p, 'web-solicitud-enviada');
  await b.close();
})();
