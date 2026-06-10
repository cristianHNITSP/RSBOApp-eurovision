// routes/auth.routes.js
/**
 * @fileoverview Rutas de autenticación
 */

const express = require('express');
const router = express.Router();

const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middlewares/auth.middleware');
const { generateCsrfToken, setCsrfTokenOnResponse } = require('../middlewares/csrf.middleware');
const { body, runValidation } = require('../validators/_helpers');
const authService = require('../services/auth.service');
const User = require('../models/User');
const DOMPurify = require('isomorphic-dompurify');

// Rate-limit específico anti fuerza bruta (defensa en profundidad: el gateway
// también limita, pero esto protege si se accede directo al servicio).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta más tarde.' },
});

const validateLogin = [
  body('username').exists({ checkNull: true }).withMessage('username requerido').bail()
    .isString().trim().isLength({ min: 1, max: 64 }).withMessage('username inválido'),
  body('password').exists({ checkNull: true }).withMessage('password requerido').bail()
    .isString().isLength({ min: 1, max: 128 }).withMessage('password inválido'),
  runValidation,
];

// POST /api/access/login
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;

    const ip        = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
    const userAgent = req.headers['user-agent'] || null;
    const { token, user } = await authService.login({ username, password, ip, userAgent });

    // Setear cookie HttpOnly — 7 h sliding session
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: authService.SESSION_TTL_MS,
    });

    // Emitir CSRF token
    setCsrfTokenOnResponse(res, generateCsrfToken());

    res.json({
      name: DOMPurify.sanitize(user.name),
      roleName: user.role?.name ?? null,
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
    res.clearCookie('csrf_token', {
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

    // Verificar que el token no haya sido revocado
    const tokenValid = user.tokens?.some((t) => t.token === token);

    if (!tokenValid) {
      return res.status(401).json({ error: 'TOKEN_REVOKED', message: 'La sesión ha expirado o fue revocada. Inicia sesión nuevamente.' });
    }

    // Actualizar lastUsedAt (máx 1 vez cada 5 min) de forma ATÓMICA
    const tokenDoc = user.tokens.find((t) => t.token === token);
    if (tokenDoc) {
      const fiveMin = 5 * 60 * 1000;
      if (!tokenDoc.lastUsedAt || Date.now() - new Date(tokenDoc.lastUsedAt).getTime() > fiveMin) {
        // Usamos updateOne para evitar race conditions con el array de tokens
        User.updateOne(
          { _id: user._id, 'tokens.token': token },
          { $set: { 'tokens.$.lastUsedAt': new Date() } }
        ).catch((e) => console.warn('check-session: fallo al actualizar lastUsedAt:', e.message));
      }
    }

    // ── Sliding session: renovar token si le queda poco tiempo ──
    const { renewed, newToken } = await authService.renewTokenIfNeeded(req.user.id, token);
    if (renewed && newToken) {
      res.cookie('auth_token', newToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge:   authService.SESSION_TTL_MS,
      });
    }

    // Refrescar CSRF token en cada check-session
    setCsrfTokenOnResponse(res, generateCsrfToken());

    const payload = authService.buildSessionPayload(req.user);
    payload.renewed = renewed; // el frontend puede saberlo
    res.json(payload);
  } catch (err) {
    console.error('Error en check-session:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/access/session-info
// Endpoint ligero usado por el watcher del frontend para conocer la
// expiración actual sin disparar la renovación (eso lo hace check-session).
router.get('/session-info', authMiddleware, (req, res) => {
  try {
    const token = req.cookies?.auth_token;
    const info = authService.getSessionInfo(token);
    if (!info) {
      return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Sesión inválida' });
    }
    res.set('Cache-Control', 'no-store');
    return res.json(info);
  } catch (err) {
    console.error('Error en session-info:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
