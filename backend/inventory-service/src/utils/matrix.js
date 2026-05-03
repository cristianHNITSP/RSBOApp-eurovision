"use strict";

const MatrixBase       = require("../models/matrix/MatrixBase");
const MatrixSphCyl     = require("../models/matrix/MatrixSphCyl");
const MatrixBifocal    = require("../models/matrix/MatrixBifocal");
const MatrixProgresivo = require("../models/matrix/MatrixProgresivo");

const FLAT_TYPES   = new Set(["BASE", "SPH_CYL"]);
const PER_EYE_TYPES = new Set(["SPH_ADD", "BASE_ADD"]);

function getMatrixModel(tipo) {
  switch (tipo) {
    case "BASE":     return MatrixBase;
    case "SPH_CYL":  return MatrixSphCyl;
    case "SPH_ADD":  return MatrixBifocal;
    case "BASE_ADD": return MatrixProgresivo;
    default:         return null;
  }
}

function isFlatMatrix(tipo)  { return FLAT_TYPES.has(tipo); }
function isPerEyeMatrix(tipo) { return PER_EYE_TYPES.has(tipo); }

function safeMapEntries(doc) {
  const m = doc?.cells;
  if (!m) return [];
  if (typeof m.entries === "function") return Array.from(m.entries());
  return Object.entries(m);
}

function readCellExistencias(tipo, cell, eye) {
  if (!cell) return 0;
  if (isFlatMatrix(tipo)) return Number(cell.existencias || 0);
  if (!eye || (eye !== "OD" && eye !== "OI")) return 0;
  return Number(cell?.[eye]?.existencias || 0);
}

module.exports = {
  getMatrixModel,
  isFlatMatrix,
  isPerEyeMatrix,
  safeMapEntries,
  readCellExistencias,
};
