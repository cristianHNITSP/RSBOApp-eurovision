"use strict";

/**
 * stockAlert.service.js
 *
 * Sistema de alertas de stock inteligente basado en distancia al neutro.
 *
 * inventory-service es PRODUCTOR: evalúa el stock de una planilla y publica un
 * hecho de dominio en Redis Streams (`stock.assessed` / `stock.cleared`) vía
 * eventBus. NO conoce al notification-service — quien materializa la
 * notificación (cadencia, dedup, display) es el consumidor.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  SECCION 1 — Clasificacion + urgencia (puras, sin I/O)  │
 * │  SECCION 2 — Evaluacion por planilla → evento de dominio│
 * │  SECCION 3 — Orquestacion: checkCell / sweep            │
 * └─────────────────────────────────────────────────────────┘
 */

const crypto        = require("crypto");
const { denormNum } = require("../inventory/utils/keys");
const eventBus      = require("./eventBus");

const MatrixBase       = require("../models/matrix/MatrixBase");
const MatrixSphCyl     = require("../models/matrix/MatrixSphCyl");
const MatrixBifocal    = require("../models/matrix/MatrixBifocal");
const MatrixProgresivo = require("../models/matrix/MatrixProgresivo");

// Modelos de Lentes de Contacto (CL)
const CLMatrixBase       = require("../models/contactlenses/CLMatrixEsferico");
const CLMatrixColorido   = require("../models/contactlenses/CLMatrixColorido");
const CLMatrixTorico     = require("../models/contactlenses/CLMatrixTorico");
const CLMatrixBifocal    = require("../models/contactlenses/CLMatrixBifocal");
const CLMatrixMultifocal = require("../models/contactlenses/CLMatrixMultifocal");

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
      case "SPH_CYL_AXIS": return Math.abs(p[0] || 0) + Math.abs(p[1] || 0);
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
      case "SPH_CYL":  label = `SPH ${fmt(p[0])} | CYL ${fmt(p[1])}`; break;
      case "SPH_CYL_AXIS": label = `SPH ${fmt(p[0])} | CYL ${fmt(p[1])} | AXIS ${p[2]}°`; break;
      case "SPH_ADD":  label = `SPH ${fmt(p[0])} | Add ${fmt(p[1])}`; break;
      case "BASE_ADD": label = `Base ${fmt(p[0])}/${fmt(p[1])} Add ${fmt(p[2])}`; break;
      default:         label = cellKey;
    }
    return eye ? `${label} (${eye})` : label;
  } catch { return cellKey; }
}

/** Coordenadas estructuradas de una celda (sin formato de presentación). */
function cellCoords(tipoMatriz, cellKey, eye) {
  const p = String(cellKey).split("|").map(denormNum);
  switch (tipoMatriz) {
    case "BASE":         return { base: p[0] ?? null };
    case "SPH_CYL":      return { sph: p[0] ?? null, cyl: p[1] ?? null };
    case "SPH_CYL_AXIS": return { sph: p[0] ?? null, cyl: p[1] ?? null, axis: p[2] != null ? parseInt(p[2]) : null };
    case "SPH_ADD":      return { sph: p[0] ?? null, add: p[1] ?? null, eye: eye || null };
    case "BASE_ADD":     return { base_izq: p[0] ?? null, base_der: p[1] ?? null, add: p[2] ?? null, eye: eye || null };
    default:             return {};
  }
}

/**
 * Score de urgencia [0..100]. Reusa la semántica de stock del dominio:
 * "mientras más lejos del neutro (0), menos urgente es tener poco stock".
 * CRÍTICO cerca de neutro → ~100; lejos → ~60. BAJO cerca → ~70; lejos → ~30.
 */
function urgency(level, distance) {
  if (level !== "CRITICO" && level !== "BAJO") return 0;
  const base      = level === "CRITICO" ? 60 : 30;
  const closeness = Math.max(0, 1 - Math.min(Number(distance) || 0, 8) / 8); // 0..1
  return Math.round(base + closeness * 40);
}

/** Etiqueta humana: prioriza el nombre de la planilla. */
function sheetLabel(sheet) {
  const name = String(sheet.nombre || sheet.name || "").trim();
  if (name) return name;
  return [sheet.baseKey, sheet.material, sheet.tratamiento]
    .filter(Boolean).join(" · ").trim() || String(sheet._id);
}

