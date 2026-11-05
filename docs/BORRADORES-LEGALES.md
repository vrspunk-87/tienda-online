# Borradores legales — punto de partida para la revisión

Borradores preparados el 5 de noviembre de 2026 como **punto de partida**. **No son textos
definitivos ni asesoramiento legal**: los debe revisar una persona con conocimientos legales (el
asesor o la gestoría de la tienda, o un abogado) antes de publicar la web. Toman como modelo las
páginas legales de la web de la plataforma.

## Qué hay y dónde

| Texto | Fichero | Dirección en la web |
|---|---|---|
| Aviso legal | `public/_paginas/aviso-legal.md` | `/paginas/aviso-legal/` |
| Política de privacidad | `public/_paginas/politica-de-privacidad.md` | `/paginas/politica-de-privacidad/` |
| Condiciones de la solicitud de presupuesto (con desistimiento, garantía y modelo de formulario de desistimiento) | `public/_paginas/condiciones-solicitud-presupuesto.md` | `/paginas/condiciones-solicitud-presupuesto/` |
| Política de cookies | `public/_paginas/politica-de-cookies.md` | `/paginas/politica-de-cookies/` |
| Textos del formulario, de la página de gracias y del correo de acuse | Este documento (pasarán a los ajustes del formulario en la fase 5) | — |

Las páginas son páginas normales del panel: cuando exista (fase 1), se editan desde Decap. Llevan
`noindex` y un aviso «Borrador pendiente de revisar» al principio, que hay que quitar al darlas por
buenas.

## Decidido por la tienda (5-11-2026)

- **Productos nuevos**; alguno puede ser **de segunda mano**, indicado en su ficha (garantía de al
  menos 1 año, pactada).
- El **precio de oferta se respeta** en las solicitudes recibidas dentro de las fechas de la oferta.
- En el desistimiento, los **gastos de devolución son del cliente** y el producto **se revisa al
  recibirlo** antes de reembolsar. Ojo: la ley permite retener el reembolso hasta recibir el
  producto y **descontar la pérdida de valor** por una manipulación excesiva, pero no negarse a
  devolver el dinero porque el producto no esté «en perfectas condiciones»; los borradores lo
  recogen así (pregunta 10).

## Datos de la tienda que faltan (entre [corchetes] en los textos)

- Titular: nombre y apellidos (si es autónomo) o razón social (si es sociedad) y, si es sociedad,
  datos del Registro Mercantil.
- Nombre comercial, NIF, dirección postal, correo y teléfono de la tienda.
- Plazo en que la tienda contesta a las solicitudes (propuesto: 2 días laborables).
- Plazo de conservación de las solicitudes que no acaban en venta (propuesto: 6 meses).
- Formas de pago aceptadas.
- Si la tienda tiene establecimiento abierto al público (hojas de reclamaciones) y si está adherida
  al arbitraje de consumo.

## Textos del formulario `/presupuesto/`

**Campos:** Nombre (obligatorio) · Correo electrónico (obligatorio) · Teléfono (obligatorio) ·
Observaciones (opcional, texto libre; ayuda: «Dudas sobre los productos, horario en que prefieres
que te llamemos…»).

**Casilla obligatoria** (sin marcar de antemano):

> He leído y acepto las [condiciones de la solicitud de presupuesto](/paginas/condiciones-solicitud-presupuesto/) y la [información sobre protección de datos](/paginas/politica-de-privacidad/).

**Información básica de protección de datos** (debajo del botón, en letra pequeña):

> **Responsable:** [Nombre o razón social]. **Finalidad:** responder a tu solicitud de presupuesto
> y, si se acuerda, gestionar la venta. **Base legal:** medidas precontractuales a petición tuya.
> **Destinatarios:** no se ceden datos salvo obligación legal; proveedores de alojamiento y correo
> (Cloudflare y Google). **Derechos:** acceso, rectificación, supresión y otros, en [correo de la
> tienda]. Más información en la [política de privacidad](/paginas/politica-de-privacidad/).

**Junto al total de la lista:**

