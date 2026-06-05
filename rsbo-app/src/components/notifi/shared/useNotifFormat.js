/**
 * useNotifFormat.js — Helpers de formato compartidos por los componentes de
 * notificación (notifi/types/*). Evita duplicar lógica de presentación.
 */

export const TYPE_TAG = {
  info: "is-info",
  warning: "is-warning",
  danger: "is-danger",
  success: "is-success",
};

export const TYPE_ICON = {
  info: "info-circle",
  warning: "exclamation-triangle",
  danger: "times-circle",
  success: "check-circle",
};

const STATUS_MAP = { pendiente: "Por iniciar", parcial: "En proceso", cerrado: "Cerrado", cancelado: "Cancelado" };
const REASONS_MAP = {
  defecto_fabricacion: "Defecto de fabricación",
  error_prescripcion: "Error en prescripción",
  insatisfaccion_cliente: "Insatisfacción del cliente",
  dano_transporte: "Daño en transporte",
  lente_roto: "Lente roto",
  pedido_incorrecto: "Pedido incorrecto",
  garantia: "Garantía",
  otro: "Otro",
};
const COND_MAP = { bueno: "Bueno", danado: "Dañado", defectuoso: "Defectuoso" };

export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

export const statusLabel = (s) => STATUS_MAP[s] || s;
export const formatReason = (r) => REASONS_MAP[r] || r || "—";
export const condLabel = (c) => COND_MAP[c] || c;

/** Formatea un valor dióptrico con signo (+/-). */
export function fmtDiopter(v) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
}

/**
 * Convierte las coordenadas estructuradas de una celda de stock en "chips"
 * etiquetados ({ k, v }), evitando el formato plano con "|". Cae al label
 * legado si la notificación no trae coords (compatibilidad).
 */
export function coordChips(cell) {
  const c = cell?.coords || {};
  const chips = [];
  if (c.base != null) chips.push({ k: "Base", v: fmtDiopter(c.base) });
  if (c.base_izq != null) {
    const v = c.base_der != null && c.base_der !== c.base_izq
      ? `${fmtDiopter(c.base_izq)} / ${fmtDiopter(c.base_der)}`
      : fmtDiopter(c.base_izq);
    chips.push({ k: "Base", v });
  }
  if (c.sph != null) chips.push({ k: "SPH", v: fmtDiopter(c.sph) });
  if (c.cyl != null) chips.push({ k: "CYL", v: fmtDiopter(c.cyl) });
  if (c.add != null) chips.push({ k: "Add", v: fmtDiopter(c.add) });
  if (c.axis != null) chips.push({ k: "Eje", v: `${c.axis}°` });
  if (c.eye) chips.push({ k: "Ojo", v: c.eye });
  if (!chips.length && cell?.label) chips.push({ k: "", v: cell.label });
  return chips;
}
