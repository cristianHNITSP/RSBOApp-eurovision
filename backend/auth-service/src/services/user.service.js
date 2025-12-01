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
  return Role.find();
}

async function getMe(userId) {
  const user = await User.findById(userId).populate("role");
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

  const filter = {};

  if (status === "trash") filter.deletedAt = { $ne: null };
  else filter.deletedAt = null;

  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;

  if (role) filter.role = role;

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const allowedSort = new Set(["name", "email", "createdAt", "lastLogin"]);
  const sort = allowedSort.has(sortBy) ? { [sortBy]: sortDir } : { name: 1 };

  const [items, total, totalUsers, activeUsers, trashUsers] = await Promise.all([
    User.find(filter)
      .select("-password -tokens")
      .populate("role", "name description permissions")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
    User.countDocuments({ deletedAt: null }),
    User.countDocuments({ deletedAt: null, isActive: true }),
    User.countDocuments({ deletedAt: { $ne: null } }),
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

  const exists = await User.findOne({ email }).select("_id");
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

  const out = await User.findById(user._id).populate("role").select("-password");
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

  const user = await User.findById(userId);
  if (!user || user.deletedAt) {
    const error = new Error("Usuario no encontrado");
    error.statusCode = 404;
    throw error;
  }

  if (roleId) {
    const role = await Role.findById(roleId);
    if (!role) {
      const error = new Error("Rol inválido");
      error.statusCode = 400;
      throw error;
    }
    user.role = role._id;
  }

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;

  // ✅ regla dura extra: si por alguna razón tuviera deletedAt, jamás permitir isActive=true
  if (isActive !== undefined) user.isActive = user.deletedAt ? false : isActive;

  user.profile = user.profile || {};
  if (phone !== undefined) user.profile.phone = phone;
  if (bio !== undefined) user.profile.bio = bio;
  if (avatar !== undefined) user.profile.avatar = avatar;

  await user.save();
  return User.findById(user._id).populate("role").select("-password");
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

async function deleteUser(userId) {
  // ✅ importante: si tokens está select:false, así sí lo traes
  const user = await User.findById(userId).select("+tokens");
  if (!user || user.deletedAt) {
    const error = new Error("Usuario no encontrado");
    error.statusCode = 404;
    throw error;
  }

  if (user.tokens && user.tokens.length > 0) {
    const error = new Error("No se puede eliminar al usuario mientras tenga sesiones activas");
    error.statusCode = 400;
    throw error;
  }

  // ✅ tu schema ya hace: deletedAt=Date y isActive=false
  await user.softDelete();
  return { message: "Usuario enviado a papelera" };
}

async function restoreUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("Usuario no encontrado");
    error.statusCode = 404;
    throw error;
  }

  if (!user.deletedAt) return { message: "El usuario ya está activo" };

  // ✅ tu schema ya hace: deletedAt=null y isActive=true
  await user.restore();
  return { message: "Usuario restaurado correctamente" };
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
};
