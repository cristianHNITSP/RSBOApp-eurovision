// models/Equipo.js
const mongoose = require("mongoose");

const EquipoSchema = new mongoose.Schema(
  {
    sku:      { type: String, required: true, unique: true, trim: true, index: true },
    nombre:   { type: String, required: true, trim: true },
    tipo: {
      type: String,
      trim: true,
      enum: ["Diagnóstico", "Medición", "Taller", "Laboratorio", "Otro"],
      default: "Diagnóstico",
    },
    marca:    { type: String, required: true, trim: true },
    modelo:   { type: String, default: "", trim: true },
    serie:    { type: String, default: "", trim: true },
    estado: {
      type: String,
      trim: true,
      enum: ["Operativo", "Mantenimiento", "Fuera de servicio", "Baja"],
      default: "Operativo",
    },
    ubicacion:     { type: String, default: "", trim: true },
    adquisicion:   { type: Date, default: null },
    mantenimiento: { type: Date, default: null },  // próximo mantenimiento
    notas:         { type: String, default: "" },

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

EquipoSchema.index({ isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model("Equipo", EquipoSchema);
