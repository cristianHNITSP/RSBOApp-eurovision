/**
 * Servicio genérico de back orders
 * Reutilizable para los 3 modelos (BasesMicas, Lentes, Óptica)
 */

const { generateFolio } = require("../utils/folio");
const { canTransition, StateError } = require("../utils/lifecycle");
const { recalcBalances } = require("./payment.service");

let _ws;
function ws() {
  if (_ws) return _ws;
  try { _ws = require("../ws"); } catch { _ws = { broadcast: () => {} }; }
  return _ws;
}

const SUBPREFIX = {
  BASES_MICAS:     "BM",
  LENTES_CONTACTO: "LC",
  OPTICA:          "OP",
};

/**
 * Crea un nuevo back order
 * @param {mongoose.Model} Model - Modelo del back order
 * @param {Object} payload - Datos del nuevo back order
 * @param {Object} actor - Usuario que crea
 * @returns {Promise<Object>}
 */
async function create(Model, payload, actor) {
  const categoryName = Model.schema.path("category").defaultValue;
  const folio = await generateFolio(`BO-${SUBPREFIX[categoryName]}`, Model);
  
  const doc = new Model({
    ...payload,
    folio,
    status: "SOLICITADO",
    fechaSolicitud: new Date(),
    eventos: [{ estado: "SOLICITADO", estadoPrev: null, actor, fecha: new Date() }],
    createdBy: actor,
    updatedBy: actor,
  });
  
  recalcBalances(doc);
  await doc.save();
  
  ws().broadcast("BACKORDER_CREATED", {
    id: String(doc._id),
    folio: doc.folio,
    category: doc.category
  });
  
  return doc.toObject();
}

/**
 * Transiciona un back order a un nuevo estado
 * @param {mongoose.Model} Model - Modelo del back order
 * @param {string} id - ID del back order
 * @param {string} newStatus - Nuevo estado
 * @param {Object} actor - Usuario que realiza la transición
 * @param {Object} opts - Opciones (notas, metadata)
 * @returns {Promise<Object>}
 */
async function transition(Model, id, newStatus, actor, opts = {}) {
  const doc = await Model.findById(id);
  if (!doc) throw Object.assign(new Error("BackOrder no encontrado"), { status: 404 });

  if (!canTransition(doc.status, newStatus)) {
    throw new StateError(doc.status, newStatus);
  }

  // Validaciones por estado de destino (V6, V7 del plan)
  if (newStatus === "PEDIDO_PROVEEDOR") {
    const provName = (opts.metadata?.proveedor?.nombre ?? doc.proveedor?.nombre ?? "").trim();
    if (!provName) {
      throw Object.assign(
        new Error("Para pasar a PEDIDO_PROVEEDOR se requiere proveedor.nombre"),
        { status: 409, code: "PROVEEDOR_REQUIRED" }
      );
    }
  }
  if (newStatus === "ENTREGADO" && Number(doc.saldoPendiente || 0) > 0 && !opts.forceClose) {
    throw Object.assign(
      new Error(`Saldo pendiente: ${doc.saldoPendiente}. Registra el pago final o pasa forceClose=true`),
      { status: 409, code: "PENDING_BALANCE" }
    );
  }

  const prev = doc.status;
  doc.status = newStatus;
  doc.updatedBy = actor;
  doc.eventos.push({
    estado: newStatus,
    estadoPrev: prev,
    actor,
    fecha: new Date(),
    notas: opts.notas || "",
    metadata: opts.metadata || {},
  });

  // Side-effects por estado
  const now = new Date();
  if (newStatus === "PEDIDO_PROVEEDOR") {
    doc.fechaPedidoProveedor = now;
    if (opts.metadata?.folioProveedor) doc.proveedor.folioProveedor = opts.metadata.folioProveedor;
    if (opts.metadata?.fechaEntregaEstimada) doc.fechaEntregaEstimada = new Date(opts.metadata.fechaEntregaEstimada);
    if (opts.metadata?.precioFinal != null) doc.precioFinal = Number(opts.metadata.precioFinal);
  }
  if (newStatus === "RECIBIDO")      doc.fechaRecepcion = now;
  if (newStatus === "LISTO_ENTREGA") doc.fechaListo = now;
  if (newStatus === "ENTREGADO")     doc.fechaEntrega = now;
  if (newStatus === "CANCELADO") {
    doc.fechaCancelacion = now;
    doc.motivoCancelacion = opts.notas || null;
  }

  recalcBalances(doc);
  await doc.save();

  ws().broadcast("BACKORDER_STATUS_CHANGED", {
    id: String(doc._id),
    folio: doc.folio,
    category: doc.category,
    from: prev,
    to: newStatus,
  });

  // Notificación cuando llega al cliente
  if (newStatus === "LISTO_ENTREGA") {
    await tryNotify({
      groupKey: `backorder_listo:${doc._id}`,
      title:    `Encargo listo: ${doc.folio}`,
      message:  `${doc.cliente.nombre} — ${doc.category}`,
      type:     "info",
      targetRoles: ["root", "eurovision", "supervisor", "ventas"],
    });
  }

  return doc.toObject();
}

