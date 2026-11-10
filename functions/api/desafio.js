/*
  Entrega un desafío nuevo a la casilla «No soy un robot» de /presupuesto/ (ALTCHA).
  Ver lib/verificacion.js y lib/solicitud-api.js.
*/
import { manejarDesafio } from '../../lib/solicitud-api.js';

export const onRequest = contexto => manejarDesafio(contexto);
