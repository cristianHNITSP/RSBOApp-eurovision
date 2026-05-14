const mongoose = require('mongoose');

const EyeCellSchema = new mongoose.Schema({
  existencias: { type: Number, default: 0, min: 0 },
  sku:         { type: String, index: true },
  codebar:     { type: String, default: null, index: true }
}, { _id: false });

const CellBifocalSchema = new mongoose.Schema({
  base_izq:  { type: Number, default: null },
  base_der:  { type: Number, default: null },
  OD:        { type: EyeCellSchema, default: () => ({}) },
  OI:        { type: EyeCellSchema, default: () => ({}) },
  createdBy: { userId: String, name: String },
  updatedBy: { userId: String, name: String }
}, { _id: false });

const CLMatrixBifocalSchema = new mongoose.Schema({
  sheet:       { type: mongoose.Schema.Types.ObjectId, ref: 'ContactLensesSheet', required: true, unique: true },
  tipo_matriz: { type: String, enum: ['SPH_ADD'], default: 'SPH_ADD' },
  // key = "sph|add" (normalizados con normNum)
  cells:       { type: Map, of: CellBifocalSchema }
}, { timestamps: true });

module.exports = mongoose.model('CLMatrixBifocal', CLMatrixBifocalSchema);
