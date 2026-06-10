/**
 * @fileoverview Helper JWT centralizado.
 * Fija explícitamente el algoritmo HS256 al firmar y verificar para evitar
 * ataques de algorithm-confusion (alg:none / confusión RS256↔HS256).
 *
 * @module utils/jwt
 */
const jwt = require("jsonwebtoken");
const config = require("../config");

const JWT_ALGORITHMS = ["HS256"];

/** Firma un payload con HS256. */
function signJwt(payload, options = {}) {
  return jwt.sign(payload, config.secrets.jwt, { algorithm: "HS256", ...options });
}

/** Verifica un token aceptando SOLO HS256. Lanza si es inválido/expirado. */
function verifyJwt(token) {
  return jwt.verify(token, config.secrets.jwt, { algorithms: JWT_ALGORITHMS });
}

module.exports = { signJwt, verifyJwt, JWT_ALGORITHMS };
