const { abrirPanel, marcas, foto } = require('./panel-comun');
(async () => {
  const { b, p, ir } = await abrirPanel();
  await ir('#/collections/productos');
  const cab = t => p.getByText(t, { exact: true }).first();
  await marcas(p, [
    { loc: cab('Contenido'), n: 1, pad: 5 }, { loc: cab('Flujo Editorial'), n: 2, pad: 5 }, { loc: cab('Medios'), n: 3, pad: 5 },
    { loc: p.getByPlaceholder('Buscar en todo el panel'), n: 4, pad: 3 },
    { loc: p.getByText('Acceso rápido').first(), n: 5, pad: 3 },
    { loc: p.getByText('Colecciones', { exact: true }).first().locator('xpath=ancestor::*[contains(@class,"xl") or self::aside or self::nav][1]'), n: 6, pad: 3 },
    { loc: p.getByRole('button', { name: 'Nuevo producto' }).or(p.getByRole('link', { name: 'Nuevo producto' })).first(), n: 7, pad: 3 },
  ]);
  await foto(p, 'panel-inicio');
  await ir('#/collections/productos/entries/alfa-525', 6000);
  const precio = p.getByLabel(/Precio orientativo/).first();
  const estado = p.getByLabel(/^Estado$/).first();
  await precio.scrollIntoViewIfNeeded(); await p.mouse.move(300, 400); await p.mouse.wheel(0, 150); await p.waitForTimeout(500);
  await marcas(p, [{ loc: precio, n: 1, pad: 4 }, { loc: p.getByText('Disponible', { exact: true }).first(), n: 2, pad: 10 }, { loc: p.getByText('Oferta (solo con estado «En oferta»)', { exact: false }).last(), n: 3, pad: 6 }]);
  await foto(p, 'panel-ficha-precio');
  // Oferta desplegada con estado En oferta
  await estado.click({ force: true }); await p.waitForTimeout(400); await p.getByText('En oferta', { exact: true }).last().click(); await p.waitForTimeout(600);
  const cabO = await p.getByText('Oferta (solo con estado «En oferta»)', { exact: false }).last().boundingBox();
  await p.mouse.click(cabO.x + 4, cabO.y + cabO.height / 2); await p.waitForTimeout(800);
  await p.getByText('Oferta (solo con estado «En oferta»)', { exact: false }).last().scrollIntoViewIfNeeded(); await p.mouse.wheel(0, 120); await p.waitForTimeout(400);
  const vis = async re => (await p.locator('label:visible').filter({ hasText: re }).count()) ? p.locator('label:visible').filter({ hasText: re }).first() : null;
  const m = []; for (const [re, n] of [[/^Precio de oferta \(€\)/, 1], [/^Desde/, 2], [/^Hasta/, 3]]) { const l = await vis(re); if (l) m.push({ loc: l, n, pad: 4 }); }
  await marcas(p, m);
  await foto(p, 'panel-ficha-oferta');
  await p.goto('about:blank'); await ir('#/collections/productos/entries/alfa-525', 6000);
  if (await p.getByText('Cambios no guardados', { exact: false }).count()) console.log('AVISO: siguen cambios');
  // Fotos
  const fotos = p.getByText('Add fotos').first();
  await fotos.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const primera = p.getByText('No imagen').first();
  if (await primera.count()) { const bb = await primera.boundingBox(); await p.mouse.click(bb.x + 2, bb.y - 18); await p.waitForTimeout(1200); }
  await fotos.scrollIntoViewIfNeeded(); await p.mouse.wheel(0, 40); await p.waitForTimeout(500);
  await marcas(p, [
    { loc: fotos, n: 1, pad: 3 },
    { loc: p.getByText('Elige una imagen diferente').first(), n: 2, pad: 3 },
    { loc: p.getByText('Quita la imagen').first(), n: 3, pad: 3 },
    { loc: p.getByLabel(/Descripción de la foto/).first(), n: 4, pad: 4 },
  ]);
  await foto(p, 'panel-ficha-fotos');
  // Cambiar el precio y guardar
  await precio.scrollIntoViewIfNeeded(); await p.mouse.wheel(0, 150); await p.waitForTimeout(300);
  await precio.fill('219.9'); await p.waitForTimeout(800);
  await marcas(p, [{ loc: precio, n: 1, pad: 4 }, { loc: p.getByRole('button', { name: 'Guardar' }), n: 2, pad: 3 }]);
  await foto(p, 'panel-guardar');
  await p.getByRole('button', { name: 'Guardar' }).click(); await p.waitForTimeout(4000);
  await marcas(p, [{ loc: p.getByRole('button', { name: /Estado:/ }), n: 1, pad: 3 }, { loc: p.getByRole('button', { name: /^Publicar/ }), n: 2, pad: 3 }]);
  await foto(p, 'panel-guardado');
  await p.getByRole('button', { name: /Estado:/ }).click(); await p.waitForTimeout(600);
  await foto(p, 'panel-estado-menu');
  await p.getByText('Listo', { exact: true }).last().click(); await p.waitForTimeout(2500);
  await p.getByRole('button', { name: /^Publicar/ }).click(); await p.waitForTimeout(700);
  await foto(p, 'panel-publicar-menu');
  await p.keyboard.press('Escape');
  await ir('#/workflow', 3500);
  await marcas(p, [{ loc: p.getByText('Borradores', { exact: true }).first(), n: 1, pad: 4 }, { loc: p.getByText('En revisión', { exact: true }).first(), n: 2, pad: 4 }, { loc: p.getByText('Listo', { exact: true }).first(), n: 3, pad: 4 }]);
  await foto(p, 'panel-flujo');
  await b.close();
})();
