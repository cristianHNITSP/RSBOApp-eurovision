/**
 * stockAlert.service.js
 *
 * Sistema de alertas de stock inteligente basado en distancia al neutro.
 * Las alertas se agrupan por planilla (una notificación diaria por planilla).
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  SECCIÓN 1 — Clasificación (puras, sin efectos)         │
 * │  SECCIÓN 2 — Notificación agrupada por planilla         │
 * │  SECCIÓN 3 — Orquestación: checkCell / sweep            │
 * └─────────────────────────────────────────────────────────┘
 */

"use strict";

const mongoose = require("mongoose");
const { denormNum } = require("../inventory/utils/keys");
const { getNotifModel } = require("./notifDb");

const MatrixBase       = require("../models/matrix/MatrixBase");
const MatrixSphCyl     = require("../models/matrix/MatrixSphCyl");
const MatrixBifocal    = require("../models/matrix/MatrixBifocal");
const MatrixProgresivo = require("../models/matrix/MatrixProgresivo");

// ============================================================================
// SECCIÓN 1 — Clasificación (funciones puras, sin I/O)
// ============================================================================

const SYSTEM_OID = new mongoose.Types.ObjectId("000000000000000000000001");
const TARGET_ROLES = ["eurovision"];
const COOLDOWN_MS = 5 * 60 * 60 * 1000; // 5 horas

const TIERS = [
  { maxDist: 1.00, critical: 3, low: 6,  neutral: 10 },
  { maxDist: 3.00, critical: 2, low: 4,  neutral: 7  },
  { maxDist: 5.00, critical: 1, low: 2,  neutral: 4  },
  { maxDist: Infinity, critical: 0, low: 1, neutral: 2 },
];

function getTier(distance) {
  return TIERS.find((t) => distance <= t.maxDist) || TIERS[TIERS.length - 1];
}

function computeDistance(tipoMatriz, cellKey) {
  try {
    const p = String(cellKey).split("|").map(denormNum);
    switch (tipoMatriz) {
      case "BASE":     return Math.abs(p[0] || 0);
      case "SPH_CYL":  return Math.abs(p[0] || 0) + Math.abs(p[1] || 0);
      case "SPH_ADD":  return Math.abs(p[0] || 0);
      case "BASE_ADD": return Math.abs(p[0] || 0) + Math.abs(p[1] || 0);
      default:         return 0;
    }
  } catch { return 0; }
}

function classifyStock(existencias, distance) {
  const n    = Number(existencias || 0);
  const tier = getTier(distance);
  if (n <= tier.critical) return "CRITICO";
  if (n <= tier.low)      return "BAJO";
  if (n <= tier.neutral)  return "NEUTRO";
  return "BUENO";
}

