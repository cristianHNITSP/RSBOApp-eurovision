const express = require('express');
const router = express.Router();
const { body, param, query, validationResult, oneOf } = require('express-validator');
const mongoose = require('mongoose');

const InventorySheet = require('../models/InventorySheet');
const InventoryItem = require('../models/InventoryItem');
const InventoryChangeLog = require('../models/InventoryChangeLog');

/* ============================ HELPERS ============================ */
const to2 = (n) => Number(parseFloat(n).toFixed(2));
const asNum2 = (v) => (v === '' || v === null || v === undefined ? null : to2(v));
const isDef = (v) => v !== undefined && v !== null;

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });
  next();
};

// EAN-13 básico
const isEAN13 = (code) => {
  if (typeof code !== 'string' || !/^\d{13}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const checksum = digits.pop();
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const calc = (10 - (sum % 10)) % 10;
  return calc === checksum;
};

// SKU estable a partir de sheet/tipo y coordenadas
const norm = (v) => (v === null || v === undefined) ? 'x' : to2(v).toFixed(2).replace('-', 'm').replace('.', 'd');
const makeSKU = (sheetId, tipo, { sph, cyl, add, base }) =>
  `S${String(sheetId).slice(-6)}-${tipo}-${norm(sph)}-${norm(cyl)}-${norm(add)}-${norm(base)}`;

/* ===== Tabs compatibles con tus vistas (cálculo on-the-fly) ===== */
const buildTabsForTipo = (tipo) => {
  switch (tipo) {
    case 'SPH_CYL':
      return [
        { id: 'sph-neg', label: 'SPH (-)', ranges: { sph: { start: 0.0, end: -6.0, step: 0.25 }, cyl: { start: -2.0, end: 0.0, step: 0.25 } } },
        { id: 'sph-pos', label: 'SPH (+)', ranges: { sph: { start: 0.25, end: 6.0, step: 0.25 },  cyl: { start: -2.0, end: 0.0, step: 0.25 } } }
      ];
    case 'SPH_ADD':
      return [
        { id: 'sph-neg', label: 'SPH (-)', ranges: { sph: { start: 0.0, end: -6.0, step: 0.25 }, addCols: [1.00, 1.25, 1.50, 1.75, 2.00] } },
        { id: 'sph-pos', label: 'SPH (+)', ranges: { sph: { start: 0.25, end: 6.0, step: 0.25 }, addCols: [1.00, 1.25, 1.50, 1.75, 2.00] } }
      ];
    case 'BASE':
      return [];
    case 'BASE_ADD':
      return [
        { id: 'base-add', label: 'BASE / ADD +', ranges: { base: { start: 0, end: 10, step: 1 }, addCols: [0.75, 1.00, 1.25, 1.50, 1.75, 2.00] } }
      ];
    default:
      return [];
  }
};

/* ========= Semilla pequeña opcional al crear HOJA ========= */
const seedChunkForSheet = async (sheet) => {
  const tipo = sheet.tipo_matriz;
  const docs = [];
  const put = (coords) => {
    const full = {
      sheet: sheet._id,
      tipo_matriz: tipo,
      sph: asNum2(coords.sph ?? null),
      cyl: asNum2(coords.cyl ?? null),
      add: asNum2(coords.add ?? null),
      base: asNum2(coords.base ?? null),
      existencias: 0
    };
    full.sku = makeSKU(sheet._id, tipo, full);
    docs.push(full);
  };

  if (tipo === 'BASE') {
    [2, 4, 6, 8].forEach((b) => put({ base: b }));
  }

  if (tipo === 'SPH_CYL') {
    const sphStart = 0.0, sphEnd = -1.0, sphStep = 0.25;
    const cylStart = -2.0, cylEnd = 0.0, cylStep = 0.25;
    for (let s = sphStart; s >= sphEnd - 1e-9; s -= sphStep) {
      for (let c = cylStart; c <= cylEnd + 1e-9; c += cylStep) {
        put({ sph: s, cyl: c });
      }
    }
  }

  if (tipo === 'SPH_ADD') {
    const sphStart = 0.0, sphEnd = -1.0, sphStep = 0.25;
    const addCols = [1.00, 1.25, 1.50];
    for (let s = sphStart; s >= sphEnd - 1e-9; s -= sphStep) {
      for (const a of addCols) {
        put({ sph: s, add: a });
      }
    }
  }

  if (tipo === 'BASE_ADD') {
    const bases = [0, 1, 2, 3];
    const addCols = [0.75, 1.00, 1.25];
    bases.forEach((b) => addCols.forEach((a) => put({ base: b, add: a })));
  }

  if (!docs.length) return { inserted: 0 };
  const result = await InventoryItem.insertMany(docs, { ordered: false });

  await InventoryChangeLog.create({
    sheet: sheet._id,
    tipo_matriz: tipo,
    type: 'SEED_GENERATE',
    details: { count: result.length, tipo }
  });

  return { inserted: result.length };
};

/* ======================= ENDPOINTS ======================= */

/** GET /api/inventory → resumen de hojas */
router.get('/', async (_req, res) => {
  try {
    const sheets = await InventorySheet.aggregate([
      { $lookup: { from: 'inventoryitems', localField: '_id', foreignField: 'sheet', as: 'items' } },
      { $project: {
        nombre: 1, baseKey: 1, material: 1, tratamientos: 1, tipo_matriz: 1,
        createdAt: 1, updatedAt: 1,
        itemCount: { $size: '$items' }
      }},
      { $sort: { updatedAt: -1, createdAt: -1 } }
    ]);

    const data = sheets.map(s => ({ ...s, tabs: buildTabsForTipo(s.tipo_matriz) }));
    res.json({ ok: true, data });
  } catch (err) {
    console.error('GET /inventory error:', err);
    res.status(500).json({ ok: false, message: 'Error al listar hojas' });
  }
});

/** POST /api/inventory/chunk → upsert por volúmenes */
router.post(
  '/chunk',
  body('sheetId').isMongoId(),
  body('rows').isArray({ min: 1 }),
  handleValidation,
  async (req, res) => {
    const { sheetId, rows } = req.body;

    try {
      const sheet = await InventorySheet.findById(sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: 'Sheet no existe' });

      if (rows.length > 5000) {
        return res.status(413).json({ ok: false, message: 'Demasiados registros en un chunk (máximo 5000)' });
      }

      const bulkOps = [];
      const logs = [];

      for (const raw of rows) {
        const doc = {
          sheet: sheet._id,
          tipo_matriz: sheet.tipo_matriz,
          sph: asNum2(raw.sph),
          cyl: asNum2(raw.cyl),
          add: asNum2(raw.add),
          base: asNum2(raw.base),
        };

        // Debe venir SPH (SPH_CYL/SPH_ADD) o BASE (BASE/BASE_ADD)
        if (!isDef(doc.sph) && !isDef(doc.base)) continue;

        if (isDef(raw.existencias)) doc.existencias = Number(raw.existencias);
        if (isDef(raw.barcode)) doc.barcode = String(raw.barcode);
        if (isDef(raw.barcodeType)) doc.barcodeType = String(raw.barcodeType);

        doc.sku = makeSKU(sheet._id, sheet.tipo_matriz, doc);

        const filter = {
          sheet: sheet._id,
          sph: doc.sph, cyl: doc.cyl, add: doc.add, base: doc.base
        };

        const now = new Date();
        const $set = { ...doc, updatedAt: now };
        const $setOnInsert = { ...doc, createdAt: now };

        bulkOps.push({
          updateOne: {
            filter,
            update: { $set, $setOnInsert },
            upsert: true
          }
        });

        logs.push({
          sheet: sheet._id,
          tipo_matriz: sheet.tipo_matriz,
          type: 'UPSERT_CHUNK',
          details: { filter, values: doc }
        });
      }

      let inserted = 0, modified = 0, matched = 0;
      if (bulkOps.length) {
        const result = await InventoryItem.bulkWrite(bulkOps, { ordered: false });
        inserted = result.upsertedCount || 0;
        modified = result.modifiedCount || 0;
        matched = result.matchedCount || 0;

        if (logs.length) await InventoryChangeLog.insertMany(logs);
        await InventorySheet.findByIdAndUpdate(sheet._id, { updatedAt: new Date() });
      }

      res.json({ ok: true, stats: { inserted, modified, matched } });
    } catch (err) {
      console.error('POST /inventory/chunk error:', err);
      res.status(500).json({ ok: false, message: 'Error en upsert por volúmenes' });
    }
  }
);

