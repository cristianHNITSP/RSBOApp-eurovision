const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const DOMPurify = require('isomorphic-dompurify');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @fileoverview Rutas de autenticación
 * Define los endpoints para login, logout y verificación de sesión. Utiliza
 * tokens JWT y cookies HttpOnly para gestionar sesiones.
 *
 * @module routes/auth
 */

/**
 * Endpoint de login
 * Autentica credenciales y crea una nueva sesión estableciendo una cookie
 * HttpOnly con el JWT.
 * 
 * @route POST /api/access/login
 * @param {Object} req.body
 * @param {string} req.body.email - Correo electrónico del usuario
 * @param {string} req.body.password - Contraseña del usuario
 * @returns {Object} Información básica del usuario y cookie de sesión
 * @throws {401} Si las credenciales son inválidas
 * @throws {500} Si ocurre un error interno
 */
router.post('/login', async (req, res) => {
  try {
    const email = DOMPurify.sanitize(req.body.email || '');
    const password = DOMPurify.sanitize(req.body.password || '');

    // Buscar usuario no borrado
    const user = await User.findOne({ email }).select('+password +tokens');
    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // 🆕 Generar nuevo token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role?.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // ➕ Agregar token al array
    user.tokens.push({ token });

    // 🧹 Mantener solo las últimas 10 sesiones activas
    if (user.tokens.length > 10) {
      user.tokens = user.tokens.slice(-10);
    }

    // 🕒 Actualizar último login
    user.lastLogin = new Date();

    // ✅ Marcar como activo solo si no tiene sesiones previas activas
    if (!user.isActive || user.tokens.length === 1) {
      user.isActive = true;
    }

    await user.save();

    // 🍪 Setear cookie HttpOnly
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 8 * 60 * 60 * 1000
    });

    res.json({
      name: DOMPurify.sanitize(user.name)
    });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Endpoint de logout
 * Termina la sesión actual y elimina el token de autenticación asociado.
 * 
 * @route POST /api/access/logout
 * @middleware authMiddleware - Verifica que el usuario esté autenticado
 * @returns {Object} Mensaje de éxito
 * @throws {500} Si ocurre un error interno
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const tokenFromCookie = req.cookies.auth_token;

    if (!tokenFromCookie) {
      return res.status(400).json({ error: 'No se encontró token de sesión' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Filtrar solo el token actual
    const initialTokensCount = user.tokens.length;
    user.tokens = user.tokens.filter(t => t.token !== tokenFromCookie);

    // Actualizar isActive si no quedan sesiones activas
    if (user.tokens.length === 0 && initialTokensCount > 0) {
      user.isActive = false;
    }

    await user.save();

    // Limpiar cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });

    res.json({ message: 'Sesión cerrada correctamente' });

  } catch (err) {
    console.error('Error en logout:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Endpoint de verificación de sesión
 * Comprueba si la sesión actual es válida y devuelve información del usuario.
 * 
 * @route GET /api/access/check-session
 * @middleware authMiddleware - Verifica que el usuario esté autenticado
 * @returns {Object} Estado de la sesión e información del usuario
 */
router.get('/check-session', authMiddleware, (req, res) => {
  console.log('--- check-session ---');
  console.log('Usuario en req.user:', req.user);

  res.json({
    message: 'Sesión válida',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  })
})


module.exports = router;
