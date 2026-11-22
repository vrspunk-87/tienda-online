const { abrirPanel, marcas, foto } = require('./panel-comun');
(async () => {
  const { b, p, ir } = await abrirPanel();
  p.on('dialog', async d => { console.log('DIALOGO:', d.message()); await d.accept(); });
  // Publicar el cambio que está «Listo»
  await ir('#/collections/productos/entries/alfa-525', 6000);
  await p.getByRole('button', { name: /^Publicar/ }).click(); await p.waitForTimeout(600);
  await marcas(p, [{ loc: p.getByText('Publicar ahora', { exact: true }), n: '', pad: 4 }]);
  await foto(p, 'panel-publicar-ahora');
  await p.getByText('Publicar ahora', { exact: true }).click(); await p.waitForTimeout(5000);
  await foto(p, 'panel-publicado');
  // Acceso rápido
  await ir('#/collections/productos');
  await p.getByText('Acceso rápido').first().click(); await p.waitForTimeout(700);
  await foto(p, 'panel-acceso-rapido');
  await p.keyboard.press('Escape');
  // Buscador general
  await ir('#/collections/productos');
  const bg = p.getByPlaceholder('Buscar en todo el panel'); await bg.click(); await bg.type('singer', { delay: 50 }); await bg.press('Enter'); await p.waitForTimeout(3500);
  await foto(p, 'panel-buscador');
  // Nuevo producto
  await ir('#/collections/productos/new', 6000);
  await foto(p, 'panel-nuevo-producto');
  // Engranaje de productos
  await ir('#/collections/productos');
  await p.locator('button:has(svg)').filter({ hasText: '' }).first();
  const eng = p.locator('[class*="xl-eng"], button[title*="ngranaje"], button[aria-label*="cciones"]').first();
  if (await eng.count()) { await eng.click(); await p.waitForTimeout(700); await foto(p, 'panel-engranaje'); }
  else console.log('sin engranaje');
  await b.close();
})();