/* ============================== SHEETS ============================== */

/** POST /api/inventory/sheets → crea hoja y opcional semilla */
router.post(
  '/sheets',
  oneOf([
    body('nombre').isString().trim().notEmpty(),
    body('name').isString().trim().notEmpty()
  ], 'Se requiere "nombre" (o "name")'),
  body('baseKey').isString().trim().notEmpty(),
  body('material').isString().trim().notEmpty(),
  body('tipo_matriz').isIn(['BASE', 'SPH_CYL', 'SPH_ADD', 'BASE_ADD']),
  body('tratamientos').optional().isArray(),
  body('autoGenerate').optional().isBoolean(),
  handleValidation,
  async (req, res) => {
    try {
      const nombre = (req.body.nombre ?? req.body.name).trim();

      const sheet = await InventorySheet.create({
        nombre,
        baseKey: req.body.baseKey,
        material: req.body.material,
        tipo_matriz: req.body.tipo_matriz,
        tratamientos: req.body.tratamientos || [],
        rangos: req.body.rangos || req.body.rango || undefined,
        meta: req.body.meta || {}
      });

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: 'SHEET_CREATE',
        details: { nombre: sheet.nombre, tipo_matriz: sheet.tipo_matriz }
      });

      const tabs = buildTabsForTipo(sheet.tipo_matriz);

      let seedStats = { inserted: 0 };
      if (req.body.autoGenerate !== false) {
        seedStats = await seedChunkForSheet(sheet);
      }

      res.status(201).json({ ok: true, data: { sheet, tabs, seed: seedStats } });
    } catch (err) {
      console.error('POST /sheets error:', err);
      const details = err?.errors
        ? Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v?.message || String(v)]))
        : (err?.message || 'unknown');
      res.status(500).json({ ok: false, message: 'Error al crear hoja', details });
    }
  }
);

