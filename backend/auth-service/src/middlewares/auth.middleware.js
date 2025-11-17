/**
 * @fileoverview Middleware de autenticación
 * Proporciona un middleware de autenticación basado en JWT para proteger rutas.
 * Verifica la presencia y validez de tokens JWT almacenados en cookies.
 * 
 * @module middlewares/auth
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación
 * Valida el JWT obtenido de la cookie `auth_token` y adjunta la información
 * decodificada en `req.user` para uso en los controladores.
 * 
 * @param {import('express').Request} req - Objeto request de Express
 * @param {import('express').Response} res - Objeto response de Express
 * @param {import('express').NextFunction} next - Función next de Express
 * @returns {void}
 */
function authMiddleware(req, res, next) {
  console.log('--- authMiddleware ---');
  console.log('Cookies recibidas:', req.cookies);

  const token = req.cookies.auth_token;

  // Caso 1: no hay token -> usuario no ha iniciado sesión / cookie borrada
  if (!token) {
    console.warn('No se encontró token en la cookie');
    return res.status(401).json({
      error: 'NO_TOKEN',
      message: 'No autorizado: token de sesión no proporcionado'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado correctamente:', decoded);

    // Adjuntar info del usuario al request
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Error verificando token:', err.message);

    // Caso 2: token expirado
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'La sesión ha expirado. Inicia sesión nuevamente.'
      });
    }

    // Caso 3: token inválido o manipulado
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Token inválido. Inicia sesión nuevamente.'
    });
  }
}

module.exports = authMiddleware;
