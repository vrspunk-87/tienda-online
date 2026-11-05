# Guía para editar la web

El panel está en **/admin/** de la web. Se entra con la cuenta de GitHub (hace falta una
invitación al repositorio). Los cambios se ven en la web 1-2 minutos después de publicarlos.

> Guía inicial (fase 1a). Se completará con el catálogo (fases 2 y 3) y las solicitudes de
> presupuesto (fase 5).

## Secciones del panel

- **Catálogo: categorías**: categorías y subcategorías. Para una subcategoría, elige su «Categoría
  padre». El «Orden en el menú» decide en qué orden salen. Cada una tiene su página con su texto.
- **Catálogo: productos**: rellena fabricante, **modelo** (obligatorio), referencia (si la hay),
  categoría (la subcategoría, si la tiene), precio, estado y de 1 a 5 fotos (la primera es la de las
  tarjetas). Para poner una oferta: estado «En oferta» y, en «Oferta», el precio y las fechas. Al terminar la
  oferta no hace falta tocar nada: la web vuelve sola al precio normal (para la siguiente oferta,
  basta con cambiar el precio y las fechas).
  Cuando se venda o se retire, estado «No disponible». Si es un accesorio, elige en «Compatible
  con» las máquinas para las que sirve.
- **Catálogo: fabricantes**: nombre e imagen (logotipo). No tienen página.

### Encontrar productos en el panel

- **Filtrar** (botón «Filter by» encima de la lista de productos): por fabricante, por categoría
  (una categoría principal incluye sus subcategorías), «En oferta», «No disponibles» y «Segunda
  mano». Se pueden marcar varios a la vez: salen los productos que cumplen **todos** (p. ej. un
  fabricante y una categoría). Un fabricante o una categoría nuevos aparecen en los filtros
  1-2 minutos después de publicarlos.
- **Agrupar** («Group by»): por fabricante, categoría o estado.
- **Ordenar** («Ordenar por»): por fecha de alta, nombre o modelo.
- **Buscar** (cuadro «Buscar todas», arriba a la izquierda): por **modelo**, referencia, fabricante
  o nombre, p. ej. «HD 100» o «MP1-HD100». La búsqueda es aproximada: lo que coincide sale primero,
  y pueden aparecer debajo otros parecidos.

(«Filter by» y «Group by» salen en inglés: la traducción al español del panel no los incluye.)

- **Blog**: entradas con título, fecha, resumen, imagen y texto. Se publican en `/blog/`.
- **Páginas**: páginas sueltas (quiénes somos, contacto, textos legales…). Para que salgan en el
  menú o en el pie, añádelas en **Ajustes del sitio**.
- **Portada**: textos del bloque principal y sus botones.
- **Ajustes del sitio**: nombre, logo, colores, menú, enlaces legales, redes y opciones avanzadas.

## Flujo de publicación

Cada cambio pasa por **Borrador → En revisión → Listo** (pestaña «Flujo editorial»). Al pulsar
«Publicar» llega a la web.

## Consejos

- Títulos en minúsculas normales (no todo en MAYÚSCULAS) y con las palabras que buscaría la gente.
- Rellena siempre la **descripción de las imágenes** (texto alternativo): qué se ve en ella.
- Para probar algo sin que salga en la web pública, marca **«Solo para pruebas»**.
- Las páginas legales son **borradores pendientes de revisión**: no las des por buenas sin la
  revisión legal (ver `docs/BORRADORES-LEGALES.md`).
