const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const DOMPurify = require('isomorphic-dompurify');
const authMiddleware = require('../middlewares/auth.middleware')

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

// 🔹 Logout (cerrar sesión)
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Eliminar token actual del array de tokens del usuario
    const user = await User.findById(req.user.id);
    if (user) {
      user.tokens = user.tokens.filter(t => t.token !== req.cookies.auth_token);
      await user.save();
    }

    // Borrar cookie
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


// Endpoint para verificar sesión
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
