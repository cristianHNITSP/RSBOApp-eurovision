"use strict";

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

/**
 * Middleware que valida el token compartido entre servicios internos.
 * Ninguna ruta /internal debe ser accesible sin este token.
 */
function requireServiceToken(req, res, next) {
  if (!INTERNAL_TOKEN) {
    console.warn("[INTERNAL] INTERNAL_SERVICE_TOKEN no configurado — rechazando peticion");
    return res.status(403).json({ error: "Servicio interno no configurado" });
  }

  const token = req.headers["x-service-token"];
  if (!token || token !== INTERNAL_TOKEN) {
    return res.status(403).json({ error: "Token de servicio invalido" });
  }

  next();
}

module.exports = { requireServiceToken };
