// models/laboratory/LaboratoryOrder.js
const mongoose = require("mongoose");

const ActorSchema = new mongoose.Schema(
  { userId: { type: String, default: null }, name: { type: String, default: null } },
  { _id: false }
);

const OrderLineSchema = new mongoose.Schema(
  {
    lineId: { type: String, required: true }, // id lógico para UI
    codebar: { type: String, required: true, index: true },
    sku: { type: String, default: null },

    sheet: { type: mongoose.Schema.Types.ObjectId, ref: "InventorySheet", required: false, default: null, index: true },
    tipo_matriz: { type: String, enum: ["BASE", "SPH_CYL", "SPH_CYL_AXIS", "SPH_ADD", "BASE_ADD"], required: true },

    matrixKey: { type: String, required: true },
    eye: { type: String, enum: ["OD", "OI", null], default: null },

    params: {
      base: { type: Number, default: null },
      sph: { type: Number, default: null },
      cyl: { type: Number, default: null },
      add: { type: Number, default: null },
      base_izq: { type: Number, default: null },
      base_der: { type: Number, default: null }
    },

    qty: { type: Number, required: true, min: 1 },
    picked: { type: Number, default: 0, min: 0 },
    precio: { type: Number, default: 0 }
  },
  { _id: false }
);

const LaboratoryOrderSchema = new mongoose.Schema(
  {
    folio:      { type: String, required: true, unique: true, index: true },
    ventaFolio: { type: String, default: null, index: true },

    sheet: { type: mongoose.Schema.Types.ObjectId, ref: "InventorySheet", required: true },
    cliente: { type: String, required: true, trim: true },
    clienteDisplay:   { type: String, default: "" },
    clienteNombres:   { type: String, default: "" },
    clienteApellidos: { type: String, default: "" },
    clienteEmpresa:   { type: String, default: "" },
    clienteContacto:  { type: String, default: "" },
    note: { type: String, default: "", trim: true },
    pago:       { type: [String], default: [] },
    totalMonto: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["pendiente", "parcial", "cerrado", "cancelado"],
      default: "pendiente",
      index: true
    },

    lines: { type: [OrderLineSchema], default: [] },

    createdBy: { type: ActorSchema, default: () => ({}) },
    updatedBy: { type: ActorSchema, default: () => ({}) },
    closedBy: { type: ActorSchema, default: () => ({}) },
    closedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

LaboratoryOrderSchema.index({ sheet: 1, createdAt: -1 });

module.exports = mongoose.model("LaboratoryOrder", LaboratoryOrderSchema);