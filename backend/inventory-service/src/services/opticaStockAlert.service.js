"use strict";

/**
 * @fileoverview Alertas de stock para ÓPTICA (productos planos: 1 producto = 1 stock).
 *
 * Replica el patrón de matrices: clasifica el stock y publica un HECHO de dominio al
 * mismo Redis Stream (`stock:events`) con contrato compatible. La política (título,
 * cadencia, dedup) la decide el notification-service.
 *
 * Reusa el `sheetId` sintético `optica:<id>` para no tocar el consumer/notification.
 */
const crypto = require("crypto");
const eventBus = require("./eventBus");
const stockState = require("./stockState");
const { MODEL_BY_KEY } = require("../models/optica/OpticaProduct");
const OpticaCategory = require("../models/optica/OpticaCategory");
const {
  OPTICA_CATEGORIES,
  OPTICA_STOCK_THRESHOLDS,
  KEY_BY_MODEL,
} = require("../data/optica.constants");

// ── Cache de categorías (umbrales/label/hasStock) con TTL corto ──────────────
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 60 * 1000;

async function getCategories() {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL_MS) return _cache;
  const map = new Map();
  try {
    const docs = await OpticaCategory.find({}).lean();
    for (const d of docs) map.set(d.key, d);
  } catch (e) {
    console.warn("[OPTICA_ALERT] getCategories error:", e?.message);
  }
  _cache = map;
  _cacheAt = Date.now();
  return map;
}

const productLabel = (p) =>
  p.nombre || [p.marca, p.modelo].filter(Boolean).join(" ").trim() || p.sku || "producto";

/** Limpia la alerta de un producto (baja, recuperación de stock, etc.). */
function clear(sheetId) {
  return eventBus.publish({ kind: "stock.cleared", v: 1, sheetId, ts: Date.now() });
}
const clearProductAlert = (id) => clear(`optica:${id}`);

/**
 * Evalúa un producto de óptica y publica el evento correspondiente.
 * - Crítico/Advertencia → `stock.assessed` (notifica).
 * - Aceptable/Bueno     → `stock.cleared`  (no pestea; limpia alerta previa).
 * @param {object} product - doc (o lean) con __t, _id, stock, sku, nombre/marca/modelo
 */
async function assessProduct(product) {
  if (!product || !product._id) return;
  const sheetId = `optica:${product._id}`;

  // Borrado → limpiar su alerta.
  if (product.isDeleted) { await clear(sheetId); return; }

  const key = KEY_BY_MODEL[product.__t];
  if (!key) return;

  const cats = await getCategories();
  const cat = cats.get(key);
  // Categoría sin stock (equipos) → sin alertas.
  if (cat && cat.hasStock === false) return;

  const thresholds = cat?.stockThresholds || OPTICA_STOCK_THRESHOLDS;
  const catLabel = cat?.label || key;
  const level = stockState.classifyFlat(product.stock, thresholds);

  if (!stockState.notifies(level)) {
    // Aceptable / Bueno → limpiar cualquier alerta previa de este producto.
    await clear(sheetId);
    return;
  }

  const label = productLabel(product);
  const stock = Number(product.stock || 0);
  const hash = crypto
    .createHash("sha256")
    .update(`${sheetId}:${level}:${stock}`)
    .digest("hex");

  await eventBus.publish({
    kind: "stock.assessed",
    v: 1,
    sheetId,
    sheetLabel: `${catLabel} · ${label}`,
    sheet: { name: label, sku: product.sku, categoria: key, tipoLabel: catLabel },
    isCL: false,
    tipo_matriz: "OPTICA",
    cells: [{ cellKey: product.sku, level, existencias: stock, urgency: stockState.urgencyFlat(level) }],
    critCount: level === stockState.LEVELS.CRITICO ? 1 : 0,
    lowCount: level === stockState.LEVELS.BAJO ? 1 : 0,
    urgencyScore: stockState.urgencyFlat(level),
    hash,
    // Overrides legibles (notification.service los usa si vienen).
    title: `${stockState.labelOf(level)} · ${catLabel}`,
    message: `${label} — quedan ${stock} unidad${stock === 1 ? "" : "es"}`,
    ts: Date.now(),
  });
}

/** Dispara la evaluación sin bloquear (para usar desde rutas, como el hook de matrices). */
function assessProductAsync(product) {
  setImmediate(() => assessProduct(product).catch((e) =>
    console.warn("[OPTICA_ALERT] assess error:", e?.message)
  ));
}

/**
 * Barrido de seguridad: evalúa todos los productos activos de categorías con stock.
 * Lo invoca el cron (arranque + horario), igual que sweepAllSheets.
 */
async function sweepOpticaProducts() {
  let total = 0;
  try {
    const cats = await getCategories();
    for (const cfg of OPTICA_CATEGORIES) {
      if (cfg.hasStock === false) continue;
      const fromDb = cats.get(cfg.key);
      if (fromDb && fromDb.hasStock === false) continue;
      const Model = MODEL_BY_KEY[cfg.key];
      if (!Model) continue;
      const items = await Model.find({ isDeleted: false }).lean();
      for (const it of items) { await assessProduct(it); total++; }
    }
    console.log(`[OPTICA_ALERT] Sweep óptica: ${total} productos evaluados.`);
  } catch (e) {
    console.error("[OPTICA_ALERT] sweepOpticaProducts error:", e?.message);
  }
}

module.exports = { assessProduct, assessProductAsync, clearProductAlert, sweepOpticaProducts };