> Precios orientativos, IVA incluido. Enviar la solicitud no te obliga a comprar: la tienda se
> pondrá en contacto contigo para confirmar disponibilidad y precio final.

## Página de gracias

> **Hemos recibido tu solicitud S-AAAA-NNNN.** Te hemos enviado un correo con el resumen. La tienda
> se pondrá en contacto contigo en un plazo de [2 días laborables]. Si no ves el correo, revisa la
> carpeta de correo no deseado.

Si se ha alcanzado el tope diario de correos: «Hemos recibido tu solicitud S-AAAA-NNNN. Hoy no
podemos enviarte el correo de confirmación, pero la tienda se pondrá en contacto contigo igualmente.»

## Correo de acuse de recibo al cliente

**Asunto:** Hemos recibido tu solicitud de presupuesto S-AAAA-NNNN

> Hola:
>
> Hemos recibido tu solicitud de presupuesto **S-AAAA-NNNN** del [fecha]. Estos son los productos
> que has elegido:
>
> - [Referencia] — [Nombre del producto] — [precio orientativo] €
> - [Referencia] — [Nombre del producto] — **Oferta: [precio de oferta] €** (antes [precio] €;
>   se respeta porque tu solicitud se recibió durante la oferta)
> - …
>
> **Total orientativo:** [total] € (IVA incluido)
>
> Los precios son orientativos y no constituyen una oferta: la tienda te confirmará la
> disponibilidad y el precio final. Te contactaremos en un plazo de [2 días laborables].
>
> Si no has enviado tú esta solicitud, ignora este correo o escríbenos para que borremos tus datos.
>
> [Nombre de la tienda] · [teléfono] · [dirección]
> Información sobre protección de datos: [dirección de la web]/paginas/politica-de-privacidad/

No incluye el nombre ni las observaciones del cliente (para que el formulario no sirva para enviar
textos ajenos a terceros; ver la fase 5 del [plan](PLAN.md)).

## Preguntas para quien revise

1. **Precios orientativos y artículo 20 del TRLGDCU.** La ley exige el precio final completo en las
   comunicaciones comerciales que permiten comprar («invitación a comprar»). Aquí no se puede
   comprar en la web; ¿es correcto mostrar precios «orientativos, IVA incluido» o hay que
   matizarlo?
2. **Ofertas.** ¿Hace falta indicar el precio anterior de referencia según la normativa de
   anuncio de reducciones de precio? (La web muestra el precio normal tachado, el porcentaje y la
   fecha de fin.)
3. **Base legal.** Se ha usado «medidas precontractuales» (art. 6.1.b RGPD) y una casilla de
   aceptación de condiciones, no el consentimiento. ¿Es adecuado?
4. **Google con cuenta gratuita.** No se firma contrato de encargado del tratamiento. ¿Es aceptable
   o conviene Google Workspace?
5. **Cloudflare.** Las funciones que reciben el formulario no se pueden fijar en la UE. ¿Basta con
   la información y las garantías de transferencia de Cloudflare?
6. **Desistimiento.** La venta se acuerda fuera de la web: en tienda (sin desistimiento) o a
   distancia (14 días). ¿Es correcto el planteamiento y el momento en que se da la información
   precontractual?
7. **Plazos de conservación** propuestos (6 meses sin venta; plazos fiscales y mercantiles con
   venta).
8. **Resolución de litigios en línea.** La plataforma europea ODR dejó de funcionar en 2025, por
   eso no se enlaza. Confirmar que no hace falta ninguna otra referencia.
9. **Registro de actividades de tratamiento** y demás obligaciones internas de la tienda (fuera de
   la web).
10. **Revisión del producto devuelto.** La tienda quiere revisar el producto antes de reembolsar.
    Se ha redactado como retención del reembolso hasta recibirlo y descuento de la pérdida de valor
    por manipulación excesiva. ¿Es correcta la redacción? ¿Conviene describir qué se revisa?
11. **Segunda mano.** ¿Cómo se pacta el plazo de garantía reducido (mínimo 1 año): basta con la
    ficha y la confirmación por escrito al acordar la venta?
