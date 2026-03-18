// routes/auth.routes.js
/**
 * @fileoverview Rutas de autenticación
 */

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const authService = require('../services/auth.service');
const User = require('../models/User');
const DOMPurify = require('isomorphic-dompurify');

// POST /api/access/login
router.post('/login', async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const ip        = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
    const userAgent = req.headers['user-agent'] || null;
    const { token, user } = await authService.login({ email, password, ip, userAgent });

    // Setear cookie HttpOnly
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({
      name: DOMPurify.sanitize(user.name),
    });
  } catch (err) {
    console.error('Error en login:', err);

    const status = err.statusCode || 500;
    const message =
      status === 500 ? 'Error interno del servidor' : err.message || 'Error al iniciar sesión';

    res.status(status).json({ error: message });
  }
});

// POST /api/access/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const tokenFromCookie = req.cookies.auth_token;

    await authService.logout({
      userId: req.user.id,
      tokenFromCookie,
    });

    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });

    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error('Error en logout:', err);

    const status = err.statusCode || 500;
    const message =
      status === 500 ? 'Error interno del servidor' : err.message || 'Error al cerrar sesión';

    res.status(status).json({ error: message });
  }
});

// GET /api/access/check-session
router.get('/check-session', authMiddleware, async (req, res) => {
  try {
    const token = req.cookies?.auth_token;

    // Verificar que el usuario siga existiendo en BD y esté activo
    const user = await User.findById(req.user.id).select('+tokens +isActive +deletedAt');

    if (!user) {
      return res.status(401).json({ error: 'USER_NOT_FOUND', message: 'El usuario no existe. Inicia sesión nuevamente.' });
    }

    if (user.deletedAt) {
      return res.status(401).json({ error: 'USER_DELETED', message: 'La cuenta ha sido eliminada.' });
    }

    if (user.isActive === false) {
      return res.status(401).json({ error: 'USER_INACTIVE', message: 'La cuenta está desactivada.' });
    }

    // Verificar que el token no haya sido revocado (logout de otra sesión, borrado de DB, etc.)
    const tokenValid = user.tokens?.some((t) => t.token === token);

    // Actualizar lastUsedAt de la sesión actual (máx 1 vez cada 5 min para no saturar BD)
    if (tokenValid) {
      const tokenDoc = user.tokens.find((t) => t.token === token);
      if (tokenDoc) {
        const fiveMin = 5 * 60 * 1000;
        if (!tokenDoc.lastUsedAt || Date.now() - new Date(tokenDoc.lastUsedAt).getTime() > fiveMin) {
          tokenDoc.lastUsedAt = new Date();
          user.save().catch(() => {});
        }
      }
    }

    if (!tokenValid) {
      return res.status(401).json({ error: 'TOKEN_REVOKED', message: 'La sesión ha expirado o fue revocada. Inicia sesión nuevamente.' });
    }

    const payload = authService.buildSessionPayload(req.user);
    res.json(payload);
  } catch (err) {
    console.error('Error en check-session:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
