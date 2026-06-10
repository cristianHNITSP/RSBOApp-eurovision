/**
 * @fileoverview Servicio de notificaciones
 * CRUD completo con lógica de filtrado por rol y seguimiento de lectura.
 *
 * @module services/notification.service
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const Notification = require('../models/Notification');

/**
 * Construye el filtro de visibilidad según el rol del usuario:
 * - isGlobal=true → siempre visible
 * - targetRoles incluye el rol → visible
 */
function visibilityFilter(roleName) {
  return { $or: [{ isGlobal: true }, { targetRoles: roleName }] };
}

function notExpired() {
  const now = new Date();
  return { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] };
}

/**
 * Combina filtros de visibilidad + expiración sin conflicto de clave $or.
 */
function baseFilter(roleName) {
  return {
    $and: [visibilityFilter(roleName), notExpired()],
  };
}

/**
 * Lista notificaciones visibles para el rol del usuario.
 * Excluye las descartadas por el usuario y añade isPinned/isRead por usuario.
 */
async function listForUser({ roleName, userId, limit = 50, skip = 0, dateRange }) {
  const userOid = new mongoose.Types.ObjectId(userId);

  const filters = [visibilityFilter(roleName)];

  if (!dateRange) {
    // Modo "activas" (panel)
    filters.push(notExpired(), { dismissedBy: { $nin: [userOid] } });
  } else {
    // Modo "historial" (vista completa)
    if (dateRange !== 'indefinido') {
      const now = new Date();
      let startDate = new Date();
      if (dateRange === 'diario') startDate.setHours(0,0,0,0);
      else if (dateRange === 'semana') startDate.setDate(now.getDate() - 7);
      else if (dateRange === 'mes') startDate.setMonth(now.getMonth() - 1);

      filters.push({ createdAt: { $gte: startDate } });
    }
  }

  const filter = { $and: filters };

  const skipVal  = Math.max(0, parseInt(skip || "0"));
  const limitVal = Math.max(1, parseInt(limit || "50"));
  // `total` solo lo necesita la vista historial (paginada). El panel lo omite → −1 query.
  const needsTotal = !!dateRange;

  const pipeline = [
    { $match: filter },
    {
      $addFields: {
        // isPinned por usuario, calculado en DB (evita enviar pinnedBy completo)
        isPinned: { $in: [userOid, { $ifNull: ["$pinnedBy", []] }] },
        priorityWeight: {
          $switch: {
            branches: [
              { case: { $eq: ["$priority", "critical"] }, then: 4 },
              { case: { $eq: ["$priority", "high"] },     then: 3 },
              { case: { $eq: ["$priority", "medium"] },   then: 2 },
              { case: { $eq: ["$priority", "low"] },      then: 1 }
            ],
            default: 0
          }
        }
      }
    },
    { $sort: { priorityWeight: -1, createdAt: -1 } },
    { $skip: skipVal },
    { $limit: limitVal },
    // Recortar payload: campos internos que el cliente no usa.
    { $project: { pinnedBy: 0, dismissedBy: 0, contentHash: 0, priorityWeight: 0 } },
  ];

  const [notifications, total] = await Promise.all([
    Notification.aggregate(pipeline),
    needsTotal ? Notification.countDocuments(filter) : Promise.resolve(undefined),
  ]);

  const result = notifications.map((n) => ({ ...n, _id: String(n._id) }));

  return { notifications: result, total };
}

/**
 * Cuenta las notificaciones creadas o actualizadas después de un timestamp.
 * Sirve para el badge de "nuevas" notificaciones.
 */
async function countNew({ roleName, userId, since }) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const filter = {
    $and: [
      visibilityFilter(roleName),
      notExpired(),
      { dismissedBy: { $nin: [userOid] } },
    ],
  };
  
  if (since) {
    const sinceDate = new Date(since);
    if (!isNaN(sinceDate.getTime())) {
      filter.$and.push({
        $or: [
          { createdAt: { $gt: sinceDate } },
          { updatedAt: { $gt: sinceDate } }
        ]
      });
    }
  }

  return Notification.countDocuments(filter);
}

/**
 * Crea una nueva notificación.
 */
async function create({ title, message, type, priority, targetRoles, isGlobal, expiresAt, createdBy, createdByName }) {
  const roles = isGlobal ? [] : (targetRoles ?? []);

  return Notification.create({
    title,
    message,
    type:         type        ?? 'info',
    priority:     priority    ?? 'low',
    targetRoles:  roles,
    isGlobal:     Boolean(isGlobal),
    expiresAt:    expiresAt   ?? null,
    createdBy,
    createdByName: createdByName ?? '',
  });
}

