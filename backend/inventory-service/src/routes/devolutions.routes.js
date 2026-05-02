/**
 * devolutions.routes.js
 *
 * CRUD completo de devoluciones del laboratorio óptico.
 *
 * GET    /api/devolutions             → listado paginado (supervisor, root, eurovision)
 * GET    /api/devolutions/stats       → métricas rápidas para el dashboard
 * GET    /api/devolutions/:id         → detalle de una devolución
 * POST   /api/devolutions             → crear devolución (ventas, supervisor, root, eurovision)
 * PATCH  /api/devolutions/:id/status  → cambiar estado (supervisor, root, eurovision)
 * DELETE /api/devolutions/:id         → borrado lógico (root, eurovision)
 */

"use strict";

const router = require("express").Router();
const { protect } = require("../utils/auth");

const Devolution      = require("../models/Devolution");
const LaboratoryOrder = require("../models/laboratory/LaboratoryOrder");
const InventorySheet  = require("../models/InventorySheet");
const InventoryChangeLog = require("../models/InventoryChangeLog");
const MatrixBase      = require("../models/matrix/MatrixBase");
const MatrixSphCyl    = require("../models/matrix/MatrixSphCyl");
const MatrixBifocal   = require("../models/matrix/MatrixBifocal");
const MatrixProgresivo = require("../models/matrix/MatrixProgresivo");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const DEBUG_DEV  = String(process.env.DEBUG_DEV || "") === "1";

// ─── Roles ───────────────────────────────────────────────────────────────────
const ROLES_VIEW    = ["root", "eurovision", "supervisor", "ventas", "laboratorio"];
const ROLES_MANAGER = ["root", "eurovision", "supervisor"];
const ROLES_CREATE  = ["root", "eurovision", "supervisor", "ventas"];
const ROLES_ADMIN   = ["root", "eurovision"];

// ─── Auth middleware ──────────────────────────────────────────────────────────
const requireAuth = (allowedRoles) => protect(allowedRoles);

// ─── Generador de folio ───────────────────────────────────────────────────────
async function generateFolio() {
  const count = await Devolution.countDocuments();
  const pad   = String(count + 1).padStart(5, "0");
  const year  = new Date().getFullYear();
  return `DEV-${year}-${pad}`;
}

// ─── Helpers de inventario (replicados de laboratory.routes.js) ───────────────
const getMatrixModel = (tipo) => {
  switch (tipo) {
    case "BASE":    return MatrixBase;
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

/**
 * Encuentra la coordenada (matrixKey, eye) de un codebar dentro de una hoja.
 * Retorna { matrixKey, eye, existencias, sku } o null si no se encuentra.
 */
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
        return { matrixKey: String(k), eye: null, existencias: Number(cell.existencias || 0), sku: cell.sku || null };
      }
    }
    return null;
  }

  // SPH_ADD o BASE_ADD
  for (const [k, cell] of safeMapEntries(doc)) {
    if (!cell) continue;
    if (String(cell?.OD?.codebar || "") === cb)
      return { matrixKey: String(k), eye: "OD", existencias: Number(cell.OD?.existencias || 0), sku: cell.OD?.sku || null };
    if (String(cell?.OI?.codebar || "") === cb)
      return { matrixKey: String(k), eye: "OI", existencias: Number(cell.OI?.existencias || 0), sku: cell.OI?.sku || null };
  }
  return null;
}

/**
 * Aplica un delta (+qty para reingreso) a una celda de inventario.
 */
async function applyStockEntry(sheet, loc, qty, actor) {
  const Model = getMatrixModel(sheet.tipo_matriz);
  if (!Model) throw new Error(`tipo_matriz no soportado: ${sheet.tipo_matriz}`);

  const doc = await Model.findOne({ sheet: sheet._id });
  if (!doc) throw new Error("Matriz no encontrada");

  doc.set("cells", doc.cells || new Map());

  const key  = String(loc.matrixKey);
  const cell = doc.cells.get(key);
  if (!cell) throw new Error(`Celda ${key} no encontrada en matriz`);

  const q = Math.abs(Number(qty || 0));
  if (!Number.isFinite(q) || q === 0) throw new Error("qty inválido");

  let before = 0, after = 0;

  if (sheet.tipo_matriz === "BASE" || sheet.tipo_matriz === "SPH_CYL") {
    before = Number(cell.existencias || 0);
    after  = before + q;
    cell.existencias = after;
    cell.updatedBy   = actor;
    doc.cells.set(key, cell);
  } else {
    const eye = loc.eye;
    if (eye !== "OD" && eye !== "OI") throw new Error("eye requerido (OD/OI)");
    cell[eye] = cell[eye] || {};
    before = Number(cell[eye].existencias || 0);
    after  = before + q;
    cell[eye].existencias = after;
    cell.updatedBy = actor;
    doc.cells.set(key, cell);
  }

  doc.markModified("cells");
  await doc.save();

  try {
    await InventoryChangeLog.create({
      sheet:       sheet._id,
      tipo_matriz: sheet.tipo_matriz,
      type:        "DEV_ENTRY",
      details: {
        codebar:   String(loc?.codebar || ""),
        qty:       q,
        before,
        after,
        matrixKey: key,
        eye:       loc.eye || null,
      },
      actor,
    });
  } catch (e) {
    if (DEBUG_DEV) console.warn("[DEV] InventoryChangeLog fail:", e?.message || e);
  }

  // Stock alert no bloqueante
  setImmediate(() => {
    try {
      const { checkCellAlert } = require("../services/stockAlert.service");
      const eyeArg = (sheet.tipo_matriz === "BASE" || sheet.tipo_matriz === "SPH_CYL") ? null : (loc.eye || null);
      checkCellAlert(sheet, sheet.tipo_matriz, key, after, eyeArg);
    } catch (_) {}
  });

  return { ok: true, before, after };
}

