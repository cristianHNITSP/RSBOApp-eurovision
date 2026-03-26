// models/LenteContacto.js
const mongoose = require("mongoose");

const LenteContactoSchema = new mongoose.Schema(
  {
    sku:        { type: String, required: true, unique: true, trim: true, index: true },
    marca:      { type: String, required: true, trim: true },
    nombre:     { type: String, required: true, trim: true },
    tipo: {
      type: String,
      trim: true,
      enum: ["Esferico", "Torico", "Multifocal", "Colorido", "Otro"],
      default: "Esferico",
    },
    material: {
      type: String,
      trim: true,
      enum: ["Hidrogel", "Silicona-Hidrogel", "HEMA", "Polímero", "Otro"],
      default: "Hidrogel",
    },
    bc:         { type: Number, default: null },   // Base Curve
    dia:        { type: Number, default: null },   // Diameter
    graduacion: { type: String, default: "", trim: true },
    duracion: {
      type: String,
      trim: true,
      enum: ["Diario", "Quincenal", "Mensual", "Anual", "Otro"],
      default: "Mensual",
    },
    stock:     { type: Number, required: true, min: 0, default: 0 },
    precio:    { type: Number, required: true, min: 0 },
    caducidad: { type: Date, default: null },
    notas:     { type: String, default: "" },

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

LenteContactoSchema.index({ isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model("LenteContacto", LenteContactoSchema);
