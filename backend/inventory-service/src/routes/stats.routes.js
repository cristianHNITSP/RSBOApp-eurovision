/**
 * stats.routes.js
 *
 * Endpoint único GET /api/stats/dashboard que devuelve todos los KPIs
 * y métricas del sistema. El frontend filtra por rol.
 *
 * Agrega datos reales de: InventorySheet, Matrix*, LaboratoryOrder,
 * LaboratoryEvent e InventoryChangeLog.
 */

"use strict";

const router = require("express").Router();
const { cacheMiddleware, KEYS } = require("../services/redis");
const { protect } = require("../utils/auth");

const InventorySheet    = require("../models/InventorySheet");
const MatrixBase        = require("../models/matrix/MatrixBase");
const MatrixSphCyl      = require("../models/matrix/MatrixSphCyl");
const MatrixBifocal     = require("../models/matrix/MatrixBifocal");
const MatrixProgresivo  = require("../models/matrix/MatrixProgresivo");
const LaboratoryOrder   = require("../models/laboratory/LaboratoryOrder");
const LaboratoryEvent   = require("../models/laboratory/LaboratoryEvent");
const InventoryChangeLog = require("../models/InventoryChangeLog");
const Devolution         = require("../models/Devolution");

// Lentes de contacto
const ContactLensesSheet = require("../models/ContactLensesSheet");
const CLMatrixEsferico   = require("../models/contactlenses/CLMatrixEsferico");
const CLMatrixColorido   = require("../models/contactlenses/CLMatrixColorido");
const CLMatrixTorico     = require("../models/contactlenses/CLMatrixTorico");
const CLMatrixMultifocal = require("../models/contactlenses/CLMatrixMultifocal");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayStart() { return daysAgo(0); }

/**
 * Agrega existencias de un documento Matrix (cells es un Map/Object).
 * Devuelve { totalStock, totalCombinations, withStock }.
 */
function aggregateCells(doc, tipo) {
  let totalStock = 0;
  let totalCombinations = 0;
  let withStock = 0;

  if (!doc?.cells) return { totalStock, totalCombinations, withStock };

  const cells = doc.cells instanceof Map ? Object.fromEntries(doc.cells) : doc.cells;

  for (const [, cell] of Object.entries(cells)) {
    if (!cell) continue;

    if (tipo === "BASE" || tipo === "SPH_CYL" || tipo === "SPH_CYL_AXIS") {
      const n = Number(cell.existencias ?? 0);
      totalCombinations++;
      totalStock += n;
      if (n > 0) withStock++;
    } else {
      // SPH_ADD / BASE_ADD: OD + OI
      for (const eye of ["OD", "OI"]) {
        if (cell[eye] !== undefined) {
          const n = Number(cell[eye]?.existencias ?? 0);
          totalCombinations++;
          totalStock += n;
          if (n > 0) withStock++;
        }
      }
    }
  }
  return { totalStock, totalCombinations, withStock };
}

// ─── GET /api/stats/dashboard ────────────────────────────────────────────────

