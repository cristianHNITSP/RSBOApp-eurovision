const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");

const InventorySheet = require("../models/InventorySheet");
const InventoryChangeLog = require("../models/InventoryChangeLog");
const MatrixBase = require("../models/matrix/MatrixBase");
const MatrixSphCyl = require("../models/matrix/MatrixSphCyl");
const MatrixBifocal = require("../models/matrix/MatrixBifocal");
const MatrixProgresivo = require("../models/matrix/MatrixProgresivo");
const LaboratoryOrder = require("../models/laboratory/LaboratoryOrder");
const LaboratoryEvent = require("../models/laboratory/LaboratoryEvent");

const { notifyPendingOrders, notifyNewOrder, notifyCorrection } = require("../services/labNotification.service");
const { actorFromBody } = require("../inventory/utils/normalize");
const { denormNum, parseKey } = require("../inventory/utils/keys");

const DEBUG_LAB = String(process.env.DEBUG_LAB || "") === "1";
const { broadcast } = require("../ws");
const { invalidatePattern, KEYS } = require("../services/redis");

// ============================================================================
// HELPERS
// ============================================================================

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });
  next();
};

const genFolio = (prefix = "LAB") => {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
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
  return String(s || "").replace(/[.*+?^{}()|[\]\\]/g, "\\$&");
}

function eyeLabel(e) {
  if (!e) return "";
  const s = String(e).toUpperCase();
  if (s === "OD" || s === "R") return "Ojo Derecho";
  if (s === "OI" || s === "OS" || s === "L") return "Ojo Izquierdo";
  return e;
}

function lineTitle(tipo, params, eye, codebar) {
  const p = params || {};
  const fv = (v) => Number(v ?? 0).toFixed(2);
  const base = String(eye || "").toUpperCase() === "OD"
    ? Number(p.base_der ?? 0) : Number(p.base_izq ?? 0);
  if (tipo === "BASE")     return `Base ${fv(p.base)}`;
  if (tipo === "SPH_CYL")  return `Esfera ${fv(p.sph)} | Cilindro ${fv(p.cyl)}`;
  if (tipo === "SPH_ADD")  return `${eyeLabel(eye)} | Esfera ${fv(p.sph)} | Adición ${fv(p.add)}`;
  if (tipo === "BASE_ADD") return `${eyeLabel(eye)} | Base ${fv(base)} | Adición ${fv(p.add)}`;
  return String(codebar || "");
}

function micaTypeName(tipo) {
  const map = {
    BASE: "Monofocal (Base)",
    SPH_CYL: "Monofocal",
    SPH_ADD: "Bifocal",
    BASE_ADD: "Progresivo"
  };
  return map[tipo] || tipo || "N/A";
}

