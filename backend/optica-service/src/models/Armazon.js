// models/Armazon.js
const mongoose = require("mongoose");

const ArmazonSchema = new mongoose.Schema(
  {
    sku:      { type: String, required: true, unique: true, trim: true, index: true },
    marca:    { type: String, required: true, trim: true },
    modelo:   { type: String, required: true, trim: true },
    color:    { type: String, default: "", trim: true },
    material: {
      type: String,
      trim: true,
      enum: ["Acetato", "Metal", "TR-90", "Titanio", "Combinado", "Madera", "Otro"],
      default: "Otro",
    },
    tipo: {
      type: String,
      trim: true,
      enum: ["Completo", "Al aire", "Semi-al-aire", "Deportivo", "Infantil", "Otro"],
      default: "Completo",
    },
    genero: {
      type: String,
      trim: true,
      enum: ["Hombre", "Mujer", "Unisex", "Infantil"],
      default: "Unisex",
    },
    talla:     { type: String, default: "", trim: true },   // e.g. "51-21-145"
    serie:     { type: String, default: "", trim: true },
    precio:    { type: Number, required: true, min: 0 },
    stock:     { type: Number, required: true, min: 0, default: 0 },
    estuche:   { type: Boolean, default: false },
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

// Estado virtual (no se guarda en BD, se calcula en el momento)
ArmazonSchema.virtual("estado").get(function () {
  if (this.stock === 0) return "Agotado";
  if (this.stock <= 3) return "Bajo stock";
  return "Disponible";
});

ArmazonSchema.set("toJSON", { virtuals: true });
ArmazonSchema.set("toObject", { virtuals: true });

ArmazonSchema.index({ marca: 1 });
ArmazonSchema.index({ isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model("Armazon", ArmazonSchema);
