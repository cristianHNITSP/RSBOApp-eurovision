// routes/laboratory.routes.js
const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");

// modelos inventario (existentes)
const InventorySheet = require("../models/InventorySheet");
const InventoryChangeLog = require("../models/InventoryChangeLog");
const MatrixBase = require("../models/matrix/MatrixBase");
const MatrixSphCyl = require("../models/matrix/MatrixSphCyl");
const MatrixBifocal = require("../models/matrix/MatrixBifocal");
const MatrixProgresivo = require("../models/matrix/MatrixProgresivo");

// modelos laboratorio (nuevos)
const LaboratoryOrder = require("../models/laboratory/LaboratoryOrder");
const LaboratoryEvent = require("../models/laboratory/LaboratoryEvent");

// utils inventario (ya existen en tu proyecto)
const { actorFromBody } = require("../inventory/utils/normalize");
const { denormNum, parseKey } = require("../inventory/utils/keys");

const DEBUG_LAB = String(process.env.DEBUG_LAB || "") === "1";

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });
  next();
};

const genFolio = () => {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `LAB-${ymd}-${rand}`;
};

const getMatrixModel = (tipo) => {
  switch (tipo) {
    case "BASE": return MatrixBase;
    case "SPH_CYL": return MatrixSphCyl;
    case "SPH_ADD": return MatrixBifocal;
    case "BASE_ADD": return MatrixProgresivo;
    default: return null;
  }
};

const safeMapEntries = (doc) => {
  const m = doc?.cells;
  if (!m) return [];
  if (typeof m.entries === "function") return Array.from(m.entries());
  return Object.entries(m);
};

