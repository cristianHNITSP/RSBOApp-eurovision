"use strict";

/**
 * Umbrales de stock por nivel de distancia al neutro.
 * Sincronizados con stockAlert.service.js → TIERS.
 *
 * distancia = |SPH| + |CYL|  (o solo |BASE| para matrices simples)
 *
 * El frontend expone LOW_STOCK_THRESHOLD como el umbral más conservador
 * (ítems más cercanos al neutro, los de mayor rotación).
 */
const STOCK_ALERT_TIERS = [
  { maxDist: 1.00, critical: 3, low: 6,  neutral: 10 },
  { maxDist: 3.00, critical: 2, low: 4,  neutral: 7  },
  { maxDist: 5.00, critical: 1, low: 2,  neutral: 4  },
  { maxDist: Infinity, critical: 0, low: 1, neutral: 2 },
];

/**
 * Umbral único para colorear celdas en el frontend.
 * Usa el tier más conservador (ítems neutros, alta rotación).
 * Mantenlo sincronizado con TIERS[0].low de stockAlert.service.js.
 */
const LOW_STOCK_THRESHOLD_FRONTEND = STOCK_ALERT_TIERS[0].low; // 6

module.exports = { STOCK_ALERT_TIERS, LOW_STOCK_THRESHOLD_FRONTEND };