const TIPO_LABEL = {
  BASE: "Monofocal", SPH_CYL: "Esf/Cil", SPH_ADD: "Bifocal",
  BASE_ADD: "Progresivo/Multifocal", SPH_CYL_AXIS: "Tórico",
};

/** Identidad estructurada de la planilla para representarla en la notificación. */
function sheetInfo(sheet) {
  return {
    name:        String(sheet.nombre || sheet.name || "").trim() || null,
    sku:         sheet.sku || null,
    proveedor:   sheet.proveedor?.name || null,
    marca:       sheet.marca?.name || null,
    material:    sheet.material || null,
    tratamiento: sheet.tratamiento || null,
    baseKey:     sheet.baseKey || null,
    tipo_matriz: sheet.tipo_matriz || null,
    tipoLabel:   TIPO_LABEL[sheet.tipo_matriz] || sheet.tipo_matriz || null,
  };
}

function getMatrixModel(tipoMatriz, isContactLens = false) {
  if (isContactLens) {
    switch (tipoMatriz) {
      case "BASE":           return CLMatrixBase;
      case "SPH_CYL":        return CLMatrixColorido;
      case "SPH_CYL_AXIS":   return CLMatrixTorico;
      case "SPH_ADD":        return CLMatrixBifocal;
      case "BASE_ADD":       return CLMatrixMultifocal;
      default:               return null;
    }
  }

  switch (tipoMatriz) {
    case "BASE":     return MatrixBase;
    case "SPH_CYL":  return MatrixSphCyl;
    case "SPH_ADD":  return MatrixBifocal;
    case "BASE_ADD": return MatrixProgresivo;
    default:         return null;
  }
}

// ============================================================================
// SECCION 2 — Evaluacion por planilla → evento de dominio
// ============================================================================

/**
 * Lee TODAS las celdas de una planilla, clasifica las que tienen stock bajo o
 * critico, y publica el hecho de dominio (`stock.assessed`). Si no hay alertas,
 * publica `stock.cleared` para que el consumidor cierre la notificacion.
 *
 * @param {object} sheet - Documento de InventorySheet / ContactLensesSheet
 */
async function upsertSheetAlertNotification(sheet, opts = {}) {
  try {
    const isCL  = sheet.isContactLens || !!sheet.curvaBase || !!sheet.diametro || sheet.tipo_matriz === 'SPH_CYL_AXIS';
    const Model = getMatrixModel(sheet.tipo_matriz, isCL);
    if (!Model) return;

    const doc = await Model.findOne({ sheet: sheet._id }).lean();
    if (!doc?.cells) return;

    const allAlertCells = [];

    for (const [key, cell] of Object.entries(doc.cells)) {
      if (!cell) continue;

      const isFlat = cell.existencias !== undefined;

      if (isFlat) {
        const existencias = Number(cell.existencias ?? 0);
        const distance    = computeDistance(sheet.tipo_matriz, key);
        const level       = classifyStock(existencias, distance);
        if (level === "CRITICO" || level === "BAJO") {
          allAlertCells.push({
            cellKey:     key,
            eye:         null,
            coords:      cellCoords(sheet.tipo_matriz, key, null),
            label:       cellLabel(sheet.tipo_matriz, key, null),
            level,
            distance,
            urgency:     urgency(level, distance),
            existencias,
            // Extraer el eje y asegurar que sea un entero limpio (sin .00)
            axis: sheet.tipo_matriz === 'SPH_CYL_AXIS' ? String(parseInt(String(key).split('|')[2] || 0)) : null
          });
        }
      } else {
        for (const eye of ["OD", "OI"]) {
          if (cell[eye] === undefined || cell[eye] === null) continue;
          const existencias = Number(cell[eye]?.existencias ?? 0);
          const distance    = computeDistance(sheet.tipo_matriz, key);
          const level       = classifyStock(existencias, distance);
          if (level === "CRITICO" || level === "BAJO") {
            allAlertCells.push({
              cellKey:     key,
              eye,
              coords:      cellCoords(sheet.tipo_matriz, key, eye),
              label:       cellLabel(sheet.tipo_matriz, key, eye),
              level,
              distance,
              urgency:     urgency(level, distance),
              existencias,
              axis: null
            });
          }
        }
      }
    }

    // ── EMISIÓN DEL HECHO DE DOMINIO ────────────────────────────────────────
    if (allAlertCells.length === 0) {
      // Stock recuperado → el consumidor cerrará la notificación de esta planilla.
      await eventBus.publish({ kind: "stock.cleared", v: 1, sheetId: String(sheet._id), ts: Date.now() });
      return;
    }

    // Estructurar alertas por eje para que el frontend pueda navegar
    const alertsByAxis = {};
    if (sheet.tipo_matriz === 'SPH_CYL_AXIS') {
      allAlertCells.forEach(cell => {
        if (!alertsByAxis[cell.axis]) alertsByAxis[cell.axis] = [];
        alertsByAxis[cell.axis].push(cell);
      });
    }

    await _emitAssessedEvent(sheet, allAlertCells, isCL, alertsByAxis);
  } catch (e) {
    console.warn("[STOCK_ALERT] upsertSheetAlertNotification error:", e?.message);
  }
}

