const mongoose = require("mongoose");

const ActorSchema = new mongoose.Schema(
  { userId: { type: String, default: null }, name: { type: String, default: null } },
  { _id: false }
);

const ClienteSchema = new mongoose.Schema(
  {
    nombre:    { type: String, required: true, trim: true },
    telefono:  { type: String, default: null },
    email:     { type: String, default: null },
    empresa:   { type: String, default: null },
    notas:     { type: String, default: "" },
  },
  { _id: false }
);

const ProveedorSchema = new mongoose.Schema(
  {
    nombre:    { type: String, default: "" },
    contacto:  { type: String, default: null },
    telefono:  { type: String, default: null },
    email:     { type: String, default: null },
    folioProveedor: { type: String, default: null },
  },
  { _id: false }
);

// Sub-doc de pagos. Permite múltiples abonos.
const PagoSchema = new mongoose.Schema(
  {
    monto:        { type: Number, required: true, min: 0 },
    metodoPago:   { type: String, enum: ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"], required: true },
    tipo:         { type: String, enum: ["ANTICIPO", "ABONO", "PAGO_COMPLETO", "PAGO_FINAL", "REEMBOLSO"], required: true },
    fecha:        { type: Date, default: Date.now },
    referencia:   { type: String, default: null },
    notas:        { type: String, default: "" },
    actor:        { type: ActorSchema, default: () => ({}) },
  },
  { _id: true, timestamps: false }
);

// Eventos del ciclo de vida (auditoría inmutable)
const EventoEstadoSchema = new mongoose.Schema(
  {
    estado:    { type: String, required: true },
    estadoPrev:{ type: String, default: null },
    fecha:     { type: Date, default: Date.now },
    actor:     { type: ActorSchema, default: () => ({}) },
    notas:     { type: String, default: "" },
    metadata:  { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: true }
);

const STATUS_VALUES = ["SOLICITADO", "PEDIDO_PROVEEDOR", "RECIBIDO", "LISTO_ENTREGA", "ENTREGADO", "CANCELADO"];

/**
 * Devuelve el bloque de campos comunes a los 3 modelos
 */
function baseFields() {
  return {
    folio:    { type: String, required: true, unique: true, index: true },

    cliente:  { type: ClienteSchema, required: true },
    proveedor:{ type: ProveedorSchema, default: () => ({}) },

    status:   { type: String, enum: STATUS_VALUES, default: "SOLICITADO", index: true },

    precioEstimado: { type: Number, default: 0, min: 0 },
    precioFinal:    { type: Number, default: null, min: 0 },
    moneda:         { type: String, default: "MXN" },

    pagos:        { type: [PagoSchema], default: [] },
    totalPagado:    { type: Number, default: 0, min: 0 },
    saldoPendiente: { type: Number, default: 0 },

    fechaSolicitud:        { type: Date, default: Date.now },
    fechaPedidoProveedor:  { type: Date, default: null },
    fechaEntregaEstimada:  { type: Date, default: null },
    fechaRecepcion:        { type: Date, default: null },
    fechaListo:            { type: Date, default: null },
    fechaEntrega:          { type: Date, default: null },
    fechaCancelacion:      { type: Date, default: null },

    motivoCancelacion:     { type: String, default: null },

    createdBy: { type: ActorSchema, default: () => ({}) },
    updatedBy: { type: ActorSchema, default: () => ({}) },
    eventos:   { type: [EventoEstadoSchema], default: [] },

    notas:     { type: String, default: "", trim: true, maxlength: 1000 },
  };
}

module.exports = { baseFields, STATUS_VALUES, ActorSchema, ClienteSchema, ProveedorSchema, PagoSchema, EventoEstadoSchema };
