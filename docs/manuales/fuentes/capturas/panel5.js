const { abrirPanel, marcas, foto } = require('./panel-comun');
const lab = (p, t) => p.locator('label:visible').filter({ hasText: t }).first();
(async () => {
  const { b, p, ir } = await abrirPanel();
  // Contacto y horario
  await ir('#/collections/contacto/entries/contacto', 6000);
  await foto(p, 'panel-contacto');
  await lab(p, 'Horario').scrollIntoViewIfNeeded(); await p.mouse.move(300, 400); await p.mouse.wheel(0, 120); await p.waitForTimeout(600);
  await foto(p, 'panel-contacto-horario');
  const av = lab(p, 'Aviso de cierre');
  await av.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const bb = await p.getByText('Aviso de cierre (vacaciones, festivos…)', { exact: false }).last().boundingBox();
  await p.mouse.click(bb.x + 4, bb.y + bb.height / 2); await p.waitForTimeout(700);
  await av.scrollIntoViewIfNeeded(); await p.mouse.wheel(0, 80); await p.waitForTimeout(500);
  await marcas(p, [{ loc: av, n: '', pad: 6 }]);
  await foto(p, 'panel-contacto-aviso');
  // Sobre nosotros
  await p.goto('about:blank'); await ir('#/collections/sobre_nosotros/entries/sobre_nosotros', 6000);
  await foto(p, 'panel-sobre-nosotros');
  // Solicitud de presupuesto
  await p.goto('about:blank'); await ir('#/collections/solicitud/entries/ajustes', 6000);
  await marcas(p, [{ loc: lab(p, 'Solicitud de presupuesto activa'), n: 1, pad: 6 }]);
  await foto(p, 'panel-solicitud');
  await lab(p, 'Conservación de las solicitudes').scrollIntoViewIfNeeded(); await p.mouse.move(300, 400); await p.mouse.wheel(0, 100); await p.waitForTimeout(500);
  await marcas(p, [{ loc: lab(p, 'Conservación de las solicitudes'), n: '', pad: 6 }]);
  await foto(p, 'panel-solicitud-conservacion');
  // Vista previa de los correos (en la parte derecha)
  const fr = p.frames().find(f => f !== p.mainFrame() && f.url().startsWith('about'));
  for (const f of p.frames()) {
    const n = await f.locator('text=/Correo a la tienda|correo a la tienda|Aviso a la tienda/').count().catch(() => 0);
    if (n) { console.log('frame con correos'); await f.locator('text=/Correo a la tienda|correo a la tienda|Aviso a la tienda/').first().scrollIntoViewIfNeeded(); await p.waitForTimeout(700); await foto(p, 'panel-solicitud-correo-tienda');
      const c = f.locator('text=/acuse|Correo al cliente/i').first(); if (await c.count()) { await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(600); await foto(p, 'panel-solicitud-correo-cliente'); } }
  }
  // Blog: nueva entrada
  await p.goto('about:blank'); await ir('#/collections/blog/new', 6000);
  await foto(p, 'panel-blog-nueva');
  await p.goto('about:blank'); await ir('#/collections/blog', 4000);
  await foto(p, 'panel-blog-lista');
  // Fabricantes
  await ir('#/collections/fabricantes', 4500);
  await foto(p, 'panel-fabricantes');
  // Medios
  await ir('#/collections/productos', 4000);
  await p.getByText('Medios', { exact: true }).first().click(); await p.waitForTimeout(3500);
  await foto(p, 'panel-medios');
  await b.close();
})();