function escapeRx(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lineTitle(tipo, params, eye, codebar) {
  const p = params || {};
  if (tipo === "BASE") return `BASE ${Number(p.base ?? 0).toFixed(2)}`;
  if (tipo === "SPH_CYL") return `SPH ${Number(p.sph ?? 0).toFixed(2)} · CYL ${Number(p.cyl ?? 0).toFixed(2)}`;
  if (tipo === "SPH_ADD") return `${eye || ""} · SPH ${Number(p.sph ?? 0).toFixed(2)} · ADD ${Number(p.add ?? 0).toFixed(2)}`;
  if (tipo === "BASE_ADD") return `${eye || ""} · BI ${Number(p.base_izq ?? 0).toFixed(2)} · BD ${Number(p.base_der ?? 0).toFixed(2)} · ADD ${Number(p.add ?? 0).toFixed(2)}`;
  return String(codebar || "");
}

/**
 * Resolver codebar dentro de la matriz de una planilla.
 * Regresa ubicación exacta: { matrixKey, eye, params, existencias, sku }
 */
async function resolveCodebarLocation(sheet, codebar) {
  const Model = getMatrixModel(sheet.tipo_matriz);
  if (!Model) return null;

  const doc = await Model.findOne({ sheet: sheet._id });
  if (!doc) return null;

  const cb = String(codebar || "").trim();
  if (!cb) return null;

  // BASE / SPH_CYL: cell.codebar directo
  if (sheet.tipo_matriz === "BASE" || sheet.tipo_matriz === "SPH_CYL") {
    for (const [k, cell] of safeMapEntries(doc)) {
      if (!cell) continue;
      if (String(cell.codebar || "") === cb) {
        const params = {};
        if (sheet.tipo_matriz === "BASE") params.base = denormNum(k);
        if (sheet.tipo_matriz === "SPH_CYL") {
          const [sph, cyl] = parseKey(k);
          params.sph = sph;
          params.cyl = cyl;
        }

        return {
          matrixKey: String(k),
          eye: null,
          sku: cell.sku || null,
          existencias: Number(cell.existencias || 0),
          params
        };
      }
    }
    return null;
  }

  // SPH_ADD / BASE_ADD: codebar vive en cell.OD / cell.OI
  for (const [k, cell] of safeMapEntries(doc)) {
    if (!cell) continue;

    const odCb = String(cell?.OD?.codebar || "");
    const oiCb = String(cell?.OI?.codebar || "");

    let eye = null;
    let node = null;

    if (odCb === cb) { eye = "OD"; node = cell.OD; }
    else if (oiCb === cb) { eye = "OI"; node = cell.OI; }

    if (!eye || !node) continue;

    const params = {};
    if (sheet.tipo_matriz === "SPH_ADD") {
      const [sph, add] = parseKey(k);
      params.sph = sph;
      params.add = add;
      params.base_izq = Number(cell.base_izq ?? null);
      params.base_der = Number(cell.base_der ?? null);
    } else if (sheet.tipo_matriz === "BASE_ADD") {
      const [bi, bd, add] = parseKey(k);
      params.base_izq = bi;
      params.base_der = bd;
      params.add = add;
    }

    return {
      matrixKey: String(k),
      eye,
      sku: node.sku || null,
      existencias: Number(node.existencias || 0),
      params
    };
  }

  return null;
}

async function applyDeltaToInventory(sheet, loc, qtySigned, actor, reasonType) {
  const Model = getMatrixModel(sheet.tipo_matriz);
  if (!Model) throw new Error(`tipo_matriz no soportado: ${sheet.tipo_matriz}`);

  const doc = await Model.findOne({ sheet: sheet._id });
  if (!doc) throw new Error("Matriz no encontrada");

  doc.set("cells", doc.cells || new Map());

  const key = String(loc.matrixKey);
  const cell = doc.cells.get(key);
  if (!cell) throw new Error("Celda no encontrada en matriz");

  const q = Number(qtySigned || 0);
  if (!Number.isFinite(q) || q === 0) throw new Error("qty inválido");

  let before = 0;
  let after = 0;

  if (sheet.tipo_matriz === "BASE" || sheet.tipo_matriz === "SPH_CYL") {
    before = Number(cell.existencias || 0);
    after = before + q;
    if (after < 0) return { ok: false, reason: "NO_STOCK", before, after };
    cell.existencias = after;
    cell.updatedBy = actor;
    doc.cells.set(key, cell);
  } else {
    const eye = loc.eye;
    if (eye !== "OD" && eye !== "OI") throw new Error("eye requerido (OD/OI)");

    cell[eye] = cell[eye] || {};
    before = Number(cell[eye].existencias || 0);
    after = before + q;
    if (after < 0) return { ok: false, reason: "NO_STOCK", before, after };

    cell[eye].existencias = after;
    cell.updatedBy = actor;
    doc.cells.set(key, cell);
  }

  doc.markModified("cells");
  await doc.save();

  // auditoría inventario
  try {
    await InventoryChangeLog.create({
      sheet: sheet._id,
      tipo_matriz: sheet.tipo_matriz,
      type: reasonType,
      details: {
        codebar: String(loc?.codebar || ""),
        qty: q,
        before,
        after,
        matrixKey: key,
        eye: loc.eye || null
      },
      actor
    });
  } catch (e) {
    if (DEBUG_LAB) console.warn("[LAB] InventoryChangeLog fail:", e?.message || e);
  }

  return { ok: true, before, after };
}

async function applyExitToInventory(sheet, loc, qty, actor) {
  return applyDeltaToInventory(sheet, loc, -Math.abs(Number(qty || 0)), actor, "LAB_EXIT");
}

async function applyEntryToInventory(sheet, loc, qty, actor) {
  return applyDeltaToInventory(sheet, loc, Math.abs(Number(qty || 0)), actor, "LAB_ENTRY");
}

/* ===================== EVENTS ===================== */

// GET /laboratory/events?type=EXIT_SCAN&limit=30
router.get(
  "/events",
  query("type").optional().isString(),
  query("orderId").optional().isMongoId(),
  query("sheetId").optional().isMongoId(),
  query("q").optional().isString(),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  handleValidation,
  async (req, res) => {
    try {
      const typeRaw = String(req.query.type || "").trim();
      const types = typeRaw
        ? typeRaw.split(",").map((x) => x.trim()).filter(Boolean)
        : [];

      const allowed = new Set(["ORDER_CREATE", "EXIT_SCAN", "ORDER_CLOSE", "ORDER_RESET", "CORRECTION_REQUEST"]);
      for (const t of types) {
        if (!allowed.has(t)) return res.status(400).json({ ok: false, message: `type inválido: ${t}` });
      }

      const filter = {};
      if (types.length) filter.type = { $in: types };
      if (req.query.orderId) filter.order = new mongoose.Types.ObjectId(req.query.orderId);
      if (req.query.sheetId) filter.sheet = new mongoose.Types.ObjectId(req.query.sheetId);

      const q = String(req.query.q || "").trim();
      if (q) {
        const rx = new RegExp(escapeRx(q), "i");
        filter.$or = [
          { "details.folio": rx },
          { "details.cliente": rx },
          { "details.codebar": rx },
          { "details.title": rx },
          { "details.message": rx },
          { type: rx }
        ];
      }

      const limit = Number(req.query.limit || 40);

      const rows = await LaboratoryEvent.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return res.json({ ok: true, data: rows });
    } catch (e) {
      console.error("GET /laboratory/events error:", e);
      res.status(500).json({ ok: false, message: "Error al listar eventos" });
    }
  }
);

/* ===================== ORDERS ===================== */

// GET /laboratory/orders?status=pendiente&q=...
router.get(
  "/orders",
  query("status").optional().isIn(["pendiente", "parcial", "cerrado", "cancelado", "all"]),
  query("q").optional().isString(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  handleValidation,
  async (req, res) => {
    try {
      const status = String(req.query.status || "all");
      const q = String(req.query.q || "").trim();
      const limit = Number(req.query.limit || 200);

      const filter = {};
      if (status !== "all") filter.status = status;

      if (q) {
        const rx = new RegExp(escapeRx(q), "i");
        filter.$or = [{ folio: rx }, { cliente: rx }, { note: rx }];
      }

      const rows = await LaboratoryOrder.find(filter).sort({ createdAt: -1 }).limit(limit);
      res.json({ ok: true, data: rows });
    } catch (e) {
      console.error("GET /laboratory/orders error:", e);
      res.status(500).json({ ok: false, message: "Error al listar pedidos" });
    }
  }
);

// POST /laboratory/orders
router.post(
  "/orders",
  body("sheetId").isMongoId(),
  body("cliente").isString().trim().notEmpty(),
  body("note").optional({ nullable: true }).isString(),
  body("lines").isArray({ min: 1 }),
  body("lines.*.codebar").isString().trim().notEmpty(),
  body("lines.*.qty").isInt({ min: 1, max: 9999 }),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req) || { userId: null, name: "system" };

    try {
      const sheet = await InventorySheet.findById(req.body.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (sheet.isDeleted) return res.status(410).json({ ok: false, message: "Sheet eliminada" });

      const folio = genFolio();
      const cliente = String(req.body.cliente).trim();
      const note = String(req.body.note || "").trim();

      // merge por codebar
      const merged = new Map();
      for (const l of req.body.lines || []) {
        const cb = String(l.codebar || "").trim();
        const qty = Number(l.qty || 0);
        if (!cb || !Number.isFinite(qty) || qty <= 0) continue;
        merged.set(cb, (merged.get(cb) || 0) + qty);
      }

      const errors = [];
      const lines = [];

      for (const [codebar, qty] of merged.entries()) {
        const loc = await resolveCodebarLocation(sheet, codebar);
        if (!loc) {
          errors.push({ codebar, error: "NO_ENCONTRADO_EN_MATRIZ" });
          continue;
        }
        if (Number(loc.existencias || 0) < qty) {
          errors.push({ codebar, error: "SIN_STOCK", stock: loc.existencias, qty });
          continue;
        }

        lines.push({
          lineId: new mongoose.Types.ObjectId().toString(),
          codebar,
          sku: loc.sku || null,
          sheet: sheet._id,
          tipo_matriz: sheet.tipo_matriz,
          matrixKey: loc.matrixKey,
          eye: loc.eye || null,
          params: loc.params || {},
          qty,
          picked: 0
        });
      }

      if (errors.length) {
        return res.status(400).json({ ok: false, message: "No se pudo crear pedido", errors });
      }

      const order = await LaboratoryOrder.create({
        folio,
        sheet: sheet._id,
        cliente,
        note,
        status: "pendiente",
        lines,
        createdBy: actor,
        updatedBy: actor
      });

      const event = await LaboratoryEvent.create({
        order: order._id,
        sheet: sheet._id,
        type: "ORDER_CREATE",
        details: { folio, cliente, sheetId: String(sheet._id), linesTotal: lines.length },
        actor
      });

      return res.status(201).json({ ok: true, data: order, event });
    } catch (e) {
      console.error("POST /laboratory/orders error:", e);
      res.status(500).json({ ok: false, message: "Error al crear pedido" });
    }
  }
);

// GET /laboratory/orders/:orderId
router.get(
  "/orders/:orderId",
  param("orderId").isMongoId(),
  handleValidation,
  async (req, res) => {
    try {
      const order = await LaboratoryOrder.findById(req.params.orderId);
      if (!order) return res.status(404).json({ ok: false, message: "Pedido no existe" });
      res.json({ ok: true, data: order });
    } catch (e) {
      console.error("GET /laboratory/orders/:id error:", e);
      res.status(500).json({ ok: false, message: "Error al obtener pedido" });
    }
  }
);

// POST /laboratory/orders/:orderId/scan  (salida por escaneo)
router.post(
  "/orders/:orderId/scan",
  param("orderId").isMongoId(),
  body("codebar").isString().trim().notEmpty(),
  body("qty").optional().isInt({ min: 1, max: 9999 }),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req) || { userId: null, name: "system" };

    try {
      const order = await LaboratoryOrder.findById(req.params.orderId);
      if (!order) return res.status(404).json({ ok: false, message: "Pedido no existe" });
      if (order.status === "cerrado") return res.status(409).json({ ok: false, message: "Pedido ya está cerrado" });

      const codebar = String(req.body.codebar).trim();
      const qtyReq = Number(req.body.qty || 1);

      const line = (order.lines || []).find((l) => String(l.codebar) === codebar);
      if (!line) return res.status(404).json({ ok: false, message: "Código no pertenece a este pedido" });

      const remaining = Number(line.qty || 0) - Number(line.picked || 0);
      if (remaining <= 0) return res.status(409).json({ ok: false, message: "Esa línea ya está completa" });

      const qty = Math.min(remaining, qtyReq);

      const sheet = await InventorySheet.findById(order.sheet);
      if (!sheet) return res.status(404).json({ ok: false, message: "Sheet no existe (pedido corrupto)" });
      if (sheet.isDeleted) return res.status(410).json({ ok: false, message: "Sheet eliminada" });

      const loc = { matrixKey: line.matrixKey, eye: line.eye || null, codebar: line.codebar };

      const inv = await applyExitToInventory(sheet, loc, qty, actor);
      if (!inv.ok && inv.reason === "NO_STOCK") {
        return res.status(409).json({ ok: false, message: "No hay stock suficiente", before: inv.before, after: inv.after });
      }

      line.picked = Number(line.picked || 0) + qty;
      order.updatedBy = actor;
      order.updatedAt = new Date();

      const total = order.lines.reduce((acc, l) => acc + Number(l.qty || 0), 0);
      const pickedTotal = order.lines.reduce((acc, l) => acc + Math.min(Number(l.picked || 0), Number(l.qty || 0)), 0);

      if (pickedTotal <= 0) order.status = "pendiente";
      else if (pickedTotal < total) order.status = "parcial";
      else {
        order.status = "cerrado";
        order.closedAt = new Date();
        order.closedBy = actor;
      }

      await order.save();

      const title = lineTitle(sheet.tipo_matriz, line.params, line.eye, codebar);

      const event = await LaboratoryEvent.create({
        order: order._id,
        sheet: sheet._id,
        type: "EXIT_SCAN",
        details: {
          folio: order.folio,
          sheetId: String(sheet._id),
          codebar,
          qty,
          before: inv.before,
          after: inv.after,
          lineId: line.lineId,
          title,
          status: order.status
        },
        actor
      });

      return res.json({ ok: true, data: order, event, scan: { codebar, qty, before: inv.before, after: inv.after } });
    } catch (e) {
      console.error("POST /laboratory/orders/:id/scan error:", e);
      res.status(500).json({ ok: false, message: "Error al procesar escaneo" });
    }
  }
);

