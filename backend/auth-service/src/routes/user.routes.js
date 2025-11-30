const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/permissions.middleware");
const userService = require("../services/user.service");

const canManageOrSelf = (req, res, next) => {
  if (req.user && String(req.user.id) === String(req.params.id)) return next();
  return requirePermissions(["manage_users"])(req, res, next);
};

router.get("/", authMiddleware, requirePermissions(["manage_users"]), async (req, res) => {
  try {
    const data = await userService.listUsers(req.query);
    res.json(data);
  } catch (err) {
    console.error("Error al listar usuarios:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/", authMiddleware, requirePermissions(["manage_users"]), async (req, res) => {
  try {
    const created = await userService.createUser(req.body);
    res.json(created);
  } catch (err) {
    console.error("Error al crear usuario:", err);
    const status = err.statusCode || 400;
    res.status(status).json({ error: err.message || "Error" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const me = await userService.getMe(req.user.id);
    res.json(me);
  } catch (err) {
    console.error("Error al obtener mi usuario:", err);
    const status = err.statusCode || 500;
    res.status(status).json({ error: status === 500 ? "Error interno del servidor" : err.message });
  }
});

router.get("/roles", authMiddleware, requirePermissions(["manage_users"]), async (req, res) => {
  try {
    const roles = await userService.getRoles();
    res.json(roles);
  } catch (err) {
    console.error("Error al obtener roles:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.put("/:id", authMiddleware, canManageOrSelf, async (req, res) => {
  try {
    const updated = await userService.updateUser(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    const status = err.statusCode || 400;
    res.status(status).json({ error: err.message || "Error" });
  }
});

router.put("/:id/password", authMiddleware, canManageOrSelf, async (req, res) => {
  try {
    const result = await userService.updatePassword(req.params.id, req.body.password);
    res.json(result);
  } catch (err) {
    console.error("Error al actualizar contraseña:", err);
    const status = err.statusCode || 400;
    res.status(status).json({ error: err.message || "Error" });
  }
});

router.put("/:id/restore", authMiddleware, requirePermissions(["manage_users"]), async (req, res) => {
  try {
    const result = await userService.restoreUser(req.params.id);
    res.json(result);
  } catch (err) {
    console.error("Error al restaurar usuario:", err);
    const status = err.statusCode || 400;
    res.status(status).json({ error: err.message || "Error" });
  }
});

router.delete("/:id", authMiddleware, requirePermissions(["manage_users"]), async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id);
    res.json(result);
  } catch (err) {
    console.error("Error al eliminar usuario:", err);
    const status = err.statusCode || 400;
    res.status(status).json({ error: err.message || "Error" });
  }
});

module.exports = router;
