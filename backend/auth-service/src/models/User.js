/**
 * @fileoverview Definición del modelo User
 * Define el esquema y modelo de MongoDB para los usuarios del sistema.
 * Incluye campos para autenticación, perfil y gestión de sesiones.
 * 
 * @module models/User
 */

const mongoose = require('mongoose');

/**
 * Definición del esquema Token
 * @typedef {Object} TokenSchema
 * @property {string} token - Token de autenticación
 * @property {Date} createdAt - Fecha de creación del token
 * @property {Date} expiresAt - Fecha de expiración del token
 * @property {Object} deviceInfo - Información del dispositivo asociada al token
 */
const tokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  deviceInfo: {
    ip: String,
    userAgent: String
  }
});

/**
 * Definición del esquema User
 * @typedef {Object} UserSchema
 * @property {string} name - Nombre completo del usuario
 * @property {string} email - Correo electrónico único del usuario
 * @property {string} password - Contraseña hasheada (no se devuelve en consultas)
 * @property {ObjectId} role - Referencia al rol del usuario
 * @property {TokenSchema[]} tokens - Array de tokens de autenticación del usuario
 * @property {boolean} isActive - Estado de la cuenta
 * @property {Date} lastLogin - Fecha del último inicio de sesión exitoso
 * @property {Object} profile - Información de perfil del usuario
 * @property {Date} createdAt - Fecha de creación de la cuenta
 * 
 * kali es mierda
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false // Not included in query results by default
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  tokens: [tokenSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profile: {
    avatar: String,
    bio: String,
    phone: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Optimización: índice para consultas por email
userSchema.index({ email: 1 });

/**
 * Modelo User
 * @type {import('mongoose').Model}
 */
module.exports = mongoose.model('User', userSchema);
