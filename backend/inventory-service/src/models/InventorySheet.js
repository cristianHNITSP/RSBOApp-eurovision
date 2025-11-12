const mongoose = require('mongoose');

const InventorySheetSchema = new mongoose.Schema({
  // Alias: permite usar tanto "nombre" como "name"
  nombre: { type: String, required: true, trim: true, alias: 'name' },

  // Tipo de matriz compatible con tus vistas
  tipo_matriz: { type: String, required: true, enum: ['BASE', 'SPH_CYL', 'SPH_ADD', 'BASE_ADD'] },

  baseKey:  { type: String, required: true, trim: true },
  material: { type: String, required: true, trim: true },
  tratamientos: [{ type: String, trim: true }],

  // Rangos personalizados (sph, cyl, add, base)
  rangos: {
    sph:  { min: Number, max: Number, step: Number },
    cyl:  { min: Number, max: Number, step: Number },
    add:  { min: Number, max: Number, step: Number },
    base: { min: Number, max: Number, step: Number },
    vista_sph: { type: String, enum: ['neg', 'pos', null], default: null }
  },

  // Metadatos de control (opcionales)
  owner:     { userId: { type: String, default: null }, name: { type: String, default: null } },
  createdBy: { userId: { type: String, default: null }, name: { type: String, default: null } },
  updatedBy: { userId: { type: String, default: null }, name: { type: String, default: null } },

  // Información adicional del usuario
  meta: {
    observaciones: { type: String, default: '' },
    notas: { type: String, default: '' }
  }
}, { timestamps: true });

InventorySheetSchema.index({ nombre: 1, material: 1 });

module.exports = mongoose.model('InventorySheet', InventorySheetSchema);
