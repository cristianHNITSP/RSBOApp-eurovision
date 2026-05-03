const mongoose = require("mongoose");
const { baseFields } = require("./_baseSchemas");

const ItemLentesSchema = new mongoose.Schema({
  marca:       { type: String, default: "" },
  modelo:      { type: String, default: "" },
  tipo:        { type: String, enum: ["ESFERICO", "TORICO", "MULTIFOCAL", "COSMETICO", "OTRO"], default: "ESFERICO" },
  duracion:    { type: String, enum: ["DIARIO", "QUINCENAL", "MENSUAL", "TRIMESTRAL", "ANUAL", "OTRO"], default: "MENSUAL" },
  params: {
    curvaBase: { type: Number, default: null },
    diametro:  { type: Number, default: null },
    sph:       { type: Number, default: null },
    cyl:       { type: Number, default: null },
    axis:      { type: Number, default: null },
    add:       { type: Number, default: null },
    color:     { type: String, default: null },
    eye:       { type: String, enum: ["OD", "OI", "AMBOS", null], default: "AMBOS" },
  },
  cantidadCajas: { type: Number, required: true, min: 1, default: 1 },
  descripcionLibre: { type: String, default: "" },
}, { _id: false });

const Schema = new mongoose.Schema({
  ...baseFields(),
  category: { type: String, default: "LENTES_CONTACTO", immutable: true },
  item: { type: ItemLentesSchema, required: true },
}, { timestamps: true, collection: "backorder_lentes" });

Schema.index({ status: 1, createdAt: -1 });
Schema.index({ "cliente.nombre": "text", "item.marca": "text", "item.modelo": "text", folio: "text" });

module.exports = mongoose.model("BackOrderLentes", Schema);