function cellLabel(tipoMatriz, cellKey, eye) {
  try {
    const p   = String(cellKey).split("|").map(denormNum);
    const fmt = (v) => (v === null ? "—" : v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
    let label;
    switch (tipoMatriz) {
      case "BASE":     label = `Base ${fmt(p[0])}`; break;
      case "SPH_CYL":  label = `SPH ${fmt(p[0])} / CYL ${fmt(p[1])}`; break;
      case "SPH_ADD":  label = `SPH ${fmt(p[0])} / Add ${fmt(p[1])}`; break;
      case "BASE_ADD": label = `Base ${fmt(p[0])}/${fmt(p[1])} Add ${fmt(p[2])}`; break;
      default:         label = cellKey;
    }
    return eye ? `${label} (${eye})` : label;
  } catch { return cellKey; }
}

function sheetLabel(sheet) {
  return [sheet.baseKey, sheet.material, sheet.tratamiento]
    .filter(Boolean).join(" · ").trim() || String(sheet._id);
}

function getMatrixModel(tipoMatriz) {
  switch (tipoMatriz) {
    case "BASE":     return MatrixBase;
    case "SPH_CYL":  return MatrixSphCyl;
    case "SPH_ADD":  return MatrixBifocal;
    case "BASE_ADD": return MatrixProgresivo;
    default:         return null;
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================================
// SECCIÓN 2 — Notificación agrupada por planilla (una por día)
// ============================================================================

/**
 * Lee TODAS las celdas de una planilla, clasifica las que tienen stock
 * bajo o crítico, y crea/actualiza UNA notificación diaria para esa planilla.
 *
 * Si no hay celdas con alerta, elimina la notificación de hoy (auto-resolución).
 *
 * @param {object} sheet - Documento de InventorySheet
 * @param {{ respectCooldown?: boolean }} opts
 */
async function upsertSheetAlertNotification(sheet, opts = {}) {
  const { respectCooldown = false } = opts;

  try {
    const Notification = await getNotifModel();
    const today    = todayStr();
    const groupKey = `stock_alert:${sheet._id}`;

    // Anti-spam: si ya se actualizó hace < 5h en el mismo día, omitir
    if (respectCooldown) {
      const existing = await Notification.findOne({ groupKey, date: today });
      if (existing) {
        const msSince = Date.now() - new Date(existing.updatedAt).getTime();
        if (msSince < COOLDOWN_MS) return;
      }
    }

    // Leer la matriz y recolectar celdas con alerta
    const Model = getMatrixModel(sheet.tipo_matriz);
    if (!Model) return;

    const doc = await Model.findOne({ sheet: sheet._id }).lean();
    if (!doc?.cells) return;

    const alertCells = [];

    for (const [key, cell] of Object.entries(doc.cells)) {
      if (!cell) continue;

      if (sheet.tipo_matriz === "BASE" || sheet.tipo_matriz === "SPH_CYL") {
        const existencias = Number(cell.existencias ?? 0);
        const distance    = computeDistance(sheet.tipo_matriz, key);
        const level       = classifyStock(existencias, distance);
        if (level === "CRITICO" || level === "BAJO") {
          alertCells.push({
            cellKey:     key,
            eye:         null,
            label:       cellLabel(sheet.tipo_matriz, key, null),
            level,
            existencias,
          });
        }
      } else {
        for (const eye of ["OD", "OI"]) {
          if (cell[eye] === undefined) continue;
          const existencias = Number(cell[eye]?.existencias ?? 0);
          const distance    = computeDistance(sheet.tipo_matriz, key);
          const level       = classifyStock(existencias, distance);
          if (level === "CRITICO" || level === "BAJO") {
            alertCells.push({
              cellKey:     key,
              eye,
              label:       cellLabel(sheet.tipo_matriz, key, eye),
              level,
              existencias,
            });
          }
        }
      }
    }

    // Sin alertas → eliminar notificación de hoy si existe
    if (alertCells.length === 0) {
      await Notification.deleteOne({ groupKey, date: today });
      // También limpiar notificaciones antiguas de celdas individuales de esta planilla
      await Notification.deleteMany({
        groupKey: { $regex: `^stock_(critico|bajo):${sheet._id}:` },
      });
      return;
    }

    // Ordenar: CRÍTICO primero
    alertCells.sort((a, b) => {
      if (a.level === "CRITICO" && b.level !== "CRITICO") return -1;
      if (b.level === "CRITICO" && a.level !== "CRITICO") return 1;
      return 0;
    });

    const critCount  = alertCells.filter((c) => c.level === "CRITICO").length;
    const lowCount   = alertCells.filter((c) => c.level === "BAJO").length;
    const sLabel     = sheetLabel(sheet);
    const hasCrit    = critCount > 0;

    const title = hasCrit
      ? `Stock Crítico — ${sLabel}`
      : `Stock Bajo — ${sLabel}`;

    const parts = [];
    if (critCount > 0) parts.push(`${critCount} combinación${critCount > 1 ? "es" : ""} en estado CRÍTICO`);
    if (lowCount  > 0) parts.push(`${lowCount} combinación${lowCount > 1 ? "es" : ""} con stock bajo`);

    const message = `Planilla: ${sLabel} — ${parts.join(", ")}. Revisa el detalle para ver todas las combinaciones afectadas.`;

    const metadata = {
      type:       "stock_alert",
      sheetId:    String(sheet._id),
      sheetLabel: sLabel,
      cells:      alertCells,
      critCount,
      lowCount,
    };

    const existing = await Notification.findOne({ groupKey, date: today });

    if (existing) {
      existing.title    = title;
      existing.message  = message.slice(0, 2000);
      existing.metadata = metadata;
      existing.type     = hasCrit ? "danger" : "warning";
      existing.priority = hasCrit ? "critical" : "high";
      existing.count    = (existing.count || 1) + 1;
      existing.readBy   = [];
      existing.markModified("metadata");
      await existing.save();
    } else {
      // Limpiar antiguas notificaciones per-celda de esta planilla antes de crear la nueva
      await Notification.deleteMany({
        groupKey: { $regex: `^stock_(critico|bajo):${sheet._id}:` },
      });

      await Notification.create({
        groupKey,
        date:          today,
        title,
        message:       message.slice(0, 2000),
        metadata,
        type:          hasCrit ? "danger" : "warning",
        priority:      hasCrit ? "critical" : "high",
        targetRoles:   TARGET_ROLES,
        isGlobal:      false,
        createdBy:     SYSTEM_OID,
        createdByName: "Sistema",
        count:         1,
      });
    }

    // WS broadcast
    try {
      require("../ws").broadcast("STOCK_ALERT", {
        sheetId:  String(sheet._id),
        sLabel,
        critCount,
        lowCount,
        total:    alertCells.length,
      });
    } catch { /* WS opcional */ }

    // Broadcast NOTIFICATION_NEW para que el badge se actualice
    try {
      require("../ws").broadcast("NOTIFICATION_NEW", { source: "stock_alert" });
    } catch { /* WS opcional */ }

  } catch (e) {
    console.warn("[STOCK_ALERT] upsertSheetAlertNotification error:", e?.message);
  }
}

// ============================================================================
// SECCIÓN 3 — Orquestación
// ============================================================================

/**
 * Verifica el estado de stock de UNA planilla completa y actualiza la notificación diaria.
 * Llamar con setImmediate() desde las rutas para no bloquear res.send().
 */
async function checkCellAlert(sheet, tipoMatriz, cellKey, existencias, eye = null) {
  // El parámetro cellKey/existencias/eye ahora solo sirve de contexto de debug.
  // La notificación se genera a nivel de planilla completa.
  await upsertSheetAlertNotification(sheet, { respectCooldown: false });
}

/**
 * Barre TODAS las celdas de una planilla y actualiza la notificación diaria.
 */
async function checkSheetAlerts(sheet, opts = {}) {
  await upsertSheetAlertNotification(sheet, opts);
}

/**
 * Barrido completo de todas las planillas.
 * Cron/startup: respectCooldown=true para evitar spam.
 */
async function sweepAllSheets(opts = { respectCooldown: true }) {
  try {
    const InventorySheet = require("../models/InventorySheet");
    const sheets = await InventorySheet.find({ isDeleted: { $ne: true } }).lean();

    for (const sheet of sheets) {
      await upsertSheetAlertNotification(sheet, opts);
    }

    console.log(`[STOCK_ALERT] Sweep completo: ${sheets.length} planilla(s).`);
  } catch (e) {
    console.error("[STOCK_ALERT] sweepAllSheets error:", e?.message);
  }
}

/**
 * Limpia notificaciones antiguas por celda individual (formato legado).
 * Llamar una vez al iniciar la app para migrar al nuevo formato por planilla.
 */
async function cleanupLegacyPerCellNotifications() {
  try {
    const Notification = await getNotifModel();
    const result = await Notification.deleteMany({
      groupKey: { $regex: "^stock_(critico|bajo):" },
    });
    if (result.deletedCount > 0) {
      console.log(`[STOCK_ALERT] Limpiadas ${result.deletedCount} notificaciones de stock por celda (formato legado).`);
    }
  } catch (e) {
    console.warn("[STOCK_ALERT] cleanupLegacyPerCellNotifications error:", e?.message);
  }
}

module.exports = {
  checkCellAlert,
  checkSheetAlerts,
  sweepAllSheets,
  cleanupLegacyPerCellNotifications,
  classifyStock,
  computeDistance,
  cellLabel,
  getTier,
};