/**
 * Crea una notificación agrupada: si ya existe una con el mismo groupKey,
 * incrementa su contador y actualiza el mensaje en lugar de crear una nueva.
 * Devuelve { notification, accumulated: boolean }.
 */
async function createOrAccumulate({ groupKey, title, messageTemplate, type, priority, targetRoles, isGlobal, createdBy, createdByName }) {
  if (!groupKey) {
    const n = await create({ title, message: messageTemplate(1), type, priority, targetRoles, isGlobal, createdBy, createdByName });
    return { notification: n, accumulated: false };
  }

  // Incremento ATÓMICO del contador (evita lost-update con acumulaciones
  // concurrentes); el mensaje se recalcula con el count ya consistente.
  const accumulated = await Notification.findOneAndUpdate(
    { groupKey, ...notExpired() },
    { $inc: { count: 1 }, $set: { title } },
    { new: true }
  );

  if (accumulated) {
    accumulated.message = messageTemplate(accumulated.count);
    await accumulated.save();
    return { notification: accumulated, accumulated: true };
  }

  const n = await Notification.create({
    groupKey,
    title,
    message:       messageTemplate(1),
    type:          type       ?? 'info',
    priority:      priority   ?? 'medium',
    targetRoles:   isGlobal ? [] : (targetRoles ?? []),
    isGlobal:      Boolean(isGlobal),
    expiresAt:     null,
    count:         1,
    createdBy,
    createdByName: createdByName ?? '',
  });

  return { notification: n, accumulated: false };
}



/**
 * Alterna el pin de una notificación para el usuario. Idempotente.
 * Devuelve { isPinned: boolean }.
 */
async function togglePin({ notificationId, roleName, userId }) {
  const filter = {
    $and: [visibilityFilter(roleName), notExpired(), { _id: notificationId }],
  };
  // Lectura solo para decidir la dirección del toggle.
  const notification = await Notification.findOne(filter).select("pinnedBy").lean();
  if (!notification) return null;

  const userStr = String(userId);
  const isPinned = (notification.pinnedBy || []).some((id) => String(id) === userStr);

  // Mutación ATÓMICA e idempotente (sin duplicados ni lost-update).
  const update = isPinned
    ? { $pull: { pinnedBy: userId } }
    : { $addToSet: { pinnedBy: userId } };
  await Notification.updateOne({ _id: notificationId }, update);

  return { isPinned: !isPinned };
}

/**
 * Descarta permanentemente una notificación para el usuario (la oculta solo para él).
 * También la marca como leída si no lo estaba.
 */
async function dismiss({ notificationId, roleName, userId }) {
  const filter = {
    $and: [visibilityFilter(roleName), notExpired(), { _id: notificationId }],
  };
  // Mutación ATÓMICA: marca descartada y quita el pin en una sola operación.
  const updated = await Notification.findOneAndUpdate(
    filter,
    { $addToSet: { dismissedBy: userId }, $pull: { pinnedBy: userId } },
    { new: true, projection: { _id: 1 } }
  );
  if (!updated) return null;
  return { dismissed: true };
}

/**
 * Crea o actualiza una notificación agrupada por día.
 * Usa groupKey + date (YYYY-MM-DD) como clave única diaria.
 * Almacena metadata para el panel expandible del frontend.
 *
 * @param {{
 *   groupKey: string,
 *   date?: string,  // YYYY-MM-DD, por defecto hoy
 *   title: string,
 *   message: string,
 *   metadata?: object,
 *   type?: string,
 *   priority?: string,
 *   targetRoles?: string[],
 *   isGlobal?: boolean,
 *   createdBy: ObjectId,
 *   createdByName?: string,
 * }} params
 */
