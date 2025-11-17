// services/auth.service.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const DOMPurify = require('isomorphic-dompurify');
const User = require('../models/User');

async function login({ email, password }) {
  const cleanEmail = DOMPurify.sanitize(email || '');
  const cleanPassword = DOMPurify.sanitize(password || '');

  const user = await User.findOne({ email: cleanEmail }).select('+password +tokens');
  if (!user) {
    const error = new Error('Usuario o contraseña incorrectos');
    error.statusCode = 401;
    throw error;
  }

  const valid = await bcrypt.compare(cleanPassword, user.password);
  if (!valid) {
    const error = new Error('Usuario o contraseña incorrectos');
    error.statusCode = 401;
    throw error;
  }

  // Generar token
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role?.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  // Manejo de sesiones
  user.tokens.push({ token });

  if (user.tokens.length > 10) {
    user.tokens = user.tokens.slice(-10);
  }

  user.lastLogin = new Date();

  if (!user.isActive || user.tokens.length === 1) {
    user.isActive = true;
  }

  await user.save();

  return {
    token,
    user,
  };
}

async function logout({ userId, tokenFromCookie }) {
  if (!tokenFromCookie) {
    const error = new Error('No se encontró token de sesión');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('Usuario no encontrado');
    error.statusCode = 404;
    throw error;
  }

  const initialTokensCount = user.tokens.length;
  user.tokens = user.tokens.filter(t => t.token !== tokenFromCookie);

  if (user.tokens.length === 0 && initialTokensCount > 0) {
    user.isActive = false;
  }

  await user.save();

  return { success: true };
}

function buildSessionPayload(decodedUser) {
  return {
    message: 'Sesión válida',
    user: {
      id: decodedUser.id,
      email: decodedUser.email,
      role: decodedUser.role,
    },
  };
}

module.exports = {
  login,
  logout,
  buildSessionPayload,
};
