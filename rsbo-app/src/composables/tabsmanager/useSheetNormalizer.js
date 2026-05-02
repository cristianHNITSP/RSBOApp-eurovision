/**
 * rsbo-app/src/composables/tabsmanager/useSheetNormalizer.js
 * Lógica para normalizar datos de planillas provenientes de la API y el catálogo.
 */
import { computed } from "vue";

export const composeTratamientoDisplay = (tratamiento, variante) => {
  const t = String(tratamiento || "").trim();
  const v = String(variante || "").trim();
  if (!t) return "";
  return v ? `${t} (${v})` : t;
};

export const displayTratamiento = (sheet) => {
  if (!sheet) return "";
  const t = sheet.tratamiento || null;
  const v = sheet.variante || null;
  const text = composeTratamientoDisplay(t, v);
  return text ? `${text}` : "";
};

export const tipoHuman = (t) => {
  if (!t) return "N/A";
  const map = {
    // Legacy / Frontend keys
    monofocal: "Monofocal",
    bifocal: "Bifocal",
    progresivo: "Progresivo",
    base: "Base (Stock)",
    
    // Backend matrix types
    BASE: "Base (Stock)",
    SPH_CYL: "Monofocal",
    SPH_ADD: "Bifocal / Progresivo",
    BASE_ADD: "Base con Adición"
  };
  const key = String(t).toLowerCase() === t.toLowerCase() ? t : t; // just to be safe
  return map[t] || map[t.toLowerCase()] || String(t).charAt(0).toUpperCase() + String(t).slice(1).toLowerCase();
};

export const normalizeSheet = (s) => {
  if (!s) return null;

  const id = String(s.id ?? s._id ?? "");
  const name = String(s.name ?? s.nombre ?? "");
  const skuRaw = s.sku ?? s.SKU ?? null;

  const proveedor =
    s.proveedor && typeof s.proveedor === "object"
      ? { id: s.proveedor.id ?? null, name: String(s.proveedor.name ?? "") }
      : { id: null, name: String(s.proveedor || "") };

  const marca =
    s.marca && typeof s.marca === "object"
      ? { id: s.marca.id ?? null, name: String(s.marca.name ?? "") }
      : { id: null, name: String(s.marca || "") };

  const pvRaw = s.precioVenta;
  const pvNum = pvRaw === null || pvRaw === undefined || String(pvRaw).trim() === "" ? null : Number(pvRaw);
  const precioVenta = Number.isFinite(pvNum) ? pvNum : null;

  const pcRaw = s.precioCompra;
  const pcNum = pcRaw === null || pcRaw === undefined || String(pcRaw).trim() === "" ? null : Number(pcRaw);
  const precioCompra = Number.isFinite(pcNum) ? pcNum : null;

  return {
    ...s,
    id,
    name,
    sku: skuRaw ? String(skuRaw) : null,

    proveedor,
    marca,

    tratamiento: s.tratamiento ?? null,
    variante: s.variante ?? null,

    fechaCreacion: s.fechaCreacion ?? s.createdAt ?? null,
    fechaCaducidad: s.fechaCaducidad ?? null,
    fechaCompra: s.fechaCompra ?? null,
    numFactura: s.numFactura ?? "",
    loteProducto: s.loteProducto ?? "",

    precioVenta,
    precioCompra,

    tratamientos: Array.isArray(s.tratamientos) ? s.tratamientos : [],
    meta: s.meta && typeof s.meta === "object" ? s.meta : { observaciones: "", notas: "" },
    tabs: Array.isArray(s.tabs) ? s.tabs : []
  };
};

export const mapSheets = (arr) => (Array.isArray(arr) ? arr : []).map(normalizeSheet).filter(Boolean);

/**
 * Factory que crea computeds para mapear el catálogo (bases y tratamientos).
 */
export function useSheetNormalizer(catalogRef) {
  const catalogBasesMap = computed(() => {
    const map = {};
    for (const b of catalogRef.value?.bases ?? []) map[b.key] = b;
    return map;
  });

  const catalogTreatmentsMap = computed(() => {
    const map = {};
    for (const t of catalogRef.value?.treatments ?? []) map[t.key] = t;
    return map;
  });

  return {
    catalogBasesMap,
    catalogTreatmentsMap
  };
}
