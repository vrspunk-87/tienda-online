const { chromium, marcas, foto, OCULTAR_ENTORNO } = require('./comun');
const W = 'http://localhost:3000';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
  await ctx.addInitScript(css => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }); }, OCULTAR_ENTORNO);
  const p = await ctx.newPage();
  const ir = async u => { await p.goto(W + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(700); };
  const solo = process.argv[2];
  const hacer = n => !solo || solo.split(',').includes(n);

  if (hacer('portada')) {
    await ir('/');
    await marcas(p, [
      { loc: p.locator('header input[type="search"], header input[name="q"]'), n: 1 },
      { loc: p.locator('.barra-catalogo').first(), n: 2, pad: 2 },
      { loc: p.getByRole('link', { name: /Mi solicitud/ }), n: 3 },
      { loc: p.getByText('Explora el catálogo', { exact: false }).locator('xpath=..'), n: 4 },
    ]);
    await foto(p, 'web-portada');
  }
  if (hacer('desplegable')) {
    await ir('/');
    await p.locator('.barra-catalogo button.barra-enlace').first().click(); await p.waitForTimeout(800);
    await foto(p, 'web-desplegable');
  }
  if (hacer('categoria')) {
    await ir('/catalogo/maquinas-domesticas/electronicas/');
    await p.locator('.filtros-barra').scrollIntoViewIfNeeded(); await p.mouse.wheel(0, -120); await p.waitForTimeout(600);
    await marcas(p, [
      { loc: p.locator('.filtros-barra'), n: 1, pad: 4 },
      { loc: p.locator('.tarjeta-producto').first(), n: 2, pad: 4 },
      { loc: p.locator('.tarjeta-anadir').first(), n: 3, pad: 4 },
    ]);
    await foto(p, 'web-categoria');
  }
  if (hacer('buscar')) {
    await ir('/');
    const caja = p.locator('header input[type="search"], header input[name="q"]').first();
    await caja.click(); await caja.type('janome', { delay: 60 }); await p.waitForTimeout(1500);
    await foto(p, 'web-buscar-sugerencias');
    await ir('/buscar/?q=remalladora');
    await p.waitForTimeout(1500);
    await foto(p, 'web-buscar-resultados');
  }
  if (hacer('ficha')) {
    await ir('/productos/alfa-525/');
    await marcas(p, [
      { loc: p.locator('.ficha-galeria'), n: 1, pad: 2 },
      { loc: p.locator('.ficha-precio'), n: 2, pad: 4 },
      { loc: p.locator('button[data-anadir-solicitud]:visible').first(), n: 3, pad: 4 },
      { loc: p.locator('.ficha-contacto'), n: 4, pad: 4 },
    ]);
    await foto(p, 'web-ficha');
    await p.locator('.ficha-pestanas').scrollIntoViewIfNeeded(); await p.mouse.wheel(0, -100); await p.waitForTimeout(500);
    await marcas(p, [{ loc: p.locator('.ficha-pestanas-nav'), n: 5, pad: 4 }]);
    await foto(p, 'web-ficha-pestanas');
    // Añadir a la solicitud
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
    await p.locator('button[data-anadir-solicitud]:visible').first().click(); await p.waitForTimeout(1200);
    await foto(p, 'web-ficha-anadido');
  }
  if (hacer('industrial')) {
    await ir('/productos/jack-jk-2030ghc-4q/');
    await marcas(p, [{ loc: p.locator('.ficha-precio'), n: '', pad: 4 }]);
    await foto(p, 'web-ficha-industrial');
  }
  if (hacer('contacto')) {
    await ir('/paginas/contacto-y-horario/'); await foto(p, 'web-contacto');
    await ir('/paginas/sobre-nosotros/'); await foto(p, 'web-sobre-nosotros');
  }
  await b.close();

  if (hacer('movil')) {
    const { devices } = require('playwright');
    const m = await b.browserType().launch();
    const mctx = await m.newContext({ ...devices['iPhone 13'] });
    await mctx.addInitScript(css => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }); }, OCULTAR_ENTORNO);
    const mp = await mctx.newPage();
    await mp.goto(W + '/', { waitUntil: 'networkidle' }); await mp.waitForTimeout(700);
    await foto(mp, 'movil-portada');
    await mp.locator('.navbar-toggler').first().click().catch(() => {}); await mp.waitForTimeout(900);
    await foto(mp, 'movil-menu');
    await mp.goto(W + '/productos/alfa-525/', { waitUntil: 'networkidle' }); await mp.waitForTimeout(700);
    await foto(mp, 'movil-ficha');
    await m.close();
  }
})();
