"use strict";

/**
 * notifClient.js
 *
 * Cliente HTTP interno para comunicarse con el notification-service.
 * Reemplaza el acceso directo a notification_db (notifDb.js eliminado).
 *
 * Variables de entorno requeridas:
 *   NOTIFICATION_SERVICE_INTERNAL_URL  — URL directa al notification-service
 *                                        (sin pasar por el gateway)
 *                                        Ej: http://localhost:3003
 *   INTERNAL_SERVICE_TOKEN             — secreto compartido con notification-service
 */

const axios = require("axios");

const BASE_URL     = (process.env.NOTIFICATION_SERVICE_INTERNAL_URL || "").replace(/\/$/, "");
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";

function _headers() {
  return {
    "Content-Type":   "application/json",
    "x-service-token": SERVICE_TOKEN,
  };
}

function _warn(context, err) {
  console.warn(`[NOTIF_CLIENT] ${context}:`, err?.response?.data || err?.message || err);
}

/**
 * Crea o actualiza una notificacion agrupada diaria en el notification-service.
 *
 * @param {{
 *   groupKey: string,
 *   date?: string,
 *   title: string,
 *   message: string,
 *   metadata?: object,
 *   type?: string,
 *   priority?: string,
 *   targetRoles?: string[],
 *   isGlobal?: boolean,
 *   createdByName?: string,
 *   respectCooldown?: boolean,
 *   cooldownMs?: number,
 * }} payload
 */
async function upsertDaily(payload) {
  if (!BASE_URL) {
    console.warn("[NOTIF_CLIENT] NOTIFICATION_SERVICE_INTERNAL_URL no configurada — omitiendo notificacion");
    return;
  }
  try {
    await axios.post(
      `${BASE_URL}/api/notification/internal/upsert-daily`,
      payload,
      { headers: _headers(), timeout: 6000 }
    );
  } catch (e) {
    _warn("upsertDaily", e);
  }
}

/**
 * Elimina notificaciones en el notification-service por groupKey y/o patron.
 *
 * @param {{
 *   groupKey?: string,
 *   date?: string,
 *   groupKeyPattern?: string,
 * }} params
 */
async function deleteByGroup(params) {
  if (!BASE_URL) return;
  try {
    await axios.post(
      `${BASE_URL}/api/notification/internal/delete`,
      params,
      { headers: _headers(), timeout: 6000 }
    );
  } catch (e) {
    _warn("deleteByGroup", e);
  }
}

module.exports = { upsertDaily, deleteByGroup };
