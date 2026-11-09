# Prueba de carga — Máquinas de Coser Zafra

Fecha: 8 de noviembre de 2026. Generador: `scripts/build.js` (estado actual del proyecto).

## Cómo se ha hecho

- Copia aislada del proyecto (no se ha tocado tu carpeta ni Git) con contenido de prueba generado automáticamente y marcado `prueba: true`.
- **Cada producto con 5 fotos** JPG de 1600×1200 (~240 KB cada una, tamaño realista de foto de móvil ya reducida).
- Categorías hoja al azar, 17 fabricantes, 15 % en oferta, 3 % no disponibles, 10 % segunda mano, accesorios con «compatible con», destacados y ficha técnica. Entradas de blog con 1 imagen.
- Máquina de pruebas: 2 núcleos y 8 GB (parecida a la de compilación de Cloudflare Pages).
- «Frío» = sin caché de imágenes (lo que pasa en Cloudflare en cada despliegue si la caché no se conserva). «Caliente» = imágenes ya optimizadas.

## Resultados

| | 200 productos + 50 entradas | 500 + 120 | 900 + 250 |
|---|---|---|---|
| Productos reales publicados* | 190 | 482 | 873 |
| Páginas HTML | 342 | 732 | 1.274 |
| Variantes de imagen (webp) | 3.077 | 7.671 | 13.926 |
| **Ficheros publicados** | 4.798 | 11.681 | **21.094** ❌ |
| Peso de la web (dist) | 501 MB | 1.250 MB | 2.274 MB |
| Imágenes en el repositorio (public/img) | 276 MB | 688 MB | 1.247 MB |
| Compilación en frío | 5 min 53 s | ≈ 15 min (estimado) | ≈ 28 min (estimado) ❌ |
| Compilación en caliente | 10 s | 25 s | 50 s |
| Memoria máxima | 348 MB | 401 MB | 510 MB |
| Portada / catálogo (HTML) | 434 KB (27 KB comprimido) | 1.015 KB (55 KB) | 1.845 KB (93 KB) |
| Página del buscador | 360 KB | 839 KB | 1.481 KB |
| Índice del buscador (Pagefind) | 2 MB | 4 MB | 6 MB |
| Enlaces rotos | 0 | 0 | 0 |

\* Algunos productos generados caen fuera por estar repetidos o sin categoría válida; no afecta a la medida.

Coste medio: **≈ 24 ficheros y ≈ 2,5 MB publicados por producto**, y ≈ 0,12 s de CPU por variante de imagen (15 variantes por producto ≈ 1,8 s).

## Límites que aparecen

Valores conocidos de los servicios (conviene confirmarlos en su documentación actual antes de publicar):

| Límite | Valor | Se alcanza hacia |
|---|---|---|
| Ficheros por despliegue en Cloudflare Pages (plan gratuito) | 20.000 | **≈ 800 productos** |
| Tiempo máximo de compilación en Cloudflare Pages | 20 min | **≈ 650–700 productos** en frío |
| Aviso de tamaño de repositorio en GitHub | ~1 GB recomendado | ≈ 800 productos |
| Tamaño máximo por fichero en Cloudflare | 25 MB | No se alcanza (la mayor página pesa 1,8 MB) |
| Memoria de compilación | — | Sin problema (máx. 0,5 GB) |

El primer límite real es **el tiempo de compilación en frío**: Cloudflare no siempre conserva la caché de `node_modules/.cache` entre despliegues, y entonces se rehacen todas las imágenes.

## Conclusión: volumen soportado hoy

Con la configuración actual, sin cambios:

- **Cómodo: hasta ≈ 500 productos (5 fotos) y ≈ 150 entradas de blog.** Compila en ≈ 15 min en frío, ≈ 12.000 ficheros, portada de 55 KB comprimida.
- **Al límite: 600–650 productos.** Cualquier despliegue sin caché roza los 20 minutos.
- **No soportado: 800 o más.** Supera los 20.000 ficheros y el tiempo de compilación.

