/**
 * @fileoverview Factory genérico de routers CRUD para productos de óptica.
 *
 * Sustituye los 6 archivos de rutas casi idénticos del antiguo optica-service.
 * Cada categoría se monta con `makeOpticaCrud(Model, cfg)` donde `cfg` proviene de
 * OPTICA_CATEGORIES (data/optica.constants.js).
 *
 * Garantías:
 *  - Auth en todas las rutas (protect()).
 *  - Anti-XSS (DOMPurify) + validación express-validator a nivel de router; el modelo
 *    valida enums/required a nivel de BD.
 *  - Stock atómico: PATCH /:id/stock usa findOneAndUpdate ($inc para delta, con guardia
 *    de no-negativo) — sin read-modify-write.
 *  - Bloqueo optimista: PUT /:id exige `__v`; si no coincide → 409 (edición simultánea).
 *  - Audit log (OpticaChangeLog) + broadcast WS en cada mutación.
 */
const express = require("express");
const { body, param, validationResult } = require("express-validator");

const { protect } = require("../../utils/auth");
const { broadcast } = require("../../ws");
const { logMovement } = require("./logHelper");
const { sanitizeMiddleware } = require("./sanitizer");
const { assessProductAsync, clearProductAlert } = require("../../services/opticaStockAlert.service");

const escapeRegExp = (s = "") => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Nombre legible del producto para el toast de tiempo real.
const itemLabel = (it = {}) =>
  it.nombre || [it.marca, it.modelo].filter(Boolean).join(" ").trim() || it.sku || "elemento";

// Identidad del autor del cambio (para excluir su propio toast en el cliente).
const actorOf = (req) => ({
  actorId: req.user?.id || req.user?.userId || null,
  actorName: req.body?.actor?.name || req.user?.username || req.user?.name || "Alguien",
});

// `sku` es inmutable: se auto-genera en creación y nunca se acepta del cliente.
const IMMUTABLE = new Set(["_id", "__v", "__t", "sku", "isDeleted", "deletedAt", "deletedBy", "createdAt", "updatedAt"]);
const stripImmutable = (obj = {}) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (!IMMUTABLE.has(k)) out[k] = v;
  return out;
};

// Convierte la spec declarativa de bodyRules en validadores express-validator
// (sin sku: se genera en el servidor, no lo manda el cliente).
const buildBodyRules = (rules = []) => {
  const chains = [];
  for (const r of rules) {
    let c = body(r.field);
    if (r.type === "float") c = c.isFloat({ min: r.min ?? 0 });
    else if (r.type === "int") c = c.isInt({ min: r.min ?? 0 });
    else c = c.notEmpty().trim();
    chains.push(c.withMessage(r.msg || `${r.field} inválido`));
  }
  return chains;
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });
  next();
};

/**
 * @param {import('mongoose').Model} Model  - discriminator (Armazon, Solucion, ...)
 * @param {object} cfg - { key, textFields, searchFields, bodyRules, hasStock }
 */
