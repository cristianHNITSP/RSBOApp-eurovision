"use strict";

const crypto = require("crypto");

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
const INTERNAL_TOKEN_BUF = INTERNAL_TOKEN ? Buffer.from(INTERNAL_TOKEN) : null;

/** Comparación en tiempo constante (evita timing attacks sobre el token). */
function safeEqual(a, b) {
  if (!a || !b) return false;
  const ab = Buffer.from(String(a));
  if (ab.length !== b.length) return false;
  return crypto.timingSafeEqual(ab, b);
}

/**
 * Middleware que valida el token compartido entre servicios internos.
 * Ninguna ruta /internal debe ser accesible sin este token.
 */
function requireServiceToken(req, res, next) {
  if (!INTERNAL_TOKEN_BUF) {
    console.warn("[INTERNAL] INTERNAL_SERVICE_TOKEN no configurado — rechazando peticion");
    return res.status(403).json({ error: "Servicio interno no configurado" });
  }

  const token = req.headers["x-service-token"];
  if (!safeEqual(token, INTERNAL_TOKEN_BUF)) {
    return res.status(403).json({ error: "Token de servicio invalido" });
  }

  next();
}

module.exports = { requireServiceToken };
