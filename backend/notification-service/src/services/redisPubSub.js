"use strict";

/**
 * redisPubSub.js — Suscriptor Redis para eventos de stock.
 * Escucha el canal "stock:alerts" y ejecuta upsertDaily en el notification-service.
 */
const svc = require("./notification.service");
const ws  = require("../ws");
const mongoose = require("mongoose");

const SYSTEM_OID = new mongoose.Types.ObjectId("000000000000000000000001");
const CHANNEL    = "stock:alerts";

let subscriber = null;

async function startSubscriber() {
  let Redis;
  try { Redis = require("ioredis"); } catch { return; }

  const url = process.env.REDIS_URL;
  if (!url) { console.warn("[REDIS_SUB] REDIS_URL no definida — suscripción deshabilitada"); return; }

  subscriber = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false });

  subscriber.on("error", (err) => console.warn("[REDIS_SUB] Error:", err.message));
  subscriber.on("connect", () => console.log("[REDIS_SUB] Conectado a Redis"));

  await subscriber.subscribe(CHANNEL);
  console.log(`[REDIS_SUB] Escuchando canal "${CHANNEL}"`);

  subscriber.on("message", async (_ch, raw) => {
    try {
      const payload = JSON.parse(raw);
      const { notification } = await svc.upsertDaily({
        ...payload,
        createdBy:     SYSTEM_OID,
        createdByName: payload.createdByName || "Sistema",
      });
      ws.broadcast("NOTIFICATION_NEW", { source: payload.groupKey });
    } catch (e) {
      console.error("[REDIS_SUB] Error procesando evento:", e?.message);
    }
  });
}

module.exports = { startSubscriber };
