/**
 * @fileoverview Constantes y Enums del servicio de Back Orders.
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
  STATUS: ["SOLICITADO", "PEDIDO_PROVEEDOR", "RECIBIDO", "LISTO_ENTREGA", "ENTREGADO", "CANCELADO"],
  
  PAGO_METODOS: ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"],
  
  PAGO_TIPOS: ["ANTICIPO", "ABONO", "PAGO_COMPLETO", "PAGO_FINAL", "REEMBOLSO"],
  
  TIPO_MATRIZ: ["BASE", "SPH_CYL", "SPH_ADD", "BASE_ADD"],
  
  EYE_SIDE: ["OD", "OI", "AMBOS", null]
};

module.exports = {
  APP_CONSTANTS,
  ENUMS
};
