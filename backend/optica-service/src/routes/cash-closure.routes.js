"use strict";

const express = require("express");
const router = express.Router();
const { protect } = require("../utils/auth");
const CashClosure = require("../models/CashClosure");
const statsController = require("../controllers/stats.controller");
const { generateFolio } = require("../utils/folio");

/**
 * GET /api/optica/cash-closures/current-summary
 */
router.get("/current-summary", protect(), statsController.getDailySummary);

/**
 * POST /api/optica/cash-closures
 */
router.post("/", protect(), async (req, res) => {
  try {
    const { observations, globalSummary } = req.body;
    
    const lastClosure = await CashClosure.findOne().sort({ endDate: -1 });
    const dateFrom = lastClosure ? lastClosure.endDate : new Date(new Date().setHours(0,0,0,0));
    const dateTo = new Date();

    const summary = await statsController.calculateSummary(dateFrom, dateTo);
    
    // Folio CRT-OPT-YYYYMMDD-XXXX
    const count = await CashClosure.countDocuments();
    const folio = `CRT-OPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${(count + 1).toString().padStart(4, '0')}`;

    const closure = await CashClosure.create({
      folio,
      startDate: dateFrom,
      endDate: dateTo,
      sales: summary.sales,
      merma: summary.merma,
      globalSummary: globalSummary || {},
      closedBy: {
        userId: req.user.id || req.user.userId,
        name:   req.user.name || req.user.username
      },
      observations: observations || ""
    });

    res.status(201).json({ ok: true, data: closure });
  } catch (err) {
    console.error("[OPTICA][CASH-CLOSURE] Create error:", err);
    res.status(500).json({ ok: false, message: "Error al realizar el corte de caja en Óptica" });
  }
});

/**
 * GET /api/optica/cash-closures
 */
router.get("/", protect(), async (req, res) => {
  try {
    const { limit = 7, page = 1 } = req.query;
    const closures = await CashClosure.find()
      .sort({ createdAt: -1 })
      .limit(7)
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    const total = await CashClosure.countDocuments();
    res.json({ ok: true, data: closures, total });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Error al listar cortes" });
  }
});

module.exports = router;
