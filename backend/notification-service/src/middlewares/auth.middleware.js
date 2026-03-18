/**
 * @fileoverview Middleware de autenticación — Notification Service
 * Verifica el JWT de la cookie `auth_token` y adjunta `req.user`.
 * El payload incluye: { id, email, role (ObjectId string), roleName }
 *
 * @module middlewares/auth
 */

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({
      error: 'NO_TOKEN',
      message: 'No autorizado: token de sesión no proporcionado',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'La sesión ha expirado. Inicia sesión nuevamente.',
      });
    }
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Token inválido. Inicia sesión nuevamente.',
    });
  }
}

module.exports = authMiddleware;
