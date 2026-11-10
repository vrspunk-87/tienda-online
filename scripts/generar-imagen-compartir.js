#!/usr/bin/env node
/*
  Genera public/img/compartir.jpg (1200×630): la imagen por defecto al compartir la web por
  WhatsApp, Facebook, etc. cuando una página no tiene imagen propia.
  Logo (public/img/logo.svg), nombre de la tienda en la letra del logo (Courgette) con el color de
  acento, la descripción corta y un pespunte, sobre el fondo de la marca; todo en el cuadrado
  central, porque WhatsApp recorta la miniatura en cuadrado.
  Se vuelve a ejecutar a mano si cambian el logo, el nombre o los colores:
      node scripts/generar-imagen-compartir.js
*/
import fs from 'node:fs';
import path from 'node:path';
import { parse as leerYaml } from 'yaml';
import opentype from 'opentype.js';
import sharp from 'sharp';

const AJ = leerYaml(fs.readFileSync('public/_datos/sitio.yml', 'utf8')) || {};
const marca = { texto: '#1f2933', fondo: '#ffffff', acento: '#2f6f8f', ...((AJ.apariencia || {}).marca || {}) };
const nombre = String(AJ.nombre || 'Máquinas de Coser Zafra');
const lema = 'Máquinas de coser y accesorios en Zafra';
const fuente = f => { const b = fs.readFileSync(f); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const courgette = fuente('node_modules/@fontsource/courgette/files/courgette-latin-400-normal.woff');
const montserrat = fuente('node_modules/@fontsource/montserrat/files/montserrat-latin-600-normal.woff');
const r = v => Math.round(v * 10) / 10;
const datos = t => t.commands.map(c => (c.type === 'Z' ? 'Z' : c.type + [c.x1, c.y1, c.x2, c.y2, c.x, c.y].filter(v => v !== undefined).map(r).join(' '))).join('');
const texto = (f, s, x, y, tam, color) => f.getPaths(s, x, y, tam).map(datos).filter(Boolean).map(d => `<path d="${d}" fill="${color}"/>`).join('');
const ancho = (f, s, tam) => f.getAdvanceWidth(s, tam);

const W = 1200, H = 630;
// Todo centrado y dentro del cuadrado central (630×630): WhatsApp y otras apps recortan la
// imagen en cuadrado para la miniatura. Nombre en dos líneas como en la cabecera.
const partes = nombre.match(/^(.*)\s(\S+)$/) || [null, nombre, ''];
const logoSvg = fs.readFileSync(path.join('public', (AJ.logo || '/img/logo.svg').replace(/^\//, '')), 'utf8');
const vb = ((logoSvg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 64 64').split(/\s+/).map(Number);
const cuerpoLogo = logoSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '').replace(/<!--[\s\S]*?-->/g, '');
const L = 150; // tamaño del logo
const centro = (f, s, tam) => (W - ancho(f, s, tam)) / 2;
let T1 = 66; while (ancho(courgette, partes[1], T1) > 560 && T1 > 40) T1 -= 2;
let T3 = 26; while (ancho(montserrat, lema, T3) > 560 && T3 > 16) T3 -= 1;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${marca.fondo}"/>
  <rect x="${W / 2 - 300}" y="30" width="600" height="${H - 60}" rx="34" fill="none" stroke="${marca.acento}" stroke-width="4" stroke-dasharray="20 13" opacity=".45"/>
  <g transform="translate(${W / 2 - L / 2} 52) scale(${L / (vb[2] || 64)})">${cuerpoLogo}</g>
  ${texto(courgette, partes[1], centro(courgette, partes[1], T1), 300, T1, marca.acento)}
  ${texto(courgette, partes[2], centro(courgette, partes[2], 112), 420, 112, marca.acento)}
  ${texto(montserrat, lema, centro(montserrat, lema, T3), 520, T3, marca.texto)}
</svg>`;
sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile('public/img/compartir.jpg')
  .then(() => console.log('public/img/compartir.jpg generada (1200×630).'));
