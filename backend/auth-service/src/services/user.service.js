// services/user.service.js
const User = require('../models/User');
const Role = require('../models/Role');
const DOMPurify = require('isomorphic-dompurify');
const bcrypt = require('bcrypt');

async function getAllUsers() {
  const users = await User.find()
    .select('-password')
    .populate('role', 'name');
  return users;
}

async function getMe(userId) {
  const user = await User.findById(userId).populate('role');
  if (!user) {
    const error = new Error('Usuario no encontrado');
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
    phone: user.profile?.phone || '',
    avatar: user.profile?.avatar || '',
    bio: user.profile?.bio || '',
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
}

async function getRoles() {
  const roles = await Role.find();
  return roles;
}

async function updateUser(userId, data) {
  const name = DOMPurify.sanitize(data.name || '');
  const email = DOMPurify.sanitize(data.email || '');
  const phone = DOMPurify.sanitize(data.phone || '');
  const bio = DOMPurify.sanitize(data.bio || '');
  const avatar = DOMPurify.sanitize(data.avatar || '');
  const roleId = data.role;

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('Usuario no encontrado');
    error.statusCode = 404;
    throw error;
  }

  if (roleId) {
    const role = await Role.findById(roleId);
    if (!role) {
      const error = new Error('Rol inválido');
      error.statusCode = 400;
      throw error;
    }
    user.role = role._id;
  }

  user.name = name;
  user.email = email;
  user.profile = user.profile || {};
  user.profile.phone = phone;
  user.profile.bio = bio;
  user.profile.avatar = avatar;

  await user.save();

  const updatedUser = await User.findById(user._id).populate('role').select('-password');
  return updatedUser;
}

async function updatePassword(userId, password) {
  if (!password) {
    const error = new Error('Contraseña requerida');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('Usuario no encontrado');
    error.statusCode = 404;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);

  await user.save();

  return { message: 'Contraseña actualizada correctamente' };
}

async function deleteUser(userId) {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) {
    const error = new Error('Usuario no encontrado');
    error.statusCode = 404;
    throw error;
  }

  if (user.tokens && user.tokens.length > 0) {
    const error = new Error('No se puede eliminar al usuario mientras tenga sesiones activas');
    error.statusCode = 400;
    throw error;
  }

  await user.softDelete();

  return { message: 'Usuario eliminado correctamente (borrado lógico)' };
}

module.exports = {
  getAllUsers,
  getMe,
  getRoles,
  updateUser,
  updatePassword,
  deleteUser,
};
