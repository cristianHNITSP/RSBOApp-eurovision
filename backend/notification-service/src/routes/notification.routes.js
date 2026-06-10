/**
 * @fileoverview Rutas de notificaciones
 *
 * GET    /                → lista notificaciones del usuario (todos los roles)
 * GET    /count           → conteo de nuevas notificaciones (acepta ?since=timestamp)
 * POST   /                → crear (root, eurovision, supervisor)
 * POST   /grouped         → crear o acumular agrupada (todos los roles autenticados)
 * PATCH  /:id/pin         → alternar pin
 * PATCH  /:id/dismiss     → descartar (ocultar para el usuario)
 * PUT    /:id             → actualizar (root, eurovision)
 * DELETE /:id             → eliminar (root, eurovision)
 *
 * @module routes/notification
 */

const router = require('express').Router();
const auth   = require('../middlewares/auth.middleware');
const { csrfProtection } = require('../middlewares/csrf.middleware');
const { requireManager, requireAdmin } = require('../middlewares/permissions.middleware');
const V      = require('../validators/notification.validators');
const svc    = require('../services/notification.service');
const ws     = require('../ws');

// Evitar que Express cachee respuestas de notificaciones (previene 304 con datos obsoletos)
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function userCtx(req) {
  return { roleName: req.user.roleName, userId: req.user.id };
}

// Notifica el badge. `audience` ({ targetRoles, isGlobal }) permite que clientes
// de otros roles ignoren el evento y no refetcheen su conteo.
async function broadcastCount(roleName, userId, since, audience = {}) {
  try {
    const count = await svc.countNew({ roleName, userId, since });
    ws.broadcast('NOTIFICATION_NEW', {
      count,
      targetRoles: audience.targetRoles || [],
      isGlobal: !!audience.isGlobal,
    });
  } catch {}
}

// ─── GET / ──────────────────────────────────────────────────────────────────
router.get('/', auth, V.listQuery, async (req, res) => {
  try {
    const { limit, skip, dateRange } = req.query;
    const data = await svc.listForUser({ ...userCtx(req), limit, skip, dateRange });
    res.json(data);
  } catch (err) {
    console.error('GET /notification:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /count ─────────────────────────────────────────────────────────────
router.get('/count', auth, async (req, res) => {
  try {
    const count = await svc.countNew({ ...userCtx(req), since: req.query.since });
    res.json({ count });
  } catch (err) {
    console.error('GET /notification/count:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST / ──────────────────────────────────────────────────────────────────
router.post('/', auth, csrfProtection, requireManager, V.createNotification, async (req, res) => {
  try {
    const { title, message, type, priority, targetRoles, isGlobal, expiresAt } = req.body;

    const notification = await svc.create({
      title: title.trim(),
      message: message.trim(),
      type, priority, targetRoles, isGlobal, expiresAt,
      createdBy:     req.user.id,
      createdByName: req.user.email,
    });

    broadcastCount(req.user.roleName, req.user.id, undefined, {
      targetRoles: notification.targetRoles, isGlobal: notification.isGlobal,
    });
    res.status(201).json(notification);
  } catch (err) {
    console.error('POST /notification:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /grouped ────────────────────────────────────────────────────────────
// Accesible a todos los roles autenticados (ventas, laboratorio, etc.)
// porque se llama desde el cliente después de acciones del negocio.
router.post('/grouped', auth, csrfProtection, V.createGrouped, async (req, res) => {
  try {
    const { groupKey, title, messageTemplate, type, priority, targetRoles, isGlobal } = req.body;

    // messageTemplate es un string con "{count}" como placeholder
    const template = (count) =>
      messageTemplate.replace(/\{count\}/g, count);

    const { notification, accumulated } = await svc.createOrAccumulate({
      groupKey,
      title:           title.trim(),
      messageTemplate: template,
      type:            type     ?? 'info',
      priority:        priority ?? 'medium',
      targetRoles:     targetRoles ?? [],
      isGlobal:        Boolean(isGlobal),
      createdBy:       req.user.id,
      createdByName:   req.user.email,
    });

    broadcastCount(req.user.roleName, req.user.id, undefined, {
      targetRoles: notification.targetRoles, isGlobal: notification.isGlobal,
    });
    res.status(accumulated ? 200 : 201).json(notification);
  } catch (err) {
    console.error('POST /notification/grouped:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



// ─── PATCH /:id/pin ──────────────────────────────────────────────────────────
router.patch('/:id/pin', auth, csrfProtection, V.idParam, async (req, res) => {
  try {
    const result = await svc.togglePin({
      notificationId: req.params.id,
      ...userCtx(req),
    });
    if (!result) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json(result);
  } catch (err) {
    console.error('PATCH /notification/:id/pin:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PATCH /:id/dismiss ───────────────────────────────────────────────────────
router.patch('/:id/dismiss', auth, csrfProtection, V.idParam, async (req, res) => {
  try {
    const result = await svc.dismiss({
      notificationId: req.params.id,
      ...userCtx(req),
    });
    if (!result) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json(result);
  } catch (err) {
    console.error('PATCH /notification/:id/dismiss:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PUT /:id ─────────────────────────────────────────────────────────────────
router.put('/:id', auth, csrfProtection, requireAdmin, V.updateNotification, async (req, res) => {
  try {
    const updated = await svc.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json(updated);
  } catch (err) {
    console.error('PUT /notification/:id:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────
router.delete('/:id', auth, csrfProtection, requireAdmin, V.idParam, async (req, res) => {
  try {
    const deleted = await svc.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /notification/:id:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
