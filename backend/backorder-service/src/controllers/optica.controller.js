/**
 * Controller thin para back orders de Óptica
 */

const backorderService = require("../services/backorder.service");
const paymentService = require("../services/payment.service");
const BackOrderOptica = require("../models/BackOrderOptica");

/**
 * POST /api/backorders/optica
 * Crear un nuevo back order de Óptica
 */
async function createBackOrder(req, res, next) {
  try {
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await backorderService.create(BackOrderOptica, req.body, actor);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/backorders/optica
 * Listar back orders de Óptica
 */
async function listBackOrders(req, res, next) {
  try {
    const docs = await backorderService.list(BackOrderOptica, req.query);
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/backorders/optica/:id
 * Obtener un back order específico
 */
async function getBackOrder(req, res, next) {
  try {
    const doc = await backorderService.getById(BackOrderOptica, req.params.id);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/backorders/optica/:id
 * Actualizar un back order (solo en SOLICITADO)
 */
async function updateBackOrder(req, res, next) {
  try {
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await backorderService.update(BackOrderOptica, req.params.id, req.body, actor);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/backorders/optica/:id/status
 * Cambiar estado del back order
 */
async function changeStatus(req, res, next) {
  try {
    const { status, notas = "", metadata = {} } = req.body;
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await backorderService.transition(BackOrderOptica, req.params.id, status, actor, { notas, metadata });
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/backorders/optica/:id/payments
 * Añadir un pago
 */
async function addPayment(req, res, next) {
  try {
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await paymentService.addPayment(BackOrderOptica, req.params.id, req.body, actor);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/backorders/optica/:id/payments/:paymentId
 * Elimina un pago capturado por error.
 */
async function deletePayment(req, res, next) {
  try {
    const actor = {
      userId: req.user?.id || null,
      name: req.user?.email || "Sistema",
    };
    const doc = await paymentService.deletePayment(
      BackOrderOptica, req.params.id, req.params.paymentId, actor
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