/** GET /api/inventory/sheets */
router.get('/sheets', async (_req, res) => {
  try {
    const sheets = await InventorySheet.find().sort({ updatedAt: -1, createdAt: -1 });
    const withTabs = sheets.map(s => ({ ...s.toObject(), tabs: buildTabsForTipo(s.tipo_matriz) }));
    res.json({ ok: true, data: withTabs });
  } catch (err) {
    console.error('GET /sheets error:', err);
    res.status(500).json({ ok: false, message: 'Error al listar hojas' });
  }
});

/** GET /api/inventory/sheets/:sheetId */
router.get('/sheets/:sheetId', param('sheetId').isMongoId(), handleValidation, async (req, res) => {
  try {
    const sheet = await InventorySheet.findById(req.params.sheetId);
    if (!sheet) return res.status(404).json({ ok: false, message: 'Sheet no existe' });
    res.json({ ok: true, data: { sheet, tabs: buildTabsForTipo(sheet.tipo_matriz) } });
  } catch (err) {
    console.error('GET /sheets/:sheetId error:', err);
    res.status(500).json({ ok: false, message: 'Error al obtener hoja' });
  }
});

/** PATCH /api/inventory/sheets/:sheetId → actualizar metadatos */
router.patch(
  '/sheets/:sheetId',
  param('sheetId').isMongoId(),
  oneOf([
    body('nombre').optional().isString().trim().notEmpty(),
    body('name').optional().isString().trim().notEmpty()
  ]),
  body('tratamientos').optional().isArray(),
  handleValidation,
  async (req, res) => {
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: 'Sheet no existe' });

      const updates = { updatedAt: new Date() };
      if (isDef(req.body.nombre) || isDef(req.body.name)) updates.nombre = (req.body.nombre ?? req.body.name).trim();
      if (isDef(req.body.tratamientos)) updates.tratamientos = req.body.tratamientos;
      if (isDef(req.body.rangos) || isDef(req.body.rango)) updates.rangos = req.body.rangos || req.body.rango;
      if (isDef(req.body.meta)) updates.meta = req.body.meta;

      const updated = await InventorySheet.findByIdAndUpdate(sheet._id, updates, { new: true });

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: updated.tipo_matriz,
        type: 'SHEET_UPDATE',
        details: updates
      });

      res.json({ ok: true, data: { sheet: updated, tabs: buildTabsForTipo(updated.tipo_matriz) } });
    } catch (err) {
      console.error('PATCH /sheets/:sheetId error:', err);
      res.status(500).json({ ok: false, message: 'Error al actualizar hoja' });
    }
  }
);

