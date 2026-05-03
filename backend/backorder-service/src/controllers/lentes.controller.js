/**
 * Controller thin para back orders de Lentes de Contacto
 */

const backorderService = require("../services/backorder.service");
const paymentService = require("../services/payment.service");
const BackOrderLentes = require("../models/BackOrderLentes");

/**
 * POST /api/backorders/lentes
 * Crear un nuevo back order de Lentes
 */
async function createBackOrder(req, res, next) {
  try {
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await backorderService.create(BackOrderLentes, req.body, actor);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/backorders/lentes
 * Listar back orders de Lentes
 */
async function listBackOrders(req, res, next) {
  try {
    const docs = await backorderService.list(BackOrderLentes, req.query);
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/backorders/lentes/:id
 * Obtener un back order específico
 */
async function getBackOrder(req, res, next) {
  try {
    const doc = await backorderService.getById(BackOrderLentes, req.params.id);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/backorders/lentes/:id
 * Actualizar un back order (solo en SOLICITADO)
 */
async function updateBackOrder(req, res, next) {
  try {
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await backorderService.update(BackOrderLentes, req.params.id, req.body, actor);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/backorders/lentes/:id/status
 * Cambiar estado del back order
 */
async function changeStatus(req, res, next) {
  try {
    const { status, notas = "", metadata = {} } = req.body;
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await backorderService.transition(BackOrderLentes, req.params.id, status, actor, { notas, metadata });
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/backorders/lentes/:id/payments
 * Añadir un pago
 */
async function addPayment(req, res, next) {
  try {
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await paymentService.addPayment(BackOrderLentes, req.params.id, req.body, actor);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/backorders/lentes/:id/payments/:paymentId
 * Elimina un pago capturado por error.
 */
async function deletePayment(req, res, next) {
  try {
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await paymentService.deletePayment(
      BackOrderLentes, req.params.id, req.params.paymentId, actor
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
