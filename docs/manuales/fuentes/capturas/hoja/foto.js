const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 320 }, deviceScaleFactor: 1.5 });
  const path = require('path'); const D = path.join(__dirname, '..', '..', 'img') + path.sep;
  await p.goto(require('url').pathToFileURL(path.join(__dirname, 'hoja.html')).href); const alto = await p.evaluate(() => document.getElementById('h1').getBoundingClientRect().height); await p.setViewportSize({ width: 1300, height: Math.ceil(alto) });
  await p.screenshot({ path: D + 'hoja-solicitudes.jpg', type: 'jpeg', quality: 88 });
  // parte derecha: notas y precio final
  await p.evaluate(() => window.scrollTo(document.body.scrollWidth, 0));
  await p.screenshot({ path: D + 'hoja-notas.jpg', type: 'jpeg', quality: 88 });
  // desplegable del estado
  await p.evaluate(() => { window.scrollTo(0, 0); const td = document.querySelectorAll('tr')[2].children[3]; const r = td.getBoundingClientRect();
    const d = document.createElement('div'); d.className = 'desp'; d.style.left = r.left + 'px'; d.style.top = (r.bottom + 2) + 'px';
    d.innerHTML = ['Nueva','En revisión','Contactado','Aceptada','Rechazada','Cancelada'].map(e => `<div class="${e==='Nueva'?'sel':''}">${e}</div>`).join(''); document.body.appendChild(d);
    td.style.outline = '2px solid #1a73e8'; });
  await p.setViewportSize({ width: 900, height: Math.ceil(alto) });
  await p.screenshot({ path: D + 'hoja-estado.jpg', type: 'jpeg', quality: 88 });
  await p.goto(require('url').pathToFileURL(path.join(__dirname, 'lineas.html')).href); const alto2 = await p.evaluate(() => document.getElementById('h1').getBoundingClientRect().height); await p.setViewportSize({ width: 1300, height: Math.ceil(alto2) });
  await p.screenshot({ path: D + 'hoja-lineas.jpg', type: 'jpeg', quality: 88 });
  await b.close();
})();
