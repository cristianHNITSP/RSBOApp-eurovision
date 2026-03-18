/**
 * @fileoverview Middleware de autorización por roles — Notification Service
 *
 * Usa `req.user.roleName` (embedded en el JWT) — sin consulta a DB.
 *
 * Jerarquía de roles:
 *   root        → acceso total
 *   eurovision  → gestión completa de notificaciones
 *   supervisor  → puede crear y leer
 *   ventas      → solo lectura + marcar leída
 *   laboratorio → solo lectura + marcar leída
 *
 * @module middlewares/permissions
 */

/**
 * Devuelve un middleware que verifica si el rol del usuario está en la lista.
 * @param {string[]} allowedRoles
 */
function requireRoles(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'NO_TOKEN',
        message: 'No autorizado: usuario no identificado en la sesión',
      });
    }

    const roleName = req.user.roleName;

    if (!roleName || !allowedRoles.includes(roleName)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'No tienes permisos para realizar esta acción',
        requiredRoles: allowedRoles,
        yourRole: roleName ?? null,
      });
    }

    next();
  };
}

/**
 * El usuario es "manager" si su rol tiene capacidad de crear/gestionar.
 * Shorthand: ['root', 'eurovision', 'supervisor']
 */
const requireManager = requireRoles(['root', 'eurovision', 'supervisor']);

/**
 * Solo root y eurovision pueden eliminar o moderar notificaciones.
 */
const requireAdmin = requireRoles(['root', 'eurovision']);

module.exports = { requireRoles, requireManager, requireAdmin };
