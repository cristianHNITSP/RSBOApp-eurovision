"use strict";

/**
 * eventBus.js — Productor de eventos de dominio vía Redis Streams.
 *
 * inventory-service NO conoce a notification-service: solo publica hechos de
 * dominio ("stock evaluado", "stock recuperado") a un stream. Quien los consuma
 * (notification-service) es transparente para este servicio.
 *
 * Degradación: si Redis no está disponible, no rompe el flujo de inventory
 * (el cron de barrido re-emitirá más tarde). Streams persiste los eventos, así
 * que un consumidor caído no pierde nada al volver.
 */

const { getClient, isReady } = require("./redis");

const STREAM = "stock:events";
const MAXLEN = 10000; // cap aproximado (~) para que el stream no crezca sin límite

/**
 * Publica un evento de dominio en el stream.
 * @param {object} event - objeto serializable con al menos { kind, v, ... }
 * @returns {Promise<boolean>} true si se publicó
 */
async function publish(event) {
  if (!isReady()) return false; // sin Redis: no-op (el cron re-emite)
  try {
    await getClient().xadd(STREAM, "MAXLEN", "~", MAXLEN, "*", "data", JSON.stringify(event));
    return true;
  } catch (e) {
    console.warn("[EVENT_BUS] publish error:", e?.message);
    return false;
  }
}

module.exports = { publish, STREAM };
