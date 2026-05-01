const jwt = require("jsonwebtoken");

/**
 * Middleware para proteger rutas verificando el JWT de la cookie
 * @param {Array} allowedRoles - Roles permitidos (opcional)
 */
const protect = (allowedRoles = []) => (req, res, next) => {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ ok: false, error: "No autorizado | Sesión no encontrada" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Inyectamos el usuario verificado en el request
    req.user = decoded;

    // Si hay roles definidos, verificar si el usuario tiene uno de ellos
    if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.roleName)) {
      console.warn(`[AUTH] Intento de acceso denegado para usuario ${decoded.email} con rol ${decoded.roleName}`);
      return res.status(403).json({ ok: false, error: "Prohibido | No tienes permisos suficientes" });
    }

    next();
  } catch (err) {
    console.error("[AUTH] Error al verificar token:", err.message);
    return res.status(401).json({ ok: false, error: "No autorizado | Sesión inválida o expirada" });
  }
};

module.exports = { protect };
