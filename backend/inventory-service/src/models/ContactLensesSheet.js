// models/ContactLensesSheet.js
const mongoose = require("mongoose");

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
    add: { type: RangeAxisSchema, default: undefined },
    axis: { type: RangeAxisSchema, default: undefined }
  },
  { _id: false }
);

const defaultRangesByTipo = {
  BASE: { base: { start: 0, end: 14, step: 0.5 } },
  SPH_CYL: {
    sph: { start: -16, end: 8, step: 0.25 },
    cyl: { start: -6, end: 0, step: 0.25 }
  },
  SPH_CYL_AXIS: {
    sph: { start: -10, end: 6, step: 0.25 },
    cyl: { start: -2.25, end: -0.75, step: 0.5 },
    axis: { start: 180, end: 10, step: 10 }
  },
  SPH_ADD: {
    sph: { start: -3, end: 11, step: 0.25 },
    add: { start: 1, end: 4, step: 0.25 }
  },
  BASE_ADD: {
    base: { start: 0, end: 3, step: 0.5 },
    add: { start: 1, end: 4, step: 0.25 }
  }
};

const PartySchema = new mongoose.Schema(
  {
    id: { type: String, default: null, trim: true },
    name: { type: String, default: "", trim: true }
  },
  { _id: false }
);

/** Caducidad por defecto: 24 meses (=2 años) */
const DEFAULT_EXPIRY_MONTHS = 24;

const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
};

const ContactLensesSheetSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, alias: "name" },

    proveedor: { type: PartySchema, default: () => ({ id: null, name: "" }) },
    marca: { type: PartySchema, default: () => ({ id: null, name: "" }) },

    sku: { type: String, trim: true, uppercase: true, default: null },

    tipo_matriz: {
      type: String,
      required: true,
      enum: ["BASE", "SPH_CYL", "SPH_CYL_AXIS", "SPH_ADD", "BASE_ADD"]
    },

    baseKey: { type: String, required: true, trim: true },
    material: { type: String, required: false, trim: true, default: "" },

    tratamiento: { type: String, trim: true, default: null },
    variante: { type: String, trim: true, default: null },

    tratamientos: [{ type: String, trim: true }],

    /** Compra / Fechas */
    fechaCreacion: { type: Date, default: null },
    fechaCaducidad: { type: Date, default: null },

    numFactura: { type: String, trim: true, default: "" },
    loteProducto: { type: String, trim: true, default: "" },
    fechaCompra: { type: Date, default: null },

    /** Precio de venta (actual) */
    precioVenta: { type: Number, required: true, min: 0 },

    /** Precio de compra (costo) */
    precioCompra: { type: Number, required: true, min: 0 },

    ranges: {
      type: RangesSchema,
      default: function () {
        return defaultRangesByTipo[this.tipo_matriz] || {};
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
      observaciones: { type: String, default: "" },
      notas: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

ContactLensesSheetSchema.pre("validate", function (next) {
  if (DEBUG_INVENTORY) {
    console.log("[CL][MODEL pre-validate] IN", {
      _id: this._id ? String(this._id) : null,
      numFactura: this.numFactura,
      loteProducto: this.loteProducto,
      fechaCompra: this.fechaCompra,
      fechaCaducidad: this.fechaCaducidad,
      fechaCreacion: this.fechaCreacion,
      precioVenta: this.precioVenta
    });
  }

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

  if (DEBUG_INVENTORY) {
    console.log("[CL][MODEL pre-validate] OUT", {
      _id: this._id ? String(this._id) : null,
      numFactura: this.numFactura,
      loteProducto: this.loteProducto,
      fechaCompra: this.fechaCompra ? this.fechaCompra.toISOString() : null,
      fechaCaducidad: this.fechaCaducidad ? this.fechaCaducidad.toISOString() : null,
      fechaCreacion: this.fechaCreacion ? this.fechaCreacion.toISOString() : null
    });
  }

  next();
});

// índices
ContactLensesSheetSchema.index({ nombre: 1, material: 1 });
ContactLensesSheetSchema.index({ "proveedor.name": 1, "marca.name": 1 });
ContactLensesSheetSchema.index({ tratamiento: 1, variante: 1 });

ContactLensesSheetSchema.index({ fechaCaducidad: 1 });
ContactLensesSheetSchema.index({ numFactura: 1, loteProducto: 1 });

ContactLensesSheetSchema.index({ sku: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("ContactLensesSheet", ContactLensesSheetSchema);
