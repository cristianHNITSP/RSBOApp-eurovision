// models/Solucion.js
const mongoose = require("mongoose");

const SolucionSchema = new mongoose.Schema(
  {
    sku:     { type: String, required: true, unique: true, trim: true, index: true },
    nombre:  { type: String, required: true, trim: true },
    tipo: {
      type: String,
      trim: true,
      enum: ["Solucion multiusos", "Solucion salina", "Gotas lubricantes", "Solucion peroxido", "Otro"],
      default: "Solucion multiusos",
    },
    marca:    { type: String, required: true, trim: true },
    volumen:  { type: Number, required: true, min: 0 },   // ml
    stock:    { type: Number, required: true, min: 0, default: 0 },
    precio:   { type: Number, required: true, min: 0 },
    caducidad: { type: Date, default: null },
    notas:    { type: String, default: "" },

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: {
      userId: { type: String, default: null },
      name:   { type: String, default: null },
    },
  },
  { timestamps: true }
);

SolucionSchema.index({ isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model("Solucion", SolucionSchema);