async function resolveCodebarLocation(sheet, codebar) {
  const Model = getMatrixModel(sheet.tipo_matriz);
  if (!Model) return null;

  const doc = await Model.findOne({ sheet: sheet._id });
  if (!doc) return null;

  const cb = String(codebar || "").trim();
  if (!cb) return null;

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

  // SPH_ADD o BASE_ADD
  for (const [k, cell] of safeMapEntries(doc)) {
    if (!cell) continue;
    const odCb = String(cell?.OD?.codebar || "");
    const oiCb = String(cell?.OI?.codebar || "");
    let eye = null, node = null;

    if (odCb === cb) {
      eye = "OD";
      node = cell.OD;
    } else if (oiCb === cb) {
      eye = "OI";
      node = cell.OI;
    }

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

  let before = 0, after = 0;

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

  // Alerta de stock tras movimiento de laboratorio — no bloqueante
  setImmediate(() => {
    const { checkCellAlert } = require("../services/stockAlert.service");
    const eyeArg = (sheet.tipo_matriz === "BASE" || sheet.tipo_matriz === "SPH_CYL") ? null : (loc.eye || null);
    checkCellAlert(sheet, sheet.tipo_matriz, key, after, eyeArg);
  });

  return { ok: true, before, after };
}

async function applyExitToInventory(sheet, loc, qty, actor) {
  return applyDeltaToInventory(sheet, loc, -Math.abs(Number(qty || 0)), actor, "LAB_EXIT");
}

async function applyEntryToInventory(sheet, loc, qty, actor) {
  return applyDeltaToInventory(sheet, loc, Math.abs(Number(qty || 0)), actor, "LAB_ENTRY");
}

// ============================================================================
// ROUTES: EVENTS
// ============================================================================

router.get(
  "/events",
  query("type").optional().isString(),
  query("orderId").optional().isMongoId(),
  query("sheetId").optional().isMongoId(),
  query("q").optional().isString(),
  query("limit").optional().isInt({ min: 1, max: 2000 }),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  handleValidation,
  async (req, res) => {
    try {
      const typeRaw = String(req.query.type || "").trim();
      const types = typeRaw ? typeRaw.split(",").map((x) => x.trim()).filter(Boolean) : [];
      const allowed = new Set(["ORDER_CREATE", "EXIT_SCAN", "ORDER_CLOSE", "ORDER_RESET", "CORRECTION_REQUEST", "ORDER_CANCEL", "ORDER_EDIT"]);

      for (const t of types) {
        if (!allowed.has(t)) return res.status(400).json({ ok: false, message: `type inválido: ${t}` });
      }

      const filter = {};
      if (types.length) filter.type = { $in: types };
      if (req.query.orderId) filter.order = new mongoose.Types.ObjectId(req.query.orderId);
      if (req.query.sheetId) filter.sheet = new mongoose.Types.ObjectId(req.query.sheetId);

      if (req.query.from || req.query.to) {
        filter.createdAt = {};
        if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
        if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
      }

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

      const limit = Number(req.query.limit || 200);
      const rows = await LaboratoryEvent.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

      return res.json({ ok: true, data: rows });
    } catch (e) {
      console.error("GET /laboratory/events error:", e);
      res.status(500).json({ ok: false, message: "Error al listar eventos" });
    }
  }
);

// ============================================================================
// ROUTES: ORDERS
// ============================================================================

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

// GET /laboratory/orders/counts
router.get(
  "/orders/counts",
  async (req, res) => {
    try {
      const agg = await LaboratoryOrder.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);
      const result = { pendiente: 0, parcial: 0, cerrado: 0, cancelado: 0 };
      for (const { _id, count } of agg) {
        if (_id in result) result[_id] = count;
      }
      res.json({ ok: true, data: result });
    } catch (e) {
      console.error("GET /laboratory/orders/counts error:", e);
      res.status(500).json({ ok: false, message: "Error al obtener conteos" });
    }
  }
);

