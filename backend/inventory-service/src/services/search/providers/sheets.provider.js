"use strict";

const InventorySheet = require("../../../models/InventorySheet");
const ContactLensesSheet = require("../../../models/ContactLensesSheet");
const { TIPO_MATRIZ_LABELS } = require("../../../data/search/tipoMatrizLabels");
const { normalize, escapeRegex, inRange, parseDiopterQuery } = require("../text.util");

const SHEET_FIELDS = {
  nombre: 1, material: 1, tipo_matriz: 1, tratamiento: 1,
  variante: 1, sku: 1, baseKey: 1, proveedor: 1, marca: 1, ranges: 1,
};

function buildTextOr(q) {
  const rx = new RegExp(escapeRegex(q), "i");
  const or = [
    { nombre: rx }, { material: rx }, { tratamiento: rx }, { variante: rx },
    { sku: rx }, { baseKey: rx }, { "proveedor.name": rx }, { "marca.name": rx },
    { tipo_matriz: rx }, { numFactura: rx }, { loteProducto: rx },
  ];
  const qNorm = normalize(q);
  const tipos = Object.entries(TIPO_MATRIZ_LABELS)
    .filter(([, label]) => normalize(label).includes(qNorm))
    .map(([code]) => code);
  if (tipos.length) or.push({ tipo_matriz: { $in: tipos } });
  return or;
}

// ── Ejes fila/columna ────────────────────────────────────────────────────────
// Fila (primario) = sph si existe, si no base. Columna = cyl si existe, si no add.
const rowFieldOf = (r) => (r?.sph ? "sph" : r?.base ? "base" : null);
const colFieldOf = (r) => (r?.cyl ? "cyl" : r?.add ? "add" : null);

// Prefiltros Mongo (OR sobre los posibles campos del eje).
const rowOr = (val) => [inRange("ranges.sph", val), inRange("ranges.base", val)];
const colOr = (val) => [inRange("ranges.cyl", val), inRange("ranges.add", val)];

/** ¿`val` cae en una CELDA real del eje? (dentro del rango Y alineado al step). */
function alignedField(ranges, val, fields) {
  if (!ranges) return null;
  for (const f of fields) {
    const r = ranges[f];
    if (!r || r.start == null || r.end == null) continue;
    const lo = Math.min(r.start, r.end);
    const hi = Math.max(r.start, r.end);
    if (val < lo - 1e-6 || val > hi + 1e-6) continue;
    const step = Math.abs(Number(r.step)) || 0.25;
    const k = (val - lo) / step;
    if (Math.abs(k - Math.round(k)) < 1e-6) return f; // existe como celda
  }
  return null;
}

/** Construye el filtro Mongo de la query de dioptría según su modo. */
function diopterQuery(parsed, baseFilter) {
  if (parsed.mode === "row") return { ...baseFilter, $or: rowOr(parsed.row) };
  if (parsed.mode === "col") return { ...baseFilter, $or: colOr(parsed.col) };
  // cell: fila A en eje fila Y columna B en eje columna
  return { ...baseFilter, $and: [{ $or: rowOr(parsed.row) }, { $or: colOr(parsed.col) }] };
}

function mapSheet(s, category, match) {
  return {
    type: match ? "diopter" : "sheet",
    id: String(s._id),
    nombre: s.nombre,
    material: s.material,
    tipo_matriz: s.tipo_matriz,
    tipoLabel: TIPO_MATRIZ_LABELS[s.tipo_matriz] || s.tipo_matriz,
    tratamiento: s.tratamiento || "",
    variante: s.variante || "",
    sku: s.sku || "",
    proveedor: s.proveedor?.name || "",
    marca: s.marca?.name || "",
    ranges: s.ranges || null,
    category,
    // Dioptría: modo + valores + ejes que casaron.
    mode: match?.mode || null,
    rowVal: match?.rowVal ?? null,
    colVal: match?.colVal ?? null,
    rowField: match?.rowField || null,
    colField: match?.colField || null,
    diopter: match ? (match.rowVal ?? match.colVal) : null, // compat
  };
}

/** Mapea una colección filtrando por el modo (descarta dioptrías fantasma). */
function mapCollection(docs, category, parsed) {
  const out = [];
  for (const s of docs) {
    if (!parsed) { out.push(mapSheet(s, category, null)); continue; }
    const r = s.ranges;
    if (parsed.mode === "row") {
      const rf = rowFieldOf(r);
      if (rf && alignedField(r, parsed.row, [rf]))
        out.push(mapSheet(s, category, { mode: "row", rowVal: parsed.row, rowField: rf }));
    } else if (parsed.mode === "col") {
      const cf = colFieldOf(r);
      if (cf && alignedField(r, parsed.col, [cf]))
        out.push(mapSheet(s, category, { mode: "col", colVal: parsed.col, colField: cf }));
    } else { // cell
      const rf = rowFieldOf(r), cf = colFieldOf(r);
      if (rf && cf && alignedField(r, parsed.row, [rf]) && alignedField(r, parsed.col, [cf]))
        out.push(mapSheet(s, category, { mode: "cell", rowVal: parsed.row, colVal: parsed.col, rowField: rf, colField: cf }));
    }
  }
  return out;
}

/**
 * Provider de PLANILLAS (bases/micas + lentes de contacto).
 * Texto → type 'sheet'. Query de dioptría (sintaxis 1.25 | ,4.00 | 1.25,4.00) →
 * type 'diopter' con `mode` (row/col/cell); el frontend hace deep-link con el foco correcto.
 */
const sheetsProvider = {
  key: "sheets",
  async search({ q, limit }) {
    const parsed = parseDiopterQuery(q);
    const baseFilter = { isDeleted: { $ne: true } };

    const query = parsed
      ? diopterQuery(parsed, baseFilter)
      : { ...baseFilter, $or: buildTextOr(q) };

    const [inv, cl] = await Promise.all([
      InventorySheet.find(query, SHEET_FIELDS).lean().limit(limit),
      ContactLensesSheet.find(query, SHEET_FIELDS).lean().limit(limit),
    ]);

    return [
      ...mapCollection(inv, "Planillas oftálmicas", parsed),
      ...mapCollection(cl, "Lentes de contacto", parsed),
    ].slice(0, limit * 2);
  },
};

module.exports = { sheetsProvider, parseDiopterQuery, alignedField, rowFieldOf, colFieldOf };
