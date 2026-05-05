/**
 * Controller thin para back orders de Bases y Micas
 */

const backorderService = require("../services/backorder.service");
const paymentService = require("../services/payment.service");
const BackOrderBasesMicas = require("../models/BackOrderBasesMicas");

/**
 * POST /api/backorders/bases-micas
 * Crear un nuevo back order de Bases y Micas
 */
async function createBackOrder(req, res, next) {
  try {
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await backorderService.create(BackOrderBasesMicas, req.body, actor);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/backorders/bases-micas
 * Listar back orders de Bases y Micas
 */
async function listBackOrders(req, res, next) {
  try {
    const docs = await backorderService.list(BackOrderBasesMicas, req.query);
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/backorders/bases-micas/:id
 * Obtener un back order específico
 */
async function getBackOrder(req, res, next) {
  try {
    const doc = await backorderService.getById(BackOrderBasesMicas, req.params.id);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/backorders/bases-micas/:id
 * Actualizar un back order (solo en SOLICITADO)
 */
async function updateBackOrder(req, res, next) {
  try {
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await backorderService.update(BackOrderBasesMicas, req.params.id, req.body, actor);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/backorders/bases-micas/:id/status
 * Cambiar estado del back order
 */
async function changeStatus(req, res, next) {
  try {
    const { status, notas = "", metadata = {} } = req.body;
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await backorderService.transition(BackOrderBasesMicas, req.params.id, status, actor, { notas, metadata });
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/backorders/bases-micas/:id/payments
 * Añadir un pago
 */
async function addPayment(req, res, next) {
  try {
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await paymentService.addPayment(BackOrderBasesMicas, req.params.id, req.body, actor);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/backorders/bases-micas/:id/payments/:paymentId
 * Elimina un pago capturado por error.
 */
async function deletePayment(req, res, next) {
  try {
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await paymentService.deletePayment(
      BackOrderBasesMicas, req.params.id, req.params.paymentId, actor
    );
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBackOrder,
  listBackOrders,
  getBackOrder,
  updateBackOrder,
  changeStatus,
  addPayment,
  deletePayment,
};
