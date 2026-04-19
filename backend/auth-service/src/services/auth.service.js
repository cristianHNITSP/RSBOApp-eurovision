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
  return DOMPurify.sanitize(String(email || ""), { ALLOWED_TAGS: [] }).trim().toLowerCase();
}

function sanitizeHeader(val) {
  // Limpieza agresiva para cabeceras de red (IP, User-Agent, etc)
  return String(val || "").replace(/[^\w\s\.\,\-\/\(\)\;\[\]\:]/g, "").substring(0, 500);
}

/**
 * IMPORTANTE:
 * - NO sanitices password con DOMPurify (puede alterarlo).
 * - Solo conviértelo a string.
 */
function normalizePassword(password) {
  return String(password || "");
}

const SESSION_TTL_MS = 7 * 3600 * 1000;       // 7 horas
const RENEW_THRESHOLD_MS = 5 * 3600 * 1000;   // renovar si quedan < 5 h

function parseDeviceName(ua) {
  const s = String(ua || '');
  let browser = 'Otro';
  let os      = 'Otro';

  // 1. Browser Detection (Orden de prioridad específico)
  if (s.includes('Firefox/'))                               browser = 'Firefox';
  else if (s.includes('Edg/') || s.includes('Edge/'))      browser = 'Edge';
  else if (s.includes('OPR/') || s.includes('Opera/'))     browser = 'Opera';
  else if (s.includes('SamsungBrowser/'))                   browser = 'Samsung Browser';
  else if (s.includes('Chrome/'))                           browser = 'Chrome';
  else if (s.includes('Safari/') && !s.includes('Chrome')) browser = 'Safari';

  // 2. OS Detection (De lo más específico a lo más general)
  if      (s.includes('Android'))      os = 'Android';
  else if (s.includes('iPhone'))       os = 'iPhone';
  else if (s.includes('iPad'))         os = 'iPad';
  else if (s.includes('Windows NT'))   os = 'Windows';
  else if (s.includes('Mac OS X'))     os = 'macOS';
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

  // Generar token — 7 h de vida (sliding: se renueva con actividad)
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role?._id?.toString() ?? user.role?.toString(),
      roleName: user.role?.name ?? null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7h" }
  );

  // Limpiar sesiones expiradas antes de agregar la nueva
  const now = Date.now();
  user.tokens = (user.tokens || []).filter(
    (t) => t.expiresAt && new Date(t.expiresAt).getTime() > now
  );

  // Manejo de sesiones
  const cleanIp = sanitizeHeader(ip);
  const cleanUA = sanitizeHeader(userAgent);
  const { browser, os, deviceName } = parseDeviceName(cleanUA);

  user.tokens.push({
    token,
    expiresAt:  new Date(now + SESSION_TTL_MS),
    lastUsedAt: new Date(),
    deviceInfo: { ip: cleanIp, userAgent: cleanUA, deviceName, os, browser },
  });

  if (user.tokens.length > 10) {
    user.tokens = user.tokens.slice(-10);
  }

  user.lastLogin = new Date();
  await user.save();

  return { token, user, sessionTtlMs: SESSION_TTL_MS };
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
      id:       decodedUser.id,
      email:    decodedUser.email,
      role:     decodedUser.role,
      roleName: decodedUser.roleName ?? null,
    },
  };
}

/**
 * Renueva el JWT si el token actual está próximo a expirar.
 * Devuelve { renewed, newToken } — renewed=false si no se necesitó renovar.
 */
async function renewTokenIfNeeded(userId, currentToken) {
  let decoded;
  try {
    decoded = jwt.verify(currentToken, process.env.JWT_SECRET);
  } catch {
    return { renewed: false };
  }

  const remainingMs = (decoded.exp * 1000) - Date.now();
  if (remainingMs > RENEW_THRESHOLD_MS) {
    return { renewed: false }; // todavía tiene bastante tiempo
  }

  // Emitir nuevo token con 7 h frescas
  const newToken = jwt.sign(
    { id: decoded.id, email: decoded.email, role: decoded.role, roleName: decoded.roleName },
    process.env.JWT_SECRET,
    { expiresIn: "7h" }
  );

  const user = await User.findById(userId).select("+tokens");
  if (!user) return { renewed: false };

  // Reemplazar el token viejo por el nuevo
  const idx = user.tokens.findIndex((t) => t.token === currentToken);
  if (idx === -1) return { renewed: false };

  user.tokens[idx].token = newToken;
  user.tokens[idx].expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  user.tokens[idx].lastUsedAt = new Date();

  // Limpiar sesiones expiradas de paso
  const now = Date.now();
  user.tokens = user.tokens.filter(
    (t) => t.expiresAt && new Date(t.expiresAt).getTime() > now
  );

  await user.save();
  return { renewed: true, newToken };
}

module.exports = {
  login,
  logout,
  buildSessionPayload,
  parseDeviceName,
  renewTokenIfNeeded,
  SESSION_TTL_MS,
};
