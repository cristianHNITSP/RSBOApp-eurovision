/**
 * @fileoverview Definición del modelo Role
 * Define el esquema y modelo de MongoDB para los roles de usuario en el sistema.
 * Se utiliza para controlar permisos y acceso por rol (RBAC).
 *
 * Roles del sistema Eurovisión:
 *   root        — Administrador del sistema (acceso total)
 *   eurovision  — Encargado de la óptica (acceso alto, sin gestión del sistema)
 *   supervisor  — Supervisa operaciones e inventario
 *   ventas      — Personal de ventas y atención al cliente
 *   laboratorio — Técnico de taller y pulido de lentes
 *
 * @module models/Role
 */

const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    enum: ['root', 'eurovision', 'supervisor', 'ventas', 'laboratorio'],
    description: 'Nombre del rol, restringido a valores predefinidos'
  },
  description: {
    type: String,
    description: 'Descripción detallada del rol y sus responsabilidades'
  },
  permissions: [{
    type: String,
    description: 'Array de identificadores de permiso (ej.: manage_users, view_reports)'
  }]
});

/**
 * Role Model
 * @type {import("mongoose").Model}
 */
module.exports = mongoose.model('Role', roleSchema);
