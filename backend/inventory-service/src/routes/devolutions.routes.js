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
const devolutionService = require("../services/devolution.service");
const stockService = require("../services/stock.service");
const notifClient = require("../services/notifClient");
const { generateFolio } = require("../utils/folio");
const axios = require("axios");

const OPTICA_SERVICE_URL = process.env.OPTICA_SERVICE_URL || "http://optica-service:3000";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const DEBUG_DEV  = String(process.env.DEBUG_DEV || "") === "1";

// ─── Roles ───────────────────────────────────────────────────────────────────
const ROLES_VIEW    = ["root", "eurovision", "supervisor", "ventas", "laboratorio"];
const ROLES_MANAGER = ["root", "eurovision", "supervisor"];
const ROLES_CREATE  = ["root", "eurovision", "supervisor", "ventas"];
const ROLES_ADMIN   = ["root", "eurovision"];

// ─── Auth middleware ──────────────────────────────────────────────────────────
const requireAuth = (allowedRoles) => protect(allowedRoles);

// generateFolio local eliminado — ahora se usa ../utils/folio.js


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

// Helpers de stock eliminados — ahora se usa stockService.mutateMatrixCell


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

    // Caso 1: item ya tiene sheet + matrixKey resuelto (LAB)
    if (item.sheet && item.matrixKey) {
      sheetDoc = await InventorySheet.findById(item.sheet).lean();
      if (sheetDoc) {
        loc = { matrixKey: item.matrixKey, eye: item.eye || null, codebar: item.codebar };
      }
    }

    // Caso 2: Es un ítem de Óptica (VNT) - Detectado por falta de sheet/matrixKey pero presencia de codebar/sku
    if (!sheetDoc && item.codebar) {
      // Intentamos ver si es de laboratorio buscando en hojas
      const sheets = await InventorySheet.find({ isDeleted: { $ne: true } }).lean();
      for (const s of sheets) {
        const found = await resolveCodebarLocation(s, item.codebar);
        if (found) {
          sheetDoc = s;
          loc      = { ...found, codebar: item.codebar };
          break;
        }
      }

      // Si después de buscar en hojas NO se encontró, es probable que sea de ÓPTICA
      if (!sheetDoc) {
        console.log(`[DEV] Item ${item.codebar} not found in lab sheets, checking Optica...`);
        try {
          // Intentamos restaurar en óptica (si falla o no existe, simplemente registramos el error)
          // El optica-service tiene endpoints PATCH /:id/stock, pero necesitamos saber el ID o usar SKU
          // Como no tenemos el ID aquí directamente, podemos usar una ruta de búsqueda por SKU
          // O mejor, el optica-service debería tener un endpoint genérico de "reingreso"
          
          // Por simplicidad en este MVP, usaremos el endpoint de stock si tenemos la info
          // En un sistema real, el objeto 'item' de la devolución debería tener 'opticaId' y 'collection'
          
          // Intentaremos restaurar en la colección más probable (armazones, lentes, etc.)
          const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
          const collections = ["armazones", "lentes", "soluciones", "accesorios"];
          let restored = false;
          for (const col of collections) {
            // Usamos el token interno para comunicación entre servicios
            const headers = { "x-service-token": INTERNAL_TOKEN };
            const findRes = await axios.get(`${OPTICA_SERVICE_URL}/api/optica/${col}`, { 
              params: { q: item.codebar },
              headers 
            });
            const target = findRes.data.data.find(it => it.sku === item.codebar);
            if (target) {
              const newStock = (target.stock || 0) + Math.abs(Number(item.qty || 0));
              await axios.patch(`${OPTICA_SERVICE_URL}/api/optica/${col}/${target._id}/stock`, 
                { stock: newStock },
                { headers }
              );
              console.log(`[DEV] Successfully restored stock for ${item.codebar} in optica/${col}`);
              restored = true;
              break;
            }
          }
          
          if (restored) continue; // Éxito en óptica, saltamos al siguiente ítem
        } catch (optErr) {
          console.warn("[DEV] optica restore fail:", optErr.message);
        }
      }
    }

    if (!sheetDoc || !loc) {
      errors.push({ codebar: item.codebar, error: "NO_ENCONTRADO_EN_INVENTARIO" });
      continue;
    }

    try {
      await stockService.mutateMatrixCell({
        sheet:       sheetDoc,
        matrixKey:   loc.matrixKey,
        eye:         loc.eye || null,
        delta:       Math.abs(Number(item.qty || 0)),
        type:        "DEV_ENTRY",
        actor,
        codebar:     item.codebar
      });
    } catch (e) {
      errors.push({ codebar: item.codebar, error: e.message });
      console.warn("[DEV] restoreStock error:", e.message);
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
    if (status && status !== "all") {
      if (status.includes(",")) {
        filter.status = { $in: status.split(",") };
      } else {
        filter.status = status;
      }
    }
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

    const folio = await generateFolio("DEV", Devolution);

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

    // Notificar a supervisores/admin (agrupado)
    setImmediate(() => {
      devolutionService.notifyPendingApprovals();
    });
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

    // Convertir items dañados/defectuosos en mermas al aprobar o procesar
    let mermasGenerated = { ok: [], errors: [] };
    if ((status === "aprobada" || status === "procesada") && !dev.mermasProcessed) {
      mermasGenerated = await devolutionService.processDamagedAsMermas(dev, actor);
      dev.mermasProcessed = true;
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
      ...(mermasGenerated.ok.length > 0 && { mermasGenerated: mermasGenerated.ok }),
      ...(mermasGenerated.errors.length > 0 && { mermaErrors: mermasGenerated.errors }),
    });

    // Notificar cambio de estado
    let notifTitle = "Actualización de Devolución";
    let notifPriority = "low";
    if (status === "aprobada") { notifTitle = "✅ Devolución Aprobada"; notifPriority = "medium"; }
    if (status === "rechazada") { notifTitle = "❌ Devolución Rechazada"; notifPriority = "high"; }
    if (status === "procesada") { notifTitle = "📦 Devolución Procesada"; notifPriority = "low"; }

    notifClient.upsertDaily({
      groupKey: `dev-status-${dev.folio}`,
      type: "inventory_alert",
      priority: notifPriority,
      title: notifTitle,
      message: `La devolución ${dev.folio} ha cambiado a estado: ${status.toUpperCase()}.`,
      targetRoles: ["supervisor", "root", "eurovision", "ventas"],
      metadata: { devolutionId: dev._id, folio: dev.folio, status }
    });

    // Actualizar notificación agrupada de pendientes
    setImmediate(() => {
      devolutionService.notifyPendingApprovals();
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── PUT /api/devolutions/:id ─────────────────────────────────────────────────
// Edita una devolución (solo en estados pendiente o en_revision).
router.put("/:id", requireAuth(ROLES_MANAGER), async (req, res) => {
  try {
    const actor = {
      userId: req.user?.userId || req.user?.id || null,
      name:   req.user?.name   || null,
    };
    const updated = await devolutionService.updateDevolution(req.params.id, req.body, actor);
    res.json({ ok: true, data: updated });

    // Actualizar notificación agrupada de pendientes
    setImmediate(() => {
      devolutionService.notifyPendingApprovals();
    });
  } catch (e) {
    const status = e?.status || 500;
    res.status(status).json({ ok: false, code: e?.code || "ERROR", error: e?.message || "Error al actualizar devolución" });
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
