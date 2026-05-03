// models/OpticaChangeLog.js
const mongoose = require("mongoose");

/**
 * Audit trail para todos los movimientos del módulo óptica.
 * Ordenados por createdAt DESC (día/mes/año).
 * Types: CREATE | UPDATE | STOCK_UPDATE | SOFT_DELETE | HARD_DELETE | RESTORE
 */
const OpticaChangeLogSchema = new mongoose.Schema(
  {
    collection: {
      type: String,
      required: true,
      enum: ["armazones", "lentes", "soluciones", "accesorios", "estuches", "equipos"],
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    documentSku: { type: String, default: null },
    type: {
      type: String,
      required: true,
      enum: ["CREATE", "UPDATE", "STOCK_UPDATE", "SOFT_DELETE", "HARD_DELETE", "RESTORE", "SALE", "RETURN"],
    },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    actor: {
      userId: { type: String, default: null },
      name:   { type: String, default: "Sistema" },
    },
  },
  { timestamps: true }
);

// Índice compuesto: colección + fecha descendente → consultas de logs eficientes
OpticaChangeLogSchema.index({ collection: 1, createdAt: -1 });
OpticaChangeLogSchema.index({ documentId: 1, createdAt: -1 });
// Para agrupación por día/mes/año en el frontend
OpticaChangeLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("OpticaChangeLog", OpticaChangeLogSchema);
