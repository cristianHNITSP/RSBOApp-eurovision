const mongoose = require('mongoose');

const EyeCellSchema = new mongoose.Schema({
  existencias: { type: Number, default: 0, min: 0 },
  sku:         { type: String, index: true },            // ID lógico interno
  codebar:     { type: String, default: null, index: true } // para escanear
}, { _id: false });

const CellMultifocalSchema = new mongoose.Schema({
  base_izq:  { type: Number, required: true },
  base_der:  { type: Number, required: true },
  OD:        { type: EyeCellSchema, default: () => ({}) },
  OI:        { type: EyeCellSchema, default: () => ({}) },
  createdBy: { userId: String, name: String },
  updatedBy: { userId: String, name: String }
}, { _id: false });

const CLMatrixMultifocalSchema = new mongoose.Schema({
  sheet:       { type: mongoose.Schema.Types.ObjectId, ref: 'ContactLensesSheet', required: true, unique: true },
  tipo_matriz: { type: String, enum: ['BASE_ADD'], default: 'BASE_ADD' },
  // key = "bi|bd|add" (normalizados)
  cells:       { type: Map, of: CellMultifocalSchema }
}, { timestamps: true });

module.exports = mongoose.model('CLMatrixMultifocal', CLMatrixMultifocalSchema);