// POST /laboratory/orders/:orderId/reset  ✅ rollback real (regresa stock y pone picked=0)
router.post(
  "/orders/:orderId/reset",
  param("orderId").isMongoId(),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req) || { userId: null, name: "system" };

    try {
      const order = await LaboratoryOrder.findById(req.params.orderId);
      if (!order) return res.status(404).json({ ok: false, message: "Pedido no existe" });

      const sheet = await InventorySheet.findById(order.sheet);
      if (!sheet) return res.status(404).json({ ok: false, message: "Sheet no existe (pedido corrupto)" });
      if (sheet.isDeleted) return res.status(410).json({ ok: false, message: "Sheet eliminada" });

      let totalRollback = 0;

      for (const line of order.lines || []) {
        const picked = Number(line.picked || 0);
        if (picked <= 0) continue;

        const loc = { matrixKey: line.matrixKey, eye: line.eye || null, codebar: line.codebar };
        await applyEntryToInventory(sheet, loc, picked, actor);

        line.picked = 0;
        totalRollback += picked;
      }

      order.status = "pendiente";
      order.closedAt = null;
      order.closedBy = { userId: null, name: null };
      order.updatedBy = actor;
      order.updatedAt = new Date();

      await order.save();

      const event = await LaboratoryEvent.create({
        order: order._id,
        sheet: sheet._id,
        type: "ORDER_RESET",
        details: { folio: order.folio, sheetId: String(sheet._id), totalRollback },
        actor
      });

      return res.json({ ok: true, data: order, event });
    } catch (e) {
      console.error("POST /laboratory/orders/:id/reset error:", e);
      res.status(500).json({ ok: false, message: "Error al reiniciar surtido" });
    }
  }
);

