// models/User.js
const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  deviceInfo: {
    ip: String,
    userAgent: String
  }
});

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
    select: false // No se envía por defecto al hacer .find()
  },

  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },

  tokens: [tokenSchema], // Tokens de sesión/autenticación

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

// Indexes opcionales para consultas rápidas
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
