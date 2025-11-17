// middlewares/permissions.middleware.js
const User = require('../models/User');

/**
 * Normaliza el campo permissions del rol:
 * - Si es string: "a,b,c" -> ["a","b","c"]
 * - Si es array: se regresa tal cual
 */
function normalizePermissions(permissions) {
  if (Array.isArray(permissions)) {
    return permissions;
  }
  if (typeof permissions === 'string') {
    return permissions
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Middleware de autorización por permisos
 * @param {string[]} requiredPermissions - Lista de permisos requeridos
 * @returns {Function} middleware Express
 */
function requirePermissions(requiredPermissions = []) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'NO_TOKEN',
          message: 'No autorizado: usuario no identificado en la sesión',
        });
      }

      // Cargar usuario con su rol
      const user = await User.findById(req.user.id).populate('role');

      if (!user || !user.role) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'No tiene un rol asignado para acceder a este recurso',
        });
      }

      const userPermissions = normalizePermissions(user.role.permissions);

      // Verificar permisos faltantes
      const missing = requiredPermissions.filter(
        perm => !userPermissions.includes(perm)
      );

      if (missing.length > 0) {
        return res.status(403).json({
          error: 'INSUFFICIENT_PERMISSIONS',
          message: 'No tiene permisos para realizar esta acción',
          missingPermissions: missing,
        });
      }

      // Opcional: adjuntar info de rol/permisos al req.user para uso posterior
      req.user.role = {
        id: user.role._id,
        name: user.role.name,
        permissions: userPermissions,
      };

      next();
    } catch (err) {
      console.error('Error en requirePermissions:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}

module.exports = {
  requirePermissions,
};
