const express = require("express");
const Armazon = require("../models/Armazon");
const Solucion = require("../models/Solucion");
const Accesorio = require("../models/Accesorio");
const Estuche = require("../models/Estuche");
const Equipo = require("../models/Equipo");

const router = express.Router();

router.get("/summary", async (req, res) => {
  try {
    const [armazones, soluciones, accesorios, estuches, equipos] = await Promise.all([
      Armazon.find({ isDeleted: false }).lean(),
      Solucion.find({ isDeleted: false }).lean(),
      Accesorio.find({ isDeleted: false }).lean(),
      Estuche.find({ isDeleted: false }).lean(),
      Equipo.find({ isDeleted: false }).lean(),
    ]);

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
    };

    res.json({ ok: true, data });
  } catch (error) {
    console.error("[OPTICA][STATS] Error al obtener summary:", error);
    res.status(500).json({ ok: false, error: "Error interno" });
  }
});

module.exports = router;
