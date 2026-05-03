"use strict";

const InventorySheet     = require("../models/InventorySheet");
const InventoryChangeLog = require("../models/InventoryChangeLog");
const { getMatrixModel, isFlatMatrix, readCellExistencias } = require("../utils/matrix");

const DEBUG = String(process.env.DEBUG_STOCK || "") === "1";

class StockError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "StockError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Mutación atómica de una celda matrix. Soporta `delta` positivo o negativo.
 * - Valida que `stockAfter >= 0`.
 * - Escribe `InventoryChangeLog` con before/after.
 * - Dispara stockAlert (best-effort, no bloqueante).
 *
 * @param {Object}  args
 * @param {Object}  args.sheet       Documento (o lean) de InventorySheet con _id y tipo_matriz
 *                                   (si solo se pasa sheetId, se hidrata internamente).
 * @param {String}  [args.sheetId]   Alternativa a `sheet`.
 * @param {String}  args.matrixKey   Clave de la celda.
 * @param {String}  [args.eye]       "OD" | "OI" para tipos per-eye (SPH_ADD, BASE_ADD).
 * @param {Number}  args.delta       Cambio de stock. Positivo = entrada; negativo = salida.
 * @param {String}  args.type        Tipo del cambio para InventoryChangeLog
 *                                   (ej. "MERMA", "LAB_CONSUMO", "DEV_ENTRY").
 * @param {Object}  args.actor       { userId, name }.
 * @param {String}  [args.codebar]
 * @param {Object}  [args.details]   Detalles extra para el log.
 * @param {Object}  [args.session]   Sesión Mongoose opcional (transacciones).
 * @returns {Promise<{stockBefore:number, stockAfter:number, sheet:object}>}
 */
async function mutateMatrixCell(args) {
  const {
    matrixKey,
    eye = null,
    delta,
    type,
    actor = {},
    codebar = null,
    details = {},
    session = null,
  } = args || {};

  if (!matrixKey) throw new StockError("BAD_KEY", "matrixKey requerido");
  if (!type)       throw new StockError("BAD_TYPE", "type requerido para change log");
  const d = Number(delta);
  if (!Number.isFinite(d) || d === 0) {
    throw new StockError("BAD_DELTA", "delta inválido (esperado número distinto de 0)");
  }

  // Hidratar sheet si vino solo el id
  let sheet = args.sheet;
  if (!sheet && args.sheetId) {
    const q = InventorySheet.findById(args.sheetId);
    if (session) q.session(session);
    sheet = await q;
  }
  if (!sheet || !sheet._id || !sheet.tipo_matriz) {
    throw new StockError("BAD_SHEET", "sheet (o sheetId) válido requerido");
  }

  const tipo = sheet.tipo_matriz;
  const Model = getMatrixModel(tipo);
  if (!Model) throw new StockError("UNSUPPORTED", `tipo_matriz no soportado: ${tipo}`);

  const key = String(matrixKey);
  const isDirect = isFlatMatrix(tipo);

  // Validar eye temprano para tipos per-eye (mensaje claro vs UPDATE_FAILED genérico)
  if (!isDirect && eye !== "OD" && eye !== "OI") {
    throw new StockError("EYE_REQUIRED", `eye requerido (OD/OI) para tipo ${tipo}`);
  }

  // Construir path atómico
  const fieldPath = isDirect ? `cells.${key}.existencias` : `cells.${key}.${eye}.existencias`;
  const updateByPath = `cells.${key}.updatedBy`;

  // Query con validación
  const query = { sheet: sheet._id };
  if (d < 0) {
    // Decremento: la celda debe existir y tener stock suficiente
    query[fieldPath] = { $gte: Math.abs(d) };
  } else {
    // Incremento: exigir que la celda exista para no crear celdas inesperadas
    query[`cells.${key}`] = { $exists: true };
  }

  const update = {
    $inc: { [fieldPath]: d },
    $set: { [updateByPath]: actor }
  };

  const updatedDoc = await Model.findOneAndUpdate(query, update, { 
    new: true, 
    session,
    lean: true // Lean para velocidad si no necesitamos métodos de instancia
  });

  if (!updatedDoc) {
    // Si no encontró el doc, puede ser por stock insuficiente o porque no existe la celda/hoja
    const checkDoc = await Model.findOne({ sheet: sheet._id }).lean();
    if (!checkDoc) throw new StockError("NO_MATRIX", "Matriz no encontrada");
    
    // Verificar si la celda existe
    const cells = checkDoc.cells;
    const cell = typeof cells?.get === "function" ? cells.get(key) : cells?.[key];
    if (!cell) throw new StockError("NO_CELL", `Celda ${key} no encontrada`);

    if (d < 0) {
      const current = readCellExistencias(tipo, cell, eye);
      if (current < Math.abs(d)) {
        throw new StockError("INSUFFICIENT_STOCK", `Stock insuficiente: actual ${current}, pedido ${Math.abs(d)}`, 409);
      }
    }
    
    throw new StockError("UPDATE_FAILED", "No se pudo actualizar el stock");
  }

  // Extraer valores reales post-update para el log
  const finalCell = updatedDoc.cells[key] || updatedDoc.cells;
  const stockAfter = readCellExistencias(tipo, finalCell, eye);
  const stockBefore = stockAfter - d;

  // Change log (best-effort: no debe romper la operación si falla)
  try {
    const logDoc = {
      sheet:       sheet._id,
      tipo_matriz: tipo,
      type,
      details: { codebar, qty: Math.abs(d), delta: d, before: stockBefore, after: stockAfter, matrixKey: key, eye, ...details },
      actor: { userId: actor?.userId || null, name: actor?.name || null },
    };
    if (session) {
      await InventoryChangeLog.create([logDoc], { session });
    } else {
      await InventoryChangeLog.create(logDoc);
    }
  } catch (e) {
    if (DEBUG) console.warn("[stock.service] InventoryChangeLog fail:", e?.message || e);
  }

  // Stock alert no bloqueante (solo si no estamos en una transacción aún sin commitear)
  if (!session) {
    setImmediate(() => {
      try {
        const { checkCellAlert } = require("./stockAlert.service");
        const eyeArg = isFlatMatrix(tipo) ? null : (eye || null);
        checkCellAlert(sheet, tipo, key, stockAfter, eyeArg);
      } catch (_) { /* noop */ }
    });
  }

  return { stockBefore, stockAfter, sheet };
}

/**
 * Lee la existencia actual de una celda sin mutar.
 */
async function readCellStock({ sheet, sheetId, matrixKey, eye = null, session = null }) {
  let s = sheet;
  if (!s && sheetId) {
    const q = InventorySheet.findById(sheetId);
    if (session) q.session(session);
    s = await q;
  }
  if (!s) throw new StockError("BAD_SHEET", "sheet (o sheetId) requerido");
  const Model = getMatrixModel(s.tipo_matriz);
  if (!Model) throw new StockError("UNSUPPORTED", `tipo_matriz no soportado: ${s.tipo_matriz}`);
  const q = Model.findOne({ sheet: s._id });
  if (session) q.session(session);
  const doc = await q;
  if (!doc) return 0;
  const cells = doc.cells;
  const cell = typeof cells?.get === "function" ? cells.get(String(matrixKey)) : cells?.[String(matrixKey)];
  return readCellExistencias(s.tipo_matriz, cell, eye);
}

module.exports = {
  StockError,
  mutateMatrixCell,
  readCellStock,
};
