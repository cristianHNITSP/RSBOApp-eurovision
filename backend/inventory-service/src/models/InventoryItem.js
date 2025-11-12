const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
  sheet:       { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySheet', required: true },
  tipo_matriz: { type: String, required: true, enum: ['BASE', 'SPH_CYL', 'SPH_ADD', 'BASE_ADD'] },

  sph:  { type: Number, default: null },
  cyl:  { type: Number, default: null },
  add:  { type: Number, default: null },
  base: { type: Number, default: null },

  existencias: { type: Number, default: 0, min: 0 },

  sku:         { type: String, required: true, index: true, unique: true },
  barcode:     { type: String, default: null, index: true, sparse: true },
  barcodeType: { type: String, enum: ['EAN13', 'CODE128', null], default: null },

  createdBy: { userId: String, name: String },
  updatedBy: { userId: String, name: String }
}, { timestamps: true });

InventoryItemSchema.index(
  { sheet: 1, tipo_matriz: 1, sph: 1, cyl: 1, add: 1, base: 1 },
  { unique: true, partialFilterExpression: { sheet: { $exists: true } } }
);

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
