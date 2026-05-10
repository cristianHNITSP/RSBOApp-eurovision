/**
 * Función authenticate() para buildAuthenticatedRouter de AdminJS.
 * Recibe el JWT como `password` (lo envía /admin/sso). Solo acepta usuarios
 * con role.name === "root".
 */
const jwt = require("jsonwebtoken");

const authenticate = async (email, password) => {
  if (email !== "sso" || !password) return null;
  try {
    const decoded = jwt.verify(password, process.env.JWT_SECRET);
    if (decoded.roleName !== "root") return null;
    return { email: decoded.username, title: "Root" };
  } catch {
    return null;
  }
};

module.exports = { authenticate };
