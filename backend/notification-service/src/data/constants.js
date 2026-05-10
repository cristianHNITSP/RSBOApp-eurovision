/**
 * @fileoverview Constantes y Enums del servicio de Notificaciones.
 */

const APP_CONSTANTS = {
  DEV_ORIGINS: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.0.87:5173",
  ],
  PATHS: {
    HEALTH: '/health',
  }
};

const ENUMS = {
  VALID_ROLES: ['root', 'eurovision', 'supervisor', 'ventas', 'laboratorio'],
  
  TYPES: ['info', 'warning', 'danger', 'success', 'inventory_alert'],
  
  PRIORITIES: ['low', 'medium', 'high', 'critical']
};

module.exports = {
  APP_CONSTANTS,
  ENUMS
};
