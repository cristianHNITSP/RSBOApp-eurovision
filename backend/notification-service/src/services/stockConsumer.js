"use strict";

/**
 * stockConsumer.js — Consumidor de eventos de stock vía Redis Streams.
 *
 * Lee `stock:events` con un consumer group (acks + replay): si el servicio se
 * reinicia o cae, los eventos NO se pierden y se reprocesan al volver.
 * Materializa cada evento en una notificación (política en notification.service)
 * y avisa a los clientes por WebSocket.
 *
 * Reemplaza al antiguo redisPubSub.js (Pub/Sub sin entrega garantizada).
 */

const Redis = require("ioredis");
const svc   = require("./notification.service");
const ws    = require("../ws");

const STREAM   = "stock:events";
const GROUP    = "notif-workers";
const CONSUMER = `notif-${process.pid}`;
const BLOCK_MS = 5000;
const BATCH    = 20;

let redis = null;
let running = false;

async function ensureGroup() {
  try {
    await redis.xgroup("CREATE", STREAM, GROUP, "$", "MKSTREAM");
  } catch (e) {
    if (!String(e.message || "").includes("BUSYGROUP")) throw e; // ya existe → ok
  }
}

async function handle(event) {
  if (!event || !event.kind) return;

  if (event.kind === "stock.assessed") {
    // Cadencia de "spam" como rate-limiter atómico en Redis, GRADUADA por urgencia:
    // crítico repesta seguido, advertencia espaciado (y siempre menos de noche).
    const resurface = await acquireSpamSlot(event.sheetId, redis, event.urgencyScore);
    const { changed, action } = await svc.upsertStockAlert(event, { resurface });
    // Al regenerar el ciclo (3 días), libera el lock para que el nuevo arranque limpio.
    if (action === "regenerate") await releaseSpamSlot(event.sheetId);
    if (changed) ws.broadcast("NOTIFICATION_NEW", { source: `stock_alert:${event.sheetId}` });
  } else if (event.kind === "stock.cleared") {
    const { changed } = await svc.clearStockAlert(event.sheetId);
    await releaseSpamSlot(event.sheetId);
    if (changed) ws.broadcast("NOTIFICATION_NEW", { source: `stock_alert:${event.sheetId}` });
  }
}

/**
 * TTL del lock según urgencia + horario (insistencia graduada):
 *   - Crítico (urgency ≥ 85): 1h laboral / 3h muertas  → repesta seguido.
 *   - Advertencia (≥ 45):     4h laboral / 12h muertas → espaciado.
 *   - Resto (aceptable):      24h                       → casi nunca.
 * Cuanto más alta la urgencia, menor el TTL → reaparece antes (más insistente).
 */
function spamTtlSeconds(urgencyScore = 0, date = new Date()) {
  const h = date.getHours();
  const laboral = h >= 8 && h < 20;
  if (urgencyScore >= 85) return laboral ? 3600 : 3 * 3600;
  if (urgencyScore >= 45) return laboral ? 4 * 3600 : 12 * 3600;
  return 24 * 3600;
}

/** Intenta tomar el "slot" de spam (SET NX EX). true = toca revivir. */
async function acquireSpamSlot(sheetId, client = redis, urgencyScore = 0) {
  try {
    const res = await client.set(`spam:${sheetId}`, "1", "EX", spamTtlSeconds(urgencyScore), "NX");
    return res === "OK";
  } catch (e) {
    console.warn("[STOCK_CONSUMER] acquireSpamSlot error:", e?.message);
    return false; // ante fallo de Redis, no spamea (conservador)
  }
}

async function releaseSpamSlot(sheetId, client = redis) {
  try { await client.del(`spam:${sheetId}`); } catch { }
}

async function loop() {
  while (running) {
    try {
      const res = await redis.xreadgroup(
        "GROUP", GROUP, CONSUMER,
        "COUNT", BATCH, "BLOCK", BLOCK_MS,
        "STREAMS", STREAM, ">"
      );
      if (!res) continue; // timeout sin mensajes
      for (const [, entries] of res) {
        for (const [id, fields] of entries) {
          try {
            const idx = fields.indexOf("data");
            const raw = idx >= 0 ? fields[idx + 1] : null;
            if (raw) await handle(JSON.parse(raw));
          } catch (e) {
            console.warn("[STOCK_CONSUMER] error procesando", id, "—", e?.message);
          } finally {
            // ACK siempre: evita poison-pills que bloqueen el stream. Errores quedan logueados.
            await redis.xack(STREAM, GROUP, id).catch(() => {});
          }
        }
      }
    } catch (e) {
      if (running) {
        console.warn("[STOCK_CONSUMER] loop error:", e?.message);
        await new Promise((r) => setTimeout(r, 1000)); // backoff antes de reintentar
      }
    }
  }
}

function start() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("[STOCK_CONSUMER] REDIS_URL no definida — consumidor deshabilitado");
    return;
  }
  redis = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false });
  redis.on("error", (err) => console.warn("[STOCK_CONSUMER] Redis error:", err.message));
  redis.on("connect", () => console.log("[STOCK_CONSUMER] Conectado a Redis"));

  running = true;
  ensureGroup()
    .then(() => {
      console.log(`[STOCK_CONSUMER] Escuchando "${STREAM}" (group=${GROUP}, consumer=${CONSUMER})`);
      loop();
    })
    .catch((e) => console.error("[STOCK_CONSUMER] no se pudo crear el group:", e?.message));
}

async function stop() {
  running = false;
  if (redis) { try { await redis.quit(); } catch { } }
}

module.exports = { start, stop, spamTtlSeconds, acquireSpamSlot, releaseSpamSlot };
