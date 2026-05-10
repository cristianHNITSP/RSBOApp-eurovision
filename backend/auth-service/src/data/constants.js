/**
 * @fileoverview Constantes globales del servicio de autenticación.
 * Centraliza configuraciones misceláneas que pueden requerir escalabilidad.
 */

const APP_CONSTANTS = {
  // CORS Origins para desarrollo
  DEV_ORIGINS: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.0.87:5173",
  ],
  
  // Configuración de Branding
  BRANDING: {
    companyName: "RSBO Admin",
    softwareBrothers: false,
    logo: false,
  },

  // Rutas del sistema
  PATHS: {
    ADMIN: '/admin',
    HEALTH: '/health',
  }
};

module.exports = {
  APP_CONSTANTS
};
