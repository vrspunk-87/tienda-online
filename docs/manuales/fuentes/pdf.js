const { chromium } = require('playwright');
const [,, entrada, salida, pie] = process.argv;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + require('path').resolve(entrada), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: salida, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="width:100%;font-size:8px;color:#888;font-family:Arial;padding:0 16mm;display:flex;justify-content:space-between"><span>${pie}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>` });
  await b.close();
})();
