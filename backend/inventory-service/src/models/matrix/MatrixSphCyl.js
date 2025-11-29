const mongoose = require('mongoose');

const CellSphCylSchema = new mongoose.Schema({
  existencias: { type: Number, default: 0, min: 0 },
  sku:         { type: String, index: true },
  codebar:     { type: String, default: null, index: true },
  createdBy:   { userId: String, name: String },
  updatedBy:   { userId: String, name: String }
}, { _id: false });

const MatrixSphCylSchema = new mongoose.Schema({
  sheet:       { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySheet', required: true, unique: true },
  tipo_matriz: { type: String, enum: ['SPH_CYL'], default: 'SPH_CYL' },
  // key = "sph|cyl" (normalizados)
  cells:       { type: Map, of: CellSphCylSchema, default: {} } // 👈 para que nunca sea undefined
}, { timestamps: true });

module.exports = mongoose.model('MatrixSphCyl', MatrixSphCylSchema);