/**
 * Construye y publica el hecho de dominio `stock.assessed`.
 * Solo datos estructurados (coords, niveles, urgencia) — la política de
 * notificación (título, mensaje, prioridad, cadencia) la decide el consumidor.
 */
async function _emitAssessedEvent(sheet, alertCells, isCL, alertsByAxis) {
  // Ordenar: CRITICO primero, luego mayor urgencia
  alertCells.sort((a, b) => {
    if (a.level === "CRITICO" && b.level !== "CRITICO") return -1;
    if (b.level === "CRITICO" && a.level !== "CRITICO") return 1;
    return (b.urgency || 0) - (a.urgency || 0);
  });

  const critCount    = alertCells.filter((c) => c.level === "CRITICO").length;
  const lowCount     = alertCells.filter((c) => c.level === "BAJO").length;
  const urgencyScore = alertCells.reduce((m, c) => Math.max(m, c.urgency || 0), 0);

  // Fingerprint del estado (para idempotencia/dedup en el consumidor)
  const fingerprint = alertCells
    .map((c) => `${c.cellKey}:${c.eye || ""}:${c.level}:${c.existencias}`)
    .sort()
    .join("|");
  const hash = crypto.createHash("sha256").update(fingerprint).digest("hex");

  await eventBus.publish({
    kind:         "stock.assessed",
    v:            1,
    sheetId:      String(sheet._id),
    sheetLabel:   sheetLabel(sheet),
    sheet:        sheetInfo(sheet),
    isCL:         Boolean(isCL),
    tipo_matriz:  sheet.tipo_matriz,
    cells:        alertCells,
    alertsByAxis,
    critCount,
    lowCount,
    urgencyScore,
    hash,
    ts:           Date.now(),
  });
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
    const ContactLensesSheet = require("../models/ContactLensesSheet");

    const [invSheets, clSheets] = await Promise.all([
      InventorySheet.find({ isDeleted: { $ne: true } }).lean(),
      ContactLensesSheet.find({ isDeleted: { $ne: true } }).lean()
    ]);

    const allSheets = [
      ...invSheets.map(s => ({ ...s, isContactLens: false })),
      ...clSheets.map(s => ({ ...s, isContactLens: true }))
    ];

    for (const sheet of allSheets) {
      await upsertSheetAlertNotification(sheet, opts);
    }

    console.log(`[STOCK_ALERT] Sweep completo: ${invSheets.length} micas y ${clSheets.length} lentes de contacto.`);
  } catch (e) {
    console.error("[STOCK_ALERT] sweepAllSheets error:", e?.message);
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
    const ContactLensesSheet = require("../models/ContactLensesSheet");

    let sheet = await InventorySheet.findById(sheetId).lean();
    let isCL = false;

    if (!sheet) {
      sheet = await ContactLensesSheet.findById(sheetId).lean();
      isCL = true;
    }

    if (!sheet || sheet.isDeleted) return;
    await upsertSheetAlertNotification({ ...sheet, isContactLens: isCL }, opts);
  } catch (e) {
    console.warn("[STOCK_ALERT] checkSheetById error:", e?.message);
  }
}

module.exports = {
  checkCellAlert,
  checkSheetAlerts,
  checkSheetById,
  sweepAllSheets,
  classifyStock,
  computeDistance,
  cellLabel,
  cellCoords,
  urgency,
  getTier,
  sheetLabel,
  sheetInfo,
};
