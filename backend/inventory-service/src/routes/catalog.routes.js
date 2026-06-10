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
const { protect } = require('../utils/auth');
const { csrfProtection } = require('../middlewares/csrf.middleware');
const { body, runValidation } = require('../validators/_helpers');

const CatalogBase = require('../models/CatalogBase');
const CatalogTreatment = require('../models/CatalogTreatment');
const InventorySheet = require('../models/InventorySheet');
const ContactLensesSheet = require('../models/ContactLensesSheet');

const ADMIN_ROLES = ['root', 'eurovision'];
const TIPO_MATRIZ = ['BASE', 'SPH_CYL', 'SPH_ADD', 'BASE_ADD'];

// ── Auth middleware (only for write operations) ──────────────────────────────
const requireAdmin = protect(ADMIN_ROLES);

// ── Whitelists anti mass-assignment ──────────────────────────────────────────
const BASE_FIELDS = ['key', 'label', 'tipo_matriz', 'orden', 'activo', 'materiales', 'tratamientos', 'materialTreatmentOverrides'];
const BASE_UPDATE_FIELDS = BASE_FIELDS.filter((f) => f !== 'key');
const TREATMENT_FIELDS = ['key', 'label', 'orden', 'activo', 'variants', 'variantsByMaterial', 'allowedMaterials', 'allowedBases'];
const TREATMENT_UPDATE_FIELDS = TREATMENT_FIELDS.filter((f) => f !== 'key');
const pick = (src, fields) => fields.reduce((o, f) => (f in src ? ((o[f] = src[f]), o) : o), {});

const validateBase = [
  body('key').exists().withMessage('key requerido').bail().isString().trim().isLength({ min: 1, max: 60 }),
  body('label').optional().isString().trim().isLength({ max: 120 }),
  body('tipo_matriz').optional().isIn(TIPO_MATRIZ).withMessage('tipo_matriz inválido'),
  body('orden').optional().isInt({ min: 0 }),
  body('activo').optional().isBoolean(),
  runValidation,
];

const validateTreatment = [
  body('key').exists().withMessage('key requerido').bail().isString().trim().isLength({ min: 1, max: 60 }),
  body('label').exists().withMessage('label requerido').bail().isString().trim().isLength({ min: 1, max: 120 }),
  body('orden').optional().isInt({ min: 0 }),
  body('activo').optional().isBoolean(),
  runValidation,
];

// ── GET /api/catalog ─────────────────────────────────────────────────────────
router.get('/', protect(), async (_req, res) => {
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
router.get('/bases', protect(), async (_req, res) => {
  try {
    const bases = await CatalogBase.find({ activo: true }).sort({ orden: 1 }).lean();
    res.json({ ok: true, data: bases });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /api/catalog/treatments ──────────────────────────────────────────────
router.get('/treatments', protect(), async (_req, res) => {
  try {
    const treatments = await CatalogTreatment.find({ activo: true }).sort({ orden: 1 }).lean();
    res.json({ ok: true, data: treatments });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /api/catalog/vendors ─────────────────────────────────────────────────
router.get('/vendors', protect(), async (req, res) => {
  const { type } = req.query;
  try {
    const tasks = [];
    if (!type || type === 'inventory') {
      tasks.push(InventorySheet.distinct('proveedor.name', { 'proveedor.name': { $ne: null, $ne: '' } }));
      tasks.push(InventorySheet.distinct('marca.name', { 'marca.name': { $ne: null, $ne: '' } }));
    } else {
      tasks.push(Promise.resolve([]), Promise.resolve([]));
    }
    if (!type || type === 'contactlenses') {
      tasks.push(ContactLensesSheet.distinct('proveedor.name', { 'proveedor.name': { $ne: null, $ne: '' } }));
      tasks.push(ContactLensesSheet.distinct('marca.name', { 'marca.name': { $ne: null, $ne: '' } }));
    } else {
      tasks.push(Promise.resolve([]), Promise.resolve([]));
    }

    const [invProv, invMarca, clProv, clMarca] = await Promise.all(tasks);

    const normalizeNames = (arrList) => {
      const set = new Set();
      for (const arr of arrList) {
        if (!Array.isArray(arr)) continue;
        for (const name of arr) {
          if (name && typeof name === 'string') {
            const pretty = name.trim();
            if (pretty) set.add(pretty);
          }
        }
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    };

    const proveedores = normalizeNames([invProv, clProv]);
    const marcas = normalizeNames([invMarca, clMarca]);
    res.json({ ok: true, data: { proveedores, marcas } });
  } catch (err) {
    console.error('GET /catalog/vendors:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── POST /api/catalog/bases ──────────────────────────────────────────────────
router.post('/bases', requireAdmin, csrfProtection, validateBase, async (req, res) => {
  try {
    // Whitelist anti mass-assignment (no se pasa req.body crudo a create)
    const base = await CatalogBase.create(pick(req.body, BASE_FIELDS));
    res.status(201).json({ ok: true, data: base });
  } catch (err) {
    console.error('POST /catalog/bases:', err);
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/catalog/treatments ─────────────────────────────────────────────
router.post('/treatments', requireAdmin, csrfProtection, validateTreatment, async (req, res) => {
  try {
    const treatment = await CatalogTreatment.create(pick(req.body, TREATMENT_FIELDS));
    res.status(201).json({ ok: true, data: treatment });
  } catch (err) {
    console.error('POST /catalog/treatments:', err);
    res.status(400).json({ error: err.message });
  }
});

// ── PUT /api/catalog/bases/:key ───────────────────────────────────────────────
router.put('/bases/:key', requireAdmin, csrfProtection, async (req, res) => {
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
router.put('/treatments/:key', requireAdmin, csrfProtection, async (req, res) => {
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
router.delete('/bases/:key', requireAdmin, csrfProtection, async (req, res) => {
  try {
    const base = await CatalogBase.findOneAndUpdate({ key: req.params.key }, { $set: { activo: false } }, { new: true });
    if (!base) return res.status(404).json({ error: 'Base no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/catalog/treatments/:key ──────────────────────────────────────
router.delete('/treatments/:key', requireAdmin, csrfProtection, async (req, res) => {
  try {
    const treatment = await CatalogTreatment.findOneAndUpdate({ key: req.params.key }, { $set: { activo: false } }, { new: true });
    if (!treatment) return res.status(404).json({ error: 'Tratamiento no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