// POST /laboratory/orders — crear pedido (soporta micas de múltiples planillas)
router.post(
  "/orders",
  body("sheetId").optional({ nullable: true }).isMongoId(),
  body("cliente").isString().trim().notEmpty(),
  body("clienteDisplay").optional({ nullable: true }).isString(),
  body("clienteNombres").optional({ nullable: true }).isString(),
  body("clienteApellidos").optional({ nullable: true }).isString(),
  body("clienteEmpresa").optional({ nullable: true }).isString(),
  body("clienteContacto").optional({ nullable: true }).isString(),
  body("note").optional({ nullable: true }).isString(),
  body("pago").optional({ nullable: true }).isArray(),
  body("totalMonto").optional({ nullable: true }).isNumeric(),
  body("lines").isArray({ min: 1 }),
  body("lines.*.codebar").isString().trim().notEmpty(),
  body("lines.*.qty").isInt({ min: 1, max: 9999 }),
  body("lines.*.sheetId").optional({ nullable: true }).isMongoId(),
  body("lines.*.precio").optional({ nullable: true }).isNumeric(),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req) || { userId: null, name: "system" };

    try {
      const fallbackSheetId = req.body.sheetId || null;
      const folio      = genFolio("LAB");
      const ventaFolio = genFolio("VTA");
      const cliente          = String(req.body.cliente).trim();
      const clienteDisplay   = String(req.body.clienteDisplay   || "").trim();
      const clienteNombres   = String(req.body.clienteNombres   || "").trim();
      const clienteApellidos = String(req.body.clienteApellidos || "").trim();
      const clienteEmpresa   = String(req.body.clienteEmpresa   || "").trim();
      const clienteContacto  = String(req.body.clienteContacto  || "").trim();
      const note             = String(req.body.note || "").trim();
      const pago             = Array.isArray(req.body.pago) ? req.body.pago : [];
      const totalMonto       = Number(req.body.totalMonto || 0);

      // Deduplicar por (sheetId + codebar)
      const merged = new Map();
      for (const l of req.body.lines || []) {
        const cb = String(l.codebar || "").trim();
        const qty = Number(l.qty || 0);
        const lineSheetId = String(l.sheetId || fallbackSheetId || "");
        const precio = Number(l.precio || 0);

        if (!cb || !Number.isFinite(qty) || qty <= 0) continue;
        if (!lineSheetId) continue;

        const key = `${lineSheetId}__${cb}`;
        if (!merged.has(key)) merged.set(key, { codebar: cb, qty, sheetId: lineSheetId, precio });
        else merged.get(key).qty += qty;
      }

      if (!merged.size) {
        return res.status(400).json({ ok: false, message: "No hay líneas válidas para crear el pedido" });
      }

      // Cargar todas las planillas necesarias
      const uniqueSheetIds = [...new Set([...merged.values()].map((v) => v.sheetId))];
      const sheetDocs = await InventorySheet.find({ _id: { $in: uniqueSheetIds } });
      const sheetsById = Object.fromEntries(sheetDocs.map((s) => [String(s._id), s]));

      const errors = [];
      const lines = [];
      let primarySheetDoc = null;

      for (const [, { codebar, qty, sheetId, precio }] of merged.entries()) {
        const sheet = sheetsById[sheetId];
        if (!sheet) {
          errors.push({ codebar, error: "SHEET_NO_ENCONTRADA", sheetId });
          continue;
        }
        if (sheet.isDeleted) {
          errors.push({ codebar, error: "SHEET_ELIMINADA", sheetId });
          continue;
        }

        const loc = await resolveCodebarLocation(sheet, codebar);
        if (!loc) {
          errors.push({ codebar, error: "NO_ENCONTRADO_EN_MATRIZ" });
          continue;
        }
        if (Number(loc.existencias || 0) < qty) {
          errors.push({ codebar, error: "SIN_STOCK", stock: loc.existencias, qty });
          continue;
        }

        if (!primarySheetDoc) primarySheetDoc = sheet;

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
          picked: 0,
          precio,
          micaType: micaTypeName(sheet.tipo_matriz),
          sheetNombre: sheet.nombre || sheet.name || ""
        });
      }

      if (errors.length) {
        return res.status(400).json({ ok: false, message: "No se pudo crear pedido", errors });
      }

      const order = await LaboratoryOrder.create({
        folio,
        ventaFolio,
        sheet: primarySheetDoc?._id || null,
        cliente,
        clienteDisplay,
        clienteNombres,
        clienteApellidos,
        clienteEmpresa,
        clienteContacto,
        note,
        pago,
        totalMonto,
        status: "pendiente",
        lines,
        createdBy: actor,
        updatedBy: actor
      });

      const micaSummary = lines.reduce((acc, l) => {
        acc[l.micaType] = (acc[l.micaType] || 0) + l.qty;
        return acc;
      }, {});

      await LaboratoryEvent.create({
        order: order._id,
        sheet: primarySheetDoc?._id || null,
        type: "ORDER_CREATE",
        details: {
          folio,
          cliente,
          sheetId: primarySheetDoc ? String(primarySheetDoc._id) : null,
          linesTotal: lines.length,
          micaSummary
        },
        actor
      });

      broadcast("LAB_ORDER_CREATE", { orderId: String(order._id), folio, cliente });
      setImmediate(() => { notifyPendingOrders(); });
      setImmediate(() => { notifyNewOrder(order); });

      return res.status(201).json({ ok: true, data: order });
    } catch (e) {
      console.error("POST /laboratory/orders error:", e);
      res.status(500).json({ ok: false, message: "Error al crear pedido" });
    }
  }
);

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

