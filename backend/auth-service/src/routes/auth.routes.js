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
    console.log('--- Login Debug ---');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'OK' : 'No definido');

    const email = DOMPurify.sanitize(req.body.email || '');
    const password = DOMPurify.sanitize(req.body.password || '');
    console.log('Credenciales recibidas:', { email, password: password ? '*****' : null });

    const user = await User.findOne({ email }).select('+password +tokens');
    if (!user) {
      console.log('Usuario no encontrado');
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log('Contraseña incorrecta');
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // 🆕 Generar nuevo token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role?.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

  console.log('Token generado:', token);

    // ➕ Agregar token al array
    user.tokens.push({ token });

    // 🧹 Mantener solo las últimas 10 sesiones activas
    if (user.tokens.length > 10) {
      user.tokens = user.tokens.slice(-10);
    }

    // 🕒 Actualizar la fecha de último inicio de sesión
    user.lastLogin = new Date();

    await user.save();

    // 🍪 Setear cookie HttpOnly
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 8 * 60 * 60 * 1000
    });

  console.log('Cookie establecida:', res.getHeader('Set-Cookie'));

    // ✅ Solo enviar el nombre del usuario
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
    // Remove current token from user's tokens array
    const user = await User.findById(req.user.id);
    if (user) {
      user.tokens = user.tokens.filter(t => t.token !== req.cookies.auth_token);
      await user.save();
    }

    // Clear authentication cookie
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