/**
 * Cuando se aprueba/procesa una devolución con restoreStock=true,
 * restaura el stock real en las matrices de inventario.
 * Solo se ejecuta una vez (guarda por stockRestored).
 */
async function restoreInventoryStock(dev, actor) {
  if (!dev.restoreStock || dev.stockRestored) return;

  const errors = [];

  for (const item of dev.items || []) {
    if (!item.restoreStock) continue;

    let sheetDoc = null;
    let loc      = null;

    // Caso 1: item ya tiene sheet + matrixKey resuelto
    if (item.sheet && item.matrixKey) {
      sheetDoc = await InventorySheet.findById(item.sheet).lean();
      if (sheetDoc) {
        loc = { matrixKey: item.matrixKey, eye: item.eye || null, codebar: item.codebar };
      }
    }

    // Caso 2: solo tiene codebar, intentar buscar en todas las hojas activas
    if (!loc && item.codebar) {
      const sheets = await InventorySheet.find({ isDeleted: { $ne: true } }).lean();
      for (const s of sheets) {
        const found = await resolveCodebarLocation(s, item.codebar);
        if (found) {
          sheetDoc = s;
          loc      = { ...found, codebar: item.codebar };
          break;
        }
      }
    }

    if (!sheetDoc || !loc) {
      errors.push({ codebar: item.codebar, error: "NO_ENCONTRADO_EN_INVENTARIO" });
      continue;
    }

    try {
      await applyStockEntry(sheetDoc, loc, item.qty, actor);
    } catch (e) {
      errors.push({ codebar: item.codebar, error: e.message });
      if (DEBUG_DEV) console.warn("[DEV] restoreStock error:", e.message);
    }
  }

  return errors;
}

