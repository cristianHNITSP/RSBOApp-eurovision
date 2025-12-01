// services/auth.service.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const DOMPurify = require("isomorphic-dompurify");
const User = require("../models/User");

function makeError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function sanitizeEmail(email) {
  return DOMPurify.sanitize(String(email || "")).trim().toLowerCase();
}

/**
 * IMPORTANTE:
 * - NO sanitices password con DOMPurify (puede alterarlo).
 * - Solo conviértelo a string.
 */
function normalizePassword(password) {
  return String(password || "");
}

async function login({ email, password }) {
  const cleanEmail = sanitizeEmail(email);
  const cleanPassword = normalizePassword(password);

  // Trae flags necesarios para bloquear login + password/tokens para validar y sesión
  const user = await User.findOne({ email: cleanEmail }).select(
    "+password +tokens +isActive +deletedAt +role +email +name"
  );

  if (!user) throw makeError(401, "Usuario o contraseña incorrectos");

  // ✅ BLOQUEO POR PAPELERA
  if (user.deletedAt) {
    throw makeError(403, "Tu cuenta está en papelera. Pide al administrador que la restaure.");
  }

  // ✅ BLOQUEO POR INACTIVO
  if (user.isActive === false) {
    throw makeError(403, "Tu cuenta está desactivada. Contacta al administrador.");
  }

  const valid = await bcrypt.compare(cleanPassword, user.password);
  if (!valid) throw makeError(401, "Usuario o contraseña incorrectos");

  // Generar token
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role?.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  // Manejo de sesiones
  user.tokens.push({ token });

  if (user.tokens.length > 10) {
    user.tokens = user.tokens.slice(-10);
  }

  user.lastLogin = new Date();

  // 🚫 Antes tú reactivabas usuarios aquí:
  // if (!user.isActive || user.tokens.length === 1) user.isActive = true;
  // Eso es incorrecto si quieres que "trash/inactive" no pueda entrar.
  // Así que NO se toca isActive aquí.

  await user.save();

  // Devuelve user sin password (como ya estás haciendo)
  return { token, user };
}

async function logout({ userId, tokenFromCookie }) {
  if (!tokenFromCookie) throw makeError(400, "No se encontró token de sesión");

  const user = await User.findById(userId).select("+tokens +isActive +deletedAt");
  if (!user) throw makeError(404, "Usuario no encontrado");

  const initialTokensCount = user.tokens?.length || 0;
  user.tokens = (user.tokens || []).filter((t) => t.token !== tokenFromCookie);

  // Si ya no tiene tokens, puedes marcar inactivo (solo si NO está en papelera)
  if (user.tokens.length === 0 && initialTokensCount > 0) {
    // Si está en papelera, ya debe estar inactivo por regla de negocio
    if (!user.deletedAt) user.isActive = false;
  }

  await user.save();
  return { success: true };
}

function buildSessionPayload(decodedUser) {
  return {
    message: "Sesión válida",
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
