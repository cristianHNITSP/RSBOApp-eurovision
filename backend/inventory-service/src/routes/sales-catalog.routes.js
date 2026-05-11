const express = require("express");
const router = express.Router();
const { protect } = require("../utils/auth");
const salesCatalogController = require("../controllers/sales-catalog.controller");

/**
 * GET /api/inventory/sales-catalog/items
 * Obtiene ítems de una planilla de forma paginada y aplanada.
 */
router.get("/items", protect(), salesCatalogController.getItems);

/**
 * PATCH /api/inventory/sales-catalog/items/:sku/stock
 * Actualiza el stock de un ítem específico desde la vista de ventas o laboratorio.
 */
router.patch("/items/:sku/stock", protect(), salesCatalogController.updateStock);

module.exports = router;
