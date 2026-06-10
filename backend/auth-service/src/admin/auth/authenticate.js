/**
 * Función authenticate() para buildAuthenticatedRouter de AdminJS.
 * Recibe el JWT como `password` (lo envía /admin/sso). Solo acepta usuarios
 * con role.name === "root".
 */
const { verifyJwt } = require("../../utils/jwt");

const authenticate = async (email, password) => {
  if (email !== "sso" || !password) return null;
  try {
    const decoded = verifyJwt(password);
    if (decoded.roleName !== "root") return null;
    return { email: decoded.username, title: "Root" };
  } catch {
    return null;
  }
};

module.exports = { authenticate };
