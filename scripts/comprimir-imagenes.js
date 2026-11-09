/*
  Reduce las imágenes grandes de public/img/ para que el repositorio no crezca
  demasiado. En la plataforma lo ejecutaba el despliegue de producción; en la tienda
  se decide en la fase 1b (despliegue) y lo reutilizará el importador del catálogo
  (fase 3 de docs/PLAN.md).

  Los límites se configuran en Decap → Ajustes del sitio → Compresión de imágenes:
  ancho máximo, calidad y a partir de qué peso se comprime.

  Solo toca las imágenes que superan el ancho o el peso máximo; el resto se queda
  igual, así que se puede ejecutar todas las veces que haga falta.
  Uso manual: node scripts/comprimir-imagenes.js
*/
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { parse as leerYaml } from 'yaml';

const DIR = 'public/img';
const ajustes = (leerYaml(fs.readFileSync('public/_datos/sitio.yml', 'utf8')) || {}).imagenes || {};
const ANCHO = Number(ajustes.ancho_maximo) || 1600;
const CALIDAD = Number(ajustes.calidad) || 82;
const PESO_KB = Number(ajustes.peso_maximo_kb) || 400;
// Ficheros que no se tocan (logo, imagen para compartir, iconos)
const EXCLUIR = [/^logo\./, /^compartir\./, /^iconos\//];

let revisadas = 0, comprimidas = 0, ahorro = 0;
const ficheros = fs.readdirSync(DIR, { recursive: true }).map(String).filter(f => /\.(jpe?g|png|webp)$/i.test(f) && !EXCLUIR.some(r => r.test(f)));

for (const f of ficheros) {
  const ruta = path.join(DIR, f);
  const antes = fs.statSync(ruta).size;
  revisadas++;
  try {
    const meta = await sharp(ruta).metadata();
    if (meta.width <= ANCHO && antes <= PESO_KB * 1024) continue;

    let img = sharp(ruta).rotate(); // respeta la orientación de las fotos del móvil
    if (meta.width > ANCHO) img = img.resize({ width: ANCHO });
    const ext = path.extname(f).toLowerCase();
    if (ext === '.png') img = img.png({ compressionLevel: 9, palette: true, quality: CALIDAD });
    else if (ext === '.webp') img = img.webp({ quality: CALIDAD });
    else img = img.jpeg({ quality: CALIDAD, mozjpeg: true });

    const buffer = await img.toBuffer();
    // Solo se guarda si se gana al menos un 10 %: así no se recomprime una y otra
    // vez la misma imagen (cada recompresión pierde algo de calidad).
    if (buffer.length < antes * 0.9) {
      fs.writeFileSync(ruta, buffer);
      comprimidas++;
      ahorro += antes - buffer.length;
      console.log(`  ${f}: ${(antes / 1024).toFixed(0)} KB → ${(buffer.length / 1024).toFixed(0)} KB`);
    }
  } catch (e) {
    console.warn(`  Aviso: no se pudo comprimir ${f}: ${e.message}`);
  }
}
console.log(`Imágenes revisadas: ${revisadas}, comprimidas: ${comprimidas}, ahorro: ${(ahorro / 1048576).toFixed(1)} MB.`);
