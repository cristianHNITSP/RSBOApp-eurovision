/**
 * ag-grid-utils.js
 * Utilidades puras para el manejo de datos y formatos en AgGrid.
 */

import { to2 } from "@/composables/ag-grid/useAgGridBase";

/** Normaliza un número para usarlo en fields de columnas (ej: -0.25 -> -0_25) */
export const norm = (n) => String(to2(n)).replace(".", "_");

/** Revierte la normalización de un field de columna a número */
export const denorm = (s) => Number(String(s).replace("_", "."));

/** Obtiene ADD y Ojo desde un field tipo add_1_25_OD */
export function parseAddEyeFromField(field) {
  if (!field.startsWith("add_")) return null;
  const tail = field.slice(4);
  const parts = tail.split("_");
  const eye = parts.pop();
  const numStr = parts.join("_");
  const add = denorm(numStr);
  if (Number.isNaN(add)) return null;
  return { add, eye };
}

/** Obtiene CYL desde un field tipo cyl_1_25 */
export function parseCylFromField(field) {
  if (!field.startsWith("cyl_")) return null;
  return denorm(field.slice(4));
}

/** Formatea el header de CYL (siempre negativo) */
export const fmtCylHeader = (cDisp) => {
  const n = Number(cDisp);
  if (!Number.isFinite(n)) return "";
  return n === 0 ? "0.00" : `-${n.toFixed(2)}`;
};

/** Verifica si un número es múltiplo de 0.25 */
export const isQuarterStep = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return false;
  return Math.abs(n * 4 - Math.round(n * 4)) < 1e-6;
};

/** Genera una clave única para filas de progresivos */
export const getProgresivoRowKey = (bi, bd) => `${to2(bi)}|${to2(bd)}`;

/** Genera un Delay/Sleep */
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** Helper para raf */
export const raf = () => new Promise(r => typeof requestAnimationFrame === "function" ? requestAnimationFrame(r) : setTimeout(r, 0));
