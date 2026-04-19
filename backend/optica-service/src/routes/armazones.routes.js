// routes/armazones.routes.js
const express = require("express");
const router  = express.Router();
const { body, param, validationResult } = require("express-validator");

const Armazon         = require("../models/Armazon");
const { logMovement } = require("../utils/logHelper");
const { sanitizeMiddleware } = require("../utils/sanitizer");
const { protect }          = require("../utils/auth");

const COLLECTION = "armazones";
// Proteger todas las rutas: requiere estar logueado
router.use(protect());
const TEXT_FIELDS = ["sku", "marca", "modelo", "color", "material", "tipo", "genero", "talla"];

// ── Validation middleware ─────────────────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });
  next();
};

const bodyRules = [
  body("sku").notEmpty().trim().withMessage("SKU requerido"),
  body("marca").notEmpty().trim().withMessage("Marca requerida"),
  body("modelo").notEmpty().trim().withMessage("Modelo requerido"),
  body("precio").isFloat({ min: 0 }).withMessage("Precio inválido"),
  body("stock").isInt({ min: 0 }).withMessage("Stock inválido"),
];

// ── GET /armazones — lista activos ──────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { isDeleted: false };
    if (q) filter.$or = [
      { sku:    { $regex: q, $options: "i" } },
      { marca:  { $regex: q, $options: "i" } },
      { modelo: { $regex: q, $options: "i" } },
    ];

    const items = await Armazon.find(filter)
      .collation({ locale: "es", strength: 1 }) // Insensible a acentos y mayúsculas
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
    console.log(`[OPTICA][ARMAZONES] GET /  → ${items.length} items`);
    return res.json({ ok: true, data: items });
  } catch (err) {
    console.error("[OPTICA][ARMAZONES] GET / error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /armazones/trash — lista en papelera ────────────────────────────────
router.get("/trash", async (req, res) => {
  try {
    const items = await Armazon.find({ isDeleted: true }).sort({ deletedAt: -1 }).lean({ virtuals: true });
    console.log(`[OPTICA][ARMAZONES] GET /trash → ${items.length} items`);
    return res.json({ ok: true, data: items });
  } catch (err) {
    console.error("[OPTICA][ARMAZONES] GET /trash error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /armazones/:id — obtener uno ──────────────────────────────────────
router.get("/:id", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const item = await Armazon.findById(req.params.id).lean({ virtuals: true });
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    return res.json({ ok: true, data: item });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /armazones — crear ──────────────────────────────────────────────
router.post("/", bodyRules, sanitizeMiddleware(TEXT_FIELDS), validate, async (req, res) => {
  try {
    const fields = req.body;
    const actor = req.user; // Identidad REAL desde el token

    const exists = await Armazon.findOne({ sku: fields.sku });
    if (exists) return res.status(409).json({ ok: false, error: `SKU "${fields.sku}" ya existe` });

    const item = await Armazon.create(fields);
    console.log(`[OPTICA][ARMAZONES] POST / → Creado SKU ${item.sku} por ${actor?.name || "Sistema"}`);
    await logMovement(COLLECTION, item._id, item.sku, "CREATE", { fields }, actor);

    return res.status(201).json({ ok: true, data: item.toJSON() });
  } catch (err) {
    console.error("[OPTICA][ARMAZONES] POST / error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PUT /armazones/:id — actualizar ────────────────────────────────────────
router.put("/:id", param("id").isMongoId(), bodyRules, sanitizeMiddleware(TEXT_FIELDS), validate, async (req, res) => {
  try {
    const fields = req.body;
    const actor = req.user; // Identidad REAL
    const item = await Armazon.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (item.isDeleted) return res.status(410).json({ ok: false, error: "Elemento en papelera" });

    // Verificar SKU único si cambió
    if (fields.sku && fields.sku !== item.sku) {
      const dup = await Armazon.findOne({ sku: fields.sku, _id: { $ne: item._id } });
      if (dup) return res.status(409).json({ ok: false, error: `SKU "${fields.sku}" ya existe` });
    }

    const before = item.toJSON();
    Object.assign(item, fields);
    await item.save();

    console.log(`[OPTICA][ARMAZONES] PUT /${req.params.id} → Actualizado SKU ${item.sku} por ${actor?.name || "Sistema"}`);
    await logMovement(COLLECTION, item._id, item.sku, "UPDATE", { before, after: item.toJSON() }, actor);

    return res.json({ ok: true, data: item.toJSON() });
  } catch (err) {
    console.error("[OPTICA][ARMAZONES] PUT error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PATCH /armazones/:id/stock — actualizar stock ──────────────────────────
router.patch("/:id/stock", param("id").isMongoId(), body("stock").isInt({ min: 0 }), validate, async (req, res) => {
  try {
    const { stock } = req.body;
    const actor = req.user;
    const item = await Armazon.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (item.isDeleted) return res.status(410).json({ ok: false, error: "Elemento en papelera" });

    const prevStock = item.stock;
    item.stock = stock;
    await item.save();

    console.log(`[OPTICA][ARMAZONES] PATCH /${req.params.id}/stock → ${prevStock} → ${stock} por ${actor?.name || "Sistema"}`);
    await logMovement(COLLECTION, item._id, item.sku, "STOCK_UPDATE", { prevStock, newStock: stock }, actor);

    return res.json({ ok: true, data: item.toJSON() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── DELETE /armazones/:id — soft delete ────────────────────────────────────
router.delete("/:id", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const actor = req.user;
    const item  = await Armazon.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (item.isDeleted) return res.status(410).json({ ok: false, error: "Ya está en papelera" });

    item.isDeleted = true;
    item.deletedAt = new Date();
    item.deletedBy = { userId: actor?.userId || null, name: actor?.name || "Sistema" };
    await item.save();

    console.log(`[OPTICA][ARMAZONES] DELETE /${req.params.id} (soft) → SKU ${item.sku} por ${actor?.name || "Sistema"}`);
    await logMovement(COLLECTION, item._id, item.sku, "SOFT_DELETE", { sku: item.sku, marca: item.marca }, actor);

    return res.json({ ok: true, message: "Movido a papelera" });
  } catch (err) {
    console.error("[OPTICA][ARMAZONES] DELETE error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── DELETE /armazones/:id/hard — hard delete ──────────────────────────────
router.delete("/:id/hard", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const actor = req.user;
    const item  = await Armazon.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });

    const snapshot = { sku: item.sku, marca: item.marca, modelo: item.modelo };
    await logMovement(COLLECTION, item._id, item.sku, "HARD_DELETE", { snapshot }, actor);
    await item.deleteOne();

    console.log(`[OPTICA][ARMAZONES] DELETE /${req.params.id}/hard → SKU ${snapshot.sku} ELIMINADO por ${actor?.name || "Sistema"}`);

    return res.json({ ok: true, message: "Eliminado permanentemente" });
  } catch (err) {
    console.error("[OPTICA][ARMAZONES] HARD DELETE error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PATCH /armazones/:id/restore — restaurar de papelera ──────────────────
router.patch("/:id/restore", param("id").isMongoId(), validate, async (req, res) => {
  try {
    const actor = req.user;
    const item  = await Armazon.findById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    if (!item.isDeleted) return res.status(400).json({ ok: false, error: "No está en papelera" });

    item.isDeleted = false;
    item.deletedAt = null;
    item.deletedBy = { userId: null, name: null };
    await item.save();

    console.log(`[OPTICA][ARMAZONES] PATCH /${req.params.id}/restore → SKU ${item.sku} restaurado por ${actor?.name || "Sistema"}`);
    await logMovement(COLLECTION, item._id, item.sku, "RESTORE", { sku: item.sku }, actor);

    return res.json({ ok: true, data: item.toJSON(), message: "Restaurado correctamente" });
  } catch (err) {
    console.error("[OPTICA][ARMAZONES] RESTORE error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
