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
    const users = await User.find().select('-password'); // no enviar password
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

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Error al actualizar usuario' });
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
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
