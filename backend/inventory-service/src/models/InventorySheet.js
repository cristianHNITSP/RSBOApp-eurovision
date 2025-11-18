// models/InventorySheet.js
const mongoose = require('mongoose');

const InventorySheetSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, alias: 'name' },
  tipo_matriz: { type: String, required: true, enum: ['BASE', 'SPH_CYL', 'SPH_ADD', 'BASE_ADD'] },
  baseKey:  { type: String, required: true, trim: true },
  material: { type: String, required: true, trim: true },
  tratamientos: [{ type: String, trim: true }],
  rangos: {
    sph:  { min: Number, max: Number, step: Number },
    cyl:  { min: Number, max: Number, step: Number },
    add:  { min: Number, max: Number, step: Number },
    base: { min: Number, max: Number, step: Number },
    vista_sph: { type: String, enum: ['neg', 'pos', null], default: null }
  },

  // 👇 Borrado lógico
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { userId: { type: String, default: null }, name: { type: String, default: null } },

  owner:     { userId: { type: String, default: null }, name: { type: String, default: null } },
  createdBy: { userId: { type: String, default: null }, name: { type: String, default: null } },
  updatedBy: { userId: { type: String, default: null }, name: { type: String, default: null } },
  meta: {
    observaciones: { type: String, default: '' },
    notas: { type: String, default: '' }
  }
}, { timestamps: true });

InventorySheetSchema.index({ nombre: 1, material: 1 });

module.exports = mongoose.model('InventorySheet', InventorySheetSchema);
