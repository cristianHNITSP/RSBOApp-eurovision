// src/routes/Search.routes.js
/**
 * @fileoverview Búsqueda global — ruta THIN.
 * Toda la lógica vive en services/search (providers + registry).
 *
 * GET /api/search?q=<texto>&limit=<n>
 * Response: { routes?, sheets?, diopters?, optica? }  (grupos vacíos omitidos)
 */
const express = require("express");
const router = express.Router();
const { protect } = require("../utils/auth");
const { query, runValidation } = require("../validators/_helpers");
const searchService = require("../services/search/search.service");

router.get("/", protect(),
  query("q").optional().isString().isLength({ max: 100 }).withMessage("q máx 100 caracteres"),
  query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("limit entre 1 y 50"),
  runValidation,
  async (req, res) => {
  try {
    const groups = await searchService.run(req.query.q, req.query.limit);
    return res.json(groups);
  } catch (err) {
    console.error("Error en búsqueda global:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
