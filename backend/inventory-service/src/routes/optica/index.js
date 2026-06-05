/**
 * @fileoverview Router raíz del módulo Óptica (montado en /api/optica).
 *
 * Genera dinámicamente un router CRUD por cada categoría declarada en
 * OPTICA_CATEGORIES usando el factory, y añade endpoints transversales:
 *   - GET /buscar?q=     → búsqueda global sobre todas las categorías
 *   - GET /categorias    → registro de categorías activas (para el front)
 *   - /logs, /stats      → audit trail y resumen agregado
 */
const express = require("express");
const router = express.Router();

const { protect } = require("../../utils/auth");
const { OPTICA_CATEGORIES } = require("../../data/optica.constants");
const { OpticaProduct, MODEL_BY_KEY } = require("../../models/optica/OpticaProduct");
const OpticaCategory = require("../../models/optica/OpticaCategory");
const { makeOpticaCrud } = require("./_opticaCrudFactory");

const escapeRegExp = (s = "") => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const GLOBAL_SEARCH_FIELDS = ["sku", "marca", "nombre", "modelo"];

// ── GET /buscar — búsqueda global (todas las categorías) ─────────────────────
router.get("/buscar", protect(), async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ ok: true, data: [] });
    const rx = { $regex: escapeRegExp(q), $options: "i" };
    const items = await OpticaProduct.find({
      isDeleted: false,
      $or: GLOBAL_SEARCH_FIELDS.map((f) => ({ [f]: rx })),
    })
      .collation({ locale: "es", strength: 1 })
      .limit(50)
      .lean({ virtuals: true });
    // __t expone la categoría de cada resultado
    return res.json({ ok: true, data: items });
  } catch (err) {
    console.error("[OPTICA][BUSCAR] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /categorias — registro de categorías (control dinámico) ──────────────
router.get("/categorias", protect(), async (_req, res) => {
  try {
    const cats = await OpticaCategory.find({ active: true }).sort({ order: 1 }).lean();
    return res.json({ ok: true, data: cats });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Sub-routers transversales ────────────────────────────────────────────────
router.use("/logs", require("./logs.routes"));
router.use("/stats", require("./stats.routes"));

// ── CRUD dinámico por categoría ──────────────────────────────────────────────
for (const cfg of OPTICA_CATEGORIES) {
  const Model = MODEL_BY_KEY[cfg.key];
  if (!Model) {
    console.warn(`[OPTICA] Categoría "${cfg.key}" sin modelo discriminator — omitida`);
    continue;
  }
  router.use(`/${cfg.key}`, makeOpticaCrud(Model, cfg));
}

module.exports = router;
