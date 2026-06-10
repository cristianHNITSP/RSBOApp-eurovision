// models/InventorySheet.js
const mongoose = require("mongoose");
const { ENUMS } = require("../data/constants");
const { DEFAULT_RANGES_BY_TIPO, DEFAULT_EXPIRY_MONTHS } = require("../data/inventory-defaults");

const DEBUG_INVENTORY = String(process.env.DEBUG_INVENTORY || "") === "1";

const RangeAxisSchema = new mongoose.Schema(
  {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    step: { type: Number, required: true }
  },
  { _id: false }
);

const RangesSchema = new mongoose.Schema(
  {
    base: { type: RangeAxisSchema, default: undefined },
    sph: { type: RangeAxisSchema, default: undefined },
    cyl: { type: RangeAxisSchema, default: undefined },
    add: { type: RangeAxisSchema, default: undefined }
  },
  { _id: false }
);

const PartySchema = new mongoose.Schema(
  {
    id: { type: String, default: null, trim: true },
    name: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
};

const InventorySheetSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, alias: "name", maxlength: 200 },

    proveedor: { type: PartySchema, default: () => ({ id: null, name: "" }) },
    marca: { type: PartySchema, default: () => ({ id: null, name: "" }) },

    sku: { type: String, trim: true, uppercase: true, default: null },

    tipo_matriz: {
      type: String,
      required: true,
      enum: ENUMS.TIPO_MATRIZ
    },

    baseKey: { type: String, required: true, trim: true },
    material: { type: String, required: true, trim: true },

    tratamiento: { type: String, trim: true, default: null },
    variante: { type: String, trim: true, default: null },

    tratamientos: [{ type: String, trim: true }],

    /** Compra / Fechas */
    fechaCreacion: { type: Date, default: null },
    fechaCaducidad: { type: Date, default: null },

    numFactura: { type: String, trim: true, default: "", maxlength: 120 },
    loteProducto: { type: String, trim: true, default: "", maxlength: 120 },
    fechaCompra: { type: Date, default: null },


/** ✅ Precio de venta (actual) */
precioVenta: { type: Number, required: true, min: 0 },

/** ✅ Precio de compra (costo) */
precioCompra: { type: Number, required: true, min: 0 },

    ranges: {
      type: RangesSchema,
      default: function () {
        return DEFAULT_RANGES_BY_TIPO[this.tipo_matriz] || {};
      }
    },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: {
      userId: { type: String, default: null },
      name: { type: String, default: null }
    },

    owner: {
      userId: { type: String, default: null },
      name: { type: String, default: null }
    },
    createdBy: {
      userId: { type: String, default: null },
      name: { type: String, default: null }
    },
    updatedBy: {
      userId: { type: String, default: null },
      name: { type: String, default: null }
    },

    meta: {
      observaciones: { type: String, default: "", maxlength: 2000 },
      notas: { type: String, default: "", maxlength: 2000 }
    }
  },
  { timestamps: true }
);

InventorySheetSchema.index({ nombre: 1, material: 1 });
InventorySheetSchema.index({ "proveedor.name": 1, "marca.name": 1 });
InventorySheetSchema.index({ tratamiento: 1, variante: 1 });
InventorySheetSchema.index({ fechaCaducidad: 1 });
InventorySheetSchema.index({ numFactura: 1, loteProducto: 1 });
InventorySheetSchema.index({ sku: 1 }, { unique: true, sparse: true });

InventorySheetSchema.pre("validate", function (next) {
  if (!this.fechaCreacion) {
    this.fechaCreacion = this.createdAt || new Date();
  }

  if (this.fechaCompra && !Number.isFinite(new Date(this.fechaCompra).getTime())) {
    this.fechaCompra = null;
  }

  if (!this.fechaCaducidad) {
    const base = this.fechaCompra || this.fechaCreacion || new Date();
    this.fechaCaducidad = addMonths(base, DEFAULT_EXPIRY_MONTHS);
  } else if (!Number.isFinite(new Date(this.fechaCaducidad).getTime())) {
    const base = this.fechaCompra || this.fechaCreacion || new Date();
    this.fechaCaducidad = addMonths(base, DEFAULT_EXPIRY_MONTHS);
  }

  next();
});

module.exports = mongoose.model("InventorySheet", InventorySheetSchema);