/**
 * stockTiers.js — Clasificación de stock por distancia al neutro (front).
 *
 * ESPEJO de la lógica del backend:
 *   backend/inventory-service/src/services/stockAlert.service.js  (TIERS / classifyStock)
 *   backend/inventory-service/src/inventory/constants/stockAlerts.js
 *
 * Idea: cuanto más lejos del neutro (0) está la dioptría, más tolerable es
 * tener poco stock → los umbrales bajan por tier. Mantener sincronizado con el backend.
 */

export const STOCK_TIERS = [
  { maxDist: 1.00, critical: 3, low: 6, neutral: 10 },
  { maxDist: 3.00, critical: 2, low: 4, neutral: 7 },
  { maxDist: 5.00, critical: 1, low: 2, neutral: 4 },
  { maxDist: Infinity, critical: 0, low: 1, neutral: 2 },
];

export const getTier = (distance) =>
  STOCK_TIERS.find((t) => distance <= t.maxDist) || STOCK_TIERS[STOCK_TIERS.length - 1];

/** Estados: SIN_STOCK | CRITICO | BAJO | NEUTRO | BUENO */
export function classifyStock(existencias, distance) {
  const n = Number(existencias || 0);
  if (n <= 0) return "SIN_STOCK";
  const t = getTier(Number(distance) || 0);
  if (n <= t.critical) return "CRITICO";
  if (n <= t.low) return "BAJO";
  if (n <= t.neutral) return "NEUTRO";
  return "BUENO";
}

/** Estado → etiqueta + clase de color (las clases viven en AgGridSheet.css, con tokens) */
export const STOCK_BADGE = {
  SIN_STOCK: { label: "Sin stock", cls: "zero" },
  CRITICO:   { label: "Crítico", cls: "crit" },
  BAJO:      { label: "Stock bajo", cls: "low" },
  NEUTRO:    { label: "Aceptable", cls: "neutral" },
  BUENO:     { label: "Buen stock", cls: "good" },
};

export const stockBadge = (existencias, distance) =>
  STOCK_BADGE[classifyStock(existencias, distance)];
