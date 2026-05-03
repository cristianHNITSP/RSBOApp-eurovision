"use strict";

const mongoose = require("mongoose");
const Devolution = require("../models/Devolution");
const InventorySheet = require("../models/InventorySheet");
const mermaService = require("./merma.service");
const notifClient = require("./notifClient");

let _ws;
function ws() {
  if (_ws) return _ws;
  try { _ws = require("../ws"); } catch { _ws = { broadcast: () => {} }; }
  return _ws;
}

class DevolutionError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "DevolutionError";
    this.code = code;
    this.status = status;
  }
}

const EDITABLE_STATES = new Set(["pendiente", "en_revision"]);
const VALID_REASONS = new Set([
  "defecto_fabricacion", "error_prescripcion", "insatisfaccion_cliente",
  "dano_transporte", "lente_roto", "pedido_incorrecto", "garantia", "otro",
]);
const VALID_CONDITIONS = new Set(["bueno", "danado", "defectuoso"]);

function sanitizeItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const condition = VALID_CONDITIONS.has(raw.condition) ? raw.condition : "defectuoso";
  // Regla V6 del plan: si la condición no es 'bueno', restoreStock se fuerza a false.
  const restoreStock = condition === "bueno" ? Boolean(raw.restoreStock) : false;
  const qty = Number(raw.qty);
  if (!Number.isFinite(qty) || qty < 1) return null;
  return {
    codebar:     String(raw.codebar || "").trim(),
    description: String(raw.description || ""),
    sku:         raw.sku || null,
    qty,
    condition,
    restoreStock,
    sheet:       raw.sheet || null,
    matrixKey:   raw.matrixKey || null,
    eye:         raw.eye === "OD" || raw.eye === "OI" ? raw.eye : null,
  };
}

function sanitizePatch(raw) {
  const out = {};
  if (raw.cliente !== undefined)      out.cliente      = String(raw.cliente).trim();
  if (raw.clientePhone !== undefined) out.clientePhone = raw.clientePhone || null;
  if (raw.reason !== undefined) {
    if (!VALID_REASONS.has(raw.reason)) {
      throw new DevolutionError("BAD_REASON", `reason inválido: ${raw.reason}`);
    }
    out.reason = raw.reason;
  }
  if (raw.reasonDetail !== undefined) out.reasonDetail = String(raw.reasonDetail || "");
  if (raw.notes !== undefined)        out.notes        = String(raw.notes || "");
  if (raw.restoreStock !== undefined) out.restoreStock = Boolean(raw.restoreStock);
  if (Array.isArray(raw.items)) {
    out.items = raw.items.map(sanitizeItem).filter(Boolean);
    if (out.items.length === 0) {
      throw new DevolutionError("EMPTY_ITEMS", "items debe contener al menos un elemento válido");
    }
  }
  return out;
}

/**
 * Edita una devolución mientras está en estado pendiente o en_revision.
 *
 * @param {string} id
 * @param {object} rawPatch
 * @param {{userId?:string, name?:string}} actor
 * @returns {Promise<object>} La devolución actualizada (lean).
 */
async function updateDevolution(id, rawPatch, actor) {
  if (!mongoose.isValidObjectId(id)) {
    throw new DevolutionError("BAD_ID", "id inválido");
  }
  const dev = await Devolution.findById(id);
  if (!dev) throw new DevolutionError("NOT_FOUND", "Devolución no encontrada", 404);
  if (!EDITABLE_STATES.has(dev.status)) {
    throw new DevolutionError("LOCKED",
      `Solo se puede editar en estados ${[...EDITABLE_STATES].join(", ")} (actual: ${dev.status})`,
      409);
  }

  const patch = sanitizePatch(rawPatch || {});
  Object.assign(dev, patch);

  // Si la devolución a nivel padre tiene restoreStock=true pero todos los items
  // están dañados, recalculamos a false para coherencia.
  if (dev.restoreStock && Array.isArray(dev.items)) {
    const anyGoodWithRestore = dev.items.some(i => i.condition === "bueno" && i.restoreStock);
    if (!anyGoodWithRestore) dev.restoreStock = false;
  }

  await dev.save();

  try {
    ws().broadcast("DEVOLUTION_UPDATED", {
      id:    String(dev._id),
      folio: dev.folio,
    });
  } catch (_) { /* noop */ }

  return dev.toObject();
}

