const express = require("express");
const router = express.Router();
const Armazon = require("../models/Armazon");
const Solucion = require("../models/Solucion");
const Accesorio = require("../models/Accesorio");
const Estuche = require("../models/Estuche");
const Equipo = require("../models/Equipo");

const statsController = require("../controllers/stats.controller");
const { protect } = require("../utils/auth");
const Sale = require("../models/Sale");
const MermaLog = require("../models/MermaLog");

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

router.get("/daily-summary", protect(), statsController.getDailySummary);

router.get("/summary", async (req, res) => {
  try {
    const [armazones, soluciones, accesorios, estuches, equipos, sales, mermas] = await Promise.all([
      Armazon.find({ isDeleted: false }).lean(),
      Solucion.find({ isDeleted: false }).lean(),
      Accesorio.find({ isDeleted: false }).lean(),
      Estuche.find({ isDeleted: false }).lean(),
      Equipo.find({ isDeleted: false }).lean(),
      // Ventas
      Sale.aggregate([
        { $match: { isReplica: { $ne: true }, createdAt: { $gte: daysAgo(30) } } },
        { $group: { 
          _id: null, 
          mes: { $sum: "$total" },
          semana: { $sum: { $cond: [{ $gte: ["$createdAt", daysAgo(7)] }, "$total", 0] } },
          hoy: { $sum: { $cond: [{ $gte: ["$createdAt", daysAgo(0)] }, "$total", 0] } }
        }}
      ]),
      // Mermas
      MermaLog.aggregate([
        { $match: { isReplica: { $ne: true }, createdAt: { $gte: daysAgo(30) } } },
        { $group: { 
          _id: null, 
          mes: { $sum: "$qty" },
          semana: { $sum: { $cond: [{ $gte: ["$createdAt", daysAgo(7)] }, "$qty", 0] } },
          hoy: { $sum: { $cond: [{ $gte: ["$createdAt", daysAgo(0)] }, "$qty", 0] } }
        }}
      ])
    ]);

    const salesAggr = sales[0] || { mes: 0, semana: 0, hoy: 0 };
    const mermasAggr = mermas[0] || { mes: 0, semana: 0, hoy: 0 };

    const calc = (items) => ({
      total: items.length,
      stock: items.reduce((s, a) => s + (a.stock || 0), 0),
      agotados: items.filter(a => (a.stock || 0) === 0).length,
      stockBajo: items.filter(a => (a.stock || 0) > 0 && (a.stock || 0) <= 3).length,
      valor: items.reduce((s, a) => s + (a.precio || 0) * (a.stock || 0), 0),
    });

    const armStats = calc(armazones);
    
    const solStats = {
      ...calc(soluciones),
      porVencer: soluciones.filter(s => {
        if (!s.caducidad) return false;
        const df = (new Date(s.caducidad) - new Date()) / 86400000;
        return df > 0 && df <= 180;
      }).length
    };

    const accStats = calc(accesorios);
    const estStats = calc(estuches);

    const eqpStats = {
      total: equipos.length,
      operativos: equipos.filter(e => e.estado === 'Operativo').length,
      mantenimiento: equipos.filter(e => e.estado === 'Mantenimiento').length,
      fueraServicio: equipos.filter(e => e.estado === 'Fuera de servicio').length,
    };

    const data = {
      armazones: armStats,
      soluciones: solStats,
      accesorios: accStats,
      estuches: estStats,
      equipos: eqpStats,
      totalProductos: armStats.total + solStats.total + accStats.total + estStats.total,
      totalPiezas: armStats.stock + solStats.stock + accStats.stock + estStats.stock,
      totalAgotados: armStats.agotados + solStats.agotados + accStats.agotados + estStats.agotados,
      totalStockBajo: armStats.stockBajo + solStats.stockBajo + accStats.stockBajo + estStats.stockBajo,
      valorTotalTienda: armStats.valor + solStats.valor + accStats.valor + estStats.valor,
      
      // Ventas y Mermas (Óptica Pura)
      ventasMontoMes: salesAggr.mes,
      ventasMontoSemana: salesAggr.semana,
      ventasMontoHoy: salesAggr.hoy,
      mermasQtyMes: mermasAggr.mes,
      mermasQtySemana: mermasAggr.semana,
      mermasQtyHoy: mermasAggr.hoy,
      
      generatedAt: new Date().toISOString()
    };

    res.json({ ok: true, data });
  } catch (error) {
    console.error("[OPTICA][STATS] Error al obtener summary:", error);
    res.status(500).json({ ok: false, error: "Error interno" });
  }
});

module.exports = router;
