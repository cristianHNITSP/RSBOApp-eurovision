// services/auth.service.js
const config = require("../config");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const DOMPurify = require("isomorphic-dompurify");
const User = require("../models/User");

function makeError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function sanitizeUsername(username) {
  return DOMPurify.sanitize(String(username || ""), { ALLOWED_TAGS: [] }).trim().toLowerCase();
}

function sanitizeHeader(val) {
  return String(val || "").replace(/[^\w\s\.\,\-\/\(\)\;\[\]\:]/g, "").substring(0, 500);
}

function normalizePassword(password) {
  return String(password || "");
}

const SESSION_TTL_HOURS = 8; 
const SESSION_RENEW_THRESHOLD_HOURS = 6;
const SESSION_TTL_MS = SESSION_TTL_HOURS * 3600 * 1000;
const RENEW_THRESHOLD_MS = SESSION_RENEW_THRESHOLD_HOURS * 3600 * 1000;
const JWT_EXPIRES_IN = `${SESSION_TTL_HOURS}h`;

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

  if      (s.includes('Android'))      os = 'Android';
  else if (s.includes('iPhone'))       os = 'iPhone';
  else if (s.includes('iPad'))         os = 'iPad';
  else if (s.includes('Windows NT'))   os = 'Windows';
  else if (s.includes('Mac OS X'))     os = 'macOS';
  else if (s.includes('Linux'))        os = 'Linux';

  return { browser, os, deviceName: `${browser} en ${os}` };
}

async function login({ username, password, ip, userAgent }) {
  const cleanUsername = sanitizeUsername(username);
  const cleanPassword = normalizePassword(password);

  const user = await User.findOne({ username: cleanUsername })
    .select("+password +tokens +isActive +deletedAt +role +username +name")
    .populate("role", "name");

  if (!user) throw makeError(401, "Usuario o contraseña incorrectos");

  if (user.deletedAt) {
    throw makeError(403, "Tu cuenta está en papelera. Pide al administrador que la restaure.");
  }

  if (user.isActive === false) {
    throw makeError(403, "Tu cuenta está desactivada. Contacta al administrador.");
  }

  // ✅ Comparar con Pepper
  const pepper = config.secrets.pepper;
  const valid = await bcrypt.compare(cleanPassword + pepper, user.password);
  if (!valid) throw makeError(401, "Usuario o contraseña incorrectos");

  const token = jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role?._id?.toString() ?? user.role?.toString(),
      roleName: user.role?.name ?? null,
    },
    config.secrets.jwt,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const now = Date.now();
  user.tokens = (user.tokens || []).filter(
    (t) => t.expiresAt && new Date(t.expiresAt).getTime() > now
  );

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
      username: decodedUser.username,
      role:     decodedUser.role,
      roleName: decodedUser.roleName ?? null,
    },
  };
}

async function renewTokenIfNeeded(userId, currentToken) {
  let decoded;
  try {
    decoded = jwt.verify(currentToken, config.secrets.jwt);
  } catch {
    return { renewed: false };
  }

  const remainingMs = (decoded.exp * 1000) - Date.now();
  if (remainingMs > RENEW_THRESHOLD_MS) {
    return { renewed: false };
  }

  const newToken = jwt.sign(
    { id: decoded.id, username: decoded.username, role: decoded.role, roleName: decoded.roleName },
    config.secrets.jwt,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const user = await User.findById(userId).select("+tokens");
  if (!user) return { renewed: false };

  const oldTokenDoc = user.tokens.find((t) => t.token === currentToken);

  // ✅ Operación atómica para evitar race conditions
  // 1. Agregamos el nuevo token
  // 2. Quitamos expirados
  const now = new Date();
  await User.updateOne(
    { _id: userId },
    {
      $push: {
        tokens: {
          token: newToken,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          lastUsedAt: now,
          deviceInfo: oldTokenDoc?.deviceInfo || {},
        },
      },
      $pull: {
        tokens: { expiresAt: { $lte: now } }
      }
    }
  );

  return { renewed: true, newToken };
}

function getSessionInfo(currentToken) {
  if (!currentToken) return null;
  let decoded;
  try {
    decoded = jwt.verify(currentToken, config.secrets.jwt);
  } catch {
    return null;
  }
  const expMs = decoded.exp * 1000;
  return {
    expiresAt: new Date(expMs).toISOString(),
    renewsAt: new Date(expMs - RENEW_THRESHOLD_MS).toISOString(),
    ttlSeconds: SESSION_TTL_HOURS * 3600,
    renewThresholdSeconds: SESSION_RENEW_THRESHOLD_HOURS * 3600,
  };
}

module.exports = {
  login,
  logout,
  buildSessionPayload,
  parseDeviceName,
  renewTokenIfNeeded,
  getSessionInfo,
  SESSION_TTL_MS,
  SESSION_TTL_HOURS,
  SESSION_RENEW_THRESHOLD_HOURS,
};
