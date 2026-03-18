/**
 * @fileoverview Rutas de notificaciones
 *
 * GET    /                → lista notificaciones del usuario (todos los roles)
 * GET    /unread          → conteo de no leídas (todos los roles)
 * POST   /                → crear (root, eurovision, supervisor)
 * POST   /grouped         → crear o acumular agrupada (todos los roles autenticados)
 * PATCH  /read-all        → marcar todas como leídas (todos los roles)
 * PATCH  /:id/read        → marcar una como leída (todos los roles)
 * PUT    /:id             → actualizar (root, eurovision)
 * DELETE /:id             → eliminar (root, eurovision)
 *
 * @module routes/notification
 */

const router = require('express').Router();
const auth   = require('../middlewares/auth.middleware');
const { requireManager, requireAdmin } = require('../middlewares/permissions.middleware');
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

async function broadcastUnread(roleName, userId) {
  try {
    const count = await svc.countUnread({ roleName, userId });
    ws.broadcast('NOTIFICATION_NEW', { unread: count });
  } catch {}
}

// ─── GET / ──────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { limit, skip } = req.query;
    const data = await svc.listForUser({ ...userCtx(req), limit, skip });
    res.json(data);
  } catch (err) {
    console.error('GET /notification:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /unread ─────────────────────────────────────────────────────────────
router.get('/unread', auth, async (req, res) => {
  try {
    const count = await svc.countUnread(userCtx(req));
    res.json({ unread: count });
  } catch (err) {
    console.error('GET /notification/unread:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST / ──────────────────────────────────────────────────────────────────
router.post('/', auth, requireManager, async (req, res) => {
  try {
    const { title, message, type, priority, targetRoles, isGlobal, expiresAt } = req.body;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'title y message son obligatorios' });
    }

    const notification = await svc.create({
      title: title.trim(),
      message: message.trim(),
      type, priority, targetRoles, isGlobal, expiresAt,
      createdBy:     req.user.id,
      createdByName: req.user.email,
    });

    broadcastUnread(req.user.roleName, req.user.id);
    res.status(201).json(notification);
  } catch (err) {
    console.error('POST /notification:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /grouped ────────────────────────────────────────────────────────────
// Accesible a todos los roles autenticados (ventas, laboratorio, etc.)
// porque se llama desde el cliente después de acciones del negocio.
router.post('/grouped', auth, async (req, res) => {
  try {
    const { groupKey, title, messageTemplate, type, priority, targetRoles, isGlobal } = req.body;

    if (!title?.trim() || !messageTemplate?.trim()) {
      return res.status(400).json({ error: 'title y messageTemplate son obligatorios' });
    }

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

    broadcastUnread(req.user.roleName, req.user.id);
    res.status(accumulated ? 200 : 201).json(notification);
  } catch (err) {
    console.error('POST /notification/grouped:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PATCH /read-all ─────────────────────────────────────────────────────────
router.patch('/read-all', auth, async (req, res) => {
  try {
    const result = await svc.markAllRead(userCtx(req));
    res.json(result);
  } catch (err) {
    console.error('PATCH /notification/read-all:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PATCH /:id/read ─────────────────────────────────────────────────────────
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await svc.markRead({
      notificationId: req.params.id,
      ...userCtx(req),
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada o no disponible para tu rol' });
    }

    res.json(notification);
  } catch (err) {
    console.error('PATCH /notification/:id/read:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PATCH /:id/pin ──────────────────────────────────────────────────────────
router.patch('/:id/pin', auth, async (req, res) => {
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
router.patch('/:id/dismiss', auth, async (req, res) => {
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
router.put('/:id', auth, requireAdmin, async (req, res) => {
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
router.delete('/:id', auth, requireAdmin, async (req, res) => {
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
