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

function parseDeviceName(ua) {
  const s = String(ua || '');
  let browser = 'Otro';
  let os      = 'Otro';
  if (s.includes('Firefox/'))                               browser = 'Firefox';
  else if (s.includes('Edg/') || s.includes('Edge/'))      browser = 'Edge';
  else if (s.includes('OPR/') || s.includes('Opera/'))     browser = 'Opera';
  else if (s.includes('SamsungBrowser/'))                   browser = 'Samsung Browser';
  else if (s.includes('Chrome/'))                           browser = 'Chrome';
  else if (s.includes('Safari/') && !s.includes('Chrome')) browser = 'Safari';

  if      (s.includes('Windows NT'))   os = 'Windows';
  else if (s.includes('Mac OS X'))     os = 'macOS';
  else if (s.includes('Android'))      os = 'Android';
  else if (s.includes('iPhone'))       os = 'iPhone';
  else if (s.includes('iPad'))         os = 'iPad';
  else if (s.includes('Linux'))        os = 'Linux';

  return { browser, os, deviceName: `${browser} en ${os}` };
}

async function login({ email, password, ip, userAgent }) {
  const cleanEmail = sanitizeEmail(email);
  const cleanPassword = normalizePassword(password);

  // Trae flags necesarios para bloquear login + password/tokens para validar y sesión
  const user = await User.findOne({ email: cleanEmail })
    .select("+password +tokens +isActive +deletedAt +role +email +name")
    .populate("role", "name");

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
    {
      id: user._id,
      email: user.email,
      role: user.role?._id?.toString() ?? user.role?.toString(),
      roleName: user.role?.name ?? null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  // Manejo de sesiones
  const { browser, os, deviceName } = parseDeviceName(userAgent);
  user.tokens.push({
    token,
    expiresAt:  new Date(Date.now() + 8 * 3600 * 1000),
    lastUsedAt: new Date(),
    deviceInfo: { ip: ip || null, userAgent: userAgent || null, deviceName, os, browser },
  });

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

  user.tokens = (user.tokens || []).filter((t) => t.token !== tokenFromCookie);

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
  parseDeviceName,
};
