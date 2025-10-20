// models/Role.js
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    enum: ['administrador', 'user'] // Opcional, o puedes dejarlo abierto
  },
  description: {
    type: String
  },
  permissions: [{
    type: String
    // Ejemplo: 'create_user', 'delete_user', etc.
  }]
});

module.exports = mongoose.model('Role', roleSchema);
