/**
 * @fileoverview Rutas de gestión de usuarios
 * Define los endpoints para operaciones CRUD sobre usuarios y gestión de perfil.
 * Todas las rutas están protegidas por el middleware de autenticación.
 * 
 * @module routes/user
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Role = require('../models/Role');
const authMiddleware = require('../middlewares/auth.middleware');
const DOMPurify = require('isomorphic-dompurify');
const bcrypt = require('bcrypt');
/**
 * Endpoint: obtener todos los usuarios
 * Recupera la lista completa de usuarios (excluyendo contraseñas)
 * 
 * @route GET /api/users
 * @middleware authMiddleware - Verifica que el usuario esté autenticado
 * @returns {Array<User>} Lista de usuarios
 * @throws {500} Si ocurre un error interno
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password') // no enviar password
      .populate('role', 'name'); // opcional: incluir el nombre del rol

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


/**
 * Endpoint: obtener perfil propio
 * Devuelve el perfil completo del usuario autenticado, incluyendo información
 * del rol (si está poblado).
 * 
 * @route GET /api/users/me
 * @middleware authMiddleware - Verifica que el usuario esté autenticado
 * @returns {Object} Perfil del usuario con información del rol
 * @throws {404} Si el usuario no existe
 * @throws {500} Si ocurre un error interno
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('role');

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
        ? {
          id: user.role._id,
          name: user.role.name,
          description: user.role.description,
          permissions: user.role.permissions
        }
        : null,
      phone: user.profile?.phone || '',
      avatar: user.profile?.avatar || '',
      bio: user.profile?.bio || '',
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    });

  } catch (err) {
    console.error('Error al obtener mi usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Obtener todos los roles
 * @route GET /api/roles
 * @middleware authMiddleware
 * @returns {Array<Role>}
 */
router.get('/roles', authMiddleware, async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (err) {
    console.error('Error al obtener roles:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Endpoint: actualizar usuario
 * Actualiza la información de un usuario por su ID.
 * 
 * @route PUT /api/users/:id
 * @middleware authMiddleware - Verifica que el usuario esté autenticado
 * @param {string} id - ID del usuario
 * @param {Object} req.body - Datos para actualizar
 * @param {string} req.body.name - Nuevo nombre del usuario
 * @param {string} req.body.email - Nuevo correo electrónico
 * @returns {Object} Usuario actualizado
 * @throws {404} Si el usuario no existe
 * @throws {400} Si la actualización falla
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const name = DOMPurify.sanitize(req.body.name || '');
    const email = DOMPurify.sanitize(req.body.email || '');
    const phone = DOMPurify.sanitize(req.body.phone || '');
    const bio = DOMPurify.sanitize(req.body.bio || '');
    const avatar = DOMPurify.sanitize(req.body.avatar || '');
    const roleId = req.body.role; // Role enviado desde el frontend

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Actualizar role si se envía
    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) return res.status(400).json({ error: 'Rol inválido' });
      user.role = role._id;
    }

    // Actualizar campos de perfil
    user.name = name;
    user.email = email;
    user.profile = user.profile || {};
    user.profile.phone = phone;
    user.profile.bio = bio;
    user.profile.avatar = avatar;

    await user.save();

    // Devolver usuario actualizado con role poblado
    const updatedUser = await User.findById(user._id).populate('role').select('-password');
    res.json(updatedUser);

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Error al actualizar usuario' });
  }
});


router.put('/:id/password', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Contraseña requerida' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Hashear manualmente
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Error al actualizar la contraseña' });
  }
});


/**
 * Endpoint: eliminar usuario
 * Elimina permanentemente un usuario del sistema.
 * 
 * @route DELETE /api/users/:id
 * @middleware authMiddleware - Verifica que el usuario esté autenticado
 * @param {string} id - ID del usuario a eliminar
 * @returns {Object} Mensaje de éxito
 * @throws {404} Si el usuario no existe
 * @throws {400} Si la eliminación falla
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.deletedAt) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // ❌ Verificar si el usuario tiene sesión activa
    if (user.tokens && user.tokens.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar al usuario mientras tenga sesiones activas' 
      });
    }

    await user.softDelete();

    res.json({ message: 'Usuario eliminado correctamente (borrado lógico)' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Error al eliminar usuario' });
  }
});



module.exports = router;
