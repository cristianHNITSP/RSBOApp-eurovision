/**
 * Modelos de inventory_db para AdminJS.
 * Usa una conexión separada — no interfiere con la conexión principal de auth-service.
 */

const mongoose = require("mongoose");

const MONGO_URI = process.env.INVENTORY_MONGO_URI;

if (!MONGO_URI) {
  console.warn("⚠️  INVENTORY_MONGO_URI no definido — modelos de inventario no disponibles en AdminJS");
  module.exports = {};
  return;
}

const conn = mongoose.createConnection(MONGO_URI);
conn.on("connected", () => console.log("✅ AdminJS conectado a inventory_db"));
conn.on("error",     (e) => console.error("❌ AdminJS inventory_db error:", e.message));

const { Mixed, ObjectId } = mongoose.Schema.Types;

// ─── InventorySheet ───────────────────────────────────────────────────────────
const InventorySheet = conn.model("InventorySheet", new mongoose.Schema({
  nombre:        String,
  proveedor:     { id: String, name: String },
  marca:         { id: String, name: String },
  sku:           String,
  tipo_matriz:   { type: String, enum: ["BASE", "SPH_CYL", "SPH_ADD", "BASE_ADD"] },
  baseKey:       String,
  material:      String,
  tratamiento:   String,
  variante:      String,
  tratamientos:  [String],
  fechaCreacion: Date,
  fechaCaducidad:Date,
  numFactura:    String,
  loteProducto:  String,
  fechaCompra:   Date,
  precioVenta:   Number,
  precioCompra:  Number,
  isDeleted:     Boolean,
  deletedAt:     Date,
  meta:          { observaciones: String, notas: String },
}, { timestamps: true }));

// ─── ContactLensesSheet ───────────────────────────────────────────────────────
const ContactLensesSheet = conn.model("ContactLensesSheet", new mongoose.Schema({
  nombre:        String,
  proveedor:     { id: String, name: String },
  marca:         { id: String, name: String },
  sku:           String,
  tipo_matriz:   { type: String, enum: ["BASE", "SPH_CYL", "SPH_ADD", "BASE_ADD"] },
  baseKey:       String,
  material:      String,
  tratamiento:   String,
  variante:      String,
  tratamientos:  [String],
  fechaCreacion: Date,
  fechaCaducidad:Date,
  numFactura:    String,
  loteProducto:  String,
  fechaCompra:   Date,
  precioVenta:   Number,
  isDeleted:     Boolean,
  deletedAt:     Date,
  meta:          { observaciones: String, notas: String },
}, { timestamps: true }));

// ─── CatalogBase ──────────────────────────────────────────────────────────────
const CatalogBase = conn.model("CatalogBase", new mongoose.Schema({
  key:         String,
  label:       String,
  tipo_matriz: { type: String, enum: ["BASE", "SPH_CYL", "SPH_ADD", "BASE_ADD"] },
  orden:       Number,
  activo:      Boolean,
  materiales:  [String],
  tratamientos:[String],
  materialTreatmentOverrides: Mixed,
}, { timestamps: true }));

// ─── CatalogTreatment ─────────────────────────────────────────────────────────
const CatalogTreatment = conn.model("CatalogTreatment", new mongoose.Schema({
  key:               String,
  label:             String,
  orden:             Number,
  activo:            Boolean,
  variants:          [String],
  variantsByMaterial:Mixed,
  allowedMaterials:  [String],
  allowedBases:      [String],
}, { timestamps: true }));

// ─── LaboratoryOrder ──────────────────────────────────────────────────────────
const LaboratoryOrder = conn.model("LaboratoryOrder", new mongoose.Schema({
  folio:    String,
  sheet:    { type: ObjectId, ref: "InventorySheet" },
  cliente:  String,
  note:     String,
  status:   { type: String, enum: ["pendiente", "parcial", "cerrado", "cancelado"] },
  lines:    Mixed,
  createdBy:{ userId: String, name: String },
  closedBy: { userId: String, name: String },
  closedAt: Date,
}, { timestamps: true }));

// ─── LaboratoryEvent (solo lectura) ───────────────────────────────────────────
const LaboratoryEvent = conn.model("LaboratoryEvent", new mongoose.Schema({
  order:  { type: ObjectId, ref: "LaboratoryOrder" },
  sheet:  { type: ObjectId, ref: "InventorySheet" },
  type:   String,
  details:Mixed,
  actor:  { userId: String, name: String },
}, { timestamps: true }));

// ─── InventoryChangeLog (solo lectura) ────────────────────────────────────────
const InventoryChangeLog = conn.model("InventoryChangeLog", new mongoose.Schema({
  sheet:      { type: ObjectId, ref: "InventorySheet" },
  tipo_matriz:String,
  sph: Number, cyl: Number, add: Number, base: Number, eye: String,
  type:   String,
  details:Mixed,
  actor:  { userId: String, name: String },
}, { timestamps: true }));

// ─── Matrices (solo lectura) ──────────────────────────────────────────────────
const matrixSchema = new mongoose.Schema({
  sheet:      { type: ObjectId, ref: "InventorySheet" },
  tipo_matriz:String,
  cells:      Mixed,
}, { timestamps: true });

const clMatrixSchema = new mongoose.Schema({
  sheet:      { type: ObjectId, ref: "ContactLensesSheet" },
  tipo_matriz:String,
  cells:      Mixed,
}, { timestamps: true });

const MatrixBase       = conn.model("MatrixBase",       matrixSchema);
const MatrixSphCyl     = conn.model("MatrixSphCyl",     matrixSchema);
const MatrixBifocal    = conn.model("MatrixBifocal",    matrixSchema);
const MatrixProgresivo = conn.model("MatrixProgresivo", matrixSchema);

const CLMatrixEsferico  = conn.model("CLMatrixEsferico",  clMatrixSchema);
const CLMatrixTorico    = conn.model("CLMatrixTorico",    clMatrixSchema);
const CLMatrixMultifocal= conn.model("CLMatrixMultifocal",clMatrixSchema);
const CLMatrixColorido  = conn.model("CLMatrixColorido",  clMatrixSchema);

module.exports = {
  InventorySheet,
  ContactLensesSheet,
  CatalogBase,
  CatalogTreatment,
  LaboratoryOrder,
  LaboratoryEvent,
  InventoryChangeLog,
  MatrixBase,
  MatrixSphCyl,
  MatrixBifocal,
  MatrixProgresivo,
  CLMatrixEsferico,
  CLMatrixTorico,
  CLMatrixMultifocal,
  CLMatrixColorido,
};
