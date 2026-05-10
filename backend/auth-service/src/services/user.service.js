// services/user.service.js
const config = require("../config");
const User = require("../models/User");
const Role = require("../models/Role");
const DOMPurify = require("isomorphic-dompurify");
const bcrypt = require("bcrypt");

function toInt(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : def;
}

function sanitizeStr(v) {
  return DOMPurify.sanitize(String(v || ""), { ALLOWED_TAGS: [] }).trim();
}

const USERNAME_REGEX = /^[a-z0-9_.-]{3,32}$/;
function isValidUsername(username) {
  return USERNAME_REGEX.test(String(username || "").toLowerCase());
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
    username: user.username,
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
  const status = String(query.status || "all"); 
  const sortBy = String(query.sortBy || "name");
  const sortDir = String(query.sortDir || "asc") === "desc" ? -1 : 1;

  const rootRole = await Role.findOne({ name: 'root' }).select('_id').lean();
  const rootRoleId = rootRole?._id ?? null;

  const filter = {};

  if (status === "trash") filter.deletedAt = { $ne: null };
  else filter.deletedAt = null;

  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;

  if (role) {
    if (rootRoleId && String(role) === String(rootRoleId)) {
      return { items: [], total: 0, page, limit, stats: { totalUsers: 0, activeUsers: 0, trashUsers: 0 } };
    }
    filter.role = role;
  } else if (rootRoleId) {
    filter.role = { $ne: rootRoleId };
  }

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { username: rx }];
  }

  const allowedSort = new Set(["name", "username", "createdAt", "lastLogin"]);
  const sort = allowedSort.has(sortBy) ? { [sortBy]: sortDir } : { name: 1 };

  const rootExclude = rootRoleId ? { role: { $ne: rootRoleId } } : {};

  const [items, total, totalUsers, activeUsers, trashUsers] = await Promise.all([
    User.find(filter)
      .select("-password -tokens")
      .populate("role", "name description permissions")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .collation({ locale: 'es', strength: 1 })
      .lean(),
    User.countDocuments(filter).collation({ locale: 'es', strength: 1 }),
    User.countDocuments({ deletedAt: null, ...rootExclude }),
    User.countDocuments({ deletedAt: null, isActive: true, ...rootExclude }),
    User.countDocuments({ deletedAt: { $ne: null }, ...rootExclude }),
  ]);

  return {
    items: (items || []).map(u => ({ ...u, roleDoc: u.role, tokensCount: 0 })),
    total,
    page,
    limit,
    stats: { totalUsers, activeUsers, trashUsers },
  };
}

async function createUser(data) {
  const name = sanitizeStr(data.name);
  const username = sanitizeStr(data.username).toLowerCase();
  const passwordPlain = String(data.password || "");

  if (name.length < 2) throw makeError(400, "El nombre debe tener al menos 2 caracteres");
  if (!isValidUsername(username)) throw makeError(400, "Nombre de usuario inválido");
  if (passwordPlain.length < 6) throw makeError(400, "Contraseña inválida (mínimo 6 caracteres)");

  const role = await Role.findById(data.role);
  if (!role || role.name === 'root') throw makeError(400, "Rol inválido");

  const exists = await User.findOne({ username }).select("_id").lean();
  if (exists) throw makeError(400, "Ese nombre de usuario ya está registrado");

  // ✅ NO hasheamos aquí. El modelo User.js lo hace con Pepper en el pre-save hook.
  const user = await User.create({
    name,
    username,
    password: passwordPlain,
    role: role._id,
    isActive: data.isActive !== undefined ? !!data.isActive : true,
    profile: { phone: sanitizeStr(data.phone), bio: sanitizeStr(data.bio), avatar: sanitizeStr(data.avatar) },
    deletedAt: null,
  });

  return User.findById(user._id).populate("role").select("-password").lean();
}

async function updateUser(userId, data) {
  const user = await User.findById(userId).populate('role', 'name');
  if (!user || user.deletedAt) throw makeError(404, "Usuario no encontrado");
  if (user.role?.name === 'root') throw makeError(403, "No se puede modificar al root");

  if (data.role) {
    const role = await Role.findById(data.role);
    if (!role || role.name === 'root') throw makeError(400, "Rol inválido");
    user.role = role._id;
  }

  if (data.name !== undefined) user.name = sanitizeStr(data.name);
  if (data.username !== undefined) {
    const newU = sanitizeStr(data.username).toLowerCase();
    if (newU !== user.username) {
      const exists = await User.findOne({ username: newU, _id: { $ne: user._id } }).select("_id").lean();
      if (exists) throw makeError(400, "Ese nombre de usuario ya está registrado");
      user.username = newU;
    }
  }

  if (data.isActive !== undefined) user.isActive = user.deletedAt ? false : !!data.isActive;

  if (data.phone !== undefined) user.profile.phone = sanitizeStr(data.phone);
  if (data.bio !== undefined) user.profile.bio = sanitizeStr(data.bio);
  if (data.avatar !== undefined) user.profile.avatar = sanitizeStr(data.avatar);

  await user.save();
  return User.findById(user._id).populate("role").select("-password").lean();
}

async function updatePassword(userId, password) {
  if (!password) throw makeError(400, "Contraseña requerida");
  const user = await User.findById(userId);
  if (!user || user.deletedAt) throw makeError(404, "Usuario no encontrado");

  // ✅ Solo asignamos. El hook pre-save hasheará con Pepper.
  user.password = String(password);
  await user.save();
  return { message: "Contraseña actualizada correctamente" };
}

async function deleteUser(userId) {
  const user = await User.findById(userId).select("+tokens").populate('role', 'name');
  if (!user) return { deleted: false, alreadyDeleted: true };
  if (user.role?.name === 'root') throw makeError(403, "No se puede eliminar al root");
  if (user.deletedAt) return { deleted: false, alreadyDeleted: true };
  if (user.tokens?.length > 0) throw makeError(409, "Usuario con sesiones activas");

  await user.softDelete();
  return { deleted: true };
}

async function restoreUser(userId) {
  const user = await User.findById(userId);
  if (!user || !user.deletedAt) return { ok: true, alreadyActive: true };
  await user.restore();
  return { ok: true, restored: true };
}

async function getMeSessions(userId, currentToken) {
  const user = await User.findById(userId).select('+tokens');
  if (!user) throw makeError(404, "No encontrado");
  user.pruneExpiredTokens();
  await user.save();

  return (user.tokens || []).map(t => ({
    id: String(t._id),
    isCurrent: t.token === currentToken,
    createdAt: t.createdAt,
    expiresAt: t.expiresAt,
    lastUsedAt: t.lastUsedAt,
    deviceInfo: t.deviceInfo
  })).sort((a,b) => (a.isCurrent ? -1 : 1));
}

async function changePasswordSelf(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password +tokens');
  if (!user) throw makeError(404, "No encontrado");

  // ✅ Comparar con Pepper
  const valid = await bcrypt.compare(String(currentPassword || '') + config.secrets.pepper, user.password);
  if (!valid) throw makeError(401, "Contraseña actual incorrecta");

  if (String(newPassword || '').length < 8) throw makeError(400, "Mínimo 8 caracteres");

  user.password = String(newPassword);
  user.tokens = [];
  await user.save();
  return { success: true };
}

function makeError(status, msg) {
  const e = new Error(msg);
  e.statusCode = status;
  return e;
}

module.exports = {
  getRoles, getMe, listUsers, createUser, updateUser, updatePassword,
  deleteUser, restoreUser, getMeSessions, changePasswordSelf
};
