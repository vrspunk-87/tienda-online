/*
  Verificación «No soy un robot» con ALTCHA (código abierto, sin servicios externos ni cookies),
  adaptada de api/_lib/verificacion.js de la plataforma. El navegador resuelve un pequeño cálculo
  (prueba de trabajo) que a una persona le cuesta un segundo, pero que encarece mucho enviar miles
  de solicitudes.

  Funciona en Cloudflare (funciones) y en Node (pruebas): solo usa la criptografía estándar
  (Web Crypto). La derivación PBKDF2 de altcha-lib usa «node:crypto», que las funciones de
  Cloudflare no tienen sin activar la compatibilidad con Node; por eso aquí va una equivalente
  con Web Crypto (mismo resultado).

  Clave secreta en Cloudflare: ALTCHA_SECRETO (texto largo y aleatorio; ver docs/solicitudes/CONFIGURAR.md).
*/
import { createChallenge, randomInt, verifySolution } from 'altcha-lib';

const ALGORITMO = 'PBKDF2/SHA-256';
const COSTE = 500;               // iteraciones por intento (dificultad: ~1 s en un móvil)
const CADUCIDAD_S = 10 * 60;     // el desafío vale 10 minutos

const bytes = v => (typeof v === 'string' ? new TextEncoder().encode(v) : v instanceof Uint8Array ? v : new Uint8Array(v));

// Derivación PBKDF2 con Web Crypto (sustituye a altcha-lib/algorithms/pbkdf2, que usa node:crypto)
export async function deriveKey(parameters, salt, password) {
  const hash = { 'PBKDF2/SHA-256': 'SHA-256', 'PBKDF2/SHA-384': 'SHA-384', 'PBKDF2/SHA-512': 'SHA-512' }[parameters.algorithm];
  if (!hash) throw new Error(`Algoritmo no admitido: ${parameters.algorithm}`);
  const clave = await crypto.subtle.importKey('raw', bytes(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: bytes(salt), iterations: Math.max(1, parameters.cost), hash }, clave, (parameters.keyLength || 32) * 8);
  return { parameters: {}, derivedKey: new Uint8Array(bits) };
}

async function sha256Hex(texto) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function secretos(env) {
  const base = env?.ALTCHA_SECRETO;
  if (!base || base.length < 20) return null;
  return { firma: base, firmaClave: await sha256Hex(`clave:${base}`) };
}

export const verificacionConfigurada = env => Boolean(env?.ALTCHA_SECRETO && env.ALTCHA_SECRETO.length >= 20);

export async function nuevoDesafio(env) {
  const s = await secretos(env);
  if (!s) throw new Error('Falta ALTCHA_SECRETO');
  return createChallenge({
    algorithm: ALGORITMO,
    cost: COSTE,
    counter: randomInt(2000, 6000),
    deriveKey,
    expiresAt: Math.floor(Date.now() / 1000) + CADUCIDAD_S,
    hmacSignatureSecret: s.firma,
    hmacKeySignatureSecret: s.firmaClave,
  });
}

// Comprueba el valor que envía el widget. Devuelve { ok, id } (id: huella para que el script de
// Google no acepte dos veces la misma verificación)
export async function comprobar(env, valor) {
  const s = await secretos(env);
  if (!s || !valor || typeof valor !== 'string' || valor.length > 5000) return { ok: false };
  let carga;
  try { carga = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(valor), c => c.charCodeAt(0)))); } catch { return { ok: false }; }
  if (!carga?.challenge || !carga?.solution) return { ok: false };
  try {
    const r = await verifySolution({
      challenge: carga.challenge,
      solution: carga.solution,
      deriveKey,
      hmacSignatureSecret: s.firma,
      hmacKeySignatureSecret: s.firmaClave,
    });
    if (!r.verified) return { ok: false, caducado: r.expired };
    return { ok: true, id: String(carga.challenge.signature || carga.challenge.parameters?.nonce || '').slice(0, 128) };
  } catch {
    return { ok: false };
  }
}
