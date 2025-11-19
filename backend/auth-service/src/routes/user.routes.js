// routes/user.routes.js
/**
 * @fileoverview Rutas de gestión de usuarios
 */

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const { requirePermissions } = require('../middlewares/permissions.middleware');
const userService = require('../services/user.service');

// GET /api/users
// Solo quien tenga manage_users puede ver la lista completa
router.get(
  '/',
  authMiddleware,
  requirePermissions(['manage_users']),
  async (req, res) => {
    try {
      const users = await userService.getAllUsers();
      res.json(users);
    } catch (err) {
      console.error('Error al obtener usuarios:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

// GET /api/users/me
// Solo requiere estar autenticado (cualquier rol)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const me = await userService.getMe(req.user.id);
    res.json(me);
  } catch (err) {
    console.error('Error al obtener mi usuario:', err);
    const status = err.statusCode || 500;
    const message = status === 500 ? 'Error interno del servidor' : err.message;
    res.status(status).json({ error: message });
  }
});

// GET /api/users/roles
// Solo admin o quien tenga manage_users
router.get(
  '/roles',
  authMiddleware,
  requirePermissions(['manage_users']),
  async (req, res) => {
    try {
      const roles = await userService.getRoles();
      res.json(roles);
    } catch (err) {
      console.error('Error al obtener roles:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

// PUT /api/users/:id
// Todos los usuarios pueden editar su usuario
router.put(
  '/:id',
  authMiddleware,
  (req, res, next) => {
    // Si el usuario autenticado está editando su propio perfil, dejamos pasar
    if (req.user && String(req.user.id) === String(req.params.id)) {
      return next();
    }
    // Si no, exigimos manage_users
    return canManageOrSelf(req, res, next);
  },
  async (req, res) => {
    try {
      const updated = await userService.updateUser(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      const status = err.statusCode || 400;
      const message = status === 500 ? 'Error interno del servidor' : err.message;
      res.status(status).json({ error: message });
    }
  }
);

// PUT /api/users/:id/password
// El usuario puede cambiar su propia contraseña
// Admin (manage_users) puede cambiar la de otros (por ejemplo, reset)
router.put(
  '/:id/password',
  authMiddleware,
  (req, res, next) => {
    if (req.user && String(req.user.id) === String(req.params.id)) {
      return next();
    }
    return canManageOrSelf(req, res, next);
  },
  async (req, res) => {
    try {
      const result = await userService.updatePassword(
        req.params.id,
        req.body.password
      );
      res.json(result);
    } catch (err) {
      console.error('Error al actualizar contraseña:', err);
      const status = err.statusCode || 400;
      const message = status === 500 ? 'Error interno del servidor' : err.message;
      res.status(status).json({ error: message });
    }
  }
);

// DELETE /api/users/:id
// Solo manage_users puede eliminar usuarios
router.delete(
  '/:id',
  authMiddleware,
  requirePermissions(['manage_users']),
  async (req, res) => {
    try {
      const result = await userService.deleteUser(req.params.id);
      res.json(result);
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      const status = err.statusCode || 400;
      const message = status === 500 ? 'Error interno del servidor' : err.message;
      res.status(status).json({ error: message });
    }
  }
);

module.exports = router;
