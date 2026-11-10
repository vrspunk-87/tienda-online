/*
  Recibe la solicitud de presupuesto de /presupuesto/ y la guarda en la hoja de Google de la tienda
  (fase 5). Toda la lógica está en lib/solicitud-api.js; el catálogo con el que se recalculan los
  precios lo genera el build en lib/generado/solicitud-datos.js (no se sube a Git).
*/
import datos from '../../lib/generado/solicitud-datos.js';
import { manejarSolicitud } from '../../lib/solicitud-api.js';

export const onRequest = contexto => manejarSolicitud(contexto, datos);
