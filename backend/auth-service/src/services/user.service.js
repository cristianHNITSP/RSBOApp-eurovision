// services/user.service.js
const User = require("../models/User");
const Role = require("../models/Role");
const DOMPurify = require("isomorphic-dompurify");
const bcrypt = require("bcrypt");

function toInt(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : def;
}

function sanitizeStr(v) {
  return DOMPurify.sanitize(String(v || "")).trim();
}

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getRoles() {
  return Role.find({ name: { $ne: 'root' } }).lean();
}

async function getMe(userId) {
  const user = await User.findById(userId).populate("role").lean();
  if (!user) {
    const error = new Error("Usuario no encontrado");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
      ? {
          id: user.role._id,
          name: user.role.name,
          description: user.role.description,
          permissions: user.role.permissions,
        }
      : null,
    phone: user.profile?.phone || "",
    avatar: user.profile?.avatar || "",
    bio: user.profile?.bio || "",
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
}

async function listUsers(query) {
  const page = toInt(query.page, 1);
  const limit = Math.min(50, toInt(query.limit, 10));
  const skip = (page - 1) * limit;

  const q = String(query.q || "").trim();
  const role = query.role && query.role !== "all" ? String(query.role) : null;
  const status = String(query.status || "all"); // all|active|inactive|trash
  const sortBy = String(query.sortBy || "name");
  const sortDir = String(query.sortDir || "asc") === "desc" ? -1 : 1;

  // El usuario root es una entidad aparte — nunca aparece en gestión
  const rootRole = await Role.findOne({ name: 'root' }).select('_id').lean();
  const rootRoleId = rootRole?._id ?? null;

  const filter = {};

  if (status === "trash") filter.deletedAt = { $ne: null };
  else filter.deletedAt = null;

  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;

  if (role) {
    // Si piden filtrar por root, devolver vacío
    if (rootRoleId && String(role) === String(rootRoleId)) {
      return { items: [], total: 0, page, limit, stats: { totalUsers: 0, activeUsers: 0, trashUsers: 0 } };
    }
    filter.role = role;
  } else if (rootRoleId) {
    filter.role = { $ne: rootRoleId };
  }

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const allowedSort = new Set(["name", "email", "createdAt", "lastLogin"]);
  const sort = allowedSort.has(sortBy) ? { [sortBy]: sortDir } : { name: 1 };

  const rootExclude = rootRoleId ? { role: { $ne: rootRoleId } } : {};

  const [items, total, totalUsers, activeUsers, trashUsers] = await Promise.all([
    User.find(filter)
      .select("-password -tokens")
      .populate("role", "name description permissions")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
    User.countDocuments({ deletedAt: null, ...rootExclude }),
    User.countDocuments({ deletedAt: null, isActive: true, ...rootExclude }),
    User.countDocuments({ deletedAt: { $ne: null }, ...rootExclude }),
  ]);

  const normalized = (items || []).map((u) => ({
    ...u,
    roleDoc: u.role || null,
    tokensCount: 0,
  }));

  return {
    items: normalized,
    total,
    page,
    limit,
    stats: { totalUsers, activeUsers, trashUsers },
  };
}

async function createUser(data) {
  const name = sanitizeStr(data.name);
  const email = sanitizeStr(data.email).toLowerCase();
  const phone = sanitizeStr(data.phone);
  const bio = sanitizeStr(data.bio);
  const avatar = sanitizeStr(data.avatar);
  const roleId = data.role;
  const isActive = data.isActive !== undefined ? !!data.isActive : true;

  const passwordPlain = String(data.password || "");
  if (passwordPlain.length < 6) {
    const error = new Error("Contraseña inválida (mínimo 6 caracteres)");
    error.statusCode = 400;
    throw error;
  }

  const role = await Role.findById(roleId);
  if (!role) {
    const error = new Error("Rol inválido");
    error.statusCode = 400;
    throw error;
  }
  if (role.name === 'root') {
    const error = new Error("No se puede crear un usuario con rol root");
    error.statusCode = 403;
    throw error;
  }

  const exists = await User.findOne({ email }).select("_id").lean();
  if (exists) {
    const error = new Error("Ese correo ya está registrado");
    error.statusCode = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash(passwordPlain, salt);

  const user = await User.create({
    name,
    email,
    password,
    role: role._id,
    isActive,
    profile: { phone, bio, avatar },
    deletedAt: null,
  });

  const out = await User.findById(user._id).populate("role").select("-password").lean();
  return out;
}

async function updateUser(userId, data) {
  const name = data.name !== undefined ? sanitizeStr(data.name) : undefined;
  const email = data.email !== undefined ? sanitizeStr(data.email).toLowerCase() : undefined;
  const phone = data.phone !== undefined ? sanitizeStr(data.phone) : undefined;
  const bio = data.bio !== undefined ? sanitizeStr(data.bio) : undefined;
  const avatar = data.avatar !== undefined ? sanitizeStr(data.avatar) : undefined;
  const roleId = data.role;
  const isActive = data.isActive !== undefined ? !!data.isActive : undefined;

  const user = await User.findById(userId).populate('role', 'name');
  if (!user || user.deletedAt) {
    const error = new Error("Usuario no encontrado");
    error.statusCode = 404;
    throw error;
  }

  // El usuario root es intocable desde el panel de gestión
  if (user.role?.name === 'root') {
    const error = new Error("El usuario root no puede ser modificado desde este panel");
    error.statusCode = 403;
    throw error;
  }

  if (roleId) {
    const role = await Role.findById(roleId);
    if (!role) {
      const error = new Error("Rol inválido");
      error.statusCode = 400;
      throw error;
    }
    if (role.name === 'root') {
      const error = new Error("No se puede asignar el rol root");
      error.statusCode = 403;
      throw error;
    }
    user.role = role._id;
  }

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;

  // ✅ si está en papelera, jamás permitir activo
  if (isActive !== undefined) user.isActive = user.deletedAt ? false : isActive;

  user.profile = user.profile || {};
  if (phone !== undefined) user.profile.phone = phone;
  if (bio !== undefined) user.profile.bio = bio;
  if (avatar !== undefined) user.profile.avatar = avatar;

  await user.save();
  return User.findById(user._id).populate("role").select("-password").lean();
}

async function updatePassword(userId, password) {
  if (!password) {
    const error = new Error("Contraseña requerida");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user || user.deletedAt) {
    const error = new Error("Usuario no encontrado");
    error.statusCode = 404;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  await user.save();

  return { message: "Contraseña actualizada correctamente" };
}

/**
 * ✅ DELETE IDEMPOTENTE
 * - Si NO existe → 200 { ok:true, alreadyDeleted:true }
 * - Si YA está en papelera → 200 { ok:true, alreadyDeleted:true }
 * - Si tiene tokens → 409
 * - Si borra → 200 { ok:true, deleted:true }
 */
async function deleteUser(userId) {
  // ✅ Trae tokens aunque sea select:false
  const user = await User.findById(userId).select("+tokens").populate('role', 'name');

  if (!user) {
    return { deleted: false, alreadyDeleted: true, reason: "NOT_FOUND" };
  }
  if (user.role?.name === 'root') {
    const error = new Error("El usuario root no puede eliminarse");
    error.statusCode = 403;
    throw error;
  }
  if (user.deletedAt) {
    return { deleted: false, alreadyDeleted: true, deletedAt: user.deletedAt };
  }

  if (Array.isArray(user.tokens) && user.tokens.length > 0) {
    const error = new Error("No se puede eliminar al usuario mientras tenga sesiones activas");
    error.statusCode = 409;
    throw error;
  }

  await user.softDelete();
  return { deleted: true, alreadyDeleted: false };
}

/**
 * ✅ RESTORE IDEMPOTENTE
 * - Si NO existe → 200 { ok:true, alreadyActive:true }
 * - Si ya está activo → 200 { ok:true, alreadyActive:true }
 * - Si restaura → 200 { ok:true, restored:true }
 */
async function restoreUser(userId) {
  const user = await User.findById(userId);

  if (!user) {
    return { ok: true, alreadyActive: true, reason: "NOT_FOUND" };
  }

  if (!user.deletedAt) {
    return { ok: true, alreadyActive: true };
  }

  await user.restore();
  return { ok: true, restored: true };
}

async function getMeSessions(userId, currentToken) {
  // Traer documento completo (no lean) para poder hacer prune + save
  const user = await User.findById(userId).select('+tokens');
  if (!user) { const e = new Error('Usuario no encontrado'); e.statusCode = 404; throw e; }

  // Limpiar sesiones expiradas antes de devolver la lista
  const pruned = user.pruneExpiredTokens();
  if (pruned > 0) await user.save();

  return (user.tokens || [])
    .map((t) => ({
      id:         String(t._id),
      isCurrent:  t.token === currentToken,
      createdAt:  t.createdAt,
      expiresAt:  t.expiresAt,
      lastUsedAt: t.lastUsedAt,
      deviceInfo: {
        ip:         t.deviceInfo?.ip || null,
        deviceName: t.deviceInfo?.deviceName || 'Dispositivo desconocido',
        os:         t.deviceInfo?.os || null,
        browser:    t.deviceInfo?.browser || null,
      },
    }))
    .sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return new Date(b.lastUsedAt || b.createdAt || 0) - new Date(a.lastUsedAt || a.createdAt || 0);
    });
}

async function revokeSession(userId, sessionId) {
  const user = await User.findById(userId).select('+tokens');
  if (!user) { const e = new Error('Usuario no encontrado'); e.statusCode = 404; throw e; }
  const before = user.tokens.length;
  user.tokens = user.tokens.filter((t) => String(t._id) !== sessionId);
  if (user.tokens.length === before) { const e = new Error('Sesión no encontrada'); e.statusCode = 404; throw e; }
  await user.save();
  return { revoked: 1 };
}

async function revokeOtherSessions(userId, currentToken) {
  const user = await User.findById(userId).select('+tokens');
  if (!user) { const e = new Error('Usuario no encontrado'); e.statusCode = 404; throw e; }
  const before = user.tokens.length;
  user.tokens = user.tokens.filter((t) => t.token === currentToken);
  await user.save();
  return { revoked: before - user.tokens.length };
}

async function changePasswordSelf(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password +tokens');
  if (!user) { const e = new Error('Usuario no encontrado'); e.statusCode = 404; throw e; }
  const valid = await bcrypt.compare(String(currentPassword || ''), user.password);
  if (!valid) { const e = new Error('Contraseña actual incorrecta'); e.statusCode = 401; throw e; }
  if (String(newPassword || '').length < 8) {
    const e = new Error('La nueva contraseña debe tener al menos 8 caracteres'); e.statusCode = 400; throw e;
  }
  user.password = await bcrypt.hash(String(newPassword), 12);
  user.tokens   = []; // Invalidar todas las sesiones
  await user.save();
  return { success: true, sessionsRevoked: true };
}

module.exports = {
  getRoles,
  getMe,
  listUsers,
  createUser,
  updateUser,
  updatePassword,
  deleteUser,
  restoreUser,
  getMeSessions,
  revokeSession,
  revokeOtherSessions,
  changePasswordSelf,
};
