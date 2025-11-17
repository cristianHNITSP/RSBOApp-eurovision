// routes/auth.routes.js
/**
 * @fileoverview Rutas de autenticación
 */

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const authService = require('../services/auth.service');
const DOMPurify = require('isomorphic-dompurify');

// POST /api/access/login
router.post('/login', async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const { token, user } = await authService.login({ email, password });

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
router.get('/check-session', authMiddleware, (req, res) => {
  console.log('--- check-session ---');
  console.log('Usuario en req.user:', req.user);

  const payload = authService.buildSessionPayload(req.user);
  res.json(payload);
});

module.exports = router;