// POST /laboratory/orders/:orderId/cancel
router.post(
  "/orders/:orderId/cancel",
  param("orderId").isMongoId(),
  body("actor").optional().isObject(),
  body("motivo").optional({ nullable: true }).isString().trim().isLength({ max: 400 }),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req) || { userId: null, name: "system" };
    const motivo = String(req.body.motivo || "").trim() || null;

    try {
      const order = await LaboratoryOrder.findById(req.params.orderId);
      if (!order) return res.status(404).json({ ok: false, message: "Pedido no existe" });
      if (order.status === "cancelado") {
        return res.status(409).json({ ok: false, message: "El pedido ya está cancelado" });
      }

      // Rollback: devolver stock
      const cancelSheetIds = [...new Set(
        (order.lines || []).filter(l => Number(l.picked || 0) > 0 && l.sheet).map(l => String(l.sheet))
      )];
      for (const line of order.lines || []) {
        const picked = Number(line.picked || 0);
        if (picked <= 0) continue;

        try {
          const lineSheet = await InventorySheet.findById(line.sheet);
          if (lineSheet && !lineSheet.isDeleted) {
            const loc = { matrixKey: line.matrixKey, eye: line.eye || null, codebar: line.codebar };
            await applyEntryToInventory(lineSheet, loc, picked, actor);
          }
        } catch (rollbackErr) {
          if (DEBUG_LAB) console.warn("[LAB] cancel rollback warning:", rollbackErr?.message);
        }
      }

      order.status = "cancelado";
      order.updatedBy = actor;
      order.updatedAt = new Date();
      await order.save();
      await Promise.all(cancelSheetIds.map(sid => invalidatePattern(KEYS.sheetPattern(sid))));
      broadcast("LAB_ORDER_CANCEL", { orderId: String(order._id), folio: order.folio, sheetIds: cancelSheetIds });
      setImmediate(() => { notifyPendingOrders(); });

      await LaboratoryEvent.create({
        order: order._id,
        sheet: order.sheet,
        type: "ORDER_CANCEL",
        details: { folio: order.folio, sheetId: order.sheet ? String(order.sheet) : null, motivo },
        actor
      });

      return res.json({ ok: true, data: order });
    } catch (e) {
      console.error("POST /laboratory/orders/:id/cancel error:", e);
      res.status(500).json({ ok: false, message: "Error al cancelar pedido" });
    }
  }
);

// POST /laboratory/orders/:orderId/scan
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
      if (order.status === "cancelado") return res.status(409).json({ ok: false, message: "Pedido cancelado" });

      const codebar = String(req.body.codebar).trim();
      const qtyReq = Number(req.body.qty || 1);
      const line = (order.lines || []).find((l) => String(l.codebar) === codebar);

      if (!line) return res.status(404).json({ ok: false, message: "Código no pertenece a este pedido" });

      const remaining = Number(line.qty || 0) - Number(line.picked || 0);
      if (remaining <= 0) return res.status(409).json({ ok: false, message: "Esa línea ya está completa" });

      const qty = Math.min(remaining, qtyReq);

      const sheet = await InventorySheet.findById(line.sheet);
      if (!sheet) return res.status(404).json({ ok: false, message: "Sheet de esta mica no encontrada" });
      if (sheet.isDeleted) return res.status(410).json({ ok: false, message: "Sheet eliminada" });

      const loc = { matrixKey: line.matrixKey, eye: line.eye || null, codebar: line.codebar };
      const inv = await applyExitToInventory(sheet, loc, qty, actor);

      if (!inv.ok && inv.reason === "NO_STOCK") {
        return res.status(409).json({
          ok: false,
          message: "No hay stock suficiente",
          before: inv.before,
          after: inv.after
        });
      }

      line.picked = Number(line.picked || 0) + qty;
      order.updatedBy = actor;
      order.updatedAt = new Date();

      const total = order.lines.reduce((acc, l) => acc + Number(l.qty || 0), 0);
      const pickedTotal = order.lines.reduce((acc, l) => acc + Math.min(Number(l.picked || 0), Number(l.qty || 0)), 0);

      if (pickedTotal <= 0) order.status = "pendiente";
      else order.status = "parcial"; // All picked = parcial until explicit /close

      await order.save();
      await invalidatePattern(KEYS.sheetPattern(String(sheet._id)));
      broadcast("LAB_ORDER_SCAN", { orderId: String(order._id), folio: order.folio, status: order.status, sheetIds: [String(sheet._id)] });

      const title = lineTitle(sheet.tipo_matriz, line.params, line.eye, codebar);

      await LaboratoryEvent.create({
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
          status: order.status,
          micaType: micaTypeName(sheet.tipo_matriz)
        },
        actor
      });

      return res.json({
        ok: true,
        data: order,
        scan: { codebar, qty, before: inv.before, after: inv.after }
      });
    } catch (e) {
      console.error("POST /laboratory/orders/:id/scan error:", e);
      res.status(500).json({ ok: false, message: "Error al procesar escaneo" });
    }
  }
);

