"use strict";

const mongoose = require("mongoose");
const MermaLog = require("../models/MermaLog");
const InventorySheet = require("../models/InventorySheet");
const { mutateMatrixCell, StockError } = require("./stock.service");
const { generateFolio } = require("../utils/folio");

let _ws;
function ws() {
  if (_ws) return _ws;
  try { _ws = require("../ws"); } catch { _ws = { broadcast: () => {} }; }
  return _ws;
}

const VALID_ORIGINS = new Set(["LAB", "VENTAS", "INVENTARIO", "DEVOLUCION"]);
const VALID_REASONS = new Set(["ROTURA", "DEFECTO", "CADUCIDAD", "EXTRAVIO", "OTRO"]);

class MermaError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "MermaError";
    this.code = code;
    this.status = status;
  }
}

function validatePayload(p) {
  if (!p || typeof p !== "object") throw new MermaError("BAD_PAYLOAD", "payload requerido");
  if (!VALID_ORIGINS.has(p.origin)) throw new MermaError("BAD_ORIGIN", `origin inválido: ${p.origin}`);
  if (!VALID_REASONS.has(p.reason)) throw new MermaError("BAD_REASON", `reason inválido: ${p.reason}`);
  if (!p.sheet) throw new MermaError("BAD_SHEET", "sheet requerido");
  if (!p.matrixKey) throw new MermaError("BAD_KEY", "matrixKey requerido");
  const qty = Number(p.qty);
  if (!Number.isFinite(qty) || qty < 1) throw new MermaError("BAD_QTY", "qty debe ser entero >= 1");
  if (p.origin === "LAB" && !p.laboratoryOrder) {
    throw new MermaError("LAB_REQUIRES_ORDER", "origin=LAB requiere laboratoryOrder");
  }
  if (p.origin === "DEVOLUCION" && !p.devolution) {
    throw new MermaError("DEV_REQUIRES_REF", "origin=DEVOLUCION requiere devolution");
  }
}

/**
 * Registra una merma desde cualquier origen. Decrementa stock y persiste log.
 *
 * @param {Object} payload
 * @param {"LAB"|"VENTAS"|"INVENTARIO"|"DEVOLUCION"} payload.origin
 * @param {string|ObjectId} payload.sheet
 * @param {string} payload.matrixKey
 * @param {"OD"|"OI"|null} [payload.eye]
 * @param {number} payload.qty
 * @param {"ROTURA"|"DEFECTO"|"CADUCIDAD"|"EXTRAVIO"|"OTRO"} payload.reason
 * @param {Object} [payload.params]
 * @param {string} [payload.codebar]
 * @param {string} [payload.notes]
 * @param {string|ObjectId} [payload.laboratoryOrder]
 * @param {string} [payload.laboratoryLineId]
 * @param {string|ObjectId} [payload.devolution]
 * @param {string} [payload.ventaFolio]
 * @param {{userId?:string,name?:string}} payload.actor
 * @param {Object} [externalSession] Sesión Mongoose del caller (opcional).
 * @returns {Promise<Object>} El MermaLog creado.
 */
