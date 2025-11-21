const mongoose = require('mongoose');

const CellBaseSchema = new mongoose.Schema({
  existencias: { type: Number, default: 0, min: 0 },
  sku:         { type: String, index: true },           // ID lógico interno
  codebar:     { type: String, default: null, index: true }, // para escanear
  createdBy:   { userId: String, name: String },
  updatedBy:   { userId: String, name: String }
}, { _id: false });

const MatrixBaseSchema = new mongoose.Schema({
  sheet:       { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySheet', required: true, unique: true },
  tipo_matriz: { type: String, enum: ['BASE'], default: 'BASE' },
  // key = base (normalizado)
  cells:       { type: Map, of: CellBaseSchema }
}, { timestamps: true });

module.exports = mongoose.model('MatrixBase', MatrixBaseSchema);
