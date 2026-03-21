// models/Devolution.js — Gestión de devoluciones del laboratorio óptico
"use strict";

const mongoose = require("mongoose");

const ActorSchema = new mongoose.Schema(
  { userId: { type: String, default: null }, name: { type: String, default: null } },
  { _id: false }
);

const DevolutionItemSchema = new mongoose.Schema(
  {
    codebar:     { type: String, default: "" },
    description: { type: String, default: "" },
    sku:         { type: String, default: null },
    qty:         { type: Number, required: true, min: 1 },      // unidades devueltas
    condition:   { type: String, enum: ["bueno", "danado", "defectuoso"], default: "defectuoso" },
    restoreStock:{ type: Boolean, default: false },  // si aplica reingreso
    sheet:       { type: mongoose.Schema.Types.ObjectId, ref: "InventorySheet", default: null },
    matrixKey:   { type: String, default: null },    // coordenada en la matriz (auto-resolución)
    eye:         { type: String, enum: ["OD", "OI", null], default: null },
  },
  { _id: false }
);

const DevolutionSchema = new mongoose.Schema(
  {
    folio: { type: String, required: true, unique: true, index: true },

    // Referencia al pedido original (opcional si viene de canal externo)
    order:       { type: mongoose.Schema.Types.ObjectId, ref: "LaboratoryOrder", default: null, index: true },
    orderFolio:  { type: String, default: null },   // desnormalizado para búsqueda rápida

    // Datos del cliente
    cliente:     { type: String, required: true, trim: true },
    clientePhone:{ type: String, default: null },

    // Motivo
    reason: {
      type: String,
      enum: [
        "defecto_fabricacion",
        "error_prescripcion",
        "insatisfaccion_cliente",
        "dano_transporte",
        "lente_roto",
        "pedido_incorrecto",
        "garantia",
        "otro",
      ],
      required: true,
    },
    reasonDetail: { type: String, default: "", trim: true },

    // Items devueltos
    items: { type: [DevolutionItemSchema], default: [] },

    // Estado del flujo
    status: {
      type: String,
      enum: ["pendiente", "en_revision", "aprobada", "rechazada", "procesada"],
      default: "pendiente",
      index: true,
    },

    // Acciones de reposición
    restoreStock:  { type: Boolean, default: false }, // marcar si se reingresa stock
    stockRestored: { type: Boolean, default: false },

    // Notas internas
    notes: { type: String, default: "", trim: true },

    // Auditores
    createdBy:   { type: ActorSchema, default: () => ({}) },
    processedBy: { type: ActorSchema, default: () => ({}) },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

DevolutionSchema.index({ createdAt: -1 });
DevolutionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Devolution", DevolutionSchema);
