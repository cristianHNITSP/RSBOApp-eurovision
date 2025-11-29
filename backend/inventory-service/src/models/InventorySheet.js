// models/InventorySheet.js
const mongoose = require('mongoose');

const RangeAxisSchema = new mongoose.Schema({
  start: { type: Number, required: true },
  end:   { type: Number, required: true },
  step:  { type: Number, required: true }
}, { _id: false });

const RangesSchema = new mongoose.Schema({
  base: { type: RangeAxisSchema, default: undefined },
  sph:  { type: RangeAxisSchema, default: undefined },
  cyl:  { type: RangeAxisSchema, default: undefined },
  add:  { type: RangeAxisSchema, default: undefined }
}, { _id: false });

const defaultRangesByTipo = {
  BASE: { base: { start: 0, end: 8, step: 0.50 } },
  SPH_CYL: {
    sph: { start: -6, end: 6, step: 0.25 },
    cyl: { start: -6, end: 6, step: 0.25 }
  },
  SPH_ADD: {
    sph: { start: -6, end: 6, step: 0.25 },
    add: { start: 0,  end: 4, step: 0.25 }
  },
  BASE_ADD: {
    base:{ start: 0, end: 8, step: 0.50 },
    add: { start: 0, end: 4, step: 0.25 }
  }
};

const InventorySheetSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, alias: 'name' },

    // ✅ SKU de la PLANILLA (localizable)
    sku: { type: String, trim: true, uppercase: true, default: null },

    tipo_matriz: {
      type: String,
      required: true,
      enum: ['BASE', 'SPH_CYL', 'SPH_ADD', 'BASE_ADD']
    },
    baseKey: { type: String, required: true, trim: true },
    material: { type: String, required: true, trim: true },
    tratamientos: [{ type: String, trim: true }],

    ranges: {
      type: RangesSchema,
      default: function () {
        return defaultRangesByTipo[this.tipo_matriz] || {};
      }
    },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: {
      userId: { type: String, default: null },
      name: { type: String, default: null }
    },

    owner: {
      userId: { type: String, default: null },
      name: { type: String, default: null }
    },
    createdBy: {
      userId: { type: String, default: null },
      name: { type: String, default: null }
    },
    updatedBy: {
      userId: { type: String, default: null },
      name: { type: String, default: null }
    },

    meta: {
      observaciones: { type: String, default: '' },
      notas: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

// índices
InventorySheetSchema.index({ nombre: 1, material: 1 });
// ✅ único pero con sparse para no romper docs viejos que aún no tengan sku
InventorySheetSchema.index({ sku: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('InventorySheet', InventorySheetSchema);
