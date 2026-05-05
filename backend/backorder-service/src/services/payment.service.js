/**
 * Servicio de pagos para back orders
 * Gestiona múltiples abonos y cálculo de saldos
 */

/**
 * Recalcula balances de pago
 * @param {Object} doc - Documento de back order
 */
function recalcBalances(doc) {
  const total = (doc.pagos || []).reduce((s, p) => {
    return p.tipo === "REEMBOLSO" ? s - Number(p.monto || 0) : s + Number(p.monto || 0);
  }, 0);
  doc.totalPagado    = Math.max(0, total);
  const ref = Number(doc.precioFinal != null ? doc.precioFinal : doc.precioEstimado || 0);
  doc.saldoPendiente = Math.max(0, ref - doc.totalPagado);
}

/** Suma de pagos no reembolsos (lo realmente cobrado al cliente) */
function sumIngresos(doc) {
  return (doc.pagos || []).reduce((s, p) => p.tipo === "REEMBOLSO" ? s : s + Number(p.monto || 0), 0);
}
/** Suma de reembolsos */
function sumReembolsos(doc) {
  return (doc.pagos || []).reduce((s, p) => p.tipo === "REEMBOLSO" ? s + Number(p.monto || 0) : s, 0);
}

/**
 * Añade un pago a un back order
 * @param {mongoose.Model} Model - Modelo de back order
 * @param {string} id - ID del back order
 * @param {Object} payment - Datos del pago
 * @param {Object} actor - Usuario que realiza la acción
 * @returns {Promise<Object>}
 */
async function addPayment(Model, id, payment, actor) {
  const doc = await Model.findById(id);
  if (!doc) throw Object.assign(new Error("BackOrder no encontrado"), { status: 404 });
  
  // En CANCELADO o ENTREGADO solo se permiten reembolsos
  if (["CANCELADO", "ENTREGADO"].includes(doc.status) && payment.tipo !== "REEMBOLSO") {
    throw Object.assign(new Error("Solo reembolsos permitidos en este estado"), { status: 409, code: "LOCKED" });
  }
  
  if (!["EFECTIVO","TARJETA","TRANSFERENCIA","OTRO"].includes(payment.metodoPago)) {
    throw Object.assign(new Error("metodoPago inválido"), { status: 400 });
  }
  
  if (!["ANTICIPO","ABONO","PAGO_COMPLETO","PAGO_FINAL","REEMBOLSO"].includes(payment.tipo)) {
    throw Object.assign(new Error("tipo inválido"), { status: 400 });
  }
  
  if (!Number.isFinite(Number(payment.monto)) || Number(payment.monto) <= 0) {
    throw Object.assign(new Error("monto debe ser > 0"), { status: 400 });
  }

  // Validar que un reembolso no exceda lo realmente cobrado (ingresos - reembolsos previos)
  if (payment.tipo === "REEMBOLSO") {
    const ingresos = sumIngresos(doc);
    const reembolsosPrevios = sumReembolsos(doc);
    const reembolsable = Math.max(0, ingresos - reembolsosPrevios);
    if (Number(payment.monto) > reembolsable) {
      throw Object.assign(
        new Error(`Reembolso ${payment.monto} excede lo reembolsable (${reembolsable})`),
        { status: 409, code: "REFUND_EXCEEDS_PAID" }
      );
    }
  }

  doc.pagos.push({
    ...payment,
    actor,
    fecha: payment.fecha ? new Date(payment.fecha) : new Date()
  });
  recalcBalances(doc);
  doc.updatedBy = actor;
  await doc.save();

  try {
    require("../ws").broadcast("BACKORDER_PAYMENT_ADDED", {
      id: String(doc._id),
      folio: doc.folio,
      totalPagado: doc.totalPagado,
      saldoPendiente: doc.saldoPendiente,
    });
  } catch (_) { /* noop */ }

  return doc.toObject();
}

/**
 * Elimina un pago del back order. Útil para corregir errores de captura.
 * Recalcula balances tras la eliminación.
 */
async function deletePayment(Model, id, paymentId, actor) {
  const doc = await Model.findById(id);
  if (!doc) throw Object.assign(new Error("BackOrder no encontrado"), { status: 404 });

  const before = doc.pagos.length;
  doc.pagos = doc.pagos.filter((p) => String(p._id) !== String(paymentId));
  if (doc.pagos.length === before) {
    throw Object.assign(new Error("Pago no encontrado"), { status: 404 });
  }

  recalcBalances(doc);
  doc.updatedBy = actor;
  await doc.save();

  try {
    require("../ws").broadcast("BACKORDER_PAYMENT_ADDED", {
      id: String(doc._id),
      folio: doc.folio,
      totalPagado: doc.totalPagado,
      saldoPendiente: doc.saldoPendiente,
      deletedPaymentId: String(paymentId),
    });
  } catch (_) { /* noop */ }

  return doc.toObject();
}

module.exports = { recalcBalances, addPayment, deletePayment };
