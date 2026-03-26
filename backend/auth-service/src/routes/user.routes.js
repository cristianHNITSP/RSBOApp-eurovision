const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const { csrfProtection } = require("../middlewares/csrf.middleware");
const { requirePermissions } = require("../middlewares/permissions.middleware");
const userService = require("../services/user.service");

const canManageOrSelf = (req, res, next) => {
  if (req.user && String(req.user.id) === String(req.params.id)) return next();
  return requirePermissions(["manage_users"])(req, res, next);
};

router.get("/", authMiddleware, requirePermissions(["manage_users"]), async (req, res) => {
  try {
    const data = await userService.listUsers(req.query);
    return res.json(data);
  } catch (err) {
    console.error("Error al listar usuarios:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/", authMiddleware, csrfProtection, requirePermissions(["manage_users"]), async (req, res) => {
  try {
    const created = await userService.createUser(req.body);
    return res.json(created);
  } catch (err) {
    console.error("Error al crear usuario:", err);
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message || "Error" });
  }
});

// ── Seguridad: sesiones activas ────────────────────────────────────────────

router.get('/me/sessions', authMiddleware, async (req, res) => {
  try {
    const currentToken = req.cookies?.auth_token;
    const sessions = await userService.getMeSessions(req.user.id, currentToken);
    res.set('Cache-Control', 'no-store');
    return res.json(sessions);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message || 'Error interno' });
  }
});

router.delete('/me/sessions/others', authMiddleware, csrfProtection, async (req, res) => {
  try {
    const currentToken = req.cookies?.auth_token;
    const result = await userService.revokeOtherSessions(req.user.id, currentToken);
    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message || 'Error interno' });
  }
});

router.delete('/me/sessions/:sessionId', authMiddleware, csrfProtection, async (req, res) => {
  try {
    const result = await userService.revokeSession(req.user.id, req.params.sessionId);
    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/me/password', authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword y newPassword son requeridos' });
    }
    const result = await userService.changePasswordSelf(req.user.id, { currentPassword, newPassword });
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message || 'Error interno' });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const me = await userService.getMe(req.user.id);
    return res.json(me);
  } catch (err) {
    console.error("Error al obtener mi usuario:", err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: status === 500 ? "Error interno del servidor" : err.message });
  }
});

router.get("/roles", authMiddleware, requirePermissions(["manage_users"]), async (req, res) => {
  try {
    const roles = await userService.getRoles();
    return res.json(roles);
  } catch (err) {
    console.error("Error al obtener roles:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.put("/:id", authMiddleware, csrfProtection, canManageOrSelf, async (req, res) => {
  try {
    const updated = await userService.updateUser(req.params.id, req.body);
    return res.json(updated);
  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message || "Error" });
  }
});

router.put("/:id/password", authMiddleware, csrfProtection, canManageOrSelf, async (req, res) => {
  try {
    const result = await userService.updatePassword(req.params.id, req.body.password);
    return res.json(result);
  } catch (err) {
    console.error("Error al actualizar contraseña:", err);
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message || "Error" });
  }
});

router.put("/:id/restore", authMiddleware, csrfProtection, requirePermissions(["manage_users"]), async (req, res) => {
  try {
    // ✅ restore idempotente: siempre 200 si ya estaba restaurado o no existe
    const result = await userService.restoreUser(req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Error al restaurar usuario:", err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || "Error interno del servidor" });
  }
});

// DELETE (soft delete, idempotente)
router.delete("/:id", authMiddleware, csrfProtection, requirePermissions(["manage_users"]), async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id);
    // ✅ SIEMPRE JSON (evita "respuesta vacía")
    return res.status(200).json({ ok: true, action: "SOFT_DELETE", ...result });
  } catch (err) {
    console.error("Error al eliminar usuario:", err);
    return sendError(res, err, 500);
  }
});


module.exports = router;
