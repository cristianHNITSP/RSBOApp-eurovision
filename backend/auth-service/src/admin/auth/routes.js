/**
 * Endpoints SSO y logout de AdminJS.
 * Deben registrarse en Express ANTES del router AdminJS para tener prioridad.
 */
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const { SESSION_KEY } = require("./session");

const escapeHtml = (s) => String(s)
  .replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

/**
 * GET /admin/sso
 * Verifica el JWT en cookie auth_token y auto-postea a /admin/login para que
 * AdminJS abra su propia sesión.
 */
const ssoHandler = (req, res) => {
  const token = req.cookies?.auth_token;
  if (!token) return res.redirect("/");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.roleName !== "root") return res.redirect("/");
    const safeToken = escapeHtml(token);
    return res.send(
      `<!doctype html><html><body>` +
      `<form id="f" method="POST" action="/admin/login">` +
      `<input name="email" value="sso" type="hidden">` +
      `<input name="password" value="${safeToken}" type="hidden">` +
      `</form><script>document.getElementById('f').submit();</script>` +
      `</body></html>`
    );
  } catch {
    return res.redirect("/");
  }
};

/**
 * GET /admin/login
 * El formulario de login nativo de AdminJS no debe ser visible —
 * cualquier GET se redirige al landing. POST sí lo usa /admin/sso.
 */
const loginGuardHandler = (_req, res) => res.redirect("/");

/**
 * GET /admin/logout
 * Revoca el JWT en BD, limpia ambas cookies y redirige al landing.
 */
const logoutHandler = async (req, res) => {
  const token = req.cookies?.auth_token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      await User.findByIdAndUpdate(decoded.id, { $pull: { tokens: { token } } });
    } catch { /* token ya inválido */ }
  }
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? "strict" : "lax",
  });
  res.clearCookie(SESSION_KEY);
  return res.redirect("/");
};

const mountSsoRoutes = (app) => {
  app.get("/admin/sso",    ssoHandler);
  app.get("/admin/login",  loginGuardHandler);
  app.get("/admin/logout", logoutHandler);
};

module.exports = { mountSsoRoutes };
