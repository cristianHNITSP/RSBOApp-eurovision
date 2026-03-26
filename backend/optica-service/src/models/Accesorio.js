// models/Accesorio.js
const mongoose = require("mongoose");

const AccesorioSchema = new mongoose.Schema(
  {
    sku:        { type: String, required: true, unique: true, trim: true, index: true },
    nombre:     { type: String, required: true, trim: true },
    categoria: {
      type: String,
      trim: true,
      enum: ["Paño", "Cadena", "Plaquetas", "Tornillos", "Limpiador", "Almohadillas", "Herramienta", "Otro"],
      default: "Otro",
    },
    marca:      { type: String, default: "Genérico", trim: true },
    compatible: { type: String, default: "Universal", trim: true },
    stock:      { type: Number, required: true, min: 0, default: 0 },
    precio:     { type: Number, required: true, min: 0 },
    notas:      { type: String, default: "" },

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

AccesorioSchema.index({ isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model("Accesorio", AccesorioSchema);
