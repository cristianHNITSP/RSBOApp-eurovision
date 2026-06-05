const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Modelos de óptica para AdminJS.
 *
 * La óptica se consolidó en inventory-service: una sola colección `opticaproducts`
 * con discriminators (clave `__t`). Estos modelos reflejan EXACTAMENTE el schema de
 * inventory-service (backend/inventory-service/src/models/optica/OpticaProduct.js)
 * para que AdminJS lea/escriba los mismos documentos.
 */

const ENUMS = {
  ARMAZON_MATERIAL: ["Acetato", "Metal", "TR-90", "Titanio", "Combinado", "Madera", "Otro"],
  ARMAZON_TIPO: ["Completo", "Al aire", "Semi-al-aire", "Deportivo", "Infantil", "Otro"],
  GENERO: ["Hombre", "Mujer", "Unisex", "Infantil"],
  SOLUCION_TIPO: ["Solucion multiusos", "Solucion salina", "Gotas lubricantes", "Solucion peroxido", "Otro"],
  ACCESORIO_CATEGORIA: ["Paño", "Cadena", "Plaquetas", "Tornillos", "Limpiador", "Almohadillas", "Herramienta", "Otro"],
  ESTUCHE_TIPO: ["Rigido", "Blando", "Plegable", "Deportivo", "Lentes de contacto", "Otro"],
  EQUIPO_TIPO: ["Diagnóstico", "Medición", "Taller", "Laboratorio", "Otro"],
  EQUIPO_ESTADO: ["Operativo", "Mantenimiento", "Fuera de servicio", "Baja"],
  LENTE_TIPO: ["Esferico", "Torico", "Multifocal", "Colorido", "Otro"],
  LENTE_MATERIAL: ["Hidrogel", "Silicona-Hidrogel", "HEMA", "Polímero", "Otro"],
  LENTE_DURACION: ["Diario", "Quincenal", "Mensual", "Anual", "Otro"],
};

const COLLECTION_KEYS = ["armazones", "lentes", "soluciones", "accesorios", "estuches", "equipos"];

const registerOpticaModels = (conn) => {
  if (!conn) return null;

  const deletedBy = {
    userId: { type: String, default: null },
    name:   { type: String, default: null },
  };

  // ─── Schema base (discriminator) ──────────────────────────────────────────
  const baseSchema = new Schema(
    {
      sku:       { type: String, required: true, unique: true, trim: true },
      notas:     { type: String, default: "" },
      stock:     { type: Number, min: 0, default: 0 },
      precio:    { type: Number, min: 0 },
      isDeleted: { type: Boolean, default: false, index: true },
      deletedAt: { type: Date, default: null },
      deletedBy,
    },
    {
      timestamps: true,
      discriminatorKey: "__t",
      collection: "opticaproducts",
      suppressReservedKeysWarning: true,
    }
  );

  // ─── SKU auto-generado e inmutable (comparte el contador "sequences" con la API REST) ──
  const SKU_PREFIX = { Armazon: "ARM", LenteContacto: "LEN", Solucion: "SOL", Accesorio: "ACC", Estuche: "EST", Equipo: "EQP" };
  const Sequence = conn.models.Sequence || conn.model("Sequence", new Schema(
    { name: { type: String, required: true, unique: true }, value: { type: Number, default: 0 } },
    { timestamps: true, collection: "sequences" }
  ));
  const genOpticaSku = async (prefix) => {
    const s = await Sequence.findOneAndUpdate(
      { name: `OPTICA_${prefix}` }, { $inc: { value: 1 } }, { new: true, upsert: true, lean: true }
    );
    return `${prefix}-${String(s.value).padStart(6, "0")}`;
  };
  baseSchema.pre("validate", async function () {
    if (this.isNew && !this.sku) this.sku = await genOpticaSku(SKU_PREFIX[this.__t] || "OPT");
  });
  baseSchema.pre("save", function (next) {
    if (!this.isNew && this.isModified("sku")) return next(new Error("El SKU es inmutable"));
    next();
  });

  const OpticaProduct = conn.models.OpticaProduct || conn.model("OpticaProduct", baseSchema);

  const disc = (name, def) =>
    OpticaProduct.discriminators?.[name] ||
    OpticaProduct.discriminator(name, new Schema(def, { timestamps: true }));

  const Armazon = disc("Armazon", {
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

  const LenteContacto = disc("LenteContacto", {
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

  const Solucion = disc("Solucion", {
    nombre:    { type: String, required: true, trim: true },
    tipo:      { type: String, trim: true, default: "Solucion multiusos" },
    marca:     { type: String, required: true, trim: true },
    volumen:   { type: Number, required: true, min: 0 },
    caducidad: { type: Date, default: null },
    precio:    { type: Number, required: true, min: 0 },
    stock:     { type: Number, required: true, min: 0, default: 0 },
  });

  const Accesorio = disc("Accesorio", {
    nombre:     { type: String, required: true, trim: true },
    categoria:  { type: String, trim: true, default: "Otro" },
    marca:      { type: String, default: "Genérico", trim: true },
    compatible: { type: String, default: "Universal", trim: true },
    precio:     { type: Number, required: true, min: 0 },
    stock:      { type: Number, required: true, min: 0, default: 0 },
  });

  const Estuche = disc("Estuche", {
    nombre:     { type: String, required: true, trim: true },
    tipo:       { type: String, trim: true, default: "Rigido" },
    material:   { type: String, default: "", trim: true },
    color:      { type: String, default: "", trim: true },
    compatible: { type: String, default: "Universal", trim: true },
    precio:     { type: Number, required: true, min: 0 },
    stock:      { type: Number, required: true, min: 0, default: 0 },
  });

  const Equipo = disc("Equipo", {
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

  // ─── ChangeLog ─────────────────────────────────────────────────────────────
  const OpticaChangeLog = conn.models.OpticaChangeLog || conn.model("OpticaChangeLog", new Schema(
    {
      collection:  { type: String, required: true, enum: COLLECTION_KEYS, index: true },
      documentId:  { type: Schema.Types.ObjectId, required: true, index: true },
      documentSku: { type: String, default: null },
      type: {
        type: String,
        required: true,
        enum: ["CREATE", "UPDATE", "STOCK_UPDATE", "SOFT_DELETE", "HARD_DELETE", "RESTORE"],
      },
      details: { type: Schema.Types.Mixed, default: {} },
      actor: {
        userId: { type: String, default: null },
        name:   { type: String, default: "Sistema" },
      },
    },
    { timestamps: true, suppressReservedKeysWarning: true }
  ));

  return { OpticaProduct, Armazon, Accesorio, Estuche, Equipo, LenteContacto, Solucion, OpticaChangeLog };
};

module.exports = { registerOpticaModels };