async function upsertDaily({ groupKey, date, title, message, metadata, type, priority, targetRoles, isGlobal, createdBy, createdByName }) {
  const today = date || new Date().toISOString().slice(0, 10);

  // Calcular fingerprint robusto (falsos negativos prevenidos al incluir metadata y texto exacto)
  const hashPayload = JSON.stringify({ title, message, metadata });
  const contentHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

  let expiresAt = null;
  if (metadata?.type === 'stock_alert') {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
  } else if (['pending_orders', 'new_order', 'correction'].includes(metadata?.type)) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 4);
  }

  // Aplica la actualización sobre un documento existente (misma lógica para el
  // camino normal y para el reintento tras colisión de índice único).
  const applyExistingUpdate = async (existing) => {
    if (existing.contentHash === contentHash) {
      return { notification: existing, accumulated: true, skipped: true };
    }
    existing.title    = title;
    existing.message  = message;
    existing.metadata = metadata ?? existing.metadata;
    existing.contentHash = contentHash;
    existing.count    = 1;
    existing.dismissedBy = [];
    if (type) existing.type = type;
    if (priority) {
      const PRIO_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
      const hasPins = (existing.pinnedBy || []).length > 0;
      if (!hasPins || PRIO_ORDER[priority] >= PRIO_ORDER[existing.priority]) {
        existing.priority = priority;
      }
    }
    if (expiresAt) existing.expiresAt = expiresAt;
    existing.markModified('metadata');
    await existing.save();
    return { notification: existing, accumulated: true };
  };

  const existing = await Notification.findOne({ groupKey, date: today });
  if (existing) return applyExistingUpdate(existing);

  try {
    const n = await Notification.create({
      groupKey,
      date:          today,
      title,
      message,
      metadata:      metadata ?? null,
      type:          type     ?? 'warning',
      priority:      priority ?? 'high',
      targetRoles:   isGlobal ? [] : (targetRoles ?? []),
      isGlobal:      Boolean(isGlobal),
      expiresAt:     expiresAt,
      count:         1,
      contentHash,
      createdBy,
      createdByName: createdByName ?? '',
    });
    return { notification: n, accumulated: false };
  } catch (err) {
    // Otro proceso creó el {groupKey,date} en paralelo (índice único) → re-leer y actualizar.
    if (err && err.code === 11000) {
      const created = await Notification.findOne({ groupKey, date: today });
      if (created) return applyExistingUpdate(created);
    }
    throw err;
  }
}

// ============================================================================
// POLÍTICA DE ALERTAS DE STOCK (consumidor de eventos `stock.*`)
// Una notificación persistente por planilla (groupKey = stock_alert:<sheetId>),
// que se "nudgea" según urgencia/antigüedad y se auto-cierra al recuperarse.
// ============================================================================

const STOCK_SYSTEM_OID = new mongoose.Types.ObjectId('000000000000000000000001');
const STOCK_TARGET_ROLES = ['eurovision'];
const PRIO_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
const HOUR_MS = 60 * 60 * 1000;
const CYCLE_MS = 3 * 24 * HOUR_MS; // una notificación vive 3 días, luego se regenera