/**
 * Actualiza un back order (solo editable en SOLICITADO)
 * @param {mongoose.Model} Model - Modelo del back order
 * @param {string} id - ID del back order
 * @param {Object} patch - Cambios a aplicar
 * @param {Object} actor - Usuario que realiza la acción
 * @returns {Promise<Object>}
 */
async function update(Model, id, patch, actor) {
  const doc = await Model.findById(id);
  if (!doc) throw Object.assign(new Error("BackOrder no encontrado"), { status: 404 });
  
  if (!["SOLICITADO"].includes(doc.status)) {
    throw Object.assign(new Error("Solo editable en estado SOLICITADO"), { status: 409, code: "LOCKED" });
  }
  
  const allowed = ["cliente", "proveedor", "item", "precioEstimado", "fechaEntregaEstimada", "notas"];
  for (const k of allowed) {
    if (patch[k] !== undefined) doc[k] = patch[k];
  }
  
  doc.updatedBy = actor;
  recalcBalances(doc);
  await doc.save();
  return doc.toObject();
}

/**
 * Lista back orders con filtros y paginación
 * @param {mongoose.Model} Model - Modelo del back order
 * @param {Object} filters - Filtros (status, fecha, cliente, search)
 * @returns {Promise<Array>}
 */
async function list(Model, filters = {}) {
  const { status, search, sortBy = "-createdAt" } = filters;
  const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
  const page  = Math.max(1, Number(filters.page) || 1);
  const skip  = filters.skip != null ? Math.max(0, Number(filters.skip) || 0) : (page - 1) * limit;

  const query = {};
  if (status) query.status = status;
  if (search) query.$text = { $search: search };

  const [docs, total] = await Promise.all([
    Model.find(query).sort(sortBy).skip(skip).limit(limit).lean(),
    Model.countDocuments(query),
  ]);

  return {
    docs,
    meta: { total, page, limit, pages: Math.ceil(total / limit) || 1, skip },
  };
}

/**
 * Obtiene un back order por ID
 * @param {mongoose.Model} Model - Modelo del back order
 * @param {string} id - ID del back order
 * @returns {Promise<Object|null>}
 */
async function getById(Model, id) {
  const doc = await Model.findById(id).lean();
  if (!doc) throw Object.assign(new Error("BackOrder no encontrado"), { status: 404 });
  return doc;
}

/**
 * Intenta enviar una notificación persistente
 * @param {Object} payload - Datos de la notificación
 */
async function tryNotify(payload) {
  try {
    await require("./notifClient").upsertDaily(payload);
  } catch (_) {
    // noop
  }
}

module.exports = { create, transition, update, list, getById };
