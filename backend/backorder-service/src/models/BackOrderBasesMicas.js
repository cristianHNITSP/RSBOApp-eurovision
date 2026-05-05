const mongoose = require("mongoose");
const { baseFields } = require("./_baseSchemas");

const ItemBasesMicasSchema = new mongoose.Schema({
  marca:       { type: String, default: "" },
  material:    { type: String, default: "" },
  tratamiento: { type: String, default: "" },
  tipo_matriz: { type: String, enum: ["BASE", "SPH_CYL", "SPH_ADD", "BASE_ADD"], required: true },
  params: {
    sph:      { type: Number, default: null },
    cyl:      { type: Number, default: null },
    add:      { type: Number, default: null },
    base:     { type: Number, default: null },
    base_izq: { type: Number, default: null },
    base_der: { type: Number, default: null },
    eye:      { type: String, enum: ["OD", "OI", "AMBOS", null], default: null },
  },
  cantidad:    { type: Number, required: true, min: 1, default: 1 },
  descripcionLibre: { type: String, default: "" },
}, { _id: false });

const Schema = new mongoose.Schema({
  ...baseFields(),
  category: { type: String, default: "BASES_MICAS", immutable: true },
  item: { type: ItemBasesMicasSchema, required: true },
}, { timestamps: true, collection: "backorder_basesmicas" });

Schema.index({ status: 1, createdAt: -1 });
Schema.index({ "cliente.nombre": "text", "item.marca": "text", folio: "text" });

module.exports = mongoose.model("BackOrderBasesMicas", Schema);
