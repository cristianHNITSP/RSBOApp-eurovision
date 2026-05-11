
const { logMovement } = require("./logHelper");
const { broadcast } = require("../ws");

/**
 * Realiza una mutación atómica de stock y registra el movimiento.
 * @param {mongoose.Model} Model - Modelo de Mongoose
 * @param {string} collection - Nombre de la colección (e.g. "armazones")
 * @param {string} id - ID del documento
 * @param {number} delta - Cambio de stock (negativo para ventas, positivo para devoluciones)
 * @param {object} actor - Usuario que realiza la acción
 * @param {string} type - Tipo de movimiento (SALE, DEVOLUTION, MERMA, etc)
 */
async function handleAtomicSale(Model, collection, id, delta, actor, type = "SALE") {
  const d = Number(delta || 0);
  if (d === 0) return { ok: false, status: 400, message: "Delta inválido" };

  const query = { _id: id, isDeleted: false };
  
  // Si es decremento, validar stock suficiente
  if (d < 0) {
    query.stock = { $gte: Math.abs(d) };
  }

  const updated = await Model.findOneAndUpdate(
    query,
    { $inc: { stock: d } },
    { new: false } // Queremos el previo
  ).lean();

  if (!updated) {
    const exists = await Model.findById(id).lean();
    if (!exists) return { ok: false, status: 404, message: "No encontrado" };
    if (exists.isDeleted) return { ok: false, status: 410, message: "Elemento en papelera" };
    if (d < 0 && exists.stock < Math.abs(d)) {
      return { ok: false, status: 409, message: "Stock insuficiente", current: exists.stock };
    }
    return { ok: false, status: 500, message: "Error al actualizar stock" };
  }

  const prevStock = updated.stock;
  const newStock = prevStock + d;

  // 2. Log de movimiento
  await logMovement(collection, id, updated.sku, type, { 
    prevStock, 
    newStock, 
    qty: Math.abs(d),
    delta: d
  }, actor);

  // 3. Broadcast WebSocket
  broadcast("INV_CHANGE", {
    collection,
    id: String(id),
    prevStock,
    newStock,
    delta: d,
  });

  return { ok: true, data: { id, sku: updated.sku, prevStock, newStock, delta: d } };
}

module.exports = { handleAtomicSale };
