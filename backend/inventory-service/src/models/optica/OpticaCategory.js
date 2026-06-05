/**
 * @fileoverview Registro gestionable de categorías (tipos de producto) de óptica.
 * Espejo de OPTICA_CATEGORIES (data/optica.constants.js). Sembrado de forma
 * idempotente al arrancar; permite añadir categorías nuevas sin tocar código.
 */
const mongoose = require("mongoose");

const OpticaCategorySchema = new mongoose.Schema(
  {
    key:    { type: String, required: true, unique: true, trim: true }, // ruta pública
    model:  { type: String, required: true, trim: true },              // discriminator
    label:  { type: String, required: true, trim: true },
    icon:   { type: String, default: "tag", trim: true },
    order:  { type: Number, default: 99 },
    skuPrefix: { type: String, default: "OPT", trim: true },           // prefijo del SKU
    hasStock: { type: Boolean, default: true },
    searchFields: { type: [String], default: [] },
    // Diccionarios de opciones por campo: { campo: { kind:"select"|"autocomplete", options:[...] } }
    dictionaries: { type: mongoose.Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

OpticaCategorySchema.index({ active: 1, order: 1 });

module.exports =
  mongoose.models.OpticaCategory ||
  mongoose.model("OpticaCategory", OpticaCategorySchema);
