const mongoose = require('mongoose');

const EyeCellSchema = new mongoose.Schema({
  existencias: { type: Number, default: 0, min: 0 },
  sku:         { type: String, index: true }
}, { _id: false });

const CellBifocalSchema = new mongoose.Schema({
  base_izq:  { type: Number, required: true },
  base_der:  { type: Number, required: true },
  OD:        { type: EyeCellSchema, default: () => ({}) },
  OI:        { type: EyeCellSchema, default: () => ({}) },
  createdBy: { userId: String, name: String },
  updatedBy: { userId: String, name: String }
}, { _id: false });

const MatrixBifocalSchema = new mongoose.Schema({
  sheet:       { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySheet', required: true, unique: true },
  tipo_matriz: { type: String, enum: ['SPH_ADD'], default: 'SPH_ADD' },
  // key = "sph|add|bi|bd" (normalizados)
  cells:       { type: Map, of: CellBifocalSchema }
}, { timestamps: true });

module.exports = mongoose.model('MatrixBifocal', MatrixBifocalSchema);
