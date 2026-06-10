/**
 * @fileoverview CSRF Protection — Double Submit (validación).
 *
 * El token CSRF lo EMITE auth-service en login/check-session (cookie `csrf_token`
 * no-HttpOnly + header `X-CSRF-Token`). Aquí solo VALIDAMOS que el header coincida
 * con la cookie en requests mutantes. GET/HEAD/OPTIONS se ignoran.
 *
 * @module middlewares/csrf
 */
const crypto = require("crypto");

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

function csrfProtection(req, res, next) {
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  if (safeMethods.has(req.method.toUpperCase())) return next();

  const headerToken = req.headers[CSRF_HEADER];
  const cookieToken = req.cookies?.[CSRF_COOKIE];

  if (!headerToken || !cookieToken) {
    return res.status(403).json({ error: "CSRF_MISSING", message: "Token CSRF no proporcionado" });
  }

  const a = Buffer.from(String(headerToken));
  const b = Buffer.from(String(cookieToken));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: "CSRF_INVALID", message: "Token CSRF inválido" });
  }

  next();
}

module.exports = { csrfProtection, CSRF_COOKIE };
