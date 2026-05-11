"use strict";

const mongoose = require("mongoose");

const ActorSchema = new mongoose.Schema(
  { userId: { type: String, default: null }, name: { type: String, default: null } },
  { _id: false }
);

const MermaLogSchema = new mongoose.Schema(
  {
    folio:  { type: String, required: true, unique: true, index: true }, // MRM-OPT-XXXX
    origin: {
      type: String,
      enum: ["VENTAS", "INVENTARIO", "DEVOLUCION", "OTRO"],
      required: true,
      index: true,
    },

    // Trazabilidad cruzada
    devolution:       { type: mongoose.Schema.Types.ObjectId, ref: "Devolution", default: null, index: true },
    ventaFolio:       { type: String, default: null, index: true },

    // Localización del stock afectado en Óptica
    collection:       { type: String, required: false }, // armazones, accesorios, etc.
    documentId:       { type: mongoose.Schema.Types.ObjectId, required: false, index: true },
    sku:              { type: String, default: null, index: true },

    // ─── REPLICACIÓN INVENTARIO (CAMPOS SHADOW) ───
    sheet:            { type: mongoose.Schema.Types.ObjectId, default: null },
    matrixKey:        { type: String, default: null },
    eye:              { type: String, default: null },
    codebar:          { type: String, default: null },
    // ──────────────────────────────────────────────

    description: { type: String, default: "" },
    qty:         { type: Number, required: true, min: 1 },
    reason:      {
      type: String,
      enum: ["ROTURA", "DEFECTO", "CADUCIDAD", "EXTRAVIO", "OTRO"],
      required: true,
    },
    notes: { type: String, default: "", trim: true, maxlength: 500 },

    // 💰 Snapshot financiero del item al momento de la merma
    unitValue: { type: Number, default: 0 }, 
    unitCost:  { type: Number, default: 0 }, 

    // Snapshot de stock para auditoría
    stockBefore: { type: Number, required: true },
    stockAfter:  { type: Number, required: true },

    isReplica: { type: Boolean, default: false, index: true },

    actor: { type: ActorSchema, default: () => ({}) },
  },
  { timestamps: true }
);

MermaLogSchema.index({ origin: 1, createdAt: -1 });
MermaLogSchema.index({ collection: 1, createdAt: -1 });

module.exports = mongoose.model("MermaLog", MermaLogSchema);
