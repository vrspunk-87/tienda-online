const { chromium } = require('./comun');
const { DIR } = require('./comun');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 2400 }, deviceScaleFactor: 1.4 });
  await ctx.route(/https:\/\/www\.maquinasdecoserzafra\.es\/.*/, async r => { const u = r.request().url().replace('https://www.maquinasdecoserzafra.es', 'http://localhost:3000'); const res = await ctx.request.get(u); await r.fulfill({ response: res }); });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/admin/', { waitUntil: 'networkidle' });
  await p.getByText('Iniciar sesión').click(); await p.waitForTimeout(3000);
  await p.goto('http://localhost:3000/admin/#/collections/solicitud/entries/ajustes', { waitUntil: 'networkidle' }); await p.waitForTimeout(6000);
  let f; for (const x of p.frames()) if (await x.getByText('Correo a la tienda (aviso)').count().catch(() => 0)) f = x;
  const iframe = await f.frameElement(); const caja = await iframe.boundingBox();
  for (const [texto, nombre] of [['Correo a la tienda (aviso)', 'correo-tienda'], ['Correo al cliente (acuse de recibo)', 'correo-cliente']]) {
    const h = f.getByText(texto).first();
    await h.evaluate(el => el.scrollIntoView({ block: 'start' })); await p.waitForTimeout(800);
    const r = await h.boundingBox();
    // hasta el siguiente título o 1500 px
    await p.screenshot({ path: DIR + nombre + '.jpg', type: 'jpeg', quality: 85, clip: { x: caja.x + 10, y: Math.max(caja.y, r.y - 6), width: Math.min(640, caja.width - 60), height: 1500 } });
    console.log('ok', nombre, JSON.stringify(r));
  }
  await b.close();
})();
