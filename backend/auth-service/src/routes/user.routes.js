const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Role = require('../models/Role'); // 🔹 Importar para registrar el modelo
const authMiddleware = require('../middlewares/auth.middleware');
const DOMPurify = require('isomorphic-dompurify');

// 🔹 Obtener todos los usuarios (protegido)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password'); // no enviar password
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 🔹 Obtener mi propio usuario según la sesión (protegido)
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

// 🔹 Actualizar usuario por ID (protegido)
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

// 🔹 Eliminar usuario por ID (protegido)
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
