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

const InventorySheet    = require("../models/InventorySheet");
const MatrixBase        = require("../models/matrix/MatrixBase");
const MatrixSphCyl      = require("../models/matrix/MatrixSphCyl");
const MatrixBifocal     = require("../models/matrix/MatrixBifocal");
const MatrixProgresivo  = require("../models/matrix/MatrixProgresivo");
const LaboratoryOrder   = require("../models/laboratory/LaboratoryOrder");
const LaboratoryEvent   = require("../models/laboratory/LaboratoryEvent");
const InventoryChangeLog = require("../models/InventoryChangeLog");
const Devolution         = require("../models/Devolution");

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

    if (tipo === "BASE" || tipo === "SPH_CYL") {
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

router.get("/dashboard", async (_req, res) => {
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

    // Alertas críticas (stock_critico notifications en notification_db)
    // Usamos la conexión del stockAlert.service si está disponible
    let criticalAlerts = 0;
    try {
      const { classifyStock, computeDistance, getTier } = require("../services/stockAlert.service");
      // Contar celdas clasificadas como CRITICO
      for (const { model, tipo } of matrixModels) {
        const docs = await model.find({}).lean();
        for (const doc of docs) {
          const cells = doc.cells instanceof Map ? Object.fromEntries(doc.cells) : (doc.cells || {});
          for (const [key, cell] of Object.entries(cells)) {
            if (!cell) continue;
            if (tipo === "BASE" || tipo === "SPH_CYL") {
              const n = Number(cell.existencias ?? 0);
              if (classifyStock(n, computeDistance(tipo, key)) === "CRITICO") criticalAlerts++;
            } else {
              for (const eye of ["OD", "OI"]) {
                if (cell[eye] !== undefined) {
                  const n = Number(cell[eye]?.existencias ?? 0);
                  if (classifyStock(n, computeDistance(tipo, key)) === "CRITICO") criticalAlerts++;
                }
              }
            }
          }
        }
      }
    } catch {
      // stockAlert.service no disponible — dejar en 0
    }

    // ── Respuesta ─────────────────────────────────────────────────────────
    return res.json({
      ok: true,
      data: {
        // Inventario
        activeSheets,
        totalStock,
        totalCombinations,
        withStock,
        coveragePct,
        criticalAlerts,
        topFamilies,

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

module.exports = router;
