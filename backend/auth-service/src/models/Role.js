/**
 * @fileoverview Definición del modelo Role
 * Define el esquema y modelo de MongoDB para los roles de usuario en el sistema.
 * Se utiliza para controlar permisos y acceso por rol (RBAC).
 * 
 * @module models/Role
 */

const mongoose = require('mongoose');

/**
 * Definición del esquema Role
 * @typedef {Object} RoleSchema
 * @property {string} name - Nombre del rol (ej.: 'administrador', 'moderador', 'user')
 * @property {string} description - Descripción y propósito del rol
 * @property {string[]} permissions - Array de identificadores de permisos
 */
const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    enum: ['administrador', 'moderador', 'laboratorio',],
    description: 'Nombre del rol, restringido a valores predefinidos'
  },
  description: {
    type: String,
    description: 'Descripción detallada del rol y sus responsabilidades'
  },
  permissions: [{
    type: String,
    description: 'Array de identificadores de permiso (ej.: create_user, delete_user)'
  }]
});

/**
 * Role Model
 * @type {import("mongoose").Model}
 */
module.exports = mongoose.model('Role', roleSchema);
