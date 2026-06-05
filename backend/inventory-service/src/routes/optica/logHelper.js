/**
 * @fileoverview Helper para registrar movimientos en OpticaChangeLog (no bloqueante).
 */
const OpticaChangeLog = require("../../models/optica/OpticaChangeLog");

/**
 * @param {string}   collection - clave de categoría ("armazones", "lentes", ...)
 * @param {ObjectId} documentId - _id del documento afectado
 * @param {string}   sku        - SKU legible para búsquedas rápidas
 * @param {string}   type       - CREATE | UPDATE | STOCK_UPDATE | SOFT_DELETE | HARD_DELETE | RESTORE
 * @param {object}   details    - Payload libre con contexto del cambio
 * @param {object}   actor      - { userId, name }
 */
async function logMovement(collection, documentId, sku, type, details = {}, actor = {}) {
  try {
    await OpticaChangeLog.create({
      collection,
      documentId,
      documentSku: sku || null,
      type,
      details,
      actor: {
        userId: actor?.userId || null,
        name:   actor?.name   || "Sistema",
      },
    });
  } catch (err) {
    console.error(
      `[OPTICA][LOG][ERROR] No se pudo guardar log ${type} para ${collection}/${documentId}:`,
      err.message
    );
  }
}

module.exports = { logMovement };
