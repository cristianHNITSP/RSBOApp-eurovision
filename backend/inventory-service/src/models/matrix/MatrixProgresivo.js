const mongoose = require('mongoose');

const EyeCellSchema = new mongoose.Schema({
  existencias: { type: Number, default: 0, min: 0 },
  sku:         { type: String, index: true }
}, { _id: false });

const CellProgresivoSchema = new mongoose.Schema({
  base_izq:  { type: Number, required: true },
  base_der:  { type: Number, required: true },
  OD:        { type: EyeCellSchema, default: () => ({}) },
  OI:        { type: EyeCellSchema, default: () => ({}) },
  createdBy: { userId: String, name: String },
  updatedBy: { userId: String, name: String }
}, { _id: false });

const MatrixProgresivoSchema = new mongoose.Schema({
  sheet:       { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySheet', required: true, unique: true },
  tipo_matriz: { type: String, enum: ['BASE_ADD'], default: 'BASE_ADD' },
  // key = "bi|bd|add" (normalizados)
  cells:       { type: Map, of: CellProgresivoSchema }
}, { timestamps: true });

module.exports = mongoose.model('MatrixProgresivo', MatrixProgresivoSchema);
