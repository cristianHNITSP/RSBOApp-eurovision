// routes/soluciones.routes.js
const express = require("express");
const router  = express.Router();
const { body, param, validationResult } = require("express-validator");

const Solucion        = require("../models/Solucion");
const { logMovement } = require("../utils/logHelper");
const { sanitizeMiddleware } = require("../utils/sanitizer");
const { protect }          = require("../utils/auth");
const { broadcast }        = require("../ws");

const COLLECTION = "soluciones";
router.use(protect());
const TEXT_FIELDS = ["sku", "nombre", "marca", "tipo", "descripcion"];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });
  next();
};

const bodyRules = [
  body("sku").notEmpty().trim().withMessage("SKU requerido"),
  body("nombre").notEmpty().trim().withMessage("Nombre requerido"),
  body("marca").notEmpty().trim().withMessage("Marca requerida"),
  body("volumen").isFloat({ min: 0 }).withMessage("Volumen inválido"),
  body("precio").isFloat({ min: 0 }).withMessage("Precio inválido"),
  body("stock").isInt({ min: 0 }).withMessage("Stock inválido"),
];

router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { isDeleted: false };
    if (q) filter.$or = [
      { sku:    { $regex: q, $options: "i" } },
      { nombre: { $regex: q, $options: "i" } },
      { marca:  { $regex: q, $options: "i" } },
    ];
    const items = await Solucion.find(filter)
      .collation({ locale: "es", strength: 1 })
      .sort({ createdAt: -1 })
      .lean();
    console.log(`[OPTICA][SOLUCIONES] GET /  → ${items.length} items`);
    return res.json({ ok: true, data: items });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/trash", async (req, res) => {
  try {
    const items = await Solucion.find({ isDeleted: true }).sort({ deletedAt: -1 }).lean();
    return res.json({ ok: true, data: items });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/:id", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const item = await Solucion.findById(req.params.id).lean();
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
    const exists = await Solucion.findOne({ sku: fields.sku });
    if (exists) return res.status(409).json({ ok: false, error: `SKU "${fields.sku}" ya existe` });
    const item = await Solucion.create(fields);
    console.log(`[OPTICA][SOLUCIONES] POST / → Creado SKU ${item.sku} por ${actor?.name || "Sistema"}`);
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
    const item = await Solucion.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (item.isDeleted) return res.status(410).json({ ok: false, error: "Elemento en papelera" });
    if (fields.sku && fields.sku !== item.sku) {
      const dup = await Solucion.findOne({ sku: fields.sku, _id: { $ne: item._id } });
      if (dup) return res.status(409).json({ ok: false, error: `SKU "${fields.sku}" ya existe` });
    }
    const before = item.toJSON();
    Object.assign(item, fields);
    await item.save();
    await logMovement(COLLECTION, item._id, item.sku, "UPDATE", { before, after: item.toJSON() }, actor);
    broadcast("INV_CHANGE", { collection: COLLECTION, id: String(item._id), newStock: item.stock });
    return res.json({ ok: true, data: item.toJSON() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch("/:id/stock", param("id").isMongoId(), body("stock").isInt({ min: 0 }), validate, async (req, res) => {
  try {
    const { stock } = req.body;
    const actor = req.user;
    const item = await Solucion.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (item.isDeleted) return res.status(410).json({ ok: false, error: "Elemento en papelera" });
    const prevStock = item.stock;
    item.stock = stock;
    await item.save();
    await logMovement(COLLECTION, item._id, item.sku, "STOCK_UPDATE", { prevStock, newStock: stock }, actor);
    broadcast("INV_CHANGE", {
      collection: COLLECTION,
      id: String(item._id),
      prevStock,
      newStock: stock,
      delta: stock - prevStock,
    });
    return res.json({ ok: true, data: item.toJSON() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /soluciones/:id/sale — Venta atómica ──────────────────────────────
const { handleAtomicSale } = require("../utils/saleHelper");
router.post("/:id/sale", param("id").isMongoId(), body("qty").optional().isInt({ min: 1 }), validate, async (req, res) => {
  try {
    const qty = req.body.qty || 1;
    const actor = req.user;
    const result = await handleAtomicSale(Solucion, COLLECTION, req.params.id, qty, actor);
    if (!result.ok) return res.status(result.status).json({ ok: false, error: result.message, current: result.current });
    return res.json({ ok: true, data: result.data });
  } catch (err) {
    console.error(`[OPTICA][${COLLECTION.toUpperCase()}] SALE error:`, err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete("/:id", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const actor = req.user;
    const item  = await Solucion.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (item.isDeleted) return res.status(410).json({ ok: false, error: "Ya está en papelera" });
    item.isDeleted = true;
    item.deletedAt = new Date();
    item.deletedBy = { userId: actor?.userId || null, name: actor?.name || "Sistema" };
    await item.save();
    console.log(`[OPTICA][SOLUCIONES] DELETE /${req.params.id} (soft) → SKU ${item.sku}`);
    await logMovement(COLLECTION, item._id, item.sku, "SOFT_DELETE", { sku: item.sku }, actor);
    broadcast("INV_CHANGE", { collection: COLLECTION });
    return res.json({ ok: true, message: "Movido a papelera" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete("/:id/hard", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const actor = req.user;
    const item  = await Solucion.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    const snapshot = { sku: item.sku, nombre: item.nombre };
    await logMovement(COLLECTION, item._id, item.sku, "HARD_DELETE", { snapshot }, actor);
    await item.deleteOne();
    console.log(`[OPTICA][SOLUCIONES] DELETE /${req.params.id}/hard → SKU ${snapshot.sku} ELIMINADO`);
    return res.json({ ok: true, message: "Eliminado permanentemente" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch("/:id/restore", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const actor = req.user;
    const item  = await Solucion.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (!item.isDeleted) return res.status(400).json({ ok: false, error: "No está en papelera" });
    item.isDeleted = false;
    item.deletedAt = null;
    item.deletedBy = { userId: null, name: null };
    await item.save();
    await logMovement(COLLECTION, item._id, item.sku, "RESTORE", { sku: item.sku }, actor);
    broadcast("INV_CHANGE", { collection: COLLECTION });
    return res.json({ ok: true, data: item.toJSON(), message: "Restaurado correctamente" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
