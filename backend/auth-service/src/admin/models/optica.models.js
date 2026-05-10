const mongoose = require("mongoose");
const { Mixed, ObjectId } = mongoose.Schema.Types;

const registerOpticaModels = (conn) => {
  if (!conn) return null;

  // ─── Armazon ──────────────────────────────────────────────────────────────
  const Armazon = conn.models.Armazon || conn.model("Armazon", new mongoose.Schema({
    sku:      { type: String, required: true, unique: true },
    marca:    { type: String, required: true },
    modelo:   { type: String, required: true },
    color:    String,
    material: { type: String, enum: ["Acetato", "Metal", "Titanio", "TR90", "Otro"] },
    tipo:     { type: String, enum: ["Completo", "Ranurado", "Tres Piezas"] },
    genero:   { type: String, enum: ["Hombre", "Mujer", "Unisex", "Infantil"] },
    talla:    String,
    serie:    String,
    precio:   { type: Number, required: true },
    stock:    { type: Number, required: true, default: 0 },
    estuche:  { type: Boolean, default: false },
    notas:    String,
    isDeleted:{ type: Boolean, default: false },
    deletedAt:Date,
  }, { timestamps: true }));

  // ─── Sale ─────────────────────────────────────────────────────────────────
  const Sale = conn.models.Sale || conn.model("Sale", new mongoose.Schema({
    folio:        { type: String, required: true, unique: true },
    cliente:      { type: String, required: true },
    clientePhone: String,
    items: [{
      collection:  String,
      documentId:  ObjectId,
      sku:         String,
      description: String,
      qty:         Number,
      precio:      Number
    }],
    total:        { type: Number, default: 0 },
    pago:         [String],
    actor: {
      userId: String,
      name:   String
    }
  }, { timestamps: true }));

  // ─── Lente de Contacto ─────────────────────────────────────────────────────
  const LenteContacto = conn.models.LenteContacto || conn.model("LenteContacto", new mongoose.Schema({
    sku:        { type: String, required: true, unique: true },
    marca:      { type: String, required: true },
    nombre:     { type: String, required: true },
    tipo:       { type: String, enum: ["Esferico", "Torico", "Multifocal", "Colorido", "Otro"] },
    material:   { type: String, enum: ["Hidrogel", "Silicona-Hidrogel", "HEMA", "Polímero", "Otro"] },
    bc:         Number,
    dia:        Number,
    graduacion: String,
    duracion:   { type: String, enum: ["Diario", "Quincenal", "Mensual", "Anual", "Otro"] },
    stock:      { type: Number, required: true, default: 0 },
    precio:     { type: Number, required: true },
    caducidad:  Date,
    notas:      String,
    isDeleted:  { type: Boolean, default: false },
  }, { timestamps: true }));

  // ─── Solucion ──────────────────────────────────────────────────────────────
  const Solucion = conn.models.Solucion || conn.model("Solucion", new mongoose.Schema({
    sku:      { type: String, required: true, unique: true },
    nombre:   { type: String, required: true },
    tipo:     { type: String, enum: ["Solucion multiusos", "Solucion salina", "Gotas lubricantes", "Solucion peroxido", "Otro"] },
    marca:    { type: String, required: true },
    volumen:  Number,
    stock:    { type: Number, required: true, default: 0 },
    precio:   { type: Number, required: true },
    caducidad:Date,
    isDeleted:{ type: Boolean, default: false },
  }, { timestamps: true }));

  // ─── Accesorio ─────────────────────────────────────────────────────────────
  const Accesorio = conn.models.Accesorio || conn.model("Accesorio", new mongoose.Schema({
    sku:       { type: String, required: true, unique: true },
    nombre:    { type: String, required: true },
    categoria: { type: String, enum: ["Paño", "Cadena", "Plaquetas", "Tornillos", "Limpiador", "Almohadillas", "Herramienta", "Otro"] },
    marca:     String,
    stock:     { type: Number, required: true, default: 0 },
    precio:    { type: Number, required: true },
    isDeleted: { type: Boolean, default: false },
  }, { timestamps: true }));

  // ─── Estuche ───────────────────────────────────────────────────────────────
  const Estuche = conn.models.Estuche || conn.model("Estuche", new mongoose.Schema({
    sku:    { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    marca:  String,
    stock:  { type: Number, required: true, default: 0 },
    precio: { type: Number, required: true },
  }, { timestamps: true }));

  // ─── Equipo ────────────────────────────────────────────────────────────────
  const Equipo = conn.models.Equipo || conn.model("Equipo", new mongoose.Schema({
    sku:    { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    marca:  String,
    estado: { type: String, enum: ["Nuevo", "Usado", "Mantenimiento", "Baja"] },
    notas:  String,
  }, { timestamps: true }));

  // ─── ChangeLog ─────────────────────────────────────────────────────────────
  const OpticaChangeLog = conn.models.OpticaChangeLog || conn.model("OpticaChangeLog", new mongoose.Schema({
    type:    String,
    details: Mixed,
    actor: {
      userId: String,
      name:   String
    }
  }, { timestamps: true }));

  return { Armazon, Sale, Accesorio, Estuche, Equipo, LenteContacto, Solucion, OpticaChangeLog };
};

module.exports = { registerOpticaModels };