// POST /laboratory/orders/:orderId/reset
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

      const resetSheetIds = [...new Set(
        (order.lines || []).filter(l => Number(l.picked || 0) > 0 && l.sheet).map(l => String(l.sheet))
      )];
      let totalRollback = 0;
      for (const line of order.lines || []) {
        const picked = Number(line.picked || 0);
        if (picked <= 0) continue;

        const lineSheet = await InventorySheet.findById(line.sheet);
        if (lineSheet && !lineSheet.isDeleted) {
          const loc = { matrixKey: line.matrixKey, eye: line.eye || null, codebar: line.codebar };
          await applyEntryToInventory(lineSheet, loc, picked, actor);
        }

        line.picked = 0;
        totalRollback += picked;
      }

      order.status = "pendiente";
      order.closedAt = null;
      order.closedBy = { userId: null, name: null };
      order.updatedBy = actor;
      order.updatedAt = new Date();
      await order.save();
      await Promise.all(resetSheetIds.map(sid => invalidatePattern(KEYS.sheetPattern(sid))));
      broadcast("LAB_ORDER_RESET", { orderId: String(order._id), folio: order.folio, sheetIds: resetSheetIds });
      setImmediate(() => { notifyPendingOrders(); });

      await LaboratoryEvent.create({
        order: order._id,
        sheet: order.sheet,
        type: "ORDER_RESET",
        details: { folio: order.folio, sheetId: order.sheet ? String(order.sheet) : null, totalRollback },
        actor
      });

      return res.json({ ok: true, data: order });
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
      broadcast("LAB_ORDER_CLOSE", { orderId: String(order._id), folio: order.folio });
      setImmediate(() => { notifyPendingOrders(); });

      await LaboratoryEvent.create({
        order: order._id,
        sheet: order.sheet,
        type: "ORDER_CLOSE",
        details: { folio: order.folio, sheetId: order.sheet ? String(order.sheet) : null },
        actor
      });

      res.json({ ok: true, data: order });
    } catch (e) {
      console.error("POST /laboratory/orders/:id/close error:", e);
      res.status(500).json({ ok: false, message: "Error al cerrar pedido" });
    }
  }
);