/** DELETE /api/inventory/sheets/:sheetId */
router.delete('/sheets/:sheetId', param('sheetId').isMongoId(), handleValidation, async (req, res) => {
  try {
    const sheet = await InventorySheet.findById(req.params.sheetId);
    if (!sheet) return res.status(404).json({ ok: false, message: 'Sheet no existe' });

    const delItems = await InventoryItem.deleteMany({ sheet: sheet._id });
    await InventorySheet.deleteOne({ _id: sheet._id });

    await InventoryChangeLog.create({
      sheet: sheet._id,
      tipo_matriz: sheet.tipo_matriz,
      type: 'SHEET_DELETE',
      details: { itemsDeleted: delItems.deletedCount }
    });

    res.json({ ok: true, message: 'Hoja eliminada', itemsDeleted: delItems.deletedCount });
  } catch (err) {
    console.error('DELETE /sheets/:sheetId error:', err);
    res.status(500).json({ ok: false, message: 'Error al eliminar hoja' });
  }
});

/** POST /api/inventory/sheets/:sheetId/chunk → alias de /chunk */
router.post(
  '/sheets/:sheetId/chunk',
  param('sheetId').isMongoId(),
  body('rows').isArray({ min: 1 }),
  handleValidation,
  async (req, res) => {
    req.body.sheetId = req.params.sheetId;
    const route = router.stack.find(r => r.route?.path === '/chunk' && r.route.methods.post);
    const handler = route.route.stack[1].handle;
    return handler(req, res);
  }
);

/* =============================== ITEMS =============================== */

/** GET /api/inventory/sheets/:sheetId/items */
router.get(
  '/sheets/:sheetId/items',
  param('sheetId').isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  handleValidation,
  async (req, res) => {
    try {
      const { sheetId } = req.params;
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '100', 10);

      const q = { sheet: sheetId };

      for (const k of ['sph', 'cyl', 'add', 'base']) {
        const minK = req.query[`${k}Min`];
        const maxK = req.query[`${k}Max`];
        if (isDef(minK) || isDef(maxK)) {
          q[k] = {};
          if (isDef(minK)) q[k].$gte = to2(minK);
          if (isDef(maxK)) q[k].$lte = to2(maxK);
        }
      }
      if (req.query.sphSign === 'neg') q.sph = { ...(q.sph || {}), $lte: 0 };
      if (req.query.sphSign === 'pos') q.sph = { ...(q.sph || {}), $gt: 0 };

      const [items, total] = await Promise.all([
        InventoryItem.find(q).sort({ sph: 1, cyl: 1, add: 1, base: 1 }).skip((page - 1) * limit).limit(limit),
        InventoryItem.countDocuments(q),
      ]);

      res.json({ ok: true, page, limit, total, data: items });
    } catch (err) {
      console.error('GET /sheets/:sheetId/items error:', err);
      res.status(500).json({ ok: false, message: 'Error al listar items' });
    }
  }
);

