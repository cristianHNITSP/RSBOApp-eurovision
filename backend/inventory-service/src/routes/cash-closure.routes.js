const express = require("express");
const router = express.Router();
const { protect } = require("../utils/auth");
const LaboratoryOrder = require("../models/laboratory/LaboratoryOrder");
const MermaLog = require("../models/MermaLog");
const CashClosure = require("../models/CashClosure");
const { generateFolio } = require("../utils/folio");
const axios = require("axios");

const OPTICA_SERVICE_URL = process.env.OPTICA_SERVICE_URL || "http://optica-service:3000";

/**
 * Calcula el resumen de lo que va del día (o desde el último corte).
 */
async function calculateSummary(dateFrom, dateTo) {
  // 1. Órdenes de Laboratorio
  const orders = await LaboratoryOrder.find({
    createdAt: { $gte: dateFrom, $lte: dateTo }
  }).lean();

  // 2. Ventas de Óptica
  let opticaSales = [];
  try {
    const opticaRes = await axios.get(`${OPTICA_SERVICE_URL}/api/optica/sales/search`, {
      params: { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() },
      headers: { "x-service-token": process.env.INTERNAL_SERVICE_TOKEN }
    });
    if (opticaRes.data && opticaRes.data.ok) {
      opticaSales = opticaRes.data.data;
    }
  } catch (err) {
    console.warn("[CASH-CLOSURE] Optica sales fetch failed:", err.message);
  }

  // 3. Mermas
  const mermas = await MermaLog.find({
    createdAt: { $gte: dateFrom, $lte: dateTo }
  }).populate("sheet", "precio cost").lean();

  const summary = {
    sales: {
      total: 0,
      count: 0,
      byMethod: { efec: 0, tarjeta: 0, trans: 0, credito: 0 }
    },
    merma: {
      totalValue: 0,
      count: 0,
      byReason: {}
    }
  };

  // ... (Procesar Laboratorio y Óptica se mantiene igual)
  // Procesar Laboratorio
  orders.forEach(o => {
    const monto = o.totalMonto || 0;
    summary.sales.total += monto;
    summary.sales.count++;
    if (Array.isArray(o.pago)) {
      o.pago.forEach(p => {
        if (summary.sales.byMethod[p] !== undefined) {
          if (o.pago.length === 1) summary.sales.byMethod[p] += monto;
          else if (p === o.pago[0]) summary.sales.byMethod[p] += monto;
        }
      });
    }
  });

  // Procesar Óptica
  opticaSales.forEach(s => {
    const monto = s.total || 0;
    summary.sales.total += monto;
    summary.sales.count++;
    if (Array.isArray(s.pago)) {
      s.pago.forEach(p => {
        if (summary.sales.byMethod[p] !== undefined) {
          if (s.pago.length === 1) summary.sales.byMethod[p] += monto;
          else if (p === s.pago[0]) summary.sales.byMethod[p] += monto;
        }
      });
    }
  });

  // Procesar Merma con valor monetario
  mermas.forEach(m => {
    const qty = m.qty || 0;
    summary.merma.count += qty;
    
    // Calcular valor: si tiene sheet (Lab), usamos el precio de la hoja
    // Si no, por ahora solo sumamos la cantidad (Óptica requeriría fetch extra por SKU)
    const price = m.sheet?.precio || 0;
    summary.merma.totalValue += (price * qty);

    const reason = m.reason || "OTRO";
    summary.merma.byReason[reason] = (summary.merma.byReason[reason] || 0) + qty;
  });

  return summary;
}

/**
 * GET /api/inventory/cash-closures/current-summary
 */
router.get("/current-summary", protect(), async (req, res) => {
  try {
    const lastClosure = await CashClosure.findOne().sort({ endDate: -1 });
    const dateFrom = lastClosure ? lastClosure.endDate : new Date(new Date().setHours(0,0,0,0));
    const dateTo = new Date();

    const summary = await calculateSummary(dateFrom, dateTo);
    res.json({ ok: true, data: { ...summary, startDate: dateFrom, endDate: dateTo } });
  } catch (e) {
    console.error("[CASH-CLOSURE] Summary error:", e);
    res.status(500).json({ ok: false, message: "Error calculando resumen" });
  }
});

/**
 * POST /api/inventory/cash-closures
 */
router.post("/", protect(), async (req, res) => {
  try {
    const lastClosure = await CashClosure.findOne().sort({ endDate: -1 });
    const dateFrom = lastClosure ? lastClosure.endDate : new Date(new Date().setHours(0,0,0,0));
    const dateTo = new Date();

    const summary = await calculateSummary(dateFrom, dateTo);
    const folio = await generateFolio("CRT", CashClosure);

    const closure = await CashClosure.create({
      folio,
      startDate: dateFrom,
      endDate: dateTo,
      sales: summary.sales,
      merma: summary.merma,
      closedBy: {
        userId: req.user.id,
        name:   req.user.name || req.user.username
      },
      observations: req.body.observations || ""
    });

    res.status(201).json({ ok: true, data: closure });
  } catch (e) {
    console.error("[CASH-CLOSURE] Create error:", e);
    res.status(500).json({ ok: false, message: "Error al realizar el corte" });
  }
});

/**
 * GET /api/inventory/cash-closures
 */
router.get("/", protect(), async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const closures = await CashClosure.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    const total = await CashClosure.countDocuments();
    res.json({ ok: true, data: closures, total });
  } catch (e) {
    res.status(500).json({ ok: false, message: "Error listando cortes" });
  }
});

/**
 * GET /api/inventory/cash-closures/:id
 */
router.get("/:id", protect(), async (req, res) => {
  try {
    const closure = await CashClosure.findById(req.params.id);
    if (!closure) return res.status(404).json({ ok: false, message: "Corte no encontrado" });
    res.json({ ok: true, data: closure });
  } catch (e) {
    res.status(500).json({ ok: false, message: "Error obteniendo corte" });
  }
});

module.exports = router;