// POST /laboratory/orders/:orderId/close
router.post(
  "/orders/:orderId/close",
  param("orderId").isMongoId(),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req) || { userId: null, name: "system" };

    try {
      const order = await LaboratoryOrder.findById(req.params.orderId);
      if (!order) return res.status(404).json({ ok: false, message: "Pedido no existe" });

      order.status = "cerrado";
      order.closedAt = new Date();
      order.closedBy = actor;
      order.updatedBy = actor;
      await order.save();

      const event = await LaboratoryEvent.create({
        order: order._id,
        sheet: order.sheet,
        type: "ORDER_CLOSE",
        details: { folio: order.folio, sheetId: String(order.sheet) },
        actor
      });

      res.json({ ok: true, data: order, event });
    } catch (e) {
      console.error("POST /laboratory/orders/:id/close error:", e);
      res.status(500).json({ ok: false, message: "Error al cerrar pedido" });
    }
  }
);

/* ===================== CORRECTIONS ===================== */

// POST /laboratory/corrections
router.post(
  "/corrections",
  body("orderId").isMongoId(),
  body("codebar").optional({ nullable: true }).isString(),
  body("message").isString().trim().isLength({ min: 3, max: 600 }),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req) || { userId: null, name: "system" };

    try {
      const order = await LaboratoryOrder.findById(req.body.orderId);
      if (!order) return res.status(404).json({ ok: false, message: "Pedido no existe" });

      const codebar = String(req.body.codebar || "").trim() || null;
      const message = String(req.body.message || "").trim();

      const event = await LaboratoryEvent.create({
        order: order._id,
        sheet: order.sheet,
        type: "CORRECTION_REQUEST",
        details: {
          folio: order.folio,
          sheetId: String(order.sheet),
          codebar,
          message
        },
        actor
      });

      return res.status(201).json({ ok: true, data: event });
    } catch (e) {
      console.error("POST /laboratory/corrections error:", e);
      res.status(500).json({ ok: false, message: "Error al solicitar corrección" });
    }
  }
);

module.exports = router;