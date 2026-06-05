// routes/optica/logs.routes.js — audit trail ordenado por día/mes/año
const express = require("express");
const router = express.Router();

const OpticaChangeLog = require("../../models/optica/OpticaChangeLog");
const { protect } = require("../../utils/auth");
const { COLLECTION_KEYS } = require("../../data/optica.constants");

router.use(protect(["admin", "root"]));

function formatDateKey(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// GET /logs — paginado, recientes primero
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50")));
    const filter = {};
    if (req.query.collection) filter.collection = req.query.collection;
    if (req.query.type) filter.type = req.query.type;

    const [total, logs] = await Promise.all([
      OpticaChangeLog.countDocuments(filter),
      OpticaChangeLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return res.json({ ok: true, data: logs, total, page, limit });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /logs/grouped — agrupado por DD/MM/YYYY (máx 500)
router.get("/grouped", async (req, res) => {
  try {
    const filter = {};
    if (req.query.collection) filter.collection = req.query.collection;
    if (req.query.type) filter.type = req.query.type;

    const logs = await OpticaChangeLog.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    const grouped = {};
    for (const log of logs) {
      const key = formatDateKey(log.createdAt);
      (grouped[key] ||= []).push(log);
    }
    const result = Object.entries(grouped).map(([date, entries]) => ({ date, entries }));
    return res.json({ ok: true, data: result, total: logs.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /logs/collection/:name
router.get("/collection/:name", async (req, res) => {
  try {
    if (!COLLECTION_KEYS.includes(req.params.name)) {
      return res.status(400).json({ ok: false, error: "Colección inválida" });
    }
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "30")));
    const filter = { collection: req.params.name };
    const [total, logs] = await Promise.all([
      OpticaChangeLog.countDocuments(filter),
      OpticaChangeLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return res.json({ ok: true, data: logs, total, page, limit });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
