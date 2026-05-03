const express = require("express");
const { protect } = require("../utils/auth");
const ctrl = require("../controllers/list.controller");

const router = express.Router();

// Acceso restringido a estos 4 roles (root incluido para scripts/admin)
const ALLOWED_ROLES = ["root", "eurovision", "supervisor", "ventas"];
router.use(protect(ALLOWED_ROLES));

/**
 * GET /api/backorders
 * Lista todos los back orders (cross-catálogo)
 */
router.get("/", ctrl.listAll);

/**
 * GET /api/backorders/stats
 * Obtiene estadísticas de back orders
 */
router.get("/stats", ctrl.getStats);

module.exports = router;