// ─── GET /api/devolutions/stats ───────────────────────────────────────────────
router.get("/stats", requireAuth(ROLES_MANAGER), async (_req, res) => {
  try {
    const d30  = new Date(); d30.setDate(d30.getDate() - 30); d30.setHours(0,0,0,0);
    const d7   = new Date(); d7.setDate(d7.getDate() - 7);    d7.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);

    const [
      total,
      pendientes,
      aprobadas,
      rechazadas,
      procesadas,
      enRevision,
      total30d,
      total7d,
      today_count,
      byReason,
    ] = await Promise.all([
      Devolution.countDocuments(),
      Devolution.countDocuments({ status: "pendiente" }),
      Devolution.countDocuments({ status: "aprobada" }),
      Devolution.countDocuments({ status: "rechazada" }),
      Devolution.countDocuments({ status: "procesada" }),
      Devolution.countDocuments({ status: "en_revision" }),
      Devolution.countDocuments({ createdAt: { $gte: d30 } }),
      Devolution.countDocuments({ createdAt: { $gte: d7 } }),
      Devolution.countDocuments({ createdAt: { $gte: today } }),
      Devolution.aggregate([
        { $group: { _id: "$reason", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      ok: true,
      data: {
        total, pendientes, aprobadas, rechazadas, procesadas, enRevision,
        total30d, total7d, today_count,
        byReason: byReason.map(r => ({ reason: r._id, count: r.count })),
      },
    });
  } catch (e) {
    console.error("GET /devolutions/stats error:", e);
    res.status(500).json({ ok: false, error: "Error al generar estadísticas" });
  }
});

// ─── GET /api/devolutions ─────────────────────────────────────────────────────
router.get("/", requireAuth(ROLES_VIEW), async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page || "1"));
    const limit  = Math.min(50, parseInt(req.query.limit || "20"));
    const skip   = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.q;

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (search) {
      filter.$or = [
        { folio: { $regex: search, $options: "i" } },
        { cliente: { $regex: search, $options: "i" } },
        { orderFolio: { $regex: search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Devolution.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Devolution.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("GET /devolutions error:", e);
    res.status(500).json({ ok: false, error: "Error al listar devoluciones" });
  }
});

// ─── GET /api/devolutions/:id ─────────────────────────────────────────────────
router.get("/:id", requireAuth(ROLES_VIEW), async (req, res) => {
  try {
    const dev = await Devolution.findById(req.params.id).lean();
    if (!dev) return res.status(404).json({ ok: false, error: "Devolución no encontrada" });
    res.json({ ok: true, data: dev });
  } catch (e) {
    res.status(500).json({ ok: false, error: "Error al obtener devolución" });
  }
});

// ─── POST /api/devolutions ────────────────────────────────────────────────────
router.post("/", requireAuth(ROLES_CREATE), async (req, res) => {
  try {
    const {
      order: orderId, orderFolio, cliente, clientePhone,
      reason, reasonDetail, items, notes, restoreStock,
    } = req.body;

    if (!cliente || !reason) {
      return res.status(400).json({ ok: false, error: "cliente y reason son requeridos" });
    }

    // Verificar que el pedido existe si se proporciona
    let resolvedOrderFolio = orderFolio || null;
    let orderDoc = null;
    if (orderId) {
      orderDoc = await LaboratoryOrder.findById(orderId).lean();
      if (!orderDoc) return res.status(404).json({ ok: false, error: "Pedido no encontrado" });
      resolvedOrderFolio = orderDoc.folio;
    }

    // Auto-resolver sheet + matrixKey de cada ítem desde las líneas del pedido
    const resolvedItems = await Promise.all(
      (Array.isArray(items) ? items : []).map(async (item) => {
        const resolved = { ...item };
        if (!resolved.sheet && orderDoc && item.codebar) {
          const orderLine = (orderDoc.lines || []).find(
            l => String(l.codebar || "") === String(item.codebar || "")
          );
          if (orderLine) {
            resolved.sheet     = orderLine.sheet     || null;
            resolved.matrixKey = orderLine.matrixKey  || null;
            resolved.eye       = orderLine.eye        || null;
          }
        }
        return resolved;
      })
    );

    const folio = await generateFolio();

    const dev = await Devolution.create({
      folio,
      order:         orderId || null,
      orderFolio:    resolvedOrderFolio,
      cliente,
      clientePhone:  clientePhone || null,
      reason,
      reasonDetail:  reasonDetail || "",
      items:         resolvedItems,
      notes:         notes || "",
      restoreStock:  Boolean(restoreStock),
      status:        "pendiente",
      createdBy: {
        userId: req.user?.userId || req.user?.id || null,
        name:   req.user?.name  || req.user?.username || null,
      },
    });

    res.status(201).json({ ok: true, data: dev });
  } catch (e) {
    console.error("POST /devolutions error:", e);
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ─── PATCH /api/devolutions/:id/status ───────────────────────────────────────
router.patch("/:id/status", requireAuth(ROLES_MANAGER), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const VALID = ["pendiente", "en_revision", "aprobada", "rechazada", "procesada"];
    if (!VALID.includes(status)) {
      return res.status(400).json({ ok: false, error: `Estado inválido: ${status}` });
    }

    // Cargar el documento actual (necesitamos el estado previo y los ítems)
    const dev = await Devolution.findById(req.params.id);
    if (!dev) return res.status(404).json({ ok: false, error: "Devolución no encontrada" });

    const actor = {
      userId: req.user?.userId || req.user?.id || null,
      name:   req.user?.name  || null,
    };

    // Restaurar stock si se marca como procesada y aún no fue restaurado
    let stockErrors = [];
    if (status === "procesada" && !dev.stockRestored && dev.restoreStock) {
      stockErrors = await restoreInventoryStock(dev, actor) || [];
    }

    dev.status      = status;
    dev.processedBy = actor;
    dev.processedAt = new Date();
    if (notes !== undefined) dev.notes = notes;
    if (status === "procesada" && dev.restoreStock) dev.stockRestored = true;

    await dev.save();

    res.json({
      ok: true,
      data: dev,
      ...(stockErrors.length > 0 && { stockWarnings: stockErrors }),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── DELETE /api/devolutions/:id ─────────────────────────────────────────────
router.delete("/:id", requireAuth(ROLES_ADMIN), async (req, res) => {
  try {
    const dev = await Devolution.findById(req.params.id);
    if (!dev) return res.status(404).json({ ok: false, error: "Devolución no encontrada" });
    if (dev.status === "procesada") {
      return res.status(400).json({ ok: false, error: "No se puede eliminar una devolución ya procesada" });
    }
    await Devolution.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
