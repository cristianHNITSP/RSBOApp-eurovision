/**
 * rsbo-app/src/composables/tabsmanager/useDateHelpers.js
 * Utilidades de manejo de fechas "date-only" para evitar desfases de zona horaria.
 */

/** Caducidad por defecto: 24 meses (= 2 años) */
export const DEFAULT_EXPIRY_MONTHS = 24;

export const ISO_DATE_ONLY_RX = /^\d{4}-\d{2}-\d{2}$/;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtDateOnly = (v) => {
  if (!v) return "";
  if (typeof v === "string" && ISO_DATE_ONLY_RX.test(v.trim())) return v.trim();
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

export const addMonthsToISODate = (isoDate, months) => {
  if (!isoDate || !ISO_DATE_ONLY_RX.test(String(isoDate).trim())) return "";
  const [y, m, d] = String(isoDate).trim().split("-").map((n) => Number(n));
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = dt.getUTCDate();
  dt.setUTCMonth(dt.getUTCMonth() + Number(months || 0));
  if (dt.getUTCDate() < day) dt.setUTCDate(0);
  return dt.toISOString().slice(0, 10);
};

// create: "" -> undefined (no enviar)
// edit: "" -> null (enviar intención de limpiar)
export const dateForCreate = (v) => {
  const s = String(v || "").trim();
  if (!s) return undefined;
  return ISO_DATE_ONLY_RX.test(s) ? s : undefined;
};
export const dateForEdit = (v) => {
  const s = String(v || "").trim();
  if (!s) return null;
  return ISO_DATE_ONLY_RX.test(s) ? s : null;
};

// ✅ números requeridos (precioVenta, precioCompra)
export const numForCreate = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};
export const numForEdit = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
