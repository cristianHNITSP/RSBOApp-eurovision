// routes/equipos.routes.js
const express = require("express");
const router  = express.Router();
const { body, param, validationResult } = require("express-validator");

const Equipo          = require("../models/Equipo");
const { logMovement } = require("../utils/logHelper");
const { sanitizeMiddleware } = require("../utils/sanitizer");
const { protect }          = require("../utils/auth");

const COLLECTION = "equipos";
router.use(protect());
const TEXT_FIELDS = ["sku", "nombre", "marca", "modelo", "serie", "ubicacion", "estado", "observaciones"];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });
  next();
};

const bodyRules = [
  body("sku").notEmpty().trim().withMessage("SKU requerido"),
  body("nombre").notEmpty().trim().withMessage("Nombre requerido"),
  body("marca").notEmpty().trim().withMessage("Marca requerida"),
];

router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { isDeleted: false };
    if (q) filter.$or = [
      { sku:    { $regex: q, $options: "i" } },
      { nombre: { $regex: q, $options: "i" } },
      { marca:  { $regex: q, $options: "i" } },
      { serie:  { $regex: q, $options: "i" } },
    ];
    const items = await Equipo.find(filter)
      .collation({ locale: "es", strength: 1 })
      .sort({ createdAt: -1 })
      .lean();
    console.log(`[OPTICA][EQUIPOS] GET /  → ${items.length} items`);
    return res.json({ ok: true, data: items });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/trash", async (req, res) => {
  try {
    const items = await Equipo.find({ isDeleted: true }).sort({ deletedAt: -1 }).lean();
    return res.json({ ok: true, data: items });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/:id", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const item = await Equipo.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    return res.json({ ok: true, data: item });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/", bodyRules, sanitizeMiddleware(TEXT_FIELDS), validate, async (req, res) => {
  try {
    const fields = req.body;
    const actor = req.user;
    const exists = await Equipo.findOne({ sku: fields.sku });
    if (exists) return res.status(409).json({ ok: false, error: `SKU "${fields.sku}" ya existe` });
    const item = await Equipo.create(fields);
    console.log(`[OPTICA][EQUIPOS] POST / → Creado SKU ${item.sku} por ${actor?.name || "Sistema"}`);
    await logMovement(COLLECTION, item._id, item.sku, "CREATE", { fields }, actor);
    broadcast("INV_CHANGE", { collection: COLLECTION });
    return res.status(201).json({ ok: true, data: item.toJSON() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.put("/:id", param("id").isMongoId(), bodyRules, sanitizeMiddleware(TEXT_FIELDS), validate, async (req, res) => {
  try {
    const fields = req.body;
    const actor = req.user;
    const item = await Equipo.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (item.isDeleted) return res.status(410).json({ ok: false, error: "Elemento en papelera" });
    if (fields.sku && fields.sku !== item.sku) {
      const dup = await Equipo.findOne({ sku: fields.sku, _id: { $ne: item._id } });
      if (dup) return res.status(409).json({ ok: false, error: `SKU "${fields.sku}" ya existe` });
    }
    const before = item.toJSON();
    Object.assign(item, fields);
    await item.save();
    console.log(`[OPTICA][EQUIPOS] PUT /${req.params.id} → SKU ${item.sku} por ${actor?.name || "Sistema"}`);
    await logMovement(COLLECTION, item._id, item.sku, "UPDATE", { before, after: item.toJSON() }, actor);
    broadcast("INV_CHANGE", { collection: COLLECTION, id: String(item._id), newStock: item.stock });
    return res.json({ ok: true, data: item.toJSON() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PATCH estado (específico para equipos)
router.patch("/:id/estado", param("id").isMongoId(), body("estado").notEmpty(), validate, async (req, res) => {
  try {
    const { estado } = req.body;
    const actor = req.user;
    const item = await Equipo.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (item.isDeleted) return res.status(410).json({ ok: false, error: "Elemento en papelera" });
    const prevEstado = item.estado;
    item.estado = estado;
    await item.save();
    console.log(`[OPTICA][EQUIPOS] PATCH /${req.params.id}/estado → ${prevEstado} → ${estado}`);
    await logMovement(COLLECTION, item._id, item.sku, "UPDATE", { field: "estado", prevEstado, newEstado: estado }, actor);
    broadcast("INV_CHANGE", { collection: COLLECTION, id: String(item._id), newStock: item.stock });
    return res.json({ ok: true, data: item.toJSON() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete("/:id", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const actor = req.body?.actor || {};
    const item  = await Equipo.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (item.isDeleted) return res.status(410).json({ ok: false, error: "Ya está en papelera" });
    item.isDeleted = true;
    item.deletedAt = new Date();
    item.deletedBy = { userId: actor?.userId || null, name: actor?.name || "Sistema" };
    await item.save();
    console.log(`[OPTICA][EQUIPOS] DELETE /${req.params.id} (soft) → SKU ${item.sku}`);
    await logMovement(COLLECTION, item._id, item.sku, "SOFT_DELETE", { sku: item.sku, nombre: item.nombre }, actor);
    broadcast("INV_CHANGE", { collection: COLLECTION });
    return res.json({ ok: true, message: "Movido a papelera" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete("/:id/hard", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const actor = req.body?.actor || {};
    const item  = await Equipo.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    const snapshot = { sku: item.sku, nombre: item.nombre, serie: item.serie };
    await logMovement(COLLECTION, item._id, item.sku, "HARD_DELETE", { snapshot }, actor);
    await item.deleteOne();
    console.log(`[OPTICA][EQUIPOS] DELETE /${req.params.id}/hard → SKU ${snapshot.sku} ELIMINADO`);
    return res.json({ ok: true, message: "Eliminado permanentemente" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch("/:id/restore", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const actor = req.body?.actor || {};
    const item  = await Equipo.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (!item.isDeleted) return res.status(400).json({ ok: false, error: "No está en papelera" });
    item.isDeleted = false;
    item.deletedAt = null;
    item.deletedBy = { userId: null, name: null };
    await item.save();
    console.log(`[OPTICA][EQUIPOS] PATCH /${req.params.id}/restore → SKU ${item.sku} restaurado`);
    await logMovement(COLLECTION, item._id, item.sku, "RESTORE", { sku: item.sku }, actor);
    broadcast("INV_CHANGE", { collection: COLLECTION });
    return res.json({ ok: true, data: item.toJSON(), message: "Restaurado correctamente" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