// PATCH /laboratory/orders/:orderId — editar cliente, nota, qty de líneas
router.patch(
  "/orders/:orderId",
  param("orderId").isMongoId(),
  body("cliente").optional().isString().trim().notEmpty(),
  body("note").optional({ nullable: true }).isString(),
  body("lines").optional().isArray(),
  body("actor").optional().isObject(),
  body("motivo").optional({ nullable: true }).isString().trim().isLength({ max: 400 }),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req) || { userId: null, name: "system" };
    const motivo = String(req.body.motivo || "").trim() || null;

    try {
      const order = await LaboratoryOrder.findById(req.params.orderId);
      if (!order) return res.status(404).json({ ok: false, message: "Pedido no existe" });
      if (order.status === "cerrado")
        return res.status(409).json({ ok: false, message: "No se puede editar un pedido cerrado" });
      if (order.status === "cancelado")
        return res.status(409).json({ ok: false, message: "No se puede editar un pedido cancelado" });

      // Capturar diff antes de modificar
      const diff = {};
      if (req.body.cliente !== undefined && req.body.cliente !== order.cliente) {
        diff.cliente = { before: order.cliente, after: String(req.body.cliente).trim() };
        order.cliente = diff.cliente.after;
      }
      if (req.body.note !== undefined && req.body.note !== order.note) {
        diff.note = { before: order.note, after: String(req.body.note || "").trim() };
        order.note = diff.note.after;
      }

      const linesChanges = [];
      if (Array.isArray(req.body.lines)) {
        const removeIds = new Set();

        for (const editLine of req.body.lines) {
          const lineId = String(editLine.lineId || "");
          const line = order.lines.find((l) => String(l.lineId) === lineId);
          if (!line) continue;

          if (editLine.remove === true) {
            const picked = Number(line.picked || 0);
            if (picked > 0) {
              return res.status(400).json({
                ok: false,
                message: `No puedes eliminar "${line.codebar}": ya se surtieron ${picked} piezas`
              });
            }
            removeIds.add(lineId);
            linesChanges.push({ action: "removed", codebar: line.codebar, lineId });
            continue;
          }

          if (editLine.qty !== undefined) {
            const newQty = Number(editLine.qty);
            const picked = Number(line.picked || 0);
            if (!Number.isInteger(newQty) || newQty < 1) {
              return res.status(400).json({ ok: false, message: "Cantidad mínima es 1" });
            }
            if (newQty < picked) {
              return res.status(400).json({
                ok: false,
                message: `No puedes reducir "${line.codebar}" a ${newQty}: ya surtidas ${picked}`
              });
            }
            if (newQty !== Number(line.qty)) {
              linesChanges.push({ action: "qty_changed", codebar: line.codebar, lineId, before: line.qty, after: newQty });
              line.qty = newQty;
            }
          }
        }

        if (removeIds.size > 0) {
          order.lines = order.lines.filter((l) => !removeIds.has(String(l.lineId)));
        }

        if (order.lines.length === 0) {
          return res.status(400).json({ ok: false, message: "El pedido debe tener al menos una línea" });
        }
      }

      // Recalcular status
      const pickedTotal = order.lines.reduce(
        (acc, l) => acc + Math.min(Number(l.picked || 0), Number(l.qty || 0)),
        0
      );
      if (pickedTotal <= 0) order.status = "pendiente";
      else order.status = "parcial";

      order.updatedBy = actor;
      order.updatedAt = new Date();
      await order.save();

      // Registrar evento de edición
      if (Object.keys(diff).length > 0 || linesChanges.length > 0 || motivo) {
        await LaboratoryEvent.create({
          order: order._id,
          sheet: order.sheet,
          type: "ORDER_EDIT",
          details: {
            folio: order.folio,
            motivo,
            diff,
            linesChanges
          },
          actor
        });
      }

      return res.json({ ok: true, data: order });
    } catch (e) {
      console.error("PATCH /laboratory/orders/:id error:", e);
      res.status(500).json({ ok: false, message: "Error al editar pedido" });
    }
  }
);

// ============================================================================
// ROUTES: CORRECTIONS
// ============================================================================

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
          sheetId: order.sheet ? String(order.sheet) : null,
          codebar,
          message
        },
        actor
      });

      setImmediate(() => {
        notifyCorrection({
          folio:     order.folio,
          orderId:   String(order._id),
          message:   String(req.body.message || "").trim(),
          actorName: actor?.name || null,
        });
      });

      return res.status(201).json({ ok: true, data: event });
    } catch (e) {
      console.error("POST /laboratory/corrections error:", e);
      res.status(500).json({ ok: false, message: "Error al solicitar corrección" });
    }
  }
);

module.exports = router;