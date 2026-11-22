const { abrirPanel, marcas, foto } = require('./panel-comun');
(async () => {
  const { b, p, ir } = await abrirPanel();
  await ir('#/collections/productos');
  await marcas(p, [
    { loc: p.locator('nav, [class*="AppHeader"]').getByText('Contenido').first(), n: 1, pad: 4 },
    { loc: p.getByText('Flujo Editorial').first(), n: 2, pad: 4 },
    { loc: p.getByText('Medios').first(), n: 3, pad: 4 },
    { loc: p.getByPlaceholder('Buscar en todo el panel'), n: 4, pad: 3 },
    { loc: p.getByText('Acceso rápido').first(), n: 5, pad: 3 },
    { loc: p.getByText('Colecciones').first().locator('xpath=..'), n: 6, pad: 3 },
  ]);
  await foto(p, 'panel-inicio');
  // Buscar en la tabla de productos
  const busc = p.getByPlaceholder(/Buscar por nombre, modelo/);
  await busc.click(); await busc.type('525', { delay: 60 }); await p.waitForTimeout(1500);
  await marcas(p, [{ loc: busc, n: 1, pad: 3 }]);
  await foto(p, 'panel-productos-buscar');
  // Grupo desplegado
  await ir('#/collections/productos');
  await p.getByText('Máquinas domésticas › Mecánicas').first().click(); await p.waitForTimeout(1500);
  await foto(p, 'panel-productos-grupo');
  // Ficha del producto
  await ir('#/collections/productos/entries/alfa-525', 6000);
  await foto(p, 'panel-ficha-arriba');
  await b.close();
})();
