const mongoose = require("mongoose");
const { baseFields } = require("./_baseSchemas");

const ItemOpticaSchema = new mongoose.Schema({
  subcategoria: { type: String, enum: ["ARMAZON", "SOLUCION", "ACCESORIO", "ESTUCHE", "EQUIPO", "OTRO"], required: true },
  marca:        { type: String, default: "" },
  modelo:       { type: String, default: "" },
  color:        { type: String, default: null },
  talla:        { type: String, default: null },
  material:     { type: String, default: null },
  skuExterno:   { type: String, default: null },
  catalogoRef:  {
    collection: { type: String, default: null },
    refId:      { type: String, default: null },
  },
  cantidad:    { type: Number, required: true, min: 1, default: 1 },
  descripcionLibre: { type: String, default: "" },
}, { _id: false });

const Schema = new mongoose.Schema({
  ...baseFields(),
  category: { type: String, default: "OPTICA", immutable: true },
  item: { type: ItemOpticaSchema, required: true },
}, { timestamps: true, collection: "backorder_optica" });

Schema.index({ status: 1, createdAt: -1 });
Schema.index({ "cliente.nombre": "text", "item.marca": "text", "item.modelo": "text", folio: "text" });

module.exports = mongoose.model("BackOrderOptica", Schema);
