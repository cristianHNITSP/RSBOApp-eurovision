"use strict";

/**
 * internal.routes.js
 *
 * Endpoints exclusivos para comunicacion service-to-service.
 * Requieren el header x-service-token con el secreto compartido.
 * NUNCA exponer estas rutas publicamente (el gateway no las proxia).
 *
 * POST /internal/upsert-daily   — crea o actualiza una notificacion agrupada por dia
 * POST /internal/delete         — elimina notificaciones por groupKey y/o patron regex
 */

const router = require("express").Router();
const mongoose = require("mongoose");
const { requireServiceToken } = require("../middlewares/internal.middleware");
const svc = require("../services/notification.service");
const ws  = require("../ws");

const SYSTEM_OID = new mongoose.Types.ObjectId("000000000000000000000001");
const DEFAULT_COOLDOWN_MS = 5 * 60 * 60 * 1000; // 5 horas

// Todas las rutas internas requieren token
router.use(requireServiceToken);

// ─── POST /internal/upsert-daily ────────────────────────────────────────────
//
// Body:
//   groupKey        string  requerido — clave unica de agrupacion
//   date            string  opcional  — YYYY-MM-DD (default: hoy)
//   title           string  requerido
//   message         string  requerido
//   metadata        object  opcional  — datos expandibles para el panel
//   type            string  opcional  — info | warning | danger | success
//   priority        string  opcional  — low | medium | high | critical
//   targetRoles     array   opcional
//   isGlobal        boolean opcional
//   createdByName   string  opcional
//   respectCooldown boolean opcional  — si true, omite si se actualizó hace < cooldownMs
//   cooldownMs      number  opcional  — default 18000000 (5h)
//
router.post("/upsert-daily", async (req, res) => {
  try {
    const {
      groupKey, date, title, message, metadata,
      type, priority, targetRoles, isGlobal,
      createdByName,
      respectCooldown, cooldownMs,
    } = req.body;

    if (!groupKey || !title || !message) {
      return res.status(400).json({ error: "groupKey, title y message son obligatorios" });
    }

    // Cooldown: si la notificacion ya fue actualizada hace menos de cooldownMs, omitir
    if (respectCooldown) {
      const Notification = require("../models/Notification");
      const today = date || new Date().toISOString().slice(0, 10);
      const existing = await Notification.findOne({ groupKey, date: today });
      if (existing) {
        const msSince = Date.now() - new Date(existing.updatedAt).getTime();
        if (msSince < (cooldownMs ?? DEFAULT_COOLDOWN_MS)) {
          return res.json({ skipped: true, reason: "cooldown" });
        }
      }
    }

    const { notification, accumulated } = await svc.upsertDaily({
      groupKey,
      date,
      title,
      message,
      metadata,
      type,
      priority,
      targetRoles,
      isGlobal,
      createdBy:     SYSTEM_OID,
      createdByName: createdByName || "Sistema",
    });

    // WS broadcast para actualizar el badge en el frontend
    try {
      ws.broadcast("NOTIFICATION_NEW", { source: groupKey });
    } catch { /* WS opcional */ }

    return res.status(accumulated ? 200 : 201).json({ notification, accumulated });
  } catch (e) {
    console.error("[INTERNAL] upsert-daily error:", e?.message);
    return res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /internal/delete ───────────────────────────────────────────────────
//
// Body (al menos uno requerido):
//   groupKey        string  — elimina exactamente { groupKey, date } si date presente,
//                             o todos los documentos con ese groupKey si no hay date
//   date            string  — YYYY-MM-DD, solo aplica junto a groupKey exacto
//   groupKeyPattern string  — regex para deleteMany({ groupKey: { $regex: pattern } })
//
router.post("/delete", async (req, res) => {
  try {
    const { groupKey, date, groupKeyPattern } = req.body;
    const Notification = require("../models/Notification");

    if (!groupKey && !groupKeyPattern) {
      return res.status(400).json({ error: "Proporciona groupKey o groupKeyPattern" });
    }

    if (groupKeyPattern) {
      await Notification.deleteMany({ groupKey: { $regex: groupKeyPattern } });
    } else if (groupKey && date) {
      await Notification.deleteOne({ groupKey, date });
    } else {
      await Notification.deleteMany({ groupKey });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("[INTERNAL] delete error:", e?.message);
    return res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
