"use strict";

/**
 * stockAlert.service.js
 *
 * Sistema de alertas de stock inteligente basado en distancia al neutro.
 * Las alertas se agrupan por planilla (una notificacion diaria por planilla).
 *
 * Las notificaciones se persisten en el notification-service via HTTP interno
 * (notifClient) — este servicio ya no accede directamente a notification_db.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  SECCION 1 — Clasificacion (puras, sin efectos)         │
 * │  SECCION 2 — Notificacion agrupada por planilla         │
 * │  SECCION 3 — Orquestacion: checkCell / sweep            │
 * └─────────────────────────────────────────────────────────┘
 */

const { denormNum } = require("../inventory/utils/keys");
const notifClient   = require("./notifClient");

const MatrixBase       = require("../models/matrix/MatrixBase");
const MatrixSphCyl     = require("../models/matrix/MatrixSphCyl");
const MatrixBifocal    = require("../models/matrix/MatrixBifocal");
const MatrixProgresivo = require("../models/matrix/MatrixProgresivo");

// ============================================================================
// SECCION 1 — Clasificacion (funciones puras, sin I/O)
// ============================================================================

const TARGET_ROLES = ["eurovision"];
const COOLDOWN_MS  = 5 * 60 * 60 * 1000; // 5 horas

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
    const fmt = (v) => (v === null ? "0.00" : v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
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
    .filter(Boolean).join(" | ").trim() || String(sheet._id);
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
// SECCION 2 — Notificacion agrupada por planilla (una por dia)
// ============================================================================

/**
 * Lee TODAS las celdas de una planilla, clasifica las que tienen stock
 * bajo o critico, y delega la persistencia al notification-service via HTTP.
 *
 * Si no hay celdas con alerta, solicita la eliminacion de la notificacion de hoy.
 *
 * @param {object} sheet - Documento de InventorySheet
 * @param {{ respectCooldown?: boolean }} opts
 */
async function upsertSheetAlertNotification(sheet, opts = {}) {
  const { respectCooldown = false } = opts;

  try {
    const today    = todayStr();
    const groupKey = `stock_alert:${sheet._id}`;

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

    // Sin alertas → eliminar notificacion de hoy y limpiar legado
    if (alertCells.length === 0) {
      await notifClient.deleteByGroup({ groupKey, date: today });
      await notifClient.deleteByGroup({ groupKeyPattern: `^stock_(critico|bajo):${sheet._id}:` });
      return;
    }

    // Ordenar: CRITICO primero
    alertCells.sort((a, b) => {
      if (a.level === "CRITICO" && b.level !== "CRITICO") return -1;
      if (b.level === "CRITICO" && a.level !== "CRITICO") return 1;
      return 0;
    });

    const critCount = alertCells.filter((c) => c.level === "CRITICO").length;
    const lowCount  = alertCells.filter((c) => c.level === "BAJO").length;
    const sLabel    = sheetLabel(sheet);
    const hasCrit   = critCount > 0;

    const title = hasCrit
      ? `STOCK CRÍTICO | ${sLabel}`
      : `STOCK BAJO | ${sLabel}`;

    const parts = [];
    if (critCount > 0) parts.push(`${critCount} combinacion${critCount > 1 ? "es" : ""} en estado CRITICO`);
    if (lowCount  > 0) parts.push(`${lowCount} combinacion${lowCount > 1 ? "es" : ""} con stock bajo`);

    const message = `[Planilla: ${sLabel}] | ${parts.join(" | ")}. Revisa el detalle para ver las combinaciones afectadas.`;

    const metadata = {
      type:       "stock_alert",
      sheetId:    String(sheet._id),
      sheetLabel: sLabel,
      cells:      alertCells,
      critCount,
      lowCount,
    };

    const payload = {
      groupKey,
      date:          today,
      title,
      message:       message.slice(0, 2000),
      metadata,
      type:          hasCrit ? "danger" : "warning",
      priority:      hasCrit ? "critical" : "high",
      targetRoles:   TARGET_ROLES,
      isGlobal:      false,
      respectCooldown,
      cooldownMs:    COOLDOWN_MS,
    };

    if (opts.useRedis) {
      const { getClient, isReady } = require("./redis");
      if (isReady()) {
        try {
          getClient().publish("stock:alerts", JSON.stringify(payload));
        } catch (e) {
          console.warn("[STOCK_ALERT] Redis publish error:", e?.message);
        }
      } else {
        // Fallback to HTTP
        await notifClient.upsertDaily(payload);
      }
    } else {
      // Delegar persistencia al notification-service (HTTP)
      await notifClient.upsertDaily(payload);
    }

    // WS broadcast del evento de dominio (independiente de la notificacion)
    try {
      require("../ws").broadcast("STOCK_ALERT", {
        sheetId:  String(sheet._id),
        sLabel,
        critCount,
        lowCount,
        total:    alertCells.length,
      });
    } catch { /* WS opcional */ }

  } catch (e) {
    console.warn("[STOCK_ALERT] upsertSheetAlertNotification error:", e?.message);
  }
}

// ============================================================================
// SECCION 3 — Orquestacion
// ============================================================================

/**
 * Verifica el estado de stock de UNA planilla completa y actualiza la notificacion diaria.
 * Llamar con setImmediate() desde las rutas para no bloquear res.send().
 */
async function checkCellAlert(sheet) {
  await upsertSheetAlertNotification(sheet, { respectCooldown: false });
}

/**
 * Barre TODAS las celdas de una planilla y actualiza la notificacion diaria.
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
    await notifClient.deleteByGroup({ groupKeyPattern: "^stock_(critico|bajo):" });
    console.log("[STOCK_ALERT] Limpieza de notificaciones por celda (formato legado) solicitada.");
  } catch (e) {
    console.warn("[STOCK_ALERT] cleanupLegacyPerCellNotifications error:", e?.message);
  }
}

/**
 * Verifica el stock de una planilla dado solo su ObjectId.
 * Usado por los hooks post-save de los modelos Matrix para cubrir
 * creacion de planillas, seeds y cualquier otra escritura directa.
 *
 * @param {ObjectId|string} sheetId
 * @param {{ respectCooldown?: boolean, cooldownMs?: number }} opts
 */
async function checkSheetById(sheetId, opts = {}) {
  try {
    const InventorySheet = require("../models/InventorySheet");
    const sheet = await InventorySheet.findById(sheetId).lean();
    if (!sheet || sheet.isDeleted) return;
    await upsertSheetAlertNotification(sheet, opts);
  } catch (e) {
    console.warn("[STOCK_ALERT] checkSheetById error:", e?.message);
  }
}

module.exports = {
  checkCellAlert,
  checkSheetAlerts,
  checkSheetById,
  sweepAllSheets,
  cleanupLegacyPerCellNotifications,
  classifyStock,
  computeDistance,
  cellLabel,
  getTier,
};
