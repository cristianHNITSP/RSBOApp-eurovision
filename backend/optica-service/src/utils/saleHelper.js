
const { logMovement } = require("./logHelper");
const { broadcast } = require("../ws");

/**
 * Realiza un descuento atómico de stock y registra el movimiento.
 * @param {mongoose.Model} Model - Modelo de Mongoose
 * @param {string} collection - Nombre de la colección (e.g. "armazones")
 * @param {string} id - ID del documento
 * @param {number} qty - Cantidad a descontar (positivo)
 * @param {object} actor - Usuario que realiza la acción
 */
async function handleAtomicSale(Model, collection, id, qty, actor) {
  const q = Math.abs(Number(qty || 1));
  
  // 1. Descuento atómico con verificación de stock suficiente ($gte)
  const updated = await Model.findOneAndUpdate(
    { _id: id, isDeleted: false, stock: { $gte: q } },
    { 
      $inc: { stock: -q },
      // Opcional: registrar quién actualizó por última vez en el documento mismo
    },
    { new: false } // Queremos el documento ANTES del cambio para saber el stock previo
  ).lean();

  if (!updated) {
    // Si no se encontró el documento, podría ser por: ID inexistente, eliminado, o stock insuficiente
    const exists = await Model.findById(id).lean();
    if (!exists) return { ok: false, status: 404, message: "No encontrado" };
    if (exists.isDeleted) return { ok: false, status: 410, message: "Elemento en papelera" };
    if (exists.stock < q) return { ok: false, status: 409, message: "Stock insuficiente", current: exists.stock };
    return { ok: false, status: 500, message: "Error desconocido al procesar venta" };
  }

  const prevStock = updated.stock;
  const newStock = prevStock - q;

  // 2. Log de movimiento
  await logMovement(collection, id, updated.sku, "SALE", { 
    prevStock, 
    newStock, 
    qty: q 
  }, actor);

  // 3. Broadcast WebSocket para refrescar UIs
  broadcast("INV_CHANGE", {
    collection,
    id: String(id),
    prevStock,
    newStock,
    delta: -q,
  });

  return { ok: true, data: { id, sku: updated.sku, prevStock, newStock, delta: -q } };
}

module.exports = { handleAtomicSale };
