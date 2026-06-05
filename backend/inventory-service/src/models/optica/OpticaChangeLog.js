/**
 * @fileoverview Audit trail de todos los movimientos del módulo óptica.
 * Types: CREATE | UPDATE | STOCK_UPDATE | SOFT_DELETE | HARD_DELETE | RESTORE
 */
const mongoose = require("mongoose");
const { COLLECTION_KEYS } = require("../../data/optica.constants");

const OpticaChangeLogSchema = new mongoose.Schema(
  {
    collection: {
      type: String,
      required: true,
      enum: COLLECTION_KEYS,
      index: true,
    },
    documentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    documentSku: { type: String, default: null },
    type: {
      type: String,
      required: true,
      enum: ["CREATE", "UPDATE", "STOCK_UPDATE", "SOFT_DELETE", "HARD_DELETE", "RESTORE"],
    },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    actor: {
      userId: { type: String, default: null },
      name:   { type: String, default: "Sistema" },
    },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

OpticaChangeLogSchema.index({ collection: 1, createdAt: -1 });
OpticaChangeLogSchema.index({ documentId: 1, createdAt: -1 });
OpticaChangeLogSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.OpticaChangeLog ||
  mongoose.model("OpticaChangeLog", OpticaChangeLogSchema);
