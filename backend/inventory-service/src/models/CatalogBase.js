const mongoose = require('mongoose');

const materialTreatmentOverrideSchema = new mongoose.Schema({
  material:   { type: String, required: true, trim: true },
  treatments: [{ type: String, trim: true }],
}, { _id: false });

const catalogBaseSchema = new mongoose.Schema({
  key:        { type: String, required: true, unique: true, trim: true },
  label:      { type: String, required: true, trim: true },
  tipo_matriz:{ type: String, required: true, enum: ['BASE', 'SPH_CYL', 'SPH_ADD', 'BASE_ADD'] },
  orden:      { type: Number, default: 0 },
  activo:     { type: Boolean, default: true },
  materiales: [{ type: String, trim: true }],
  tratamientos: [{ type: String, trim: true }],
  // Per-material treatment overrides (e.g. Cristal only allows BCO and CRISTAL_FOTO)
  materialTreatmentOverrides: [materialTreatmentOverrideSchema],
}, { timestamps: true });

module.exports = mongoose.model('CatalogBase', catalogBaseSchema);
