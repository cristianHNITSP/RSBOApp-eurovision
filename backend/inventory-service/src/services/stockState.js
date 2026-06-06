"use strict";

/**
 * @fileoverview Fuente ÚNICA de verdad de los estados de stock (inventory-service).
 *
 * 4 estados para clasificar/colorear; SOLO 2 generan notificación (pesteo):
 *   - CRITICO  "Stock crítico"      → notifica (insistente)
 *   - BAJO     "Advertencia de stock"→ notifica (espaciada)
 *   - NEUTRO   "Stock aceptable"    → solo visual (pre-aviso, aún bien)
 *   - BUENO    "Stock bueno"        → solo visual (sin preocupaciones)
 *
 * Usado por matrices/CL (clasifican por distancia) y por óptica (umbrales planos).
 */

const LEVELS = {
  CRITICO: "CRITICO",
  BAJO: "BAJO",
  NEUTRO: "NEUTRO",
  BUENO: "BUENO",
};

const LABELS = {
  CRITICO: "Stock crítico",
  BAJO: "Advertencia de stock",
  NEUTRO: "Stock aceptable",
  BUENO: "Stock bueno",
};

// Variante CSS/semántica reutilizable por el front (mismo vocabulario).
const CSS = {
  CRITICO: "danger",
  BAJO: "warn",
  NEUTRO: "info",
  BUENO: "ok",
};

// Niveles que GENERAN notificación. Cambiar aquí es la única palanca.
const NOTIFYING_LEVELS = ["CRITICO", "BAJO"];

/**
 * Clasificación por umbrales absolutos (óptica: 1 producto = 1 stock).
 * @param {number} stock
 * @param {{critical:number, low:number, acceptable:number}} thresholds
 * @returns {"CRITICO"|"BAJO"|"NEUTRO"|"BUENO"}
 */
function classifyFlat(stock, thresholds = {}) {
  const n = Number(stock || 0);
  const { critical = 3, low = 8, acceptable = 15 } = thresholds;
  if (n <= critical) return LEVELS.CRITICO;
  if (n <= low) return LEVELS.BAJO;
  if (n <= acceptable) return LEVELS.NEUTRO;
  return LEVELS.BUENO;
}

/** Urgencia [0..100] para flujo plano (óptica). Alimenta la cadencia del consumer. */
function urgencyFlat(level) {
  if (level === LEVELS.CRITICO) return 90;
  if (level === LEVELS.BAJO) return 50;
  return 0;
}

const notifies = (level) => NOTIFYING_LEVELS.includes(level);
const labelOf = (level) => LABELS[level] || level;
const cssOf = (level) => CSS[level] || "info";

module.exports = {
  LEVELS,
  LABELS,
  CSS,
  NOTIFYING_LEVELS,
  classifyFlat,
  urgencyFlat,
  notifies,
  labelOf,
  cssOf,
};
