/**
 * stockAlert.job.js
 *
 * Cron job de barrido periódico de alertas de stock.
 *
 * Punto 2 — Anti-spam: pasa respectCooldown=true al sweep para que el cron
 *   no renotifique celdas que el hook ya alertó hace menos de 5 horas.
 *
 * Punto 3 — No-bloqueante: el sweep inicial se lanza como IIFE async
 *   que no suspende app.listen(). startStockAlertJob() retorna de inmediato.
 */

"use strict";

const cron = require("node-cron");
const { sweepAllSheets, cleanupLegacyPerCellNotifications } = require("../services/stockAlert.service");
const { notifyPendingOrders } = require("../services/labNotification.service");

/** Tiempo de espera antes del primer sweep (deja que mongoose conecte). */
const STARTUP_DELAY_MS = 8000;

function startStockAlertJob() {
  // ── Punto 3: Sweep inicial — IIFE async, fire-and-forget ─────────────────
  // No usa await → app.listen() no se retrasa.
  // El catch final evita unhandledRejection sin suprimir el error silenciosamente.
  (async () => {
    await new Promise((resolve) => setTimeout(resolve, STARTUP_DELAY_MS));
    console.log("[STOCK_ALERT] Sweep inicial al arrancar...");
    await cleanupLegacyPerCellNotifications();
    await sweepAllSheets({ respectCooldown: true });
    await notifyPendingOrders();
  })().catch((e) => console.error("[STOCK_ALERT] Error en sweep inicial:", e?.message));

  // ── Cron cada 6 horas ────────────────────────────────────────────────────
  // respectCooldown=true → omite celdas notificadas por hook en las últimas 5h.
  cron.schedule("0 */6 * * *", () => {
    console.log("[STOCK_ALERT] Cron: iniciando barrido periódico...");
    // Fire-and-forget: el cron no necesita esperar el resultado.
    sweepAllSheets({ respectCooldown: true })
      .catch((e) => console.error("[STOCK_ALERT] Error en cron sweep:", e?.message));
  });

  console.log("[STOCK_ALERT] Job iniciado — cron 6h activo.");
}

module.exports = { startStockAlertJob };