async function registerMerma(payload, externalSession = null) {
  validatePayload(payload);

  const session = externalSession || null;

  // Hidratar la hoja para obtener tipo_matriz
  const sheetQ = InventorySheet.findById(payload.sheet);
  if (session) sheetQ.session(session);
  const sheet = await sheetQ;
  if (!sheet) throw new MermaError("SHEET_NOT_FOUND", "Hoja de inventario no encontrada", 404);

  const actor = {
    userId: payload.actor?.userId || null,
    name:   payload.actor?.name   || null,
  };

  // Mutación de stock (delta negativo). Si falla por stock insuficiente, propaga 409.
  let stockBefore, stockAfter;
  try {
    const r = await mutateMatrixCell({
      sheet,
      matrixKey: payload.matrixKey,
      eye:       payload.eye || null,
      delta:     -Math.abs(Number(payload.qty)),
      type:      "MERMA",
      actor,
      codebar:   payload.codebar || null,
      details:   { origin: payload.origin, reason: payload.reason },
      session,
    });
    stockBefore = r.stockBefore;
    stockAfter  = r.stockAfter;
  } catch (err) {
    if (err instanceof StockError) {
      throw new MermaError(err.code, err.message, err.status || 409);
    }
    throw err;
  }

  // Crear MermaLog
  const folio = await generateFolio("MRM", MermaLog, { session });
  const docPayload = {
    folio,
    origin: payload.origin,
    laboratoryOrder:  payload.laboratoryOrder  || null,
    laboratoryLineId: payload.laboratoryLineId || null,
    devolution:       payload.devolution       || null,
    ventaFolio:       payload.ventaFolio       || null,
    sheet:       sheet._id,
    tipo_matriz: sheet.tipo_matriz,
    matrixKey:   String(payload.matrixKey),
    eye:         payload.eye || null,
    codebar:     payload.codebar || null,
    params:      payload.params || {},
    qty:         Math.abs(Number(payload.qty)),
    reason:      payload.reason,
    notes:       payload.notes || "",
    stockBefore,
    stockAfter,
    actor,
  };

  let merma;
  try {
    if (session) {
      const arr = await MermaLog.create([docPayload], { session });
      merma = arr[0];
    } else {
      merma = await MermaLog.create(docPayload);
    }
  } catch (err) {
    // Compensación single-node: si la creación del log falla, revertir stock.
    if (!session) {
      try {
        await mutateMatrixCell({
          sheet,
          matrixKey: payload.matrixKey,
          eye:       payload.eye || null,
          delta:     +Math.abs(Number(payload.qty)),
          type:      "MERMA_COMPENSATION",
          actor,
          codebar:   payload.codebar || null,
          details:   { reason: "rollback after MermaLog.create failure", origError: err?.message },
        });
      } catch (compErr) {
        console.error("[merma.service] COMPENSATION FAILED — stock inconsistente:", compErr?.message);
      }
    }
    throw err;
  }

  // Notificar fuera de la transacción del caller (si la hay) cuando esta función la posee
  if (!externalSession) {
    try {
      ws().broadcast("MERMA_CREATED", {
        id:     String(merma._id),
        folio:  merma.folio,
        origin: merma.origin,
        sheet:  String(merma.sheet),
        qty:    merma.qty,
      });
    } catch (_) { /* noop */ }
  }

  return merma;
}

async function listMermas({ origin, sheet, dateFrom, dateTo, page = 1, limit = 20, search } = {}) {
  const q = {};
  if (origin) q.origin = origin;
  if (sheet)  q.sheet = sheet;
  if (dateFrom || dateTo) {
    q.createdAt = {};
    if (dateFrom) q.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   q.createdAt.$lte = new Date(dateTo);
  }
  if (search) {
    q.$or = [
      { folio:   { $regex: search, $options: "i" } },
      { codebar: { $regex: search, $options: "i" } },
    ];
  }

  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, total] = await Promise.all([
    MermaLog.find(q)
      .populate("sheet", "nombre sku")
      .populate("laboratoryOrder", "folio cliente status")
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean(),
    MermaLog.countDocuments(q),
  ]);
  return { items, meta: { page: p, limit: l, total, pages: Math.ceil(total / l) } };
}

async function getMerma(id) {
  if (!mongoose.isValidObjectId(id)) throw new MermaError("BAD_ID", "id inválido", 400);
  const m = await MermaLog.findById(id).lean();
  if (!m) throw new MermaError("NOT_FOUND", "Merma no encontrada", 404);
  return m;
}

async function getStats({ dateFrom, dateTo } = {}) {
  const match = {};
  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   match.createdAt.$lte = new Date(dateTo);
  }

  const byOrigin = await MermaLog.aggregate([
    { $match: match },
    { $group: { _id: "$origin", count: { $sum: 1 }, qtyTotal: { $sum: "$qty" } } },
  ]);
  const byReason = await MermaLog.aggregate([
    { $match: match },
    { $group: { _id: "$reason", count: { $sum: 1 }, qtyTotal: { $sum: "$qty" } } },
  ]);
  const totals = await MermaLog.aggregate([
    { $match: match },
    { $group: { _id: null, count: { $sum: 1 }, qtyTotal: { $sum: "$qty" } } },
  ]);

  return {
    totals: totals[0] || { count: 0, qtyTotal: 0 },
    byOrigin,
    byReason,
  };
}

module.exports = {
  MermaError,
  registerMerma,
  listMermas,
  getMerma,
  getStats,
};
