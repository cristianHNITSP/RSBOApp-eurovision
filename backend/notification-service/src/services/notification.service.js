/**
 * @fileoverview Servicio de notificaciones
 * CRUD completo con lógica de filtrado por rol y seguimiento de lectura.
 *
 * @module services/notification.service
 */

const mongoose = require('mongoose');
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
async function listForUser({ roleName, userId, limit = 50, skip = 0 }) {
  console.log(`[NOTIF-DEBUG] listForUser: role=${roleName}, userId=${userId}`);
  const userOid = new mongoose.Types.ObjectId(userId);
  const filter = {
    $and: [
      visibilityFilter(roleName),
      notExpired(),
      { dismissedBy: { $nin: [userOid] } },
    ],
  };

  const skipVal  = Math.max(0, parseInt(skip || "0"));
  const limitVal = Math.max(1, parseInt(limit || "50"));

  const [notifications, total] = await Promise.all([
    Notification.aggregate([
      { $match: filter },
      {
        $addFields: {
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
      { $limit: limitVal }
    ]),
    Notification.countDocuments(filter),
  ]);

  const userStr = String(userId);
  const result = notifications.map((n) => ({
    ...n,
    _id: String(n._id), // Asegurar que el ID sea string tras agregación
    isPinned: (n.pinnedBy || []).some((id) => String(id) === userStr),
  }));

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

  const existing = await Notification.findOne({ groupKey, ...notExpired() });

  if (existing) {
    existing.count += 1;
    existing.message = messageTemplate(existing.count);
    existing.title   = title;
    existing.updatedAt = new Date();
    await existing.save();
    return { notification: existing, accumulated: true };
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
  const notification = await Notification.findOne(filter);
  if (!notification) return null;

  const userStr = String(userId);
  const idx = (notification.pinnedBy || []).findIndex((id) => String(id) === userStr);
  if (idx === -1) {
    notification.pinnedBy.push(userId);
  } else {
    notification.pinnedBy.splice(idx, 1);
  }
  await notification.save();
  return { isPinned: idx === -1 };
}

/**
 * Descarta permanentemente una notificación para el usuario (la oculta solo para él).
 * También la marca como leída si no lo estaba.
 */
async function dismiss({ notificationId, roleName, userId }) {
  const filter = {
    $and: [visibilityFilter(roleName), notExpired(), { _id: notificationId }],
  };
  const notification = await Notification.findOne(filter);
  if (!notification) return null;

  const userStr = String(userId);

  const alreadyDismissed = (notification.dismissedBy || []).some((id) => String(id) === userStr);
  if (!alreadyDismissed) {
    notification.dismissedBy.push(userId);
  }

  // También quitar el pin si estaba fijado
  const pinIdx = (notification.pinnedBy || []).findIndex((id) => String(id) === userStr);
  if (pinIdx !== -1) notification.pinnedBy.splice(pinIdx, 1);

  await notification.save();
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

  const existing = await Notification.findOne({ groupKey, date: today });

  if (existing) {
    existing.title    = title;
    existing.message  = message;
    existing.metadata = metadata ?? existing.metadata;
    // No incrementamos count automáticamente si es una notificación de estado agrupada
    // a menos que el llamador lo pida explícitamente (ej. nuevas alertas)
    existing.count    = 1; 
    existing.dismissedBy = []; // Reset dismissed so it pops up again for everyone
    if (type)     existing.type     = type;
    
    // Solo escalar prioridad hacia arriba si tiene pins activos
    if (priority) {
      const PRIO_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
      const hasPins = (existing.pinnedBy || []).length > 0;
      if (!hasPins || PRIO_ORDER[priority] >= PRIO_ORDER[existing.priority]) {
        existing.priority = priority;
      }
    }
    existing.markModified('metadata');
    await existing.save();
    return { notification: existing, accumulated: true };
  }

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
    expiresAt:     null,
    count:         1,
    createdBy,
    createdByName: createdByName ?? '',
  });

  return { notification: n, accumulated: false };
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

module.exports = { listForUser, countNew, create, createOrAccumulate, upsertDaily, togglePin, dismiss, update, remove };
