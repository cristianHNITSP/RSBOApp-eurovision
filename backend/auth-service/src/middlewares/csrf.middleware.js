/**
 * @fileoverview CSRF Protection — Double Submit via header + cookie
 *
 * Flujo:
 * 1. Login / check-session emiten un header `X-CSRF-Token` y una cookie
 *    `csrf_token` (NO HttpOnly, para que JS la lea).
 * 2. En cada request mutante (POST/PUT/PATCH/DELETE), el frontend envía
 *    el valor como header `X-CSRF-Token`.
 * 3. Este middleware compara el header con la cookie — si no coinciden → 403.
 *
 * GET/HEAD/OPTIONS se ignoran (safe methods).
 */

const crypto = require('crypto');

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const TOKEN_BYTES = 32;

/** Genera un token CSRF aleatorio criptográficamente seguro */
function generateCsrfToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

/**
 * Setea la cookie csrf_token + el header X-CSRF-Token en la respuesta.
 * Llamar en login y check-session.
 */
function setCsrfTokenOnResponse(res, token) {
  // Cookie legible por JS (NO httpOnly) — solo SameSite protege
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,           // JS necesita leerla
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge:   7 * 3600 * 1000, // misma vida que la sesión
    path:     '/',
  });
  res.set('X-CSRF-Token', token);
}

/**
 * Middleware que valida CSRF en requests mutantes.
 * Montarlo DESPUÉS de parsear cookies.
 */
function csrfProtection(req, res, next) {
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (safeMethods.has(req.method.toUpperCase())) return next();

  const headerToken = req.headers[CSRF_HEADER];
  const cookieToken = req.cookies?.[CSRF_COOKIE];

  if (!headerToken || !cookieToken) {
    return res.status(403).json({
      error: 'CSRF_MISSING',
      message: 'Token CSRF no proporcionado',
    });
  }

  // Comparación en tiempo constante para evitar timing attacks
  const a = Buffer.from(String(headerToken));
  const b = Buffer.from(String(cookieToken));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({
      error: 'CSRF_INVALID',
      message: 'Token CSRF inválido',
    });
  }

  next();
}

module.exports = {
  generateCsrfToken,
  setCsrfTokenOnResponse,
  csrfProtection,
  CSRF_COOKIE,
};
