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
const { protect } = require("../utils/auth");

const { notifyPendingOrders, notifyNewOrder, notifyCorrection } = require("../services/labNotification.service");
const { actorFromBody, sanitizeString } = require("../inventory/utils/normalize");
const { denormNum, parseKey } = require("../inventory/utils/keys");
const { broadcast } = require("../ws");
const { invalidatePattern, KEYS } = require("../services/redis");

// ============================================================================
// HELPERS (RESTAURADOS PARA MICAS SOLAMENTE)
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

/**
 * GET /api/laboratory/clients
 * Busca clientes únicos en las órdenes de laboratorio para autocompletado.
 */
router.get("/clients", protect(), async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q || q.length < 2) return res.json({ ok: true, data: [] });

    const regex = new RegExp(escapeRx(q), "i");

    const clients = await LaboratoryOrder.aggregate([
      { $match: { 
          $or: [
            { cliente: regex },
            { clienteDisplay: regex },
            { clienteNombres: regex },
            { clienteApellidos: regex }
          ]
      } },
      { $sort: { createdAt: -1 } },
      { $group: {
          _id: "$cliente", 
          nombre: { $first: "$cliente" },
          display: { $first: "$clienteDisplay" },
          nombres: { $first: "$clienteNombres" },
          apellidos: { $first: "$clienteApellidos" },
          empresa: { $first: "$clienteEmpresa" },
          contacto: { $first: "$clienteContacto" },
          nota: { $first: "$note" },
          pedidos: { $sum: 1 }
      } },
      { $limit: 10 }
    ]);

    res.json({ ok: true, data: clients });
  } catch (e) {
    console.error("Error buscando clientes:", e);
    res.status(500).json({ ok: false });
  }
});

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
        return { matrixKey: String(k), eye: null, sku: cell.sku || null, existencias: Number(cell.existencias || 0), params };
      }
    }
    return null;
  }

  for (const [k, cell] of safeMapEntries(doc)) {
    if (!cell) continue;
    const odCb = String(cell?.OD?.codebar || "");
    const oiCb = String(cell?.OI?.codebar || "");
    let eye = null, node = null;

    if (odCb === cb) { eye = "OD"; node = cell.OD; }
    else if (oiCb === cb) { eye = "OI"; node = cell.OI; }

    if (!eye || !node) continue;

    const params = {};
    if (sheet.tipo_matriz === "SPH_ADD") {
      const [sph, add] = parseKey(k);
      params.sph = sph; params.add = add;
      params.base_izq = Number(cell.base_izq ?? null);
      params.base_der = Number(cell.base_der ?? null);
    } else if (sheet.tipo_matriz === "BASE_ADD") {
      const [bi, bd, add] = parseKey(k);
      params.base_izq = bi; params.base_der = bd; params.add = add;
    }

    return { matrixKey: String(k), eye, sku: node.sku || null, existencias: Number(node.existencias || 0), params };
  }
  return null;
}

async function applyDeltaToInventory(sheet, loc, qtySigned, actor, reasonType) {
  const Model = getMatrixModel(sheet.tipo_matriz);
  if (!Model) throw new Error(`tipo_matriz no soportado: ${sheet.tipo_matriz}`);
  const q = Number(qtySigned || 0);
  const key = String(loc.matrixKey);
  const isDirect = (sheet.tipo_matriz === "BASE" || sheet.tipo_matriz === "SPH_CYL");
  const fieldPath = isDirect ? `cells.${key}.existencias` : `cells.${key}.${loc.eye}.existencias`;
  const query = { sheet: sheet._id };
  if (q < 0) query[fieldPath] = { $gte: Math.abs(q) };

  try {
    const updatedDoc = await Model.findOneAndUpdate(query, {
      $inc: { [fieldPath]: q },
      $set: { [`cells.${key}.updatedBy`]: actor }
    }, { new: true }).lean();

    if (!updatedDoc) return { ok: false, reason: q < 0 ? "NO_STOCK" : "FAILED" };

    const cellData = updatedDoc.cells[key] || updatedDoc.cells;
    const after = isDirect ? (cellData?.existencias || 0) : (cellData?.[loc.eye]?.existencias || 0);
    const before = after - q;

    setImmediate(async () => {
      try {
        await InventoryChangeLog.create({
          sheet: sheet._id, tipo_matriz: sheet.tipo_matriz, type: reasonType,
          details: { codebar: String(loc?.codebar || ""), qty: q, before, after, matrixKey: key, eye: loc.eye || null },
          actor
        });
        const { checkCellAlert } = require("../services/stockAlert.service");
        checkCellAlert(sheet, sheet.tipo_matriz, key, after, isDirect ? null : (loc.eye || null));
      } catch (e) { if (DEBUG_LAB) console.warn("[LAB] Log fail:", e.message); }
    });

    return { ok: true, before, after };
  } catch (e) { console.error(e); throw e; }
}

