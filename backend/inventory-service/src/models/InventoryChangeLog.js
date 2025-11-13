const mongoose = require('mongoose');

const InventoryChangeLogSchema = new mongoose.Schema({
  sheet: { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySheet', required: true },
  item:  { type: mongoose.Schema.Types.ObjectId, default: null }, // puede apuntar a cualquier colección de items
  tipo_matriz: { type: String, enum: ['BASE', 'SPH_CYL', 'SPH_ADD', 'BASE_ADD'], required: true },

  // coordenadas opcionales por tipo (para consulta rápida)
  sph:  { type: Number, default: null },
  cyl:  { type: Number, default: null },
  add:  { type: Number, default: null },
  base: { type: Number, default: null },
  eye:  { type: String, enum: ['OD', 'OI', null], default: null },
  base_izq: { type: Number, default: null },
  base_der: { type: Number, default: null },

  type: { type: String, required: true }, // SHEET_CREATE, SEED_GENERATE, UPSERT_CHUNK, ITEM_PATCH, ITEM_DELETE, SHEET_UPDATE, SHEET_DELETE...
  details: { type: mongoose.Schema.Types.Mixed },

  actor: { userId: String, name: String }
}, { timestamps: true });

InventoryChangeLogSchema.index({ sheet: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryChangeLog', InventoryChangeLogSchema);
