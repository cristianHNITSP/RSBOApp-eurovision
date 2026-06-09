// src/data/search/rangeLabels.js
// Data + formateadores de rangos dióptricos para los resultados de búsqueda.

export const RANGE_LABELS = { sph: "Esf", cyl: "Cil", add: "Add", base: "Base", axis: "Eje" };

/** Valor dióptrico con signo (ej. -3 → "-3.00", 2 → "+2.00"). */
export function fmtDiop(n) {
  if (n == null) return "?";
  const s = Number(n).toFixed(2);
  return n > 0 ? `+${s}` : s;
}

/** Eje sin signo (ej. 90 → "90°"). */
export function fmtAxis(n) {
  return n == null ? "?" : `${Number(n).toFixed(0)}°`;
}

/**
 * Convierte el objeto `ranges` de una planilla en chips legibles.
 * Ej: ["Esf: -16.00…+8.00", "Cil: -6.00…0.00"]
 */
export function formatRangeChips(ranges) {
  if (!ranges) return [];
  return Object.entries(RANGE_LABELS)
    .filter(([key]) => ranges[key] != null)
    .map(([key, label]) => {
      const { start, end } = ranges[key];
      if (key === "axis") return `${label}: ${fmtAxis(start)}–${fmtAxis(end)}`;
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      return `${label}: ${fmtDiop(lo)}…${fmtDiop(hi)}`;
    });
}

/** ¿El chip de rango contiene el valor numérico buscado? (para resaltarlo) */
export function chipContains(chip, val) {
  if (val == null || Number.isNaN(val)) return false;
  const nums = chip.match(/[-+]?\d+\.?\d*/g);
  if (!nums || nums.length < 2) return false;
  const [lo, hi] = nums.map(Number).sort((a, b) => a - b);
  return val >= lo && val <= hi;
}
