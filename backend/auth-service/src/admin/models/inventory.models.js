const mongoose = require("mongoose");
const { Mixed, ObjectId } = mongoose.Schema.Types;

const registerInventoryModels = (conn) => {
  if (!conn) return null;

  const PartySchema = { id: String, name: { type: String, default: "" } };
  const ActorSchema = { userId: String, name: String };

  // ─── InventorySheet ───────────────────────────────────────────────────────
  const InventorySheet = conn.model("InventorySheet", new mongoose.Schema({
    nombre:         { type: String, required: true },
    proveedor:      PartySchema,
    marca:          PartySchema,
    sku:            { type: String, unique: true },
    tipo_matriz:    { type: String, enum: ["BASE", "SPH_CYL", "SPH_ADD", "BASE_ADD"] },
    baseKey:        String,
    material:       String,
    tratamiento:    String,
    variante:       String,
    tratamientos:   [String],
    fechaCreacion:  Date,
    fechaCaducidad: Date,
    numFactura:     String,
    loteProducto:   String,
    fechaCompra:    Date,
    precioVenta:    { type: Number, default: 0 },
    precioCompra:   { type: Number, default: 0 },
    isDeleted:      { type: Boolean, default: false },
    deletedAt:      Date,
    meta:           { observaciones: String, notas: String },
  }, { timestamps: true }));

  // ─── ContactLensesSheet ───────────────────────────────────────────────────
  const ContactLensesSheet = conn.model("ContactLensesSheet", new mongoose.Schema({
    nombre:        { type: String, required: true },
    proveedor:     PartySchema,
    marca:         PartySchema,
    sku:           { type: String, unique: true },
    tipo_matriz:   { type: String, enum: ["BASE", "SPH_CYL", "SPH_ADD", "BASE_ADD"] },
    baseKey:       String,
    material:      String,
    stock:         { type: Number, default: 0 },
    precioVenta:   { type: Number, default: 0 },
    isDeleted:     { type: Boolean, default: false },
  }, { timestamps: true }));

  // ─── CatalogBase ──────────────────────────────────────────────────────────
  const CatalogBase = conn.model("CatalogBase", new mongoose.Schema({
    key:         { type: String, required: true },
    label:       String,
    tipo_matriz: { type: String, enum: ["BASE", "SPH_CYL", "SPH_ADD", "BASE_ADD"] },
    orden:       Number,
    activo:      { type: Boolean, default: true },
    materiales:  [String],
    tratamientos:[String],
  }, { timestamps: true }));

  // ─── CatalogTreatment ─────────────────────────────────────────────────────
  const CatalogTreatment = conn.model("CatalogTreatment", new mongoose.Schema({
    key:               { type: String, required: true, unique: true },
    label:             { type: String, required: true },
    orden:             { type: Number, default: 0 },
    activo:            { type: Boolean, default: true },
    variants:          [String],
    variantsByMaterial:Mixed,
    allowedMaterials:  [String],
    allowedBases:      [String],
  }, { timestamps: true }));





  // ─── InventoryChangeLog ───────────────────────────────────────────────────
  const InventoryChangeLog = conn.model("InventoryChangeLog", new mongoose.Schema({
    sheet:       { type: ObjectId, ref: "InventorySheet" },
    item:        ObjectId,
    tipo_matriz: { type: String, enum: ["BASE", "SPH_CYL", "SPH_CYL_AXIS", "SPH_ADD", "BASE_ADD"] },
    sph:  Number, cyl: Number, add: Number, base: Number,
    eye:  { type: String, enum: ["OD", "OI", null], default: null },
    base_izq: Number, base_der: Number,
    type:    { type: String, required: true },
    details: Mixed,
    actor:   ActorSchema,
  }, { timestamps: true }));



  // ─── Sequence ─────────────────────────────────────────────────────────────
  const Sequence = conn.model("Sequence", new mongoose.Schema({
    name:  { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
  }, { timestamps: true }));

  // ─── Matrices (InventorySheet) ─────────────────────────────────────────────
  const matrixSheetSchema = (tipoMatriz) => new mongoose.Schema({
    sheet:       { type: ObjectId, ref: "InventorySheet", required: true, unique: true },
    tipo_matriz: { type: String, default: tipoMatriz },
    cells:       Mixed,
  }, { timestamps: true });

  const MatrixBase       = conn.model("MatrixBase",       matrixSheetSchema("BASE"));
  const MatrixSphCyl     = conn.model("MatrixSphCyl",     matrixSheetSchema("SPH_CYL"));
  const MatrixBifocal    = conn.model("MatrixBifocal",    matrixSheetSchema("SPH_ADD"));
  const MatrixProgresivo = conn.model("MatrixProgresivo", matrixSheetSchema("BASE_ADD"));

  // ─── CLMatrices (ContactLensesSheet) ─────────────────────────────────────
  const clMatrixSchema = (tipoMatriz) => new mongoose.Schema({
    sheet:       { type: ObjectId, ref: "ContactLensesSheet", required: true, unique: true },
    tipo_matriz: { type: String, default: tipoMatriz },
    cells:       Mixed,
  }, { timestamps: true });

  const CLMatrixEsferico   = conn.model("CLMatrixEsferico",   clMatrixSchema("BASE"));
  const CLMatrixTorico     = conn.model("CLMatrixTorico",     clMatrixSchema("SPH_CYL_AXIS"));
  const CLMatrixMultifocal = conn.model("CLMatrixMultifocal", clMatrixSchema("BASE_ADD"));
  const CLMatrixColorido   = conn.model("CLMatrixColorido",   clMatrixSchema("SPH_CYL"));

  return {
    InventorySheet,
    ContactLensesSheet,
    CatalogBase,
    CatalogTreatment,
    InventoryChangeLog,
    Sequence,
    MatrixBase,
    MatrixSphCyl,
    MatrixBifocal,
    MatrixProgresivo,
    CLMatrixEsferico,
    CLMatrixTorico,
    CLMatrixMultifocal,
    CLMatrixColorido,
  };
};

module.exports = { registerInventoryModels };
