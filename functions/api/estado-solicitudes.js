/*
  Diagnóstico de la solicitud de presupuesto: /api/estado-solicitudes?clave=…
  Dice si están las variables de Cloudflare y si el script de Google responde y acepta la clave.
  No muestra ningún valor secreto ni escribe en la hoja. Protegido con DIAGNOSTICO_CLAVE: sin esa
  variable (o con otra clave) contesta «No encontrado».
*/
import datos from '../../lib/generado/solicitud-datos.js';
import { manejarEstado } from '../../lib/solicitud-api.js';

export const onRequest = contexto => manejarEstado(contexto, datos);