router.get("/dashboard", protect(), cacheMiddleware(KEYS.stats, 45), async (_req, res) => {
  try {
    const today = todayStart();
    const d30   = daysAgo(30);
    const d7    = daysAgo(7);

    // ── Inventario ────────────────────────────────────────────────────────
    const sheets = await InventorySheet.find({ isDeleted: { $ne: true } }).lean();
    const activeSheets = sheets.length;

    // Agregar stock de todas las matrices
    let totalStock = 0;
    let totalCombinations = 0;
    let withStock = 0;
    const familyStockMap = {}; // material → stock

    const matrixModels = [
      { model: MatrixBase, tipo: "BASE" },
      { model: MatrixSphCyl, tipo: "SPH_CYL" },
      { model: MatrixBifocal, tipo: "SPH_ADD" },
      { model: MatrixProgresivo, tipo: "BASE_ADD" },
    ];

    for (const { model, tipo } of matrixModels) {
      const docs = await model.find({}).lean();
      for (const doc of docs) {
        const agg = aggregateCells(doc, tipo);
        totalStock += agg.totalStock;
        totalCombinations += agg.totalCombinations;
        withStock += agg.withStock;

        // Mapear a familia por sheet
        const sheet = sheets.find((s) => String(s._id) === String(doc.sheet));
        if (sheet) {
          const family = sheet.material || sheet.baseKey || tipo;
          familyStockMap[family] = (familyStockMap[family] || 0) + agg.totalStock;
        }
      }
    }

    const coveragePct = totalCombinations > 0
      ? Math.round((withStock / totalCombinations) * 100)
      : 0;

    // Distribución por familia (topFamilies)
    const totalForFamilies = Object.values(familyStockMap).reduce((a, b) => a + b, 0) || 1;
    const topFamilies = Object.entries(familyStockMap)
      .map(([name, stock]) => ({
        name,
        stock,
        percentage: Math.round((stock / totalForFamilies) * 100),
      }))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 8);

    // ── Lentes de contacto (inventario separado) ─────────────────────────
    const clSheets = await ContactLensesSheet.find({ isDeleted: { $ne: true } }).lean();
    const clActiveSheets = clSheets.length;

    let clTotalStock = 0;
    let clTotalCombinations = 0;
    let clWithStock = 0;
    const clTypeStockMap = {};

    const TIPO_LABELS = {
      BASE: "Esférico",
      SPH_CYL: "Colorido (Esférica + Cilíndrica)",
      SPH_CYL_AXIS: "Tórico (Esférica + Cilíndrica + Eje)",
      BASE_ADD: "Multifocal (Base Esférica + Adición)",
      SPH_ADD: "Bifocal (Esférica + Adición)",
    };

    const clMatrixModels = [
      { model: CLMatrixEsferico,  tipo: "BASE" },
      { model: CLMatrixColorido,  tipo: "SPH_CYL" },
      { model: CLMatrixTorico,    tipo: "SPH_CYL_AXIS" },
      { model: CLMatrixMultifocal, tipo: "BASE_ADD" },
    ];

    for (const { model, tipo } of clMatrixModels) {
      const docs = await model.find({}).lean();
      let tipoStock = 0;
      let tipoCombinations = 0;
      let tipoWithStock = 0;

      for (const doc of docs) {
        const agg = aggregateCells(doc, tipo);
        clTotalStock += agg.totalStock;
        clTotalCombinations += agg.totalCombinations;
        clWithStock += agg.withStock;
        tipoStock += agg.totalStock;
        tipoCombinations += agg.totalCombinations;
        tipoWithStock += agg.withStock;
      }

      const label = TIPO_LABELS[tipo] || tipo;
      clTypeStockMap[label] = {
        stock: tipoStock,
        combinations: tipoCombinations,
        withStock: tipoWithStock,
        sheets: clSheets.filter((s) => s.tipo_matriz === tipo).length,
      };
    }

    const clCoveragePct = clTotalCombinations > 0
      ? Math.round((clWithStock / clTotalCombinations) * 100)
      : 0;

    const clTotalForDist = Math.max(Object.values(clTypeStockMap).reduce((a, b) => a + b.stock, 0), 1);
    const clDistribution = Object.entries(clTypeStockMap).map(([name, d]) => ({
      name,
      stock: d.stock,
      combinations: d.combinations,
      withStock: d.withStock,
      sheets: d.sheets,
      percentage: Math.round((d.stock / clTotalForDist) * 100),
    })).sort((a, b) => b.stock - a.stock);

    // Promedio de existencias por celda CL
    const clAvgPerCell = clTotalCombinations > 0
      ? Number((clTotalStock / clTotalCombinations).toFixed(2))
      : 0;

    // Top plantillas CL con menor stock (alertas)
    const clLowStockSheets = [];
    for (const clSheet of clSheets) {
      const matEntry = clMatrixModels.find((m) => m.tipo === clSheet.tipo_matriz);
      if (!matEntry) continue;
      const matDoc = await matEntry.model.findOne({ sheet: clSheet._id }).lean();
      if (!matDoc) continue;
      const agg = aggregateCells(matDoc, clSheet.tipo_matriz);
      clLowStockSheets.push({
        id: String(clSheet._id),
        nombre: clSheet.nombre,
        tipo: TIPO_LABELS[clSheet.tipo_matriz] || clSheet.tipo_matriz,
        stock: agg.totalStock,
        combinations: agg.totalCombinations,
        withStock: agg.withStock,
        coverage: agg.totalCombinations > 0 ? Math.round((agg.withStock / agg.totalCombinations) * 100) : 0,
      });
    }
    clLowStockSheets.sort((a, b) => a.coverage - b.coverage);
    const clTopLowStock = clLowStockSheets.slice(0, 5);
    const clTopHighStock = [...clLowStockSheets].sort((a, b) => b.stock - a.stock).slice(0, 5);

    // Inventario optico: top plantillas por stock para comparar
    const opticLowStockSheets = [];
    for (const sheet of sheets) {
      const matEntry = matrixModels.find((m) => m.tipo === sheet.tipo_matriz);
      if (!matEntry) continue;
      const matDoc = await matEntry.model.findOne({ sheet: sheet._id }).lean();
      if (!matDoc) continue;
      const agg = aggregateCells(matDoc, sheet.tipo_matriz);
      opticLowStockSheets.push({
        id: String(sheet._id),
        nombre: sheet.nombre,
        tipo: TIPO_LABELS[sheet.tipo_matriz] || sheet.tipo_matriz,
        stock: agg.totalStock,
        combinations: agg.totalCombinations,
        coverage: agg.totalCombinations > 0 ? Math.round((agg.withStock / agg.totalCombinations) * 100) : 0,
      });
    }
    opticLowStockSheets.sort((a, b) => a.coverage - b.coverage);
    const opticTopLowStock = opticLowStockSheets.slice(0, 5);

    // Promedio de existencias por celda inventario optico
    const opticAvgPerCell = totalCombinations > 0
      ? Number((totalStock / totalCombinations).toFixed(2))
      : 0;

    // ── Laboratorio / Pedidos ─────────────────────────────────────────────
    const [
      ordersPending,
      ordersClosedAll,
      ordersCancelledAll,
      ordersToday,
      ordersClosedToday,
      ordersClosed30d,
    ] = await Promise.all([
      LaboratoryOrder.countDocuments({ status: { $in: ["pendiente", "parcial"] } }),
      LaboratoryOrder.countDocuments({ status: "cerrado" }),
      LaboratoryOrder.countDocuments({ status: "cancelado" }),
      LaboratoryOrder.countDocuments({ createdAt: { $gte: today } }),
      LaboratoryOrder.countDocuments({ status: "cerrado", closedAt: { $gte: today } }),
      LaboratoryOrder.countDocuments({ status: "cerrado", closedAt: { $gte: d30 } }),
    ]);

    // ── Eventos de laboratorio ────────────────────────────────────────────
    const [
      corrections30d,
      corrections7d,
      scansToday,
      edits30d,
    ] = await Promise.all([
      LaboratoryEvent.countDocuments({ type: "CORRECTION_REQUEST", createdAt: { $gte: d30 } }),
      LaboratoryEvent.countDocuments({ type: "CORRECTION_REQUEST", createdAt: { $gte: d7 } }),
      LaboratoryEvent.countDocuments({ type: "EXIT_SCAN", createdAt: { $gte: today } }),
      LaboratoryEvent.countDocuments({ type: "ORDER_EDIT", createdAt: { $gte: d30 } }),
    ]);

    // ── Ventas (Monto) ────────────────────────────────────────────────────
    const [
      ventasMontoHoyAggr,
      ventasMontoSemanaAggr,
      ventasMontoMesAggr
    ] = await Promise.all([
      LaboratoryOrder.aggregate([{ $match: { status: "cerrado", closedAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: "$totalMonto" } } }]),
      LaboratoryOrder.aggregate([{ $match: { status: "cerrado", closedAt: { $gte: d7 } } }, { $group: { _id: null, total: { $sum: "$totalMonto" } } }]),
      LaboratoryOrder.aggregate([{ $match: { status: "cerrado", closedAt: { $gte: d30 } } }, { $group: { _id: null, total: { $sum: "$totalMonto" } } }]),
    ]);

    const ventasMontoHoy = ventasMontoHoyAggr[0]?.total || 0;
    const ventasMontoSemana = ventasMontoSemanaAggr[0]?.total || 0;
    const ventasMontoMes = ventasMontoMesAggr[0]?.total || 0;

    // ── Movimientos de inventario ─────────────────────────────────────────
    const [
      movementsTotal30d,
      entries30d,
      exits30d,
      movementsToday,
    ] = await Promise.all([
      InventoryChangeLog.countDocuments({ createdAt: { $gte: d30 } }),
      InventoryChangeLog.countDocuments({ type: { $in: ["LAB_ENTRY", "CELL_UPDATE", "CHUNK_SAVE"] }, createdAt: { $gte: d30 } }),
      InventoryChangeLog.countDocuments({ type: "LAB_EXIT", createdAt: { $gte: d30 } }),
      InventoryChangeLog.countDocuments({ createdAt: { $gte: today } }),
    ]);

    // ── Devoluciones ──────────────────────────────────────────────────────
    const [
      devolucionesPendientes,
      devolucionesAprobadas,
      devolucionesRechazadas,
      devolucionesProcesadas,
      devolucionesEnRevision,
      devolucionesTotal30d,
      devolucionesTotal7d,
      devolucionesHoy,
    ] = await Promise.all([
      Devolution.countDocuments({ status: "pendiente" }),
      Devolution.countDocuments({ status: "aprobada" }),
      Devolution.countDocuments({ status: "rechazada" }),
      Devolution.countDocuments({ status: "procesada" }),
      Devolution.countDocuments({ status: "en_revision" }),
      Devolution.countDocuments({ createdAt: { $gte: d30 } }),
      Devolution.countDocuments({ createdAt: { $gte: d7 } }),
      Devolution.countDocuments({ createdAt: { $gte: today } }),
    ]);

    // Nivel de servicio: % pedidos cerrados sin corrección
    let serviceLevel = 0;
    if (ordersClosed30d > 0) {
      const ordersWithCorrection = await LaboratoryEvent.distinct("order", {
        type: "CORRECTION_REQUEST",
        createdAt: { $gte: d30 },
      });
      const closedWithoutCorrection = ordersClosed30d - ordersWithCorrection.length;
      serviceLevel = Math.round((Math.max(0, closedWithoutCorrection) / ordersClosed30d) * 100);
    }

    let criticalAlertsOptic = 0;
    let criticalAlertsCL = 0;
    try {
      const { classifyStock, computeDistance } = require("../services/stockAlert.service");
      // Contar celdas clasificadas como CRITICO en óptico
      for (const { model, tipo } of matrixModels) {
        const docs = await model.find({}).lean();
        for (const doc of docs) {
          const cells = doc.cells instanceof Map ? Object.fromEntries(doc.cells) : (doc.cells || {});
          for (const [key, cell] of Object.entries(cells)) {
            if (!cell) continue;
            if (tipo === "BASE" || tipo === "SPH_CYL") {
              const n = Number(cell.existencias ?? 0);
              if (classifyStock(n, computeDistance(tipo, key)) === "CRITICO") criticalAlertsOptic++;
            } else {
              for (const eye of ["OD", "OI"]) {
                if (cell[eye] !== undefined) {
                  const n = Number(cell[eye]?.existencias ?? 0);
                  if (classifyStock(n, computeDistance(tipo, key)) === "CRITICO") criticalAlertsOptic++;
                }
              }
            }
          }
        }
      }

      // Contar celdas clasificadas como CRITICO en lentes de contacto
      for (const { model, tipo } of clMatrixModels) {
        const docs = await model.find({}).lean();
        for (const doc of docs) {
          const cells = doc.cells instanceof Map ? Object.fromEntries(doc.cells) : (doc.cells || {});
          for (const [key, cell] of Object.entries(cells)) {
            if (!cell) continue;
            if (tipo === "BASE" || tipo === "SPH_CYL" || tipo === "SPH_CYL_AXIS") {
              const n = Number(cell.existencias ?? 0);
              if (classifyStock(n, computeDistance(tipo, key)) === "CRITICO") criticalAlertsCL++;
            } else {
              for (const eye of ["OD", "OI"]) {
                if (cell[eye] !== undefined) {
                  const n = Number(cell[eye]?.existencias ?? 0);
                  if (classifyStock(n, computeDistance(tipo, key)) === "CRITICO") criticalAlertsCL++;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // stockAlert.service no disponible — dejar en 0
      console.warn("Error calculating critical alerts", e?.message);
    }

    // ── Respuesta ─────────────────────────────────────────────────────────
    return res.json({
      ok: true,
      data: {
        // Inventario optico
        activeSheets,
        totalStock,
        totalCombinations,
        withStock,
        coveragePct,
        criticalAlertsOptic,
        criticalAlertsCL,
        topFamilies,
        opticAvgPerCell,
        opticTopLowStock,

        // Lentes de contacto
        clActiveSheets,
        clTotalStock,
        clTotalCombinations,
        clWithStock,
        clCoveragePct,
        clDistribution,
        clAvgPerCell,
        clTopLowStock,
        clTopHighStock,

        // Pedidos / Laboratorio
        ordersPending,
        ordersClosedAll,
        ordersCancelledAll,
        ordersToday,
        ordersClosedToday,
        ordersClosed30d,
        corrections30d,
        corrections7d,
        scansToday,
        edits30d,

        // Ventas
        ventasMontoHoy,
        ventasMontoSemana,
        ventasMontoMes,

        // Movimientos inventario
        movementsTotal30d,
        entries30d,
        exits30d,
        movementsToday,

        // Nivel de servicio
        serviceLevel,

        // Devoluciones
        devolucionesPendientes,
        devolucionesAprobadas,
        devolucionesRechazadas,
        devolucionesProcesadas,
        devolucionesEnRevision,
        devolucionesTotal30d,
        devolucionesTotal7d,
        devolucionesHoy,

        // Meta
        periodLabel: "Últimos 30 días",
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("GET /api/stats/dashboard error:", e);
    res.status(500).json({ ok: false, message: "Error al generar estadísticas" });
  }
});

// ─── GET /api/stats/product-movements ───────────────────────────────────────
router.get("/product-movements", protect(), async (req, res) => {
  try {
    const period = req.query.period || "30d";
    let days = 30;
    if (period === "7d") days = 7;
    else if (period === "90d") days = 90;
    else if (period === "1d") days = 1; // diario
    
    const since = daysAgo(days);

    // Mapear movimientos
    const pipeline = [
      { 
        $match: { 
          createdAt: { $gte: since },
          type: { $in: ["LAB_ENTRY", "CELL_UPDATE", "CHUNK_SAVE", "LAB_EXIT"] }
        } 
      },
      {
        $group: {
          _id: { sheet: "$sheet", tipo_matriz: "$tipo_matriz", sph: "$sph", cyl: "$cyl", add: "$add", base: "$base", eye: "$eye", base_izq: "$base_izq", base_der: "$base_der" },
          totalMovements: { $sum: 1 },
          entries: { $sum: { $cond: [{ $in: ["$type", ["LAB_ENTRY", "CELL_UPDATE", "CHUNK_SAVE"]] }, 1, 0] } },
          exits: { $sum: { $cond: [{ $eq: ["$type", "LAB_EXIT"] }, 1, 0] } }
        }
      },
      { $sort: { totalMovements: -1 } },
      { $limit: 20 }
    ];

    const results = await InventoryChangeLog.aggregate(pipeline);
    
    // Poblar sheets
    const populated = await InventorySheet.populate(results, { path: "_id.sheet", select: "nombre baseKey material tipo_matriz" });

    const topMovers = populated.map(item => {
      const id = item._id;
      const sheet = id.sheet || {};
      
      // Construir label
      let cellKey = "";
      let label = "";
      const fmt = (v) => (v === null || v === undefined ? "0.00" : v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
      
      switch (id.tipo_matriz) {
        case "BASE":     label = `Base ${fmt(id.base)}`; cellKey = `${id.base}`; break;
        case "SPH_CYL":  label = `SPH ${fmt(id.sph)} | CYL ${fmt(id.cyl)}`; cellKey = `${id.sph}|${id.cyl}`; break;
        case "SPH_CYL_AXIS": label = `SPH ${fmt(id.sph)} | CYL ${fmt(id.cyl)}`; cellKey = `${id.sph}|${id.cyl}`; break;
        case "SPH_ADD":  label = `SPH ${fmt(id.sph)} | Add ${fmt(id.add)}`; cellKey = `${id.sph}|${id.add}`; break;
        case "BASE_ADD": label = `Base ${fmt(id.base_izq)}/${fmt(id.base_der)} Add ${fmt(id.add)}`; cellKey = `${id.base_izq}|${id.base_der}|${id.add}`; break;
        default:         label = "Desconocida";
      }

      if (id.eye) label += ` (${id.eye})`;

      let trend = "balanced";
      if (item.exits > item.entries * 1.5) trend = "high_demand";
      else if (item.entries > item.exits * 1.5) trend = "low_demand";

      return {
        sheetId: sheet._id,
        sheetName: sheet.nombre || `${sheet.baseKey || ''} ${sheet.material || ''}`.trim() || 'Desconocido',
        cellKey,
        label,
        totalMovements: item.totalMovements,
        entries: item.entries,
        exits: item.exits,
        trend
      };
    });

    res.json({ ok: true, data: { period, topMovers } });
  } catch (e) {
    console.error("GET /api/stats/product-movements error:", e);
    res.status(500).json({ ok: false, message: "Error al generar movimientos" });
  }
});

// ─── GET /api/stats/my-performance ───────────────────────────────────────
router.get("/my-performance", protect(), async (req, res) => {
  try {
    const userId = req.user.userId;
    const d30 = daysAgo(30);
    const d7 = daysAgo(7);
    const today = todayStart();

    const [
      ordersToday, ordersWeek, ordersMonth,
      montoTodayAggr, montoWeekAggr, montoMonthAggr,
      scansToday, scansWeek,
      correctionsMonth,
      editsMonth,
      devolutionsMonth
    ] = await Promise.all([
      LaboratoryOrder.countDocuments({ "createdBy.userId": userId, createdAt: { $gte: today } }),
      LaboratoryOrder.countDocuments({ "createdBy.userId": userId, createdAt: { $gte: d7 } }),
      LaboratoryOrder.countDocuments({ "createdBy.userId": userId, createdAt: { $gte: d30 } }),
      LaboratoryOrder.aggregate([{ $match: { "createdBy.userId": userId, createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: "$totalMonto" } } }]),
      LaboratoryOrder.aggregate([{ $match: { "createdBy.userId": userId, createdAt: { $gte: d7 } } }, { $group: { _id: null, total: { $sum: "$totalMonto" } } }]),
      LaboratoryOrder.aggregate([{ $match: { "createdBy.userId": userId, createdAt: { $gte: d30 } } }, { $group: { _id: null, total: { $sum: "$totalMonto" } } }]),
      LaboratoryEvent.countDocuments({ type: "EXIT_SCAN", "actor.userId": userId, createdAt: { $gte: today } }),
      LaboratoryEvent.countDocuments({ type: "EXIT_SCAN", "actor.userId": userId, createdAt: { $gte: d7 } }),
      LaboratoryEvent.countDocuments({ type: "CORRECTION_REQUEST", "actor.userId": userId, createdAt: { $gte: d30 } }),
      LaboratoryEvent.countDocuments({ type: "ORDER_EDIT", "actor.userId": userId, createdAt: { $gte: d30 } }),
      Devolution.countDocuments({ "createdBy.userId": userId, createdAt: { $gte: d30 } }),
    ]);

    const myRevenue = {
      today: montoTodayAggr[0]?.total || 0,
      week: montoWeekAggr[0]?.total || 0,
      month: montoMonthAggr[0]?.total || 0,
    };

    // Calcular ranking basado en órdenes cerradas en el mes
    let ranking = null;
    const rankingAggr = await LaboratoryOrder.aggregate([
      { $match: { status: "cerrado", closedAt: { $gte: d30 } } },
      { $group: { _id: "$createdBy.userId", totalOrders: { $sum: 1 } } },
      { $sort: { totalOrders: -1 } }
    ]);
    
    if (rankingAggr.length > 0) {
      const pos = rankingAggr.findIndex(r => r._id === userId);
      ranking = {
        position: pos >= 0 ? pos + 1 : rankingAggr.length + 1,
        totalUsers: rankingAggr.length,
        totalOrders: pos >= 0 ? rankingAggr[pos].totalOrders : 0
      };
    }

    const isHighRole = ["root", "eurovision", "supervisor"].includes(req.user.roleName);

    res.json({
      ok: true,
      data: {
        myOrders: { today: ordersToday, week: ordersWeek, month: ordersMonth },
        myRevenue,
        myScans: { today: scansToday, week: scansWeek },
        myCorrections: { month: correctionsMonth },
        myEdits: { month: editsMonth },
        myDevolutions: { month: devolutionsMonth },
        ranking: isHighRole ? ranking : null
      }
    });
  } catch (e) {
    console.error("GET /api/stats/my-performance error:", e);
    res.status(500).json({ ok: false, message: "Error al cargar desempeño" });
  }
});

module.exports = router;
