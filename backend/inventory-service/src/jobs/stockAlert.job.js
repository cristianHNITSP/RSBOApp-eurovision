"use strict";

/**
 * stockAlert.job.js
 *
 * Estrategia de deteccion de alertas:
 *
 *   1. EVENT-DRIVEN (principal): cada vez que un usuario actualiza una celda/chunk
 *      (matrices/CL) o el stock de un producto de óptica, los hooks lanzan la
 *      evaluación via setImmediate — alerta en tiempo real, sin polling.
 *
 *   2. SWEEP (safety-net): cron horario + barrido de arranque que recorren TODAS
 *      las planillas Y los productos de óptica, para capturar cambios fuera del
 *      flujo normal (migraciones directas, crashes, etc.).
 *
 *   3. LOCK DISTRIBUIDO: el barrido corre en UNA sola réplica (Redis SET NX EX);
 *      las demás lo omiten. El dedup del consumer evita duplicados igualmente.
 */

const cron = require("node-cron");
const { sweepAllSheets } = require("../services/stockAlert.service");
const { sweepOpticaProducts } = require("../services/opticaStockAlert.service");
const { withLeaderLock } = require("../services/redis");

const STARTUP_DELAY_MS = 8000;
const LOCK_KEY = "cron:stockSweep";
const LOCK_TTL_S = 300; // 5 min: cubre el barrido y evita doble-tick entre réplicas

async function runSweep(reason) {
  const ran = await withLeaderLock(LOCK_KEY, LOCK_TTL_S, async () => {
    console.log(`[STOCK_ALERT] Barrido (${reason})...`);
    await sweepAllSheets();
    await sweepOpticaProducts();
  });
  if (!ran) console.log(`[STOCK_ALERT] Barrido (${reason}) omitido — lock en otra réplica.`);
}

function startStockAlertJob() {
  // ── Barrido de arranque ────────────────────────────────────────────────────
  (async () => {
    await new Promise((resolve) => setTimeout(resolve, STARTUP_DELAY_MS));
    await runSweep("arranque");
  })().catch((e) => console.error("[STOCK_ALERT] Error en sweep inicial:", e?.message));

  // ── Barrido horario (safety-net). La CADENCIA del recordatorio la impone el
  //    consumidor (rate-limiter en Redis), no este cron. ──────────────────────
  cron.schedule("0 * * * *", () => {
    runSweep("cron horario").catch((e) =>
      console.error("[STOCK_ALERT] Error en cron horario:", e?.message)
    );
  });

  console.log("[STOCK_ALERT] Job iniciado — barrido horario (matrices + óptica, lock distribuido).");
}

module.exports = { startStockAlertJob };
