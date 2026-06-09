"use strict";

/** Minúsculas + sin tildes (para match de keywords/labels). */
function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Escapa una query para usarla como RegExp segura. */
function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** ¿La query es un número puro (búsqueda de dioptría)? */
function isNumber(q) {
  return /^[-+]?\d+(\.\d+)?$/.test(String(q).trim());
}

const NUM = "[-+]?\\d+(?:\\.\\d+)?";
const RE_ROW = new RegExp(`^\\s*(${NUM})\\s*$`);
const RE_COL = new RegExp(`^\\s*,\\s*(${NUM})\\s*$`);
const RE_CELL = new RegExp(`^\\s*(${NUM})\\s*,\\s*(${NUM})\\s*$`);

/**
 * Parsea una búsqueda de dioptría con SINTAXIS EXPLÍCITA:
 *   `1.25`        → { mode:'row',  row:1.25 }        (fila)
 *   `, 4.00`      → { mode:'col',  col:4 }           (columna)
 *   `1.25, 4.00`  → { mode:'cell', row:1.25, col:4 } (intersección)
 * Devuelve null si no es una búsqueda de dioptría (→ búsqueda de texto).
 */
function parseDiopterQuery(q) {
  const s = String(q || "");
  let m;
  if ((m = RE_CELL.exec(s))) return { mode: "cell", row: parseFloat(m[1]), col: parseFloat(m[2]) };
  if ((m = RE_COL.exec(s))) return { mode: "col", col: parseFloat(m[1]) };
  if ((m = RE_ROW.exec(s))) return { mode: "row", row: parseFloat(m[1]) };
  return null;
}

/**
 * Condición Mongo: `val` cae dentro del rango almacenado en `field` (.start/.end).
 * Soporta rangos ascendentes y descendentes (ej. axis: 180 → 10).
 */
function inRange(field, val) {
  return {
    $or: [
      { $and: [{ [`${field}.start`]: { $lte: val } }, { [`${field}.end`]: { $gte: val } }] },
      { $and: [{ [`${field}.end`]: { $lte: val } }, { [`${field}.start`]: { $gte: val } }] },
    ],
  };
}

module.exports = { normalize, escapeRegex, isNumber, inRange, parseDiopterQuery };
