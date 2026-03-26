// routes/accesorios.routes.js
const express = require("express");
const router  = express.Router();
const { body, param, validationResult } = require("express-validator");

const Accesorio       = require("../models/Accesorio");
const { logMovement } = require("../utils/logHelper");

const COLLECTION = "accesorios";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });
  next();
};

const bodyRules = [
  body("sku").notEmpty().trim().withMessage("SKU requerido"),
  body("nombre").notEmpty().trim().withMessage("Nombre requerido"),
  body("precio").isFloat({ min: 0 }).withMessage("Precio inválido"),
  body("stock").isInt({ min: 0 }).withMessage("Stock inválido"),
];

router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { isDeleted: false };
    if (q) filter.$or = [
      { sku:      { $regex: q, $options: "i" } },
      { nombre:   { $regex: q, $options: "i" } },
      { categoria:{ $regex: q, $options: "i" } },
    ];
    const items = await Accesorio.find(filter).sort({ createdAt: -1 }).lean();
    console.log(`[OPTICA][ACCESORIOS] GET /  → ${items.length} items`);
    return res.json({ ok: true, data: items });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/trash", async (req, res) => {
  try {
    const items = await Accesorio.find({ isDeleted: true }).sort({ deletedAt: -1 }).lean();
    return res.json({ ok: true, data: items });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/:id", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const item = await Accesorio.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    return res.json({ ok: true, data: item });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/", bodyRules, validate, async (req, res) => {
  try {
    const { actor, ...fields } = req.body;
    const exists = await Accesorio.findOne({ sku: fields.sku });
    if (exists) return res.status(409).json({ ok: false, error: `SKU "${fields.sku}" ya existe` });
    const item = await Accesorio.create(fields);
    console.log(`[OPTICA][ACCESORIOS] POST / → Creado SKU ${item.sku} por ${actor?.name || "Sistema"}`);
    await logMovement(COLLECTION, item._id, item.sku, "CREATE", { fields }, actor);
    return res.status(201).json({ ok: true, data: item.toJSON() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.put("/:id", param("id").isMongoId(), bodyRules, validate, async (req, res) => {
  try {
    const { actor, ...fields } = req.body;
    const item = await Accesorio.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (item.isDeleted) return res.status(410).json({ ok: false, error: "Elemento en papelera" });
    if (fields.sku && fields.sku !== item.sku) {
      const dup = await Accesorio.findOne({ sku: fields.sku, _id: { $ne: item._id } });
      if (dup) return res.status(409).json({ ok: false, error: `SKU "${fields.sku}" ya existe` });
    }
    const before = item.toJSON();
    Object.assign(item, fields);
    await item.save();
    await logMovement(COLLECTION, item._id, item.sku, "UPDATE", { before, after: item.toJSON() }, actor);
    return res.json({ ok: true, data: item.toJSON() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch("/:id/stock", param("id").isMongoId(), body("stock").isInt({ min: 0 }), validate, async (req, res) => {
  try {
    const { stock, actor } = req.body;
    const item = await Accesorio.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (item.isDeleted) return res.status(410).json({ ok: false, error: "Elemento en papelera" });
    const prevStock = item.stock;
    item.stock = stock;
    await item.save();
    await logMovement(COLLECTION, item._id, item.sku, "STOCK_UPDATE", { prevStock, newStock: stock }, actor);
    return res.json({ ok: true, data: item.toJSON() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete("/:id", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const actor = req.body?.actor || {};
    const item  = await Accesorio.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (item.isDeleted) return res.status(410).json({ ok: false, error: "Ya está en papelera" });
    item.isDeleted = true;
    item.deletedAt = new Date();
    item.deletedBy = { userId: actor?.userId || null, name: actor?.name || "Sistema" };
    await item.save();
    await logMovement(COLLECTION, item._id, item.sku, "SOFT_DELETE", { sku: item.sku }, actor);
    return res.json({ ok: true, message: "Movido a papelera" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete("/:id/hard", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const actor = req.body?.actor || {};
    const item  = await Accesorio.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    const snapshot = { sku: item.sku, nombre: item.nombre };
    await logMovement(COLLECTION, item._id, item.sku, "HARD_DELETE", { snapshot }, actor);
    await item.deleteOne();
    return res.json({ ok: true, message: "Eliminado permanentemente" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch("/:id/restore", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const actor = req.body?.actor || {};
    const item  = await Accesorio.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (!item.isDeleted) return res.status(400).json({ ok: false, error: "No está en papelera" });
    item.isDeleted = false;
    item.deletedAt = null;
    item.deletedBy = { userId: null, name: null };
    await item.save();
    await logMovement(COLLECTION, item._id, item.sku, "RESTORE", { sku: item.sku }, actor);
    return res.json({ ok: true, data: item.toJSON(), message: "Restaurado correctamente" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