Para una tienda de máquinas de coser con catálogo propio esto deja margen amplio; las mejoras de abajo lo multiplican si hiciera falta.

## Mejoras propuestas (por impacto)

1. **No publicar las fotos originales.** Hoy se copian a la web además de sus 3 variantes webp. Quitándolas: −5 ficheros y −1,4 MB por producto (−690 MB a 500 productos). La ventana ampliada de la galería usaría la webp de 1600 px. *Sube el techo de ficheros a ≈ 1.000 productos.*
2. **Conservar la caché de imágenes entre despliegues.** Opción A: compilar en GitHub Actions con caché y publicar con `wrangler pages deploy` (sin el límite de 20 min de Cloudflare). Opción B: guardar las variantes ya generadas en el repositorio. *La compilación pasa de 15–28 min a menos de 1 min.*
3. **Portada, catálogo y buscador más ligeros.** Ahora incluyen la tarjeta de todos los productos en el HTML (1,8 MB a 900 productos). Pintar 24 y cargar el resto desde un JSON reduciría esas páginas a ~100 KB y mejoraría la carga en móvil.
4. **Reducir las fotos al subirlas** (Decap permite limitar el tamaño): el repositorio crecería la mitad.
5. **Panel de Decap con muchas entradas:** a partir de varios cientos de productos, el listado del panel se vuelve lento; conviene agrupar o filtrar por tipo en `config.yml`.

## Después de las mejoras (8-11-2026)

Aplicadas las mejoras 1, 3 y 4 (ver arriba); la 2 y la 5 quedan para la instalación real
([PLAN.md](PLAN.md), fase 8, punto 6). Misma prueba de 900 productos + 250 entradas:

| | Antes | Después |
|---|---|---|
| Ficheros publicados | 21.094 ❌ | **17.617** ✅ |
| Peso de la web (dist) | 2.274 MB | **1.106 MB** |
| Portada (HTML) | 1.845 KB (93 KB comprimido) | **76 KB (12 KB)** |
| Catálogo / buscador (HTML) | 1.845 / 1.481 KB | **70 / 75 KB** |
| Mayor página | 1,8 MB | 134 KB (ofertas de un tipo) |
| Memoria máxima | 510 MB | 470 MB |

Qué cambió:

1. **Fotos originales fuera de la web**: se publican solo sus versiones WebP y, de la foto principal
   de cada contenido, un JPG de 1200 px para compartir en redes. ≈ 17,5 ficheros por producto
   (antes ≈ 24): **el límite de 20.000 ficheros pasa de ≈ 800 a ≈ 1.000 productos**.
3. **Listas largas ligeras**: con más de 48 productos o entradas, el HTML solo trae la primera
   página; el resto se carga de un JSON compartido (≈ 45 KB comprimido con 500 productos) que el
   navegador guarda. Filtros, orden, paginación, buscador y el botón «+» funcionan igual.
4. **Fotos al subirlas**: el panel no deja subir ficheros de más de 8 MB; la compresión por defecto
   pasa a 1600 px y 400 KB, y el build avisa de las fotos que pesan más.

Lo que sigue limitando es **la compilación sin caché** (≈ 30 min a 900 productos, ≈ 15 min a 500):
por eso la mejora 2 es imprescindible antes de pasar de ≈ 600 productos.

## Entorno local de pruebas

`node scripts/pruebas-carga.mjs pequena|media|grande|sin-blog|solo-blog|limpiar` y `npm run web`
(detalles en el [README](../README.md#probar-con-volumen)).

## Qué no se ha medido

- Tiempo real dentro de Cloudflare (sólo se ha simulado con una máquina equivalente).
- Velocidad del panel Decap con este volumen.
- Cuotas de la función de envío de solicitudes (fase 5, aún no existe).
