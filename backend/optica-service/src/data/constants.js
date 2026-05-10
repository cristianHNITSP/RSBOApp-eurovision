/**
 * @fileoverview Constantes y Enums del servicio de Óptica.
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
  ARMAZON_MATERIAL: ["Acetato", "Metal", "TR-90", "Titanio", "Combinado", "Madera", "Otro"],
  ARMAZON_TIPO: ["Completo", "Al aire", "Semi-al-aire", "Deportivo", "Infantil", "Otro"],
  GENERO: ["Hombre", "Mujer", "Unisex", "Infantil"]
};

module.exports = {
  APP_CONSTANTS,
  ENUMS
};
