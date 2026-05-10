/**
 * @fileoverview Constantes y Enums del servicio de Inventario.
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
  TIPO_MATRIZ: ["BASE", "SPH_CYL", "SPH_ADD", "BASE_ADD"]
};

module.exports = {
  APP_CONSTANTS,
  ENUMS
};
