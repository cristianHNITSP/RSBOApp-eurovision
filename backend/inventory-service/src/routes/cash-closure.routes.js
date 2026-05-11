const express = require("express");
const router = express.Router();
const { protect } = require("../utils/auth");
const Sale = require("../models/Sale");
const MermaLog = require("../models/MermaLog");
const CashClosure = require("../models/CashClosure");
const { generateFolio } = require("../utils/folio");
async function calculateSummary(dateFrom, dateTo) {
  // 1. Ventas
  const sales = await Sale.find({
    createdAt: { $gte: dateFrom, $lte: dateTo }
  }).populate("items.sheet").lean();

  // 2. Mermas
  const mermas = await MermaLog.find({
    createdAt: { $gte: dateFrom, $lte: dateTo }
  }).populate("sheet", "precio cost tipo_matriz").lean();

  const summary = {
    sales: { total: 0, count: 0, byMethod: { efec: 0, tarjeta: 0, trans: 0, credito: 0 } },
    merma: { totalValue: 0, count: 0, byReason: {} },
    categories: {
      "bases-micas":     { sales: 0, count: 0, merma: 0, bySheet: {} },
      "lentes-contacto": { sales: 0, count: 0, merma: 0, bySheet: {} }
    }
  };

    // Procesar Ventas
    sales.forEach(s => {
      const monto = s.total || 0;
      summary.sales.total += monto;
      summary.sales.count++;
      
      // ✅ Categorización Atómica por Ítem (No por venta completa)
      s.items.forEach(i => {
        const itemMonto = (i.precio || 0) * (i.qty || 1);
        
        // Detección de categoría
        let itemCat = "bases-micas";
        const isLC = i.collection === 'lentes-contacto' || 
                     i.category === 'contact-lenses' || 
                     i.sheet?.tipo_matriz === "SPH_CYL_AXIS";
                     
        if (isLC) itemCat = "lentes-contacto";

        if (summary.categories[itemCat]) {
          summary.categories[itemCat].sales += itemMonto;
          summary.categories[itemCat].count += (i.qty || 1);
          
          const sName = i.sheet?.nombre || i.description || "Genérico";
          if (!summary.categories[itemCat].bySheet[sName]) {
            summary.categories[itemCat].bySheet[sName] = { sales: 0, count: 0 };
          }
          summary.categories[itemCat].bySheet[sName].sales += itemMonto;
          summary.categories[itemCat].bySheet[sName].count += (i.qty || 1);
        }
      });

      if (Array.isArray(s.pago)) {
        s.pago.forEach(p => {
          if (summary.sales.byMethod[p] !== undefined) {
            // Prorrata simple: si hay un solo método, se lleva el total. Si hay varios, el primero (mejorable a futuro)
            if (p === s.pago[0]) summary.sales.byMethod[p] += monto;
          }
        });
      }
    });

  // Procesar Merma
  mermas.forEach(m => {
    const qty = m.qty || 0;
    summary.merma.count += qty;
    
    // ✅ Usamos el costo capturado (snapshot) o el precio si no hay costo
    const lossUnit = m.unitCost || m.unitValue || 0;
    const lossTotal = lossUnit * qty;
    
    summary.merma.totalValue += lossTotal;

    // Categorizar merma financiera por categoría
    const cat = m.tipo_matriz === "SPH_CYL_AXIS" ? "lentes-contacto" : "bases-micas";
    if (summary.categories[cat]) {
      summary.categories[cat].merma += lossTotal;
    }

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
      globalSummary: req.body.globalSummary || {},
      closedBy: {
        userId: req.user.id || req.user.userId,
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
    const { limit = 7, page = 1 } = req.query;
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
