const express = require("express");
const { protect } = require("../utils/auth");
const ctrl = require("../controllers/lentes.controller");

const router = express.Router();

// Acceso restringido a estos 4 roles (root incluido para scripts/admin)
const ALLOWED_ROLES = ["root", "eurovision", "supervisor", "ventas"];
router.use(protect(ALLOWED_ROLES));

/**
 * POST /api/backorders/lentes
 * Crear un nuevo back order
 */
router.post("/", ctrl.createBackOrder);

/**
 * GET /api/backorders/lentes
 * Listar back orders
 */
router.get("/", ctrl.listBackOrders);

/**
 * GET /api/backorders/lentes/:id
 * Obtener un back order específico
 */
router.get("/:id", ctrl.getBackOrder);

/**
 * PATCH /api/backorders/lentes/:id
 * Actualizar un back order
 */
router.patch("/:id", ctrl.updateBackOrder);

/**
 * PATCH /api/backorders/lentes/:id/status
 * Cambiar estado del back order
 */
router.patch("/:id/status", ctrl.changeStatus);

/**
 * POST /api/backorders/lentes/:id/payments
 * Añadir un pago
 */
router.post("/:id/payments", ctrl.addPayment);

/**
 * DELETE /api/backorders/lentes/:id/payments/:paymentId
 * Eliminar un pago (corrección de captura)
 */
router.delete("/:id/payments/:paymentId", ctrl.deletePayment);

module.exports = router;
