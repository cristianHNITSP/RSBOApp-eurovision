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
  if (!token) {
    console.warn('❌ No se encontró token en la cookie');
    return res.status(401).json({ error: 'No autorizado: token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decodificado correctamente:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ Error verificando token:', err.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = authMiddleware;
