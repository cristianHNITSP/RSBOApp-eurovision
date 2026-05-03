"use strict";

const crypto = require("crypto");
const mongoose = require("mongoose");
const LaboratoryOrder = require("../models/laboratory/LaboratoryOrder");
const MermaLog = require("../models/MermaLog");

let _ws;
function ws() {
  if (_ws) return _ws;
  try { _ws = require("../ws"); } catch { _ws = { broadcast: () => {} }; }
  return _ws;
}

class LaboratoryError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "LaboratoryError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Agrega cantidades mermadas por línea a partir de la colección MermaLog,
 * filtrando por laboratoryOrder. Devuelve un Map<lineId, qty>.
 */
async function aggregateMermasByLine(orderId) {
  const rows = await MermaLog.aggregate([
    { $match: { laboratoryOrder: new mongoose.Types.ObjectId(orderId) } },
    { $group: { _id: "$laboratoryLineId", qty: { $sum: "$qty" } } },
  ]);
  const m = new Map();
  for (const r of rows) {
    if (r._id) m.set(String(r._id), Number(r.qty || 0));
  }
  return m;
}

/**
 * Cierre de lote (LaboratoryOrder).
 *
 * - Idempotente: si la orden ya está cerrada, devuelve el snapshot existente.
 * - Construye snapshot de lines con qty/picked/mermada (mermada agregada desde MermaLog).
 * - Persiste status="cerrado" + closedAt/closedBy + closeSnapshot con txId único.
 * - Emite LAB_ORDER_CLOSED_TX (nuevo) y LAB_ORDER_CLOSE (compat).
 *
 * @param {string} orderId
 * @param {{userId?:string, name?:string}} actor
 * @returns {Promise<{order: object, alreadyClosed: boolean}>}
 */
async function closeOrder(orderId, actor) {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new LaboratoryError("BAD_ID", "orderId inválido");
  }

  // 1. Verificar si ya está cerrada (lectura rápida sin bloqueo aún)
  let order = await LaboratoryOrder.findById(orderId);
  if (!order) throw new LaboratoryError("NOT_FOUND", "Pedido no encontrado", 404);

  if (order.status === "cerrado" && order.closeSnapshot?.txId) {
    return { order: order.toObject(), alreadyClosed: true };
  }
  if (order.status === "cancelado") {
    throw new LaboratoryError("CANCELLED", "No se puede cerrar un pedido cancelado", 409);
  }

  const safeActor = {
    userId: actor?.userId || null,
    name:   actor?.name   || null,
  };

  // 2. Calcular snapshot (esto es seguro leerlo de mermas actuales)
  const mermasByLine = await aggregateMermasByLine(order._id);

  const totalsByLine = (order.lines || []).map((l) => {
    const mermada = mermasByLine.get(String(l.lineId)) || 0;
    return {
      lineId:  l.lineId,
      qty:     Number(l.qty || 0),
      picked:  Number(l.picked || 0),
      mermada,
    };
  });

  const totals = totalsByLine.reduce((acc, l) => {
    acc.qty     += l.qty;
    acc.picked  += l.picked;
    acc.mermada += l.mermada;
    return acc;
  }, { qty: 0, picked: 0, mermada: 0 });

  const closedAt = new Date();
  const txId = crypto.randomUUID();

  // 3. ACTUALIZACIÓN ATÓMICA: Solo si sigue en un estado no cerrado
  // Usamos findOneAndUpdate con filtro de estado para evitar la carrera
  const updatedOrder = await LaboratoryOrder.findOneAndUpdate(
    { _id: orderId, status: { $nin: ["cerrado", "cancelado"] } },
    {
      $set: {
        status: "cerrado",
        closedAt,
        closedBy: safeActor,
        updatedBy: safeActor,
        closeSnapshot: {
          txId,
          closedBy: safeActor,
          closedAt,
          totalsByLine,
          totals,
        }
      }
    },
    { new: true }
  );

  // Si no se actualizó nada, es porque alguien más lo cerró o canceló justo ahora
  if (!updatedOrder) {
    const fresh = await LaboratoryOrder.findById(orderId);
    if (fresh && fresh.status === "cerrado") {
      return { order: fresh.toObject(), alreadyClosed: true };
    }
    throw new LaboratoryError("CONCURRENCY_ERROR", "El pedido cambió de estado durante la operación", 409);
  }

  try {
    ws().broadcast("LAB_ORDER_CLOSED_TX", {
      orderId: String(updatedOrder._id),
      folio:   updatedOrder.folio,
      txId,
      totals,
    });
    ws().broadcast("LAB_ORDER_CLOSE", {
      orderId: String(updatedOrder._id),
      folio:   updatedOrder.folio,
    });
  } catch (_) { /* noop */ }

  return { order: updatedOrder.toObject(), alreadyClosed: false };
}

module.exports = {
  LaboratoryError,
  closeOrder,
};
