// routes/logs.routes.js — consulta de audit trail ordenado por día/mes/año
const express = require("express");
const router  = express.Router();

const OpticaChangeLog = require("../models/OpticaChangeLog");
const { protect }      = require("../utils/auth");

// Todas las rutas de logs requieren ser Admin o Root
router.use(protect(["admin", "root"]));

/**
 * Formatea fecha como "DD/MM/YYYY" para agrupación legible.
 */
function formatDateKey(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ── GET /logs — todos los logs (paginado, recientes primero) ─────────────
router.get("/", async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50")));
    const skip  = (page - 1) * limit;

    const { collection, type } = req.query;
    const filter = {};
    if (collection) filter.collection = collection;
    if (type)       filter.type = type;

    const [total, logs] = await Promise.all([
      OpticaChangeLog.countDocuments(filter),
      OpticaChangeLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    console.log(`[OPTICA][LOGS] GET /  → ${logs.length}/${total} logs (page ${page})`);
    return res.json({ ok: true, data: logs, total, page, limit });
  } catch (err) {
    console.error("[OPTICA][LOGS] GET / error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /logs/grouped — logs agrupados por DD/MM/YYYY ───────────────────
router.get("/grouped", async (req, res) => {
  try {
    const { collection, type } = req.query;
    const filter = {};
    if (collection) filter.collection = collection;
    if (type)       filter.type = type;

    // Máximo 500 entradas para agrupación
    const logs = await OpticaChangeLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    // Agrupar por DD/MM/YYYY
    const grouped = {};
    for (const log of logs) {
      const key = formatDateKey(log.createdAt);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(log);
    }

    // Convertir a array ordenado (más reciente primero)
    const result = Object.entries(grouped).map(([date, entries]) => ({ date, entries }));

    console.log(`[OPTICA][LOGS] GET /grouped → ${result.length} días`);
    return res.json({ ok: true, data: result, total: logs.length });
  } catch (err) {
    console.error("[OPTICA][LOGS] GET /grouped error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /logs/collection/:name — logs de una colección específica ────────
router.get("/collection/:name", async (req, res) => {
  try {
    const validCollections = ["armazones", "lentes", "soluciones", "accesorios", "estuches", "equipos"];
    if (!validCollections.includes(req.params.name)) {
      return res.status(400).json({ ok: false, error: "Colección inválida" });
    }

    const page  = Math.max(1, parseInt(req.query.page  || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "30")));
    const skip  = (page - 1) * limit;

    const filter = { collection: req.params.name };
    const [total, logs] = await Promise.all([
      OpticaChangeLog.countDocuments(filter),
      OpticaChangeLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    console.log(`[OPTICA][LOGS] GET /collection/${req.params.name} → ${logs.length}/${total}`);
    return res.json({ ok: true, data: logs, total, page, limit });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