async function applyExitToInventory(sheet, loc, qty, actor) {
  return applyDeltaToInventory(sheet, loc, -Math.abs(Number(qty || 0)), actor, "LAB_EXIT");
}

async function applyEntryToInventory(sheet, loc, qty, actor) {
  return applyDeltaToInventory(sheet, loc, Math.abs(Number(qty || 0)), actor, "LAB_ENTRY");
}

// ============================================================================
// ROUTES
// ============================================================================

router.use(protect());

router.get("/events", handleValidation, async (req, res) => {
  try {
    const filter = {};
    if (req.query.orderId) filter.order = new mongoose.Types.ObjectId(req.query.orderId);
    const rows = await LaboratoryEvent.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ ok: true, data: rows });
  } catch (e) { res.status(500).json({ ok: false }); }
});

router.get("/orders", handleValidation, async (req, res) => {
  try {
    const status = String(req.query.status || "all");
    const filter = status === "all" ? {} : { status };
    const rows = await LaboratoryOrder.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ ok: true, data: rows });
  } catch (e) { res.status(500).json({ ok: false }); }
});

router.get("/orders/counts", async (req, res) => {
  try {
    const agg = await LaboratoryOrder.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const result = { pendiente: 0, parcial: 0, cerrado: 0, cancelado: 0 };
    for (const { _id, count } of agg) { if (_id in result) result[_id] = count; }
    res.json({ ok: true, data: result });
  } catch (e) { res.status(500).json({ ok: false }); }
});

// POST /orders (EXCLUSIVO PARA MICAS)
router.post("/orders", [
  body("sheetId").isMongoId(),
  body("cliente").isString().trim().notEmpty(),
  body("lines").isArray({ min: 1 })
], handleValidation, async (req, res) => {
  const actor = actorFromBody(req) || { userId: null, name: "system" };
  try {
    const sheet = await InventorySheet.findById(req.body.sheetId);
    if (!sheet || sheet.isDeleted) return res.status(404).json({ ok: false, message: "Sheet no encontrada" });

    const folio = genFolio("LAB");
    const lines = [];
    for (const l of req.body.lines) {
      const loc = await resolveCodebarLocation(sheet, l.codebar);
      if (!loc) return res.status(400).json({ ok: false, message: `Código ${l.codebar} no encontrado` });
      lines.push({ lineId: new mongoose.Types.ObjectId().toString(), codebar: l.codebar, sku: loc.sku, sheet: sheet._id, tipo_matriz: sheet.tipo_matriz, matrixKey: loc.matrixKey, eye: loc.eye, params: loc.params, qty: l.qty, picked: 0, precio: l.precio, micaType: micaTypeName(sheet.tipo_matriz), sheetNombre: sheet.nombre });
    }

    const order = await LaboratoryOrder.create({
      folio,
      sheet: sheet._id,
      cliente: req.body.cliente,
      clienteNombres: req.body.clienteNombres || "",
      clienteApellidos: req.body.clienteApellidos || "",
      clienteEmpresa: req.body.clienteEmpresa || "",
      clienteContacto: req.body.clienteContacto || "",
      clienteDisplay: [req.body.clienteNombres, req.body.clienteApellidos].filter(Boolean).join(" ") || req.body.cliente,
      note: req.body.note || "",
      pago: req.body.pago || [],
      totalMonto: req.body.totalMonto,
      status: "pendiente",
      lines,
      createdBy: actor,
      updatedBy: actor
    });
    broadcast("LAB_ORDER_CREATE", { orderId: order._id, folio, cliente: order.cliente });
    
    // 🔔 Notificaciones asíncronas (en paralelo para mayor velocidad)
    setImmediate(async () => {
      await Promise.all([
        notifyNewOrder(order),
        notifyPendingOrders()
      ]).catch(e => console.warn("[LAB] Notif Error:", e.message));
    });

    return res.status(201).json({ ok: true, data: order });
  } catch (e) { console.error(e); res.status(500).json({ ok: false }); }
});

