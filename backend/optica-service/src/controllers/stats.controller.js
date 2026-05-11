"use strict";

const Sale = require("../models/Sale");
const MermaLog = require("../models/MermaLog");
const CashClosure = require("../models/CashClosure");

/**
 * Calcula el resumen de ventas y mermas para un rango de fechas.
 */
async function calculateSummary(dateFrom, dateTo) {
  // 1. Ventas
  const sales = await Sale.find({
    createdAt: { $gte: dateFrom, $lte: dateTo },
    isReplica: { $ne: true }
  }).lean();

  // 2. Mermas
  const mermas = await MermaLog.find({
    createdAt: { $gte: dateFrom, $lte: dateTo },
    isReplica: { $ne: true }
  }).lean();

  const summary = {
    sales: { total: 0, count: 0, byMethod: { efec: 0, tarjeta: 0, trans: 0, credito: 0 } },
    merma: { totalValue: 0, count: 0, byReason: {} },
    categories: {} // Desglose por colecciones (armazones, accesorios, etc.)
  };

  // Procesar Ventas
  sales.forEach(s => {
    const monto = s.total || 0;
    summary.sales.total += monto;
    summary.sales.count++;
    
    // Desglose por colección
    if (Array.isArray(s.items)) {
      s.items.forEach(it => {
        const cat = it.collection || "otros";
        if (!summary.categories[cat]) {
          summary.categories[cat] = { sales: 0, count: 0, merma: 0 };
        }
        // Prorrateo simple del total de la venta si hay múltiples ítems?
        // Por ahora, si es venta de Óptica, cada ítem suele ser una venta.
        // Usamos el precio del ítem * qty para ser precisos.
        const itemTotal = (it.precio || 0) * (it.qty || 1);
        summary.categories[cat].sales += itemTotal;
        summary.categories[cat].count += (it.qty || 1);
      });
    }

    if (Array.isArray(s.pago)) {
      s.pago.forEach(p => {
        if (summary.sales.byMethod[p] !== undefined) {
          if (p === s.pago[0]) summary.sales.byMethod[p] += monto;
        }
      });
    }
  });

  // Procesar Mermas
  mermas.forEach(m => {
    const qty = m.qty || 0;
    summary.merma.count += qty;
    
    // ✅ Usamos el valor capturado (snapshot)
    const lossUnit = m.unitCost || m.unitValue || 0;
    const lossTotal = lossUnit * qty;
    
    summary.merma.totalValue += lossTotal;
    
    const cat = m.collection || "otros";
    if (!summary.categories[cat]) {
      summary.categories[cat] = { sales: 0, count: 0, merma: 0 };
    }
    summary.categories[cat].merma += lossTotal;

    const reason = m.reason || "OTRO";
    summary.merma.byReason[reason] = (summary.merma.byReason[reason] || 0) + qty;
  });

  return summary;
}

/**
 * GET /api/optica/stats/daily-summary
 * Devuelve el resumen desde el último corte hasta ahora.
 */
exports.getDailySummary = async (req, res) => {
  try {
    const lastClosure = await CashClosure.findOne().sort({ endDate: -1 });
    const dateFrom = lastClosure ? lastClosure.endDate : new Date(new Date().setHours(0,0,0,0));
    const dateTo = new Date();

    const summary = await calculateSummary(dateFrom, dateTo);
    res.json({ ok: true, data: { ...summary, startDate: dateFrom, endDate: dateTo } });
  } catch (err) {
    console.error("[OPTICA][STATS] Summary error:", err);
    res.status(500).json({ ok: false, message: "Error al generar resumen diario" });
  }
};

module.exports = { calculateSummary, getDailySummary: exports.getDailySummary };
