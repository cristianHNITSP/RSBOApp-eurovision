/**
 * @fileoverview Helper JWT centralizado (notification-service).
 * Fija HS256 al verificar para evitar algorithm-confusion (alg:none / RS↔HS).
 *
 * @module utils/jwt
 */
const jwt = require("jsonwebtoken");

const JWT_ALGORITHMS = ["HS256"];

/** Verifica un token aceptando SOLO HS256. Lanza si es inválido/expirado. */
function verifyJwt(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: JWT_ALGORITHMS });
}

module.exports = { verifyJwt, JWT_ALGORITHMS };
