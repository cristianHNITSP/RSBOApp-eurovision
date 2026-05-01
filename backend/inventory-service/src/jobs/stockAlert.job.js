"use strict";

/**
 * stockAlert.job.js
 *
 * Estrategia de deteccion de alertas:
 *
 *   1. EVENT-DRIVEN (principal): cada vez que un usuario actualiza una celda o
 *      guarda un chunk, las rutas lanzan checkCellAlert / checkSheetAlerts via
 *      setImmediate — la alerta se detecta en tiempo real, sin polling.
 *
 *   2. SWEEP DIARIO (safety net): un cron a las 3:00 AM hace un barrido de
 *      todas las planillas para capturar cualquier cambio que haya ocurrido
 *      fuera del flujo normal (migraciones directas en DB, crashes, etc.).
 *      respectCooldown=true evita re-notificar lo que el trigger ya gestionó.
 *
 *   3. SWEEP DE ARRANQUE: barrido inicial con delay de 8s para dar tiempo a
 *      que Mongoose conecte. Util tras reinicios del servicio.
 */

const cron = require("node-cron");
const { sweepAllSheets, cleanupLegacyPerCellNotifications } = require("../services/stockAlert.service");
const { notifyPendingOrders } = require("../services/labNotification.service");

const STARTUP_DELAY_MS = 8000;

function startStockAlertJob() {
  // ── Sweep de arranque — fire-and-forget ───────────────────────────────────
  (async () => {
    await new Promise((resolve) => setTimeout(resolve, STARTUP_DELAY_MS));
    console.log("[STOCK_ALERT] Sweep inicial al arrancar...");
    await cleanupLegacyPerCellNotifications();
    await sweepAllSheets({ respectCooldown: true });
    await notifyPendingOrders();
  })().catch((e) => console.error("[STOCK_ALERT] Error en sweep inicial:", e?.message));

  // ── Sweep Inteligente (Redis Pub/Sub) ───────────────────────────────────
  
  // REGLA 1: Horario Laboral (8 AM - 8 PM) - Cada Hora
  cron.schedule("0 8-20 * * *", () => {
    console.log("[STOCK_ALERT] Cron Laboral: iniciando barrido horario...");
    sweepAllSheets({ respectCooldown: true, useRedis: true })
      .catch((e) => console.error("[STOCK_ALERT] Error en cron laboral:", e?.message));
  });

  // REGLA 2: Horario Nocturno - Cada 4 Horas (00:00, 04:00)
  cron.schedule("0 0,4 * * *", () => {
    console.log("[STOCK_ALERT] Cron Nocturno: iniciando barrido preventivo...");
    sweepAllSheets({ respectCooldown: true, useRedis: true })
      .catch((e) => console.error("[STOCK_ALERT] Error en cron nocturno:", e?.message));
  });

  console.log("[STOCK_ALERT] Job iniciado — Horario laboral (8-20h: cada hora) | Nocturno (cada 4h).");
}

module.exports = { startStockAlertJob };
