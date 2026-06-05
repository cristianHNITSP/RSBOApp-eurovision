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
const { sweepAllSheets } = require("../services/stockAlert.service");

const STARTUP_DELAY_MS = 8000;

function startStockAlertJob() {
  // ── Sweep de arranque — fire-and-forget ───────────────────────────────────
  (async () => {
    await new Promise((resolve) => setTimeout(resolve, STARTUP_DELAY_MS));
    console.log("[STOCK_ALERT] Sweep inicial al arrancar...");
    await sweepAllSheets();
  })().catch((e) => console.error("[STOCK_ALERT] Error en sweep inicial:", e?.message));

  // ── Barrido periódico horario (safety-net). Solo "verifica" y emite a Redis
  //    Streams; la CADENCIA real del recordatorio (1h laboral / 6h muertas) la
  //    impone el consumidor con un rate-limiter en Redis, no este cron. ───────
  cron.schedule("0 * * * *", () => {
    console.log("[STOCK_ALERT] Cron horario: iniciando barrido...");
    sweepAllSheets()
      .catch((e) => console.error("[STOCK_ALERT] Error en cron horario:", e?.message));
  });

  console.log("[STOCK_ALERT] Job iniciado — barrido horario (cadencia gobernada por el consumidor).");
}

module.exports = { startStockAlertJob };
