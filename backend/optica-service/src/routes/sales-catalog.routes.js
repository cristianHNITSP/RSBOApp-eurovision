const express = require("express");
const router = express.Router();
const salesCatalogController = require("../controllers/sales-catalog.controller");
const { protect } = require("../utils/auth");

/**
 * GET /api/optica/sales-catalog/items
 */
router.get("/items", protect(), salesCatalogController.getItems);
router.patch("/items/:sku/stock", protect(), salesCatalogController.updateStock);

module.exports = router;