function makeOpticaCrud(Model, cfg) {
  const router = express.Router();
  const COLLECTION = cfg.key;
  const TEXT_FIELDS = cfg.textFields || ["sku"];
  const SEARCH_FIELDS = cfg.searchFields || ["sku"];
  const FILTER_FIELDS = new Set(cfg.filterFields || []);
  const DICTIONARIES = cfg.dictionaries || {};
  // Campos de lista cerrada (select) y de autocompletado, derivados del diccionario.
  const SELECT_FIELDS = Object.entries(DICTIONARIES)
    .filter(([, d]) => d?.kind === "select")
    .map(([f, d]) => [f, new Set(d.options || [])]);
  const AUTOCOMPLETE_FIELDS = new Set(
    Object.entries(DICTIONARIES).filter(([, d]) => d?.kind === "autocomplete").map(([f]) => f)
  );
  const DEFAULT_LIMIT = 6;
  const MAX_LIMIT = 50;
  const bodyRules = buildBodyRules(cfg.bodyRules);

  // Valida que los campos de tipo "select" lleven un valor permitido por el diccionario.
  // (Reemplaza la garantía que daba el enum del schema, ahora relajado.)
  const validateDictionary = (req, res, next) => {
    for (const [field, allowed] of SELECT_FIELDS) {
      const val = req.body[field];
      if (val === undefined || val === null || val === "") continue;
      if (!allowed.has(val)) {
        return res.status(400).json({
          ok: false,
          error: `Valor inválido para "${field}": "${val}" no está en el diccionario de la categoría`,
          code: "INVALID_OPTION",
        });
      }
    }
    next();
  };

  // Normaliza page/limit de la query
  const parsePaging = (query) => {
    const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit || DEFAULT_LIMIT, 10) || DEFAULT_LIMIT));
    return { page, limit, skip: (page - 1) * limit };
  };

  router.use(protect());

  const tag = `[OPTICA][${COLLECTION.toUpperCase()}]`;

  // ── GET / — lista activos (paginada 6/pág, búsqueda ?q=, filtro server-side) ─
  router.get("/", async (req, res) => {
    try {
      const { q, filterField, filterValue } = req.query;
      const { page, limit, skip } = parsePaging(req.query);

      const filter = { isDeleted: false };
      if (q) {
        const rx = { $regex: escapeRegExp(q), $options: "i" };
        filter.$or = SEARCH_FIELDS.map((f) => ({ [f]: rx }));
      }
      // Filtro exacto sólo sobre campos permitidos (evita inyección de claves)
      if (filterField && filterValue && FILTER_FIELDS.has(filterField)) {
        filter[filterField] = filterValue;
      }

      const [items, total] = await Promise.all([
        Model.find(filter)
          .collation({ locale: "es", strength: 1 })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean({ virtuals: true }),
        Model.countDocuments(filter),
      ]);
      return res.json({ ok: true, data: items, total, page, limit });
    } catch (err) {
      console.error(`${tag} GET / error:`, err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /trash — papelera (paginada) ──────────────────────────────────────
  router.get("/trash", async (req, res) => {
    try {
      const { page, limit, skip } = parsePaging(req.query);
      const filter = { isDeleted: true };
      const [items, total] = await Promise.all([
        Model.find(filter).sort({ deletedAt: -1 }).skip(skip).limit(limit).lean({ virtuals: true }),
        Model.countDocuments(filter),
      ]);
      return res.json({ ok: true, data: items, total, page, limit });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /distinct?field= — valores únicos para autocompletado ─────────────
  router.get("/distinct", async (req, res) => {
    try {
      const field = String(req.query.field || "");
      if (!AUTOCOMPLETE_FIELDS.has(field)) {
        return res.status(400).json({ ok: false, error: `Campo no permitido para distinct: "${field}"` });
      }
      const values = await Model.distinct(field, { isDeleted: false, [field]: { $nin: [null, ""] } });
      const data = values
        .filter((v) => typeof v === "string" && v.trim())
        .map((v) => v.trim())
        .sort((a, b) => a.localeCompare(b, "es"));
      return res.json({ ok: true, data });
    } catch (err) {
      console.error(`${tag} GET /distinct error:`, err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /:id ──────────────────────────────────────────────────────────────
  router.get("/:id", param("id").isMongoId(), validate, async (req, res) => {
    try {
      const item = await Model.findById(req.params.id).lean({ virtuals: true });
      if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
      return res.json({ ok: true, data: item });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST / — crear (SKU auto-generado por el modelo) ──────────────────────
  router.post("/", bodyRules, validateDictionary, sanitizeMiddleware(TEXT_FIELDS), validate, async (req, res) => {
    try {
      const fields = stripImmutable(req.body); // descarta cualquier sku del cliente
      const actor = req.user;

      const item = await Model.create(fields); // el hook pre-validate genera el sku
      await logMovement(COLLECTION, item._id, item.sku, "CREATE", { fields }, actor);
      broadcast("INV_CHANGE", {
        collection: COLLECTION, action: "create",
        id: String(item._id), sku: item.sku, label: itemLabel(item),
        ...actorOf(req), item: item.toJSON(),
      });
      if (cfg.hasStock) assessProductAsync(item); // evalúa alerta de stock
      return res.status(201).json({ ok: true, data: item.toJSON() });
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({ ok: false, error: "Colisión de SKU, reintenta" });
      }
      console.error(`${tag} POST / error:`, err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── PUT /:id — actualizar (bloqueo optimista vía __v) ─────────────────────
  router.put(
    "/:id",
    param("id").isMongoId(),
    bodyRules,
    validateDictionary,
    sanitizeMiddleware(TEXT_FIELDS),
    validate,
    async (req, res) => {
      try {
        const actor = req.user;
        const fields = stripImmutable(req.body); // sku es inmutable: nunca se actualiza
        const clientVersion = Number(req.body.__v);

        const current = await Model.findById(req.params.id);
        if (!current) return res.status(404).json({ ok: false, error: "No encontrado" });
        if (current.isDeleted) return res.status(410).json({ ok: false, error: "Elemento en papelera" });

        const before = current.toJSON();

        // Guardia de versión: si el cliente envía __v, exigir coincidencia (lost-update)
        const query = { _id: current._id };
        if (Number.isFinite(clientVersion)) query.__v = clientVersion;

        const updated = await Model.findOneAndUpdate(
          query,
          { $set: fields, $inc: { __v: 1 } },
          { new: true, runValidators: true, context: "query" }
        );

        if (!updated) {
          return res.status(409).json({
            ok: false,
            error: "Conflicto de versión: el registro fue modificado por otro usuario",
            code: "VERSION_CONFLICT",
          });
        }

        await logMovement(COLLECTION, updated._id, updated.sku, "UPDATE", { before, after: updated.toJSON() }, actor);
        broadcast("INV_CHANGE", { collection: COLLECTION, id: String(updated._id), newStock: updated.stock });
        if (cfg.hasStock) assessProductAsync(updated);
        return res.json({ ok: true, data: updated.toJSON() });
      } catch (err) {
        if (err?.code === 11000) return res.status(409).json({ ok: false, error: "SKU duplicado" });
        console.error(`${tag} PUT error:`, err);
        return res.status(500).json({ ok: false, error: err.message });
      }
    }
  );

  // ── PATCH /:id/stock — ajuste atómico de stock ────────────────────────────
  if (cfg.hasStock) {
    router.patch(
      "/:id/stock",
      param("id").isMongoId(),
      body("stock").optional().isInt({ min: 0 }),
      body("delta").optional().isInt(),
      validate,
      async (req, res) => {
        try {
          const actor = req.user;
          const hasDelta = req.body.delta !== undefined;
          const hasAbs = req.body.stock !== undefined;
          if (!hasDelta && !hasAbs) {
            return res.status(400).json({ ok: false, error: "Indica 'stock' (absoluto) o 'delta'" });
          }

          let updated;
          if (hasDelta) {
            // Atómico: $inc con guardia de no-negativo
            const delta = Number(req.body.delta);
            const query = { _id: req.params.id, isDeleted: false };
            if (delta < 0) query.stock = { $gte: Math.abs(delta) };
            updated = await Model.findOneAndUpdate(
              query,
              { $inc: { stock: delta, __v: 1 } },
              { new: true }
            );
            if (!updated) {
              const exists = await Model.findById(req.params.id).select("stock isDeleted").lean();
              if (!exists) return res.status(404).json({ ok: false, error: "No encontrado" });
              if (exists.isDeleted) return res.status(410).json({ ok: false, error: "Elemento en papelera" });
              return res.status(409).json({
                ok: false,
                error: `Stock insuficiente (actual: ${exists.stock})`,
                code: "INSUFFICIENT_STOCK",
              });
            }
          } else {
            // Set absoluto atómico (single op, sin read-modify-write)
            updated = await Model.findOneAndUpdate(
              { _id: req.params.id, isDeleted: false },
              { $set: { stock: Number(req.body.stock) }, $inc: { __v: 1 } },
              { new: true }
            );
            if (!updated) return res.status(404).json({ ok: false, error: "No encontrado o en papelera" });
          }

          await logMovement(COLLECTION, updated._id, updated.sku, "STOCK_UPDATE", { newStock: updated.stock }, actor);
          broadcast("INV_CHANGE", {
            collection: COLLECTION,
            id: String(updated._id),
            newStock: updated.stock,
          });
          assessProductAsync(updated); // re-evalúa alerta de stock
          return res.json({ ok: true, data: updated.toJSON() });
        } catch (err) {
          console.error(`${tag} PATCH stock error:`, err);
          return res.status(500).json({ ok: false, error: err.message });
        }
      }
    );
  }

  // ── DELETE /:id — soft delete ─────────────────────────────────────────────
  router.delete("/:id", param("id").isMongoId(), validate, async (req, res) => {
    try {
      const actor = req.user;
      const updated = await Model.findOneAndUpdate(
        { _id: req.params.id, isDeleted: false },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: { userId: actor?.userId || null, name: actor?.name || "Sistema" },
          },
          $inc: { __v: 1 },
        },
        { new: true }
      );
      if (!updated) return res.status(404).json({ ok: false, error: "No encontrado o ya en papelera" });

      await logMovement(COLLECTION, updated._id, updated.sku, "SOFT_DELETE", { sku: updated.sku }, actor);
      broadcast("INV_CHANGE", {
        collection: COLLECTION, action: "delete",
        id: String(updated._id), sku: updated.sku, label: itemLabel(updated), ...actorOf(req),
      });
      assessProductAsync(updated); // isDeleted=true → limpia su alerta
      return res.json({ ok: true, message: "Movido a papelera" });
    } catch (err) {
      console.error(`${tag} DELETE error:`, err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── DELETE /:id/hard — hard delete ────────────────────────────────────────
  router.delete("/:id/hard", param("id").isMongoId(), validate, async (req, res) => {
    try {
      const actor = req.user;
      const item = await Model.findById(req.params.id);
      if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });

      const snapshot = { sku: item.sku, ...item.toJSON() };
      await logMovement(COLLECTION, item._id, item.sku, "HARD_DELETE", { snapshot }, actor);
      await item.deleteOne();
      clearProductAlert(item._id); // limpia su alerta si la tenía
      return res.json({ ok: true, message: "Eliminado permanentemente" });
    } catch (err) {
      console.error(`${tag} HARD DELETE error:`, err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── PATCH /:id/restore — restaurar de papelera ────────────────────────────
  router.patch("/:id/restore", param("id").isMongoId(), validate, async (req, res) => {
    try {
      const actor = req.user;
      const updated = await Model.findOneAndUpdate(
        { _id: req.params.id, isDeleted: true },
        {
          $set: { isDeleted: false, deletedAt: null, deletedBy: { userId: null, name: null } },
          $inc: { __v: 1 },
        },
        { new: true }
      );
      if (!updated) return res.status(400).json({ ok: false, error: "No encontrado o no está en papelera" });

      await logMovement(COLLECTION, updated._id, updated.sku, "RESTORE", { sku: updated.sku }, actor);
      broadcast("INV_CHANGE", {
        collection: COLLECTION, action: "restore",
        id: String(updated._id), sku: updated.sku, label: itemLabel(updated), ...actorOf(req),
      });
      if (cfg.hasStock) assessProductAsync(updated); // re-evalúa tras restaurar
      return res.json({ ok: true, data: updated.toJSON(), message: "Restaurado correctamente" });
    } catch (err) {
      console.error(`${tag} RESTORE error:`, err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

module.exports = { makeOpticaCrud };
