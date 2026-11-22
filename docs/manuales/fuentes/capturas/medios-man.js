const { abrirPanel, marcas, foto } = require('./panel-comun');
(async () => {
  const { b, p, ir } = await abrirPanel();
  await ir('#/collections/productos', 4000);
  await p.getByText('Medios', { exact: true }).first().click(); await p.waitForTimeout(3500);
  await p.locator('.xl-med-tabs button', { hasText: 'Manuales' }).click(); await p.waitForTimeout(2500);
  await p.locator('.xl-med-f').first().click(); await p.waitForTimeout(800);
  await marcas(p, [{ loc: p.locator('.xl-med-tabs button', { hasText: 'Manuales' }), n: 1, pad: 3 }, { loc: p.locator('.xl-med-f').first(), n: 2, pad: 3 }, { loc: p.locator('[data-uno-abrir]'), n: 3, pad: 3 }, { loc: p.locator('[data-uno-bajar]'), n: 4, pad: 3 }]);
  await foto(p, 'panel-medios-manuales');
  const [desc] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.locator('[data-uno-bajar]').click()]);
  console.log('descarga', desc.suggestedFilename(), (await require('fs').promises.stat(await desc.path())).size);
  const [pop] = await Promise.all([p.context().waitForEvent('page', { timeout: 20000 }), p.locator('[data-uno-abrir]').click()]);
  const d2 = await pop.waitForEvent('download', { timeout: 15000 }).catch(() => null); console.log('abierta', pop.url().slice(0, 40), 'descarga en la pestaña nueva:', d2 ? d2.url().slice(0, 30) : 'no');
  console.log('msj', await p.locator('.xl-med-msj').allTextContents());
  await b.close();
})();
