/**
 * Configuración de la sesión propia de AdminJS.
 * Mantiene el comportamiento original: cookie httpOnly, secure en producción,
 * sameSite estricto en producción, maxAge 8h.
 */
const SESSION_KEY = "adminjs";

const resolveSessionSecret = () =>
  process.env.SESSION_SECRET || process.env.JWT_SECRET;

const buildSessionOpts = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    name:              SESSION_KEY,
    secret:            resolveSessionSecret(),
    resave:            false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure:   isProd,
      sameSite: isProd ? "strict" : "lax",
      maxAge:   8 * 60 * 60 * 1000,
    },
  };
};

module.exports = { SESSION_KEY, resolveSessionSecret, buildSessionOpts };
