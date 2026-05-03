"use strict";

const mongoose = require("mongoose");

const ActorSchema = new mongoose.Schema(
  { userId: { type: String, default: null }, name: { type: String, default: null } },
  { _id: false }
);

const ParamsSchema = new mongoose.Schema(
  {
    sph:      { type: Number, default: null },
    cyl:      { type: Number, default: null },
    add:      { type: Number, default: null },
    base:     { type: Number, default: null },
    base_izq: { type: Number, default: null },
    base_der: { type: Number, default: null },
    eye:      { type: String, enum: ["OD", "OI", "AMBOS", null], default: null },
  },
  { _id: false }
);

const MermaLogSchema = new mongoose.Schema(
  {
    folio:  { type: String, required: true, unique: true, index: true }, // MRM-YYYY-NNNNN
    origin: {
      type: String,
      enum: ["LAB", "VENTAS", "INVENTARIO", "DEVOLUCION"],
      required: true,
      index: true,
    },

    // Trazabilidad cruzada (refs opcionales según origin)
    laboratoryOrder:  { type: mongoose.Schema.Types.ObjectId, ref: "LaboratoryOrder", default: null, index: true },
    laboratoryLineId: { type: String, default: null },
    devolution:       { type: mongoose.Schema.Types.ObjectId, ref: "Devolution", default: null, index: true },
    ventaFolio:       { type: String, default: null, index: true },

    // Localización del stock afectado (Opcional para productos de Óptica)
    sheet:       { type: mongoose.Schema.Types.ObjectId, ref: "InventorySheet", required: false, index: true },
    tipo_matriz: {
      type: String,
      enum: ["BASE", "SPH_CYL", "SPH_CYL_AXIS", "SPH_ADD", "BASE_ADD", null],
      required: false,
    },
    matrixKey: { type: String, required: false },
    eye:       { type: String, enum: ["OD", "OI", null], default: null },
    codebar:   { type: String, default: null },

    // Snapshot inmutable de los parámetros técnicos del item
    params: { type: ParamsSchema, default: () => ({}) },

    qty:    { type: Number, required: true, min: 1 },
    reason: {
      type: String,
      enum: ["ROTURA", "DEFECTO", "CADUCIDAD", "EXTRAVIO", "OTRO"],
      required: true,
    },
    notes: { type: String, default: "", trim: true, maxlength: 500 },

    // Snapshot de stock antes/después para auditoría
    stockBefore: { type: Number, required: true },
    stockAfter:  { type: Number, required: true },

    actor: { type: ActorSchema, default: () => ({}) },
  },
  { timestamps: true }
);

MermaLogSchema.index({ origin: 1, createdAt: -1 });
MermaLogSchema.index({ sheet: 1, createdAt: -1 });
MermaLogSchema.index({ laboratoryOrder: 1, createdAt: -1 });

module.exports = mongoose.model("MermaLog", MermaLogSchema);
