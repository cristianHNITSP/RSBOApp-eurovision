const mongoose = require("mongoose");
const { Mixed } = mongoose.Schema.Types;

const registerBackorderModels = (conn) => {
  if (!conn) return null;

  const STATUS_VALUES = ["SOLICITADO", "PEDIDO_PROVEEDOR", "RECIBIDO", "LISTO_ENTREGA", "ENTREGADO", "CANCELADO"];
  const PAGO_METODOS = ["EFECTIVO", "TARJETA_DEBITO", "TARJETA_CREDITO", "TRANSFERENCIA", "OTRO"];
  const PAGO_TIPOS = ["ANTICIPO", "LIQUIDACION", "ABONO"];

  const ActorSchema = { userId: String, name: String };
  const ClienteSchema = {
    nombre:   { type: String, required: true },
    telefono: String,
    email:    String,
    empresa:  String,
    notas:    String,
  };
  const ProveedorSchema = {
    nombre:         String,
    contacto:       String,
    telefono:       String,
    email:          String,
    folioProveedor: String,
  };
  const PagoSchema = new mongoose.Schema({
    monto:      Number,
    metodoPago: { type: String, enum: PAGO_METODOS },
    tipo:       { type: String, enum: PAGO_TIPOS },
    fecha:      { type: Date, default: Date.now },
    referencia: String,
    notas:      String,
    actor:      ActorSchema,
  });

  const baseSchema = {
    folio:                 { type: String, required: true, unique: true },
    cliente:               ClienteSchema,
    proveedor:             ProveedorSchema,
    status:                { type: String, enum: STATUS_VALUES, default: "SOLICITADO" },
    precioEstimado:        { type: Number, default: 0 },
    precioFinal:           Number,
    moneda:                { type: String, default: "MXN" },
    pagos:                 [PagoSchema],
    totalPagado:           { type: Number, default: 0 },
    saldoPendiente:        { type: Number, default: 0 },
    fechaSolicitud:        { type: Date, default: Date.now },
    fechaPedidoProveedor:  Date,
    fechaEntregaEstimada:  Date,
    fechaRecepcion:        Date,
    fechaListo:            Date,
    fechaEntrega:          Date,
    fechaCancelacion:      Date,
    createdBy:             ActorSchema,
    updatedBy:             ActorSchema,
    notas:                 String,
  };

  const BackOrderBasesMicas = conn.model("BackOrderBasesMicas", new mongoose.Schema({
    ...baseSchema,
    category: { type: String, default: "BASES_MICAS" },
    detalleLente: {
      material: String,
      tratamiento: String,
      graduacion: String,
    }
  }, { timestamps: true }));

  const BackOrderLentes = conn.model("BackOrderLentes", new mongoose.Schema({
    ...baseSchema,
    category: { type: String, default: "LENTES_CONTACTO" },
    detalleLente: {
      marca: String,
      tipo: String,
      graduacion: String,
    }
  }, { timestamps: true }));

  const BackOrderOptica = conn.model("BackOrderOptica", new mongoose.Schema({
    ...baseSchema,
    category: { type: String, default: "OPTICA" },
    items: Mixed
  }, { timestamps: true }));

  const Sequence = conn.model("Sequence", new mongoose.Schema({
    _id: String,
    seq: Number
  }));

  return { BackOrderBasesMicas, BackOrderLentes, BackOrderOptica, BackorderSequence: Sequence };
};

module.exports = { registerBackorderModels };
