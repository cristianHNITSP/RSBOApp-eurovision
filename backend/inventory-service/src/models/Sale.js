"use strict";

const mongoose = require("mongoose");

const SaleSchema = new mongoose.Schema(
  {
    folio: { type: String, required: true, unique: true, index: true },
    cliente: { type: String, required: true, trim: true },
    clientePhone: { type: String, default: "" },

    // Lista de ítems vendidos (Bases, Micas, o réplicas de Óptica)
    items: [{
      // Campos para Inventario (Micas o Lentes de Contacto)
      sheet:      { type: mongoose.Schema.Types.ObjectId, refPath: 'items.sheetModel', required: false },
      sheetModel: { type: String, enum: ['InventorySheet', 'ContactLensesSheet'], required: false },
      matrixKey:  { type: String, required: false },
      codebar:    { type: String, required: false },

      // Parámetros clínicos numéricos (sph, cyl, axis, add, base)
      params: {
        sph:      { type: Number, default: null },
        cyl:      { type: Number, default: null },
        axis:     { type: Number, default: null },
        add:      { type: Number, default: null },
        base:     { type: Number, default: null },
        base_izq: { type: Number, default: null },
        base_der: { type: Number, default: null },
        _id: false
      },
      eye: { type: String, enum: ["OD", "OI", null], default: null },

      // Campos para Réplicas de Óptica
      collection: { type: String, required: false },
      documentId: { type: mongoose.Schema.Types.ObjectId, required: false },

      sku: { type: String, required: true },
      description: { type: String, default: "" },
      qty: { type: Number, required: true, min: 1 },
      precio: { type: Number, default: 0 }
    }],

    total: { type: Number, default: 0 },
    pago: { type: [String], default: [] }, // efec, tarjeta, trans, credito

    // Referencia opcional a pedido de laboratorio
    labOrder: { type: mongoose.Schema.Types.ObjectId, ref: "LaboratoryOrder", default: null, index: true },

    actor: {
      userId: { type: String, default: null },
      name: { type: String, default: "Sistema" }
    },

    isReplica: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

SaleSchema.index({ cliente: "text", folio: "text" });
SaleSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Sale", SaleSchema);
