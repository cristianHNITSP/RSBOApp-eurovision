// rsbo-app/src/composables/lab/useLabMappers.js
import { fmtShort } from "@/utils/formatters";

export const normTxt = (s) =>
  String(s || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const eyeLabel = (e) => {
  if (!e) return "—";
  const s = String(e).toUpperCase();
  if (s === "OD" || s === "R" || s === "RIGHT") return "Derecho";
  if (s === "OS" || s === "OI" || s === "L" || s === "LEFT") return "Izquierdo";
  return e;
};

export const getMicaTypeName = (tipoMatriz) => ({
  BASE: "Lente Monofocal (Base)",
  SPH_CYL: "Lente Monofocal",
  SPH_ADD: "Lente Bifocal",
  BASE_ADD: "Lente Progresivo"
}[tipoMatriz] || tipoMatriz || "—");

export const normalizeSheet = (s) => {
  const id = String(s?._id ?? s?.id ?? "");
  const updatedByName = s?.updatedBy?.name || s?.updatedBy?.nombre || (typeof s?.updatedBy === "string" ? s.updatedBy : "") || "";
  return {
    ...s,
    id,
    nombre: s?.nombre ?? s?.name ?? "",
    name: s?.nombre ?? s?.name ?? "",
    tratamientos: Array.isArray(s?.tratamientos) ? s.tratamientos : [],
    updatedByName
  };
};

export const normalizeOrder = (o) => {
  const id = String(o?._id ?? o?.id ?? "");
  const sheetId = String(o?.sheet ?? o?.sheetId ?? "");
  const lines = Array.isArray(o?.lines) ? o.lines : [];
  return {
    ...o,
    id,
    sheetId,
    createdAtShort: fmtShort(o?.createdAt),
    updatedAtShort: fmtShort(o?.updatedAt),
    lines: lines.map((l, i) => ({
      ...l,
      id: String(l?.lineId ?? l?.id ?? `line_${i}`),
      lineId: String(l?.lineId ?? l?.id ?? `line_${i}`),
      qty: Number(l?.qty || 0),
      picked: Number(l?.picked || 0),
      codebar: String(l?.codebar || ""),
      params: l?.params || {},
      eye: l?.eye ?? null,
      tipoMatriz: l?.tipo_matriz || null,
      micaType: l?.micaType || getMicaTypeName(l?.tipo_matriz),
      sheetNombre: l?.sheetNombre || "",
      lineSheetId: l?.sheet ? String(l.sheet) : null
    }))
  };
};

export const mapEntryEvent = (e) => ({
  id: String(e._id || e.id),
  folio: e?.details?.folio || "—",
  at: fmtShort(e?.createdAt),
  rawCreatedAt: e?.createdAt || null,
  cliente: e?.details?.cliente || "—",
  sheetId: e?.details?.sheetId || (e?.sheet ? String(e.sheet) : null),
  linesTotal: Number(e?.details?.linesTotal || 0),
  micaSummary: e?.details?.micaSummary || null
});

export const mapExitEvent = (e) => ({
  id: String(e._id || e.id),
  folio: e?.details?.folio || "—",
  at: fmtShort(e?.createdAt),
  rawCreatedAt: e?.createdAt || null,
  sheetId: e?.details?.sheetId || (e?.sheet ? String(e.sheet) : null),
  codebar: e?.details?.codebar || "",
  title: e?.details?.title || "Salida",
  micaType: e?.details?.micaType || "—"
});

const fmtVal = (v) => { const n = Number(v ?? 0); return n.toFixed(2); };

export const buildRowTitle = (row, sheet) => {
  const t = sheet?.tipo_matriz;
  const name = sheet?.nombre || sheet?.name || "Producto";
  const base = String(row.eye || "").toUpperCase() === "OD"
    ? Number(row.base_der ?? 0) : Number(row.base_izq ?? 0);
  if (t === "BASE") return `${name} · Base ${fmtVal(row.base)}`;
  if (t === "SPH_CYL") return `${name} · Esfera ${fmtVal(row.sph)} · Cilindro ${fmtVal(row.cyl)}`;
  if (t === "SPH_ADD") return `${name} · Ojo ${eyeLabel(row.eye)} · Esfera ${fmtVal(row.sph)} · Adición ${fmtVal(row.add)}`;
  if (t === "BASE_ADD") return `${name} · Ojo ${eyeLabel(row.eye)} · Base ${fmtVal(base)} · Adición ${fmtVal(row.add)}`;
  return name;
};

export const buildRowParams = (row, sheet) => {
  const t = sheet?.tipo_matriz;
  const parts = [];
  if (t === "BASE") {
    parts.push(`Base: ${fmtVal(row.base)}`);
  } else if (t === "SPH_CYL") {
    parts.push(`Esfera: ${fmtVal(row.sph)}`);
    parts.push(`Cilindro: ${fmtVal(row.cyl)}`);
  } else if (t === "SPH_ADD") {
    parts.push(`Esfera: ${fmtVal(row.sph)}`);
    parts.push(`Adición: ${fmtVal(row.add)}`);
  } else if (t === "BASE_ADD") {
    const base = String(row.eye || "").toUpperCase() === "OD"
      ? Number(row.base_der ?? 0) : Number(row.base_izq ?? 0);
    parts.push(`Base: ${fmtVal(base)}`);
    parts.push(`Adición: ${fmtVal(row.add)}`);
  }
  return parts.length ? parts.join(" · ") : "—";
};

export const sheetTitle = (s) => {
  if (!s) return "—";
  const name = s.nombre || s.name || "Planilla";
  const sku = s.sku ? ` · ${s.sku}` : "";
  return `${name}${sku}`;
};

export const prettyTrat = (list) => {
  if (!Array.isArray(list) || !list.length) return "Sin tratamientos";
  return list.join(", ");
};

export const lineHuman = (line, sheet) => {
  // Las líneas de pedido tienen las mismas propiedades de mica que los items de inventario
  return buildRowTitle(line, sheet);
};
