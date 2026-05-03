"use strict";

/**
 * merma.routes.js
 *
 * Endpoints unificados para registro y consulta de mermas desde cualquier
 * origen (LAB, VENTAS, INVENTARIO, DEVOLUCION).
 *
 * GET   /api/mermas         → listado paginado (filtros: origin, sheet, fecha, search)
 * GET   /api/mermas/stats   → métricas agregadas
 * GET   /api/mermas/:id     → detalle
 * POST  /api/mermas         → registrar merma (descuenta stock + log)
 */

const router = require("express").Router();
const { protect } = require("../utils/auth");
const ctrl = require("../controllers/merma.controller");

const ROLES_VIEW   = ["root", "eurovision", "supervisor", "laboratorio", "ventas"];
const ROLES_CREATE = ["root", "eurovision", "supervisor", "laboratorio", "ventas"];

router.get("/",      protect(ROLES_VIEW),   ctrl.list);
router.get("/stats", protect(ROLES_VIEW),   ctrl.stats);
router.get("/:id",   protect(ROLES_VIEW),   ctrl.detail);
router.post("/",     protect(ROLES_CREATE), ctrl.create);

module.exports = router;
