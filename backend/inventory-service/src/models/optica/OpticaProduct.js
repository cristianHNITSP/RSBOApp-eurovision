/**
 * @fileoverview Modelo unificado de productos de óptica vía Mongoose discriminators.
 *
 * Una sola colección física (`opticaproducts`) con un discriminatorKey `__t`.
 * Cada categoría (Armazon, Solucion, ...) es un discriminator que añade sus campos
 * y validaciones a nivel de base de datos.
 *
 * - SKU único GLOBAL: el índice unique sobre `sku` es a nivel de colección, así que
 *   ninguna categoría puede repetir un SKU de otra.
 * - Bloqueo optimista: `optimisticConcurrency: true` hace que save() incremente y
 *   valide `__v`. Las rutas PUT lo refuerzan vía findOneAndUpdate({ _id, __v }).
 */

const mongoose = require("mongoose");
const { SKU_PREFIX_BY_MODEL } = require("../../data/optica.constants");
const { generateOpticaSku } = require("../../routes/optica/sku");

const { Schema } = mongoose;

// ─── Subdocumento de borrado lógico ──────────────────────────────────────────
const deletedBySchema = {
  userId: { type: String, default: null },
  name:   { type: String, default: null },
};

// ─── Schema base (campos comunes a TODAS las categorías) ─────────────────────
const baseSchema = new Schema(
  {
    sku:       { type: String, required: true, unique: true, trim: true },
    notas:     { type: String, default: "" },

    // stock/precio viven en la base como opcionales (Equipo no los usa);
    // las categorías que los requieren los marcan required en su discriminator.
    stock:     { type: Number, min: 0, default: 0 },
    precio:    { type: Number, min: 0 },

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: deletedBySchema,
  },
  {
    timestamps: true,
    discriminatorKey: "__t",
    optimisticConcurrency: true, // refuerza __v en save()
    collection: "opticaproducts",
  }
);

baseSchema.virtual("estado").get(function () {
  if (this.stock === 0) return "Agotado";
  if (this.stock <= 3) return "Bajo stock";
  return "Disponible";
});

baseSchema.set("toJSON", { virtuals: true });
baseSchema.set("toObject", { virtuals: true });

baseSchema.index({ isDeleted: 1, createdAt: -1 });

// ─── SKU auto-generado e inmutable ───────────────────────────────────────────
// Se genera en creación según el prefijo del discriminator; nunca lo pone el cliente.
baseSchema.pre("validate", async function () {
  if (this.isNew && !this.sku) {
    const prefix = SKU_PREFIX_BY_MODEL[this.__t] || "OPT";
    this.sku = await generateOpticaSku(prefix);
  }
});

// Inmutable: una vez creado, el SKU no puede cambiar.
baseSchema.pre("save", function (next) {
  if (!this.isNew && this.isModified("sku")) {
    return next(new Error("El SKU es inmutable y no puede modificarse"));
  }
  next();
});

const OpticaProduct =
  mongoose.models.OpticaProduct || mongoose.model("OpticaProduct", baseSchema);

// ─── Helper para registrar un discriminator de forma idempotente ─────────────
const defineDiscriminator = (name, definition) =>
  OpticaProduct.discriminators?.[name] ||
  OpticaProduct.discriminator(name, new Schema(definition, { timestamps: true }));

// ─── Armazon ─────────────────────────────────────────────────────────────────
const Armazon = defineDiscriminator("Armazon", {
  marca:   { type: String, required: true, trim: true },
  modelo:  { type: String, required: true, trim: true },
  color:   { type: String, default: "", trim: true },
  material:{ type: String, trim: true, default: "Otro" },
  tipo:    { type: String, trim: true, default: "Completo" },
  genero:  { type: String, trim: true, default: "Unisex" },
  talla:   { type: String, default: "", trim: true },
  serie:   { type: String, default: "", trim: true },
  estuche: { type: Boolean, default: false },
  precio:  { type: Number, required: true, min: 0 },
  stock:   { type: Number, required: true, min: 0, default: 0 },
});

// ─── LenteContacto ───────────────────────────────────────────────────────────
const LenteContacto = defineDiscriminator("LenteContacto", {
  marca:      { type: String, required: true, trim: true },
  nombre:     { type: String, required: true, trim: true },
  tipo:       { type: String, trim: true, default: "Esferico" },
  material:   { type: String, trim: true, default: "Hidrogel" },
  bc:         { type: Number, default: null },
  dia:        { type: Number, default: null },
  graduacion: { type: String, default: "", trim: true },
  duracion:   { type: String, trim: true, default: "Mensual" },
  caducidad:  { type: Date, default: null },
  precio:     { type: Number, required: true, min: 0 },
  stock:      { type: Number, required: true, min: 0, default: 0 },
});

// ─── Solucion ─────────────────────────────────────────────────────────────────
const Solucion = defineDiscriminator("Solucion", {
  nombre:    { type: String, required: true, trim: true },
  tipo:      { type: String, trim: true, default: "Solucion multiusos" },
  marca:     { type: String, required: true, trim: true },
  volumen:   { type: Number, required: true, min: 0 },
  caducidad: { type: Date, default: null },
  precio:    { type: Number, required: true, min: 0 },
  stock:     { type: Number, required: true, min: 0, default: 0 },
});

// ─── Accesorio ────────────────────────────────────────────────────────────────
const Accesorio = defineDiscriminator("Accesorio", {
  nombre:     { type: String, required: true, trim: true },
  categoria:  { type: String, trim: true, default: "Otro" },
  marca:      { type: String, default: "Genérico", trim: true },
  compatible: { type: String, default: "Universal", trim: true },
  precio:     { type: Number, required: true, min: 0 },
  stock:      { type: Number, required: true, min: 0, default: 0 },
});

// ─── Estuche ──────────────────────────────────────────────────────────────────
const Estuche = defineDiscriminator("Estuche", {
  nombre:     { type: String, required: true, trim: true },
  tipo:       { type: String, trim: true, default: "Rigido" },
  material:   { type: String, default: "", trim: true },
  color:      { type: String, default: "", trim: true },
  compatible: { type: String, default: "Universal", trim: true },
  precio:     { type: Number, required: true, min: 0 },
  stock:      { type: Number, required: true, min: 0, default: 0 },
});

// ─── Equipo (sin stock/precio) ─────────────────────────────────────────────────
const Equipo = defineDiscriminator("Equipo", {
  nombre:        { type: String, required: true, trim: true },
  tipo:          { type: String, trim: true, default: "Diagnóstico" },
  marca:         { type: String, required: true, trim: true },
  modelo:        { type: String, default: "", trim: true },
  serie:         { type: String, default: "", trim: true },
  estado:        { type: String, trim: true, default: "Operativo" },
  ubicacion:     { type: String, default: "", trim: true },
  adquisicion:   { type: Date, default: null },
  mantenimiento: { type: Date, default: null },
});

// Mapa key (ruta pública) → modelo discriminator
const MODEL_BY_KEY = {
  armazones: Armazon,
  lentes: LenteContacto,
  soluciones: Solucion,
  accesorios: Accesorio,
  estuches: Estuche,
  equipos: Equipo,
};

module.exports = {
  OpticaProduct,
  Armazon,
  LenteContacto,
  Solucion,
  Accesorio,
  Estuche,
  Equipo,
  MODEL_BY_KEY,
};
