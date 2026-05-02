/**
 * @typedef {Object} VentasStrategy
 * @property {'lab'|'direct'} kind
 * @property {Object} catalog       // { items, query, filter, pagination, ... }
 * @property {Object} cart          // { items, cliente, total, addItem, removeItem, clear, ... }
 * @property {() => Promise<Order>} checkout
 * @property {Ref<Order|null>} lastVoucher
 * @property {Object} loading       // { sheets, items, sale }
 */

/**
 * Shared helpers for Sales Dashboard components and composables.
 */

export const normTxt = (s) =>
  String(s || "")
    .trim()
    .replace(/<[^>]*>?/gm, "") // Eliminar etiquetas HTML
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const eyeLabel = (e) => {
  if (!e) return "";
  const s = String(e).toUpperCase();
  if (s === "OD" || s === "R") return "Ojo Derecho";
  if (s === "OI" || s === "OS" || s === "L") return "Ojo Izquierdo";
  return e;
};

export const fv = (v) => Number(v ?? 0).toFixed(2);

// Para BASE_ADD: OD usa base_der, OI usa base_izq
export const baseForEye = (row) =>
  String(row.eye || "").toUpperCase() === "OD"
    ? Number(row.base_der ?? 0)
    : Number(row.base_izq ?? 0);

export const buildRowTitle = (row, sheet) => {
  const t = sheet?.tipo_matriz;
  if (t === "BASE")    return `Base ${fv(row.base)}`;
  if (t === "SPH_CYL") return `Esfera ${fv(row.sph)} · Cilindro ${fv(row.cyl)}`;
  if (t === "SPH_CYL_AXIS") return `Esfera ${fv(row.sph)} · Cilindro ${fv(row.cyl)} · Eje ${row.axis}°`;
  if (t === "SPH_ADD")  return `${eyeLabel(row.eye)} · Esfera ${fv(row.sph)} · Adición ${fv(row.add)}`;
  if (t === "BASE_ADD") return `${eyeLabel(row.eye)} · Base ${fv(baseForEye(row))} · Adición ${fv(row.add)}`;
  return "Producto";
};

export const buildRowParams = (row, sheet) => {
  const t = sheet?.tipo_matriz;
  if (t === "BASE")    return `base=${fv(row.base)}`;
  if (t === "SPH_CYL") return `sph=${fv(row.sph)} · cyl=${fv(row.cyl)}`;
  if (t === "SPH_CYL_AXIS") return `sph=${fv(row.sph)} · cyl=${fv(row.cyl)} · eje=${row.axis}`;
  if (t === "SPH_ADD")  return `sph=${fv(row.sph)} · add=${fv(row.add)}`;
  if (t === "BASE_ADD") return `base=${fv(baseForEye(row))} · add=${fv(row.add)}`;
  return "—";
};

/**
 * Extracts actor information (userId, name) from the provided getUser function or localStorage.
 * @param {Function} [getUser] 
 */
export function getActor(getUser) {
  if (typeof getUser === "function") {
    const u = getUser();
    if (u) {
      const userId = u.id ?? u.userId ?? null;
      const name   = u.name ?? u.nombre ?? null;
      if (userId || name) return { userId, name };
    }
  }
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("auth_user") || "";
    if (!raw) return undefined;
    const u = JSON.parse(raw);
    const userId = u?.id || u?.userId || null;
    const name   = u?.name || u?.nombre || null;
    return userId || name ? { userId, name } : undefined;
  } catch { return undefined; }
}

export const PAGO_LABELS = { 
  trans: "TRANS", 
  efec: "EFEC", 
  credito: "CRÉDITO", 
  tarjeta: "TARJETA C|D" 
};