/**
 * Convierte items dañados/defectuosos en MermaLog. Pensado para invocarse desde
 * el handler de cambio de status (al transicionar a 'procesada' o 'aprobada').
 *
 * No reingresa stock — eso lo sigue haciendo `restoreInventoryStock` solo para
 * items con condition='bueno' && restoreStock=true.
 *
 * @returns {Promise<{ok:string[], errors:object[]}>}
 */
async function processDamagedAsMermas(dev, actor) {
  const ok = [];
  const errors = [];
  if (!dev || !Array.isArray(dev.items)) return { ok, errors };

  for (const item of dev.items) {
    if (!["danado", "defectuoso"].includes(item.condition)) continue;
    if (!item.sheet || !item.matrixKey) {
      errors.push({ codebar: item.codebar, error: "ITEM_SIN_LOCALIZACION" });
      continue;
    }
    try {
      const merma = await mermaService.registerMerma({
        origin:     "DEVOLUCION",
        devolution: dev._id,
        sheet:      item.sheet,
        matrixKey:  item.matrixKey,
        eye:        item.eye || null,
        codebar:    item.codebar || null,
        params:     {},
        qty:        Number(item.qty),
        reason:     "DEFECTO",
        notes:      `Auto-merma desde devolución ${dev.folio}`,
        actor,
        skipMutation: true, // Crucial: la pieza ya está "fuera" de stock, solo documentamos la pérdida.
      });
      ok.push(merma.folio);
    } catch (e) {
      errors.push({ codebar: item.codebar, error: e?.message || "UNKNOWN" });
    }
  }
  return { ok, errors };
}

/**
 * Notifica las devoluciones que requieren atención (aprobación/rechazo).
 * Agrupa todas las pendientes en una sola notificación diaria.
 */
async function notifyPendingApprovals() {
  try {
    const pending = await Devolution.find({
      status: { $in: ["pendiente", "en_revision"] }
    }).sort({ createdAt: -1 }).lean();

    const groupKey = "dev_pending_approvals";
    const today    = new Date().toISOString().slice(0, 10);

    if (pending.length === 0) {
      // Si no hay pendientes, intentamos borrar la notificación agrupada de hoy
      await notifClient.deleteByGroup({ groupKey, date: today });
      return;
    }

    const count = pending.length;
    const title = `⚠️ ${count} Devolución${count > 1 ? 'es' : ''} pendiente${count > 1 ? 's' : ''}`;
    const message = `Hay ${count} solicitud${count > 1 ? 'es' : ''} de devolución esperando revisión. Revisa el detalle para aprobar o rechazar directamente.`;
    
    console.log(`[DEV_SERVICE] Notificación agrupada enviada: ${count} pendientes`);
    await notifClient.upsertDaily({
      groupKey,
      date:        today,
      title,
      message,
      type:        "warning",
      priority:    "high",
      targetRoles: ["supervisor", "root", "eurovision"],
      metadata: {
        type: "dev_approval",
        count,
        devolutions: pending.map(d => ({
          id:     String(d._id),
          folio:  d.folio,
          cliente: d.cliente,
          reason:  d.reason,
          fecha:   d.createdAt,
          itemsCount: (d.items || []).length
        }))
      }
    });
  } catch (e) {
    console.error("[DEV_SERVICE] notifyPendingApprovals error:", e.message);
  }
}

module.exports = {
  DevolutionError,
  EDITABLE_STATES,
  updateDevolution,
  processDamagedAsMermas,
  notifyPendingApprovals,
};
