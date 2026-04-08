// src/utils/formatters.js
// Helpers de formato de fecha compartidos entre composables y servicios.

export function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/** Alias corto (mismo formato que fmtDate) — usado en useLaboratorioApi como fmtShort */
export const fmtShort = fmtDate;

export function fmtDateShort(v) {
  if (!v) return "DD/MM/AAAA";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "DD/MM/AAAA";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}