router.post("/orders/:orderId/scan", param("orderId").isMongoId(), handleValidation, async (req, res) => {
  const actor = actorFromBody(req) || { userId: null, name: "system" };
  try {
    const order = await LaboratoryOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ ok: false, message: "Pedido no encontrado" });

    if (order.status === "cerrado" || order.status === "cancelado") {
      return res.status(400).json({ ok: false, message: "No se puede surtir un pedido que ya está cerrado o cancelado." });
    }

    const line = order.lines.find(l => l.codebar === req.body.codebar);
    if (!line) return res.status(404).json({ ok: false, message: `El código ${req.body.codebar} no pertenece a este pedido.` });

    const sheet = await InventorySheet.findById(line.sheet);
    const inv = await applyExitToInventory(sheet, line, req.body.qty || 1, actor);
    if (!inv.ok) return res.status(409).json({ ok: false, reason: inv.reason });

    // 🚀 ATOMIC UPDATE: Previene que escaneos simultáneos del mismo pedido se pisen entre sí
    const updatedOrder = await LaboratoryOrder.findOneAndUpdate(
      { _id: req.params.orderId, "lines.codebar": req.body.codebar },
      { 
        $inc: { "lines.$.picked": (req.body.qty || 1) },
        $set: { status: "parcial", updatedBy: actor }
      },
      { new: true }
    );

    broadcast("LAB_ORDER_SCAN", { orderId: updatedOrder._id, folio: updatedOrder.folio });
    setImmediate(() => notifyPendingOrders());
    res.json({ ok: true, data: updatedOrder });
  } catch (e) { res.status(500).json({ ok: false }); }
});

router.post("/orders/:orderId/close", param("orderId").isMongoId(), async (req, res) => {
  try {
    const order = await LaboratoryOrder.findByIdAndUpdate(req.params.orderId, { status: "cerrado", closedAt: new Date(), closedBy: actorFromBody(req) }, { new: true });
    broadcast("LAB_ORDER_CLOSE", { orderId: order._id, folio: order.folio });
    setImmediate(() => notifyPendingOrders());
    res.json({ ok: true, data: order });
  } catch (e) { res.status(500).json({ ok: false }); }
});

router.post("/orders/:orderId/reset", param("orderId").isMongoId(), async (req, res) => {
  const actor = actorFromBody(req) || { userId: null, name: "system" };
  try {
    const order = await LaboratoryOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ ok: false });

    // Devolver stock de lo que ya se había "picado"
    for (const line of order.lines) {
      if (line.picked > 0) {
        const sheet = await InventorySheet.findById(line.sheet);
        if (sheet) await applyEntryToInventory(sheet, line, line.picked, actor);
        line.picked = 0;
      }
    }

    order.status = "pendiente";
    order.updatedBy = actor;
    await order.save();

    broadcast("LAB_ORDER_RESET", { orderId: order._id, folio: order.folio });
    setImmediate(() => notifyPendingOrders());
    res.json({ ok: true, data: order });
  } catch (e) { console.error(e); res.status(500).json({ ok: false }); }
});

router.post("/orders/:orderId/cancel", param("orderId").isMongoId(), async (req, res) => {
  const actor = actorFromBody(req) || { userId: null, name: "system" };
  try {
    const order = await LaboratoryOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ ok: false });

    // Devolver stock si era parcial
    for (const line of order.lines) {
      if (line.picked > 0) {
        const sheet = await InventorySheet.findById(line.sheet);
        if (sheet) await applyEntryToInventory(sheet, line, line.picked, actor);
      }
    }

    order.status = "cancelado";
    order.updatedBy = actor;
    await order.save();

    broadcast("LAB_ORDER_CANCEL", { orderId: order._id, folio: order.folio });
    setImmediate(() => notifyPendingOrders());
    res.json({ ok: true, data: order });
  } catch (e) { console.error(e); res.status(500).json({ ok: false }); }
});

module.exports = router;