/**
 * @fileoverview Rutas del catálogo de bases y tratamientos.
 *
 * GET  /api/catalog               → catálogo completo (público)
 * GET  /api/catalog/bases         → solo bases
 * GET  /api/catalog/treatments    → solo tratamientos
 * PUT  /api/catalog/bases/:key    → actualizar base (requiere admin JWT)
 * PUT  /api/catalog/treatments/:key → actualizar tratamiento (requiere admin JWT)
 * POST /api/catalog/bases         → crear base (requiere admin JWT)
 * POST /api/catalog/treatments    → crear tratamiento (requiere admin JWT)
 * DELETE /api/catalog/bases/:key    → eliminar base (requiere admin JWT)
 * DELETE /api/catalog/treatments/:key → eliminar tratamiento (requiere admin JWT)
 */

const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const CatalogBase      = require('../models/CatalogBase');
const CatalogTreatment = require('../models/CatalogTreatment');

const JWT_SECRET    = process.env.JWT_SECRET || 'dev_secret';
const ADMIN_ROLES   = ['root', 'eurovision'];

// ── Auth middleware (only for write operations) ──────────────────────────────
function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.auth_token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No autenticado' });
    const payload = jwt.verify(token, JWT_SECRET);
    if (!ADMIN_ROLES.includes(payload.roleName)) {
      return res.status(403).json({ error: 'Acceso restringido a administradores' });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ── GET /api/catalog ─────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const [bases, treatments] = await Promise.all([
      CatalogBase.find({ activo: true }).sort({ orden: 1 }).lean(),
      CatalogTreatment.find({ activo: true }).sort({ orden: 1 }).lean(),
    ]);
    res.json({ ok: true, data: { bases, treatments } });
  } catch (err) {
    console.error('GET /catalog:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /api/catalog/bases ───────────────────────────────────────────────────
router.get('/bases', async (_req, res) => {
  try {
    const bases = await CatalogBase.find({ activo: true }).sort({ orden: 1 }).lean();
    res.json({ ok: true, data: bases });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /api/catalog/treatments ──────────────────────────────────────────────
router.get('/treatments', async (_req, res) => {
  try {
    const treatments = await CatalogTreatment.find({ activo: true }).sort({ orden: 1 }).lean();
    res.json({ ok: true, data: treatments });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── POST /api/catalog/bases ──────────────────────────────────────────────────
router.post('/bases', requireAdmin, async (req, res) => {
  try {
    const base = await CatalogBase.create(req.body);
    res.status(201).json({ ok: true, data: base });
  } catch (err) {
    console.error('POST /catalog/bases:', err);
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/catalog/treatments ─────────────────────────────────────────────
router.post('/treatments', requireAdmin, async (req, res) => {
  try {
    const treatment = await CatalogTreatment.create(req.body);
    res.status(201).json({ ok: true, data: treatment });
  } catch (err) {
    console.error('POST /catalog/treatments:', err);
    res.status(400).json({ error: err.message });
  }
});

// ── PUT /api/catalog/bases/:key ───────────────────────────────────────────────
router.put('/bases/:key', requireAdmin, async (req, res) => {
  try {
    const allowed = ['label', 'tipo_matriz', 'orden', 'activo', 'materiales', 'tratamientos', 'materialTreatmentOverrides'];
    const updates = {};
    for (const k of allowed) {
      if (k in req.body) updates[k] = req.body[k];
    }
    const base = await CatalogBase.findOneAndUpdate({ key: req.params.key }, { $set: updates }, { new: true, runValidators: true });
    if (!base) return res.status(404).json({ error: 'Base no encontrada' });
    res.json({ ok: true, data: base });
  } catch (err) {
    console.error('PUT /catalog/bases/:key:', err);
    res.status(400).json({ error: err.message });
  }
});

// ── PUT /api/catalog/treatments/:key ─────────────────────────────────────────
router.put('/treatments/:key', requireAdmin, async (req, res) => {
  try {
    const allowed = ['label', 'orden', 'activo', 'variants', 'variantsByMaterial', 'allowedMaterials', 'allowedBases'];
    const updates = {};
    for (const k of allowed) {
      if (k in req.body) updates[k] = req.body[k];
    }
    const treatment = await CatalogTreatment.findOneAndUpdate({ key: req.params.key }, { $set: updates }, { new: true, runValidators: true });
    if (!treatment) return res.status(404).json({ error: 'Tratamiento no encontrado' });
    res.json({ ok: true, data: treatment });
  } catch (err) {
    console.error('PUT /catalog/treatments/:key:', err);
    res.status(400).json({ error: err.message });
  }
});

// ── DELETE /api/catalog/bases/:key ───────────────────────────────────────────
router.delete('/bases/:key', requireAdmin, async (req, res) => {
  try {
    const base = await CatalogBase.findOneAndUpdate({ key: req.params.key }, { $set: { activo: false } }, { new: true });
    if (!base) return res.status(404).json({ error: 'Base no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/catalog/treatments/:key ──────────────────────────────────────
router.delete('/treatments/:key', requireAdmin, async (req, res) => {
  try {
    const treatment = await CatalogTreatment.findOneAndUpdate({ key: req.params.key }, { $set: { activo: false } }, { new: true });
    if (!treatment) return res.status(404).json({ error: 'Tratamiento no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