/** GET /api/inventory/items → búsqueda global por sheet o barcode */
router.get('/items', async (req, res) => {
  try {
    const q = {};
    if (req.query.sheetId && mongoose.Types.ObjectId.isValid(req.query.sheetId)) q.sheet = req.query.sheetId;
    if (req.query.barcode) q.barcode = String(req.query.barcode);

    const items = await InventoryItem.find(q).limit(500).sort({ updatedAt: -1 });
    res.json({ ok: true, data: items });
  } catch (err) {
    console.error('GET /items error:', err);
    res.status(500).json({ ok: false, message: 'Error al buscar items' });
  }
});

/** PATCH /api/inventory/items/:itemId */
router.patch(
  '/items/:itemId',
  param('itemId').isMongoId(),
  body('existencias').optional().isInt({ min: 0 }),
  body('barcode').optional().isString(),
  body('barcodeType').optional().isString(),
  handleValidation,
  async (req, res) => {
    try {
      const item = await InventoryItem.findById(req.params.itemId);
      if (!item) return res.status(404).json({ ok: false, message: 'Item no existe' });

      const updates = { updatedAt: new Date() };
      if (isDef(req.body.existencias)) updates.existencias = Number(req.body.existencias);

      if (isDef(req.body.barcode)) {
        const code = String(req.body.barcode);
        if (code && !isEAN13(code)) return res.status(400).json({ ok: false, message: 'barcode no es EAN-13 válido' });
        updates.barcode = code || null;
      }
      if (isDef(req.body.barcodeType)) updates.barcodeType = String(req.body.barcodeType);

      const updated = await InventoryItem.findByIdAndUpdate(item._id, updates, { new: true });

      await InventoryChangeLog.create({
        sheet: item.sheet,
        item: item._id,
        tipo_matriz: updated.tipo_matriz,
        type: 'ITEM_PATCH',
        details: updates
      });

      res.json({ ok: true, data: updated });
    } catch (err) {
      console.error('PATCH /items/:itemId error:', err);
      res.status(500).json({ ok: false, message: 'Error al actualizar item' });
    }
  }
);

/** DELETE /api/inventory/items/:itemId */
router.delete('/items/:itemId', param('itemId').isMongoId(), handleValidation, async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.itemId);
    if (!item) return res.status(404).json({ ok: false, message: 'Item no existe' });

    await InventoryItem.deleteOne({ _id: item._id });

    await InventoryChangeLog.create({
      sheet: item.sheet,
      item: item._id,
      tipo_matriz: item.tipo_matriz,
      type: 'ITEM_DELETE',
      details: { sph: item.sph, cyl: item.cyl, add: item.add, base: item.base }
    });

    res.json({ ok: true, message: 'Item eliminado' });
  } catch (err) {
    console.error('DELETE /items/:itemId error:', err);
    res.status(500).json({ ok: false, message: 'Error al eliminar item' });
  }
});

/* ================================ LOGS ================================ */

/** GET /api/inventory/sheets/:sheetId/logs */
router.get('/sheets/:sheetId/logs', param('sheetId').isMongoId(), handleValidation, async (req, res) => {
  try {
    const logs = await InventoryChangeLog.find({ sheet: req.params.sheetId }).sort({ createdAt: -1 }).limit(500);
    res.json({ ok: true, data: logs });
  } catch (err) {
    console.error('GET /sheets/:sheetId/logs error:', err);
    res.status(500).json({ ok: false, message: 'Error al listar logs' });
  }
});

/** GET /api/inventory/logs → global */
router.get('/logs', async (req, res) => {
  try {
    const q = {};
    if (req.query.sheetId && mongoose.Types.ObjectId.isValid(req.query.sheetId)) q.sheet = req.query.sheetId;
    if (req.query.itemId && mongoose.Types.ObjectId.isValid(req.query.itemId)) q.item = req.query.itemId;
    if (req.query.type) q.type = String(req.query.type);

    const logs = await InventoryChangeLog.find(q).sort({ createdAt: -1 }).limit(500);
    res.json({ ok: true, data: logs });
  } catch (err) {
    console.error('GET /logs error:', err);
    res.status(500).json({ ok: false, message: 'Error al listar logs' });
  }
});

module.exports = router;