/** urgencyScore [0..100] → prioridad de la notificación. */
function priorityFromScore(score) {
  if (score >= 85) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function buildStockTitle(ev) {
  const label = ev.sheetLabel || ev.sheetId;
  return ev.critCount > 0 ? `Stock crítico · ${label}` : `Stock bajo · ${label}`;
}

function buildStockMessage(ev) {
  const parts = [];
  if (ev.critCount > 0) parts.push(`${ev.critCount} crítico${ev.critCount > 1 ? 's' : ''}`);
  if (ev.lowCount  > 0) parts.push(`${ev.lowCount} bajo${ev.lowCount > 1 ? 's' : ''}`);
  return parts.join(' · ') || 'Revisar stock';
}

function buildStockFields(ev) {
  return {
    // El emisor puede mandar título/mensaje legibles (óptica); si no, se arman.
    title:    ev.title   || buildStockTitle(ev),
    message:  ev.message || buildStockMessage(ev),
    type:     ev.critCount > 0 ? 'danger' : 'warning',
    priority: priorityFromScore(ev.urgencyScore || 0),
    metadata: {
      type:        'stock_alert',
      sheetId:     ev.sheetId,
      sheetLabel:  ev.sheetLabel,
      sheet:       ev.sheet || null,   // identidad: name, sku, proveedor, marca, material, tratamiento, tipoLabel
      isCL:        !!ev.isCL,          // destino del deep-link: lentes-contacto vs bases-micas
      tipo_matriz: ev.tipo_matriz,
      cells:       ev.cells,
      alertsByAxis: ev.alertsByAxis || null,
      critCount:   ev.critCount,
      lowCount:    ev.lowCount,
      urgencyScore: ev.urgencyScore,
    },
  };
}

/**
 * Política PURA (sin I/O): decide qué hacer con un evento `stock.assessed`.
 * - create:     no existe la notificación.
 * - regenerate: la vigente superó el ciclo de 3 días → nueva identidad.
 * - revive:     dentro del ciclo, no fijada y la cadencia (lock) lo permite → re-surface.
 * - refresh:    actualiza datos en silencio (fijada, o cambió el contenido sin tick de cadencia).
 * - skip:       nada que hacer.
 * NUNCA hay contadores: el "spam" es revivir, no acumular.
 * @returns {{ action: 'create'|'regenerate'|'revive'|'refresh'|'skip' }}
 */
function decideStockAction({ existing, ev, now, resurface, pinned, cycleMs = CYCLE_MS }) {
  if (!existing) return { action: 'create' };
  if (now - new Date(existing.createdAt).getTime() > cycleMs) return { action: 'regenerate' };
  const contentChanged = existing.contentHash !== ev.hash;
  if (pinned)    return { action: contentChanged ? 'refresh' : 'skip' };
  if (resurface) return { action: 'revive' };
  return { action: contentChanged ? 'refresh' : 'skip' };
}

/**
 * Materializa un evento `stock.assessed` en una notificación persistente.
 * `resurface` lo decide el consumidor con el rate-limiter de Redis (cadencia).
 * @returns {{ notification, changed:boolean, action:string }}
 */
async function upsertStockAlert(ev, { resurface = false } = {}) {
  const groupKey = `stock_alert:${ev.sheetId}`;
  const now = Date.now();

  // Una sola notificación por planilla: conserva la más reciente, borra duplicados.
  const dupes    = await Notification.find({ groupKey }).sort({ updatedAt: -1 });
  let existing   = dupes[0] || null;
  if (dupes.length > 1) {
    await Notification.deleteMany({ groupKey, _id: { $ne: existing._id } });
  }

  const pinned = !!existing && (existing.pinnedBy || []).length > 0;
  const { action } = decideStockAction({ existing, ev, now, resurface, pinned });
  const fields = buildStockFields(ev);

  // create / regenerate → nueva notificación (identidad fresca, sin contador)
  if (action === 'create' || action === 'regenerate') {
    if (action === 'regenerate') await Notification.deleteMany({ groupKey });
    const n = await Notification.create({
      groupKey,
      date:          new Date().toISOString().slice(0, 10),
      ...fields,
      targetRoles:   STOCK_TARGET_ROLES,
      isGlobal:      false,
      count:         1,            // fijo; nunca se incrementa
      contentHash:   ev.hash,
      createdBy:     STOCK_SYSTEM_OID,
      createdByName: 'Sistema',
    });
    return { notification: n, changed: true, action };
  }

  if (action === 'skip') return { notification: existing, changed: false, action };

  // revive / refresh → actualiza la vigente
  existing.title    = fields.title;
  existing.message  = fields.message;
  existing.metadata = fields.metadata;
  existing.markModified('metadata');
  existing.contentHash = ev.hash;
  existing.type     = fields.type;
  // Prioridad: subir siempre; bajar solo si no está fijada.
  if (!pinned || PRIO_ORDER[fields.priority] >= PRIO_ORDER[existing.priority]) {
    existing.priority = fields.priority;
  }

  if (action === 'revive') {
    existing.dismissedBy = [];        // re-surface: vuelve a verse para todos
    await existing.save();            // updatedAt avanza → sube y cuenta como nueva
    return { notification: existing, changed: true, action };
  }

  // refresh: datos frescos en silencio, sin revivir ni mover updatedAt
  await existing.save({ timestamps: false });
  return { notification: existing, changed: false, action };
}

/** Stock recuperado → cierra la notificación de la planilla. */
async function clearStockAlert(sheetId) {
  const res = await Notification.deleteMany({ groupKey: `stock_alert:${sheetId}` });
  return { changed: (res.deletedCount || 0) > 0 };
}

/**
 * Actualiza campos permitidos de una notificación.
 */
async function update(notificationId, updates) {
  const allowed = ['title', 'message', 'type', 'priority', 'targetRoles', 'isGlobal', 'expiresAt', 'metadata'];
  const safeUpdates = {};
  for (const key of allowed) {
    if (key in updates) safeUpdates[key] = updates[key];
  }
  if (safeUpdates.isGlobal) safeUpdates.targetRoles = [];

  return Notification.findByIdAndUpdate(notificationId, { $set: safeUpdates }, { new: true, runValidators: true });
}

/**
 * Elimina una notificación.
 */
async function remove(notificationId) {
  return Notification.findByIdAndDelete(notificationId);
}

module.exports = {
  listForUser, countNew, create, createOrAccumulate, upsertDaily,
  upsertStockAlert, clearStockAlert, togglePin, dismiss, update, remove,
  // puras (para tests)
  decideStockAction, priorityFromScore, CYCLE_MS,
};
