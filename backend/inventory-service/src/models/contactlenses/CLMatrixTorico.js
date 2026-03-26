const mongoose = require('mongoose');

const CellToricoSchema = new mongoose.Schema({
  existencias: { type: Number, default: 0, min: 0 },
  sku:         { type: String, index: true },
  codebar:     { type: String, default: null, index: true },
  createdBy:   { userId: String, name: String },
  updatedBy:   { userId: String, name: String }
}, { _id: false });

const CLMatrixToricoSchema = new mongoose.Schema({
  sheet:       { type: mongoose.Schema.Types.ObjectId, ref: 'ContactLensesSheet', required: true, unique: true },
  tipo_matriz: { type: String, enum: ['SPH_CYL_AXIS'], default: 'SPH_CYL_AXIS' },
  // key = "sph|cyl|axis" (normalizados)
  cells:       { type: Map, of: CellToricoSchema }
}, { timestamps: true });

module.exports = mongoose.model('CLMatrixTorico', CLMatrixToricoSchema);
