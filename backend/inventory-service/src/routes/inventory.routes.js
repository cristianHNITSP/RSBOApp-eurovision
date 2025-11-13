// routes/inventory.js
const express = require('express');
const router = express.Router();
const { body, param, validationResult, oneOf } = require('express-validator');

const InventorySheet     = require('../models/InventorySheet');
const InventoryChangeLog = require('../models/InventoryChangeLog');

// Matrices por tipo (1 doc por hoja)
const MatrixBase        = require('../models/matrix/MatrixBase');
const MatrixSphCyl      = require('../models/matrix/MatrixSphCyl');
const MatrixBifocal     = require('../models/matrix/MatrixBifocal');
const MatrixProgresivo  = require('../models/matrix/MatrixProgresivo');

/* ============================ HELPERS ============================ */
const to2   = (n) => Number(parseFloat(n).toFixed(2));
const isDef = (v) => v !== undefined && v !== null;

const actorFromBody = (req) => {
  const a = req?.body?.actor;
  return a && typeof a === 'object'
    ? { userId: isDef(a.userId) ? String(a.userId) : null, name: isDef(a.name) ? String(a.name) : null }
    : null;
};

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });
  next();
};

// Rango numérico (↑ o ↓) con paso decimal
const frange = (start, end, step) => {
  const out = [];
  if (!step) return out;
  const eps = 1e-9;
  if (start <= end) {
    for (let v = start; v <= end + eps; v += step) out.push(to2(v));
  } else {
    for (let v = start; v >= end - eps; v -= step) out.push(to2(v));
  }
  return out;
};

const shortId = (id) => String(id).slice(-6);
const normNum = (v) => v === null || v === undefined ? 'x'
  : (Number(v) < 0 ? `m${String(Math.abs(Number(v)).toFixed(2)).replace('.', 'd')}`
                   : String(Number(v).toFixed(2)).replace('.', 'd'));
const normStr = (s) => (s || 'x');
const makeSKU = (sheetId, tipo, coords = {}) => [
  `S${shortId(sheetId)}`,
  tipo,
  normNum(coords.sph),
  normNum(coords.cyl),
  normNum(coords.add),
  normNum(coords.base),
  normStr(coords.eye),
  `bi${normNum(coords.base_izq)}`,
  `bd${normNum(coords.base_der)}`
].join('-');

// Normalización/keys para Map
const denormNum = (s) => {
  if (s === 'x') return null;
  if (s.startsWith('m')) return -Number(s.slice(1).replace('d', '.'));
  return Number(s.replace('d', '.'));
};
const keyBase     = (base)                => `${normNum(base)}`;
const keySphCyl   = (sph, cyl)            => `${normNum(sph)}|${normNum(cyl)}`;
const keyBifocal  = (sph, add, bi, bd)    => `${normNum(sph)}|${normNum(add)}|${normNum(bi)}|${normNum(bd)}`;
const keyProg     = (bi, bd, add)         => `${normNum(bi)}|${normNum(bd)}|${normNum(add)}`;
const parseKey = (key) => key.split('|').map(denormNum);

/* ===== Tabs de ayuda para el front ===== */
const buildTabsForTipo = (tipo) => {
  switch (tipo) {
    case 'SPH_CYL':
      return [
        { id: 'sph-neg', label: 'SPH (-)', ranges: { sph: { start: 0.0,  end: -6.0, step: 0.25 }, cyl: { start: -6.0, end: 0.0, step: 0.25 } } },
        { id: 'sph-pos', label: 'SPH (+)', ranges: { sph: { start: 1.00, end:  6.0, step: 0.25 }, cyl: { start: -6.0, end: 0.0, step: 0.25 } } }
      ];
    case 'SPH_ADD':  // Bifocal
      return [
        { id: 'sph-neg', label: 'SPH (-)', ranges: { sph: { start: 0.0,  end: -6.0, step: 0.25 }, addCols: [1.00, 1.25, 1.50, 1.75, 2.00] } },
        { id: 'sph-pos', label: 'SPH (+)', ranges: { sph: { start: 1.00, end:  6.0, step: 0.25 }, addCols: [1.00, 1.25, 1.50, 1.75, 2.00] } }
      ];
    case 'BASE':
      return [];
    case 'BASE_ADD': // Progresivo
      return [
        { id: 'base-add', label: 'BASE / ADD +', ranges: { base: { start: 0, end: 8, step: 1 }, addCols: [0.75, 1.00, 1.25, 1.50, 1.75, 2.00] } }
      ];
    default:
      return [];
  }
};

/* ============== Seeds por tipo (Map en documentos Matrix*) ============== */

// Crea 1 celda raíz (mínimo) según tipo
const seedRootForSheet = async (sheet, actor) => {
  switch (sheet.tipo_matriz) {
    case 'BASE': {
      const doc = await MatrixBase.findOneAndUpdate(
        { sheet: sheet._id },
        { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'BASE', cells: new Map() } },
        { new: true, upsert: true }
      );
      const k = keyBase(0);
      if (!doc.cells?.has(k)) {
        doc.set('cells', doc.cells || new Map());
        doc.cells.set(k, {
          existencias: 0,
          sku: makeSKU(sheet._id, 'BASE', { base: 0 }),
          createdBy: actor, updatedBy: actor
        });
        doc.markModified('cells');
        await doc.save();
      }
      return doc;
    }
    case 'SPH_CYL': {
      const doc = await MatrixSphCyl.findOneAndUpdate(
        { sheet: sheet._id },
        { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'SPH_CYL', cells: new Map() } },
        { new: true, upsert: true }
      );
      const k = keySphCyl(0, 0);
      if (!doc.cells?.has(k)) {
        doc.set('cells', doc.cells || new Map());
        doc.cells.set(k, {
          existencias: 0,
          sku: makeSKU(sheet._id, 'SPH_CYL', { sph: 0, cyl: 0 }),
          createdBy: actor, updatedBy: actor
        });
        doc.markModified('cells');
        await doc.save();
      }
      return doc;
    }
    case 'SPH_ADD': {
      const doc = await MatrixBifocal.findOneAndUpdate(
        { sheet: sheet._id },
        { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'SPH_ADD', cells: new Map() } },
        { new: true, upsert: true }
      );
      const k = keyBifocal(0, 1.00, 0, 0);
      if (!doc.cells?.has(k)) {
        doc.set('cells', doc.cells || new Map());
        doc.cells.set(k, {
          base_izq: 0, base_der: 0,
          OD: { existencias: 0, sku: makeSKU(sheet._id, 'SPH_ADD', { sph: 0, add: 1.00, eye: 'OD', base_izq: 0, base_der: 0 }) },
          OI: { existencias: 0, sku: makeSKU(sheet._id, 'SPH_ADD', { sph: 0, add: 1.00, eye: 'OI', base_izq: 0, base_der: 0 }) },
          createdBy: actor, updatedBy: actor
        });
        doc.markModified('cells');
        await doc.save();
      }
      return doc;
    }
    case 'BASE_ADD': {
      const doc = await MatrixProgresivo.findOneAndUpdate(
        { sheet: sheet._id },
        { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'BASE_ADD', cells: new Map() } },
        { new: true, upsert: true }
      );
      const k = keyProg(0, 0, 1.00);
      if (!doc.cells?.has(k)) {
        doc.set('cells', doc.cells || new Map());
        doc.cells.set(k, {
          base_izq: 0, base_der: 0,
          OD: { existencias: 0, sku: makeSKU(sheet._id, 'BASE_ADD', { add: 1.00, eye: 'OD', base_izq: 0, base_der: 0 }) },
          OI: { existencias: 0, sku: makeSKU(sheet._id, 'BASE_ADD', { add: 1.00, eye: 'OI', base_izq: 0, base_der: 0 }) },
          createdBy: actor, updatedBy: actor
        });
        doc.markModified('cells');
        await doc.save();
      }
      return doc;
    }
  }
};

// Genera matriz completa con rangos por defecto
const seedFullForSheet = async (sheet, actor) => {
  const setActor = (cell) => Object.assign(cell, { createdBy: actor, updatedBy: actor });

  if (sheet.tipo_matriz === 'BASE') {
    const doc = await MatrixBase.findOneAndUpdate(
      { sheet: sheet._id },
      { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'BASE', cells: new Map() } },
      { new: true, upsert: true }
    );
    const baseVals = frange(0, 8, 1);
    doc.set('cells', doc.cells || new Map());
    baseVals.forEach((base) => {
      const k = keyBase(base);
      if (!doc.cells.has(k)) {
        doc.cells.set(k, setActor({
          existencias: 0,
          sku: makeSKU(sheet._id, 'BASE', { base })
        }));
      }
    });
    doc.markModified('cells');
    await doc.save();
    return { inserted: baseVals.length };
  }

  if (sheet.tipo_matriz === 'SPH_CYL') {
    const doc = await MatrixSphCyl.findOneAndUpdate(
      { sheet: sheet._id },
      { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'SPH_CYL', cells: new Map() } },
      { new: true, upsert: true }
    );

    // ⬇️ ahora incluye SPH positivos: [-6..0] ∪ [0.25..6]
    const sphVals = [...frange(-6, 0, 0.25), ...frange(0.25, 6, 0.25)];
    const cylVals = frange(-6, 0, 0.25); // deja CYL negativos por defecto

    doc.set('cells', doc.cells || new Map());
    let count = 0;
    for (const sph of sphVals) for (const cyl of cylVals) {
      const k = keySphCyl(sph, cyl);
      if (!doc.cells.has(k)) {
        doc.cells.set(k, setActor({
          existencias: 0,
          sku: makeSKU(sheet._id, 'SPH_CYL', { sph, cyl })
        }));
        count++;
      }
    }
    doc.markModified('cells');
    await doc.save();
    return { inserted: count };
  }

  if (sheet.tipo_matriz === 'SPH_ADD') {
    const doc = await MatrixBifocal.findOneAndUpdate(
      { sheet: sheet._id },
      { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'SPH_ADD', cells: new Map() } },
      { new: true, upsert: true }
    );

    // ⬇️ incluye SPH negativos y positivos
    const sphVals = [...frange(-6, 0, 0.25), ...frange(0.25, 6, 0.25)];
    const addVals = frange(1, 6, 0.25);

    doc.set('cells', doc.cells || new Map());
    let count = 0;
    for (const sph of sphVals) for (const add of addVals) {
      const bi = 0, bd = 0;
      const k = keyBifocal(sph, add, bi, bd);
      if (!doc.cells.has(k)) {
        doc.cells.set(k, setActor({
          base_izq: bi, base_der: bd,
          OD: { existencias: 0, sku: makeSKU(sheet._id, 'SPH_ADD', { sph, add, eye: 'OD', base_izq: bi, base_der: bd }) },
          OI: { existencias: 0, sku: makeSKU(sheet._id, 'SPH_ADD', { sph, add, eye: 'OI', base_izq: bi, base_der: bd }) }
        }));
        count++;
      }
    }
    doc.markModified('cells');
    await doc.save();
    return { inserted: count };
  }

  if (sheet.tipo_matriz === 'BASE_ADD') {
    const doc = await MatrixProgresivo.findOneAndUpdate(
      { sheet: sheet._id },
      { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'BASE_ADD', cells: new Map() } },
      { new: true, upsert: true }
    );
    const baseVals = frange(0, 8, 1);
    const addVals  = frange(0.75, 6, 0.25);
    doc.set('cells', doc.cells || new Map());
    let count = 0;
    for (const b of baseVals) for (const add of addVals) {
      const bi = b, bd = b;
      const k = keyProg(bi, bd, add);
      if (!doc.cells.has(k)) {
        doc.cells.set(k, setActor({
          base_izq: bi, base_der: bd,
          OD: { existencias: 0, sku: makeSKU(sheet._id, 'BASE_ADD', { add, eye: 'OD', base_izq: bi, base_der: bd }) },
          OI: { existencias: 0, sku: makeSKU(sheet._id, 'BASE_ADD', { add, eye: 'OI', base_izq: bi, base_der: bd }) }
        }));
        count++;
      }
    }
    doc.markModified('cells');
    await doc.save();
    return { inserted: count };
  }

  return { inserted: 0 };
};

/* ======================= ENDPOINTS SHEETS ======================= */

router.get('/', async (_req, res) => {
  try {
    const sheets = await InventorySheet.find().sort({ updatedAt: -1, createdAt: -1 });
    const data = sheets.map(s => ({ ...s.toObject(), tabs: buildTabsForTipo(s.tipo_matriz) }));
    res.json({ ok: true, data });
  } catch (err) {
    console.error('GET /inventory error:', err);
    res.status(500).json({ ok: false, message: 'Error al listar hojas' });
  }
});

router.post(
  '/sheets',
  oneOf([
    body('nombre').isString().trim().notEmpty(),
    body('name').isString().trim().notEmpty()
  ]),
  body('baseKey').isString().trim().notEmpty(),
  body('material').isString().trim().notEmpty(),
  body('tipo_matriz').isIn(['BASE', 'SPH_CYL', 'SPH_ADD', 'BASE_ADD']),
  body('tratamientos').optional().isArray(),
  body('actor').optional().isObject(),
  body('seed').optional().isBoolean(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const nombre = (req.body.nombre ?? req.body.name).trim();

      const sheet = await InventorySheet.create({
        nombre,
        baseKey: req.body.baseKey,
        material: req.body.material,
        tipo_matriz: req.body.tipo_matriz,
        tratamientos: req.body.tratamientos || [],
        rangos: req.body.rangos || req.body.rango || undefined,
        meta: req.body.meta || {},
        owner: actor,
        createdBy: actor,
        updatedBy: actor
      });

      const matrixDoc = await seedRootForSheet(sheet, actor);
      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: 'SHEET_CREATE',
        details: { nombre: sheet.nombre, matrixId: matrixDoc?._id || null },
        actor
      });

      let seedStats = { inserted: 0 };
      if (req.body.seed === true) {
        seedStats = await seedFullForSheet(sheet, actor);
        await InventoryChangeLog.create({
          sheet: sheet._id,
          tipo_matriz: sheet.tipo_matriz,
          type: 'SEED_GENERATE',
          details: { inserted: seedStats.inserted, defaults: true },
          actor
        });
      }

      res.status(201).json({ ok: true, data: { sheet, rootItem: null, tabs: buildTabsForTipo(sheet.tipo_matriz), seed: seedStats } });
    } catch (err) {
      console.error('POST /sheets error:', err);
      const details = err?.errors
        ? Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v?.message || String(v)]))
        : (err?.message || 'unknown');
      res.status(500).json({ ok: false, message: 'Error al crear hoja', details });
    }
  }
);

router.get('/sheets/:sheetId',
  param('sheetId').isMongoId(),
  handleValidation,
  async (req, res) => {
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: 'Sheet no existe' });
      res.json({ ok: true, data: { sheet, tabs: buildTabsForTipo(sheet.tipo_matriz) } });
    } catch (err) {
      console.error('GET /sheets/:sheetId error:', err);
      res.status(500).json({ ok: false, message: 'Error al obtener hoja' });
    }
  }
);

router.patch(
  '/sheets/:sheetId',
  param('sheetId').isMongoId(),
  oneOf([
    body('nombre').optional().isString().trim().notEmpty(),
    body('name').optional().isString().trim().notEmpty()
  ]),
  body('tratamientos').optional().isArray(),
  body('actor').optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: 'Sheet no existe' });

      const updates = { updatedBy: actor, updatedAt: new Date() };
      if (isDef(req.body.nombre) || isDef(req.body.name)) updates.nombre = (req.body.nombre ?? req.body.name).trim();
      if (isDef(req.body.tratamientos)) updates.tratamientos = req.body.tratamientos;
      if (isDef(req.body.rangos) || isDef(req.body.rango)) updates.rangos = req.body.rangos || req.body.rango;
      if (isDef(req.body.meta)) updates.meta = req.body.meta;

      const updated = await InventorySheet.findByIdAndUpdate(sheet._id, updates, { new: true });

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: 'SHEET_UPDATE',
        details: updates,
        actor
      });

      res.json({ ok: true, data: { sheet: updated, tabs: buildTabsForTipo(updated.tipo_matriz) } });
    } catch (err) {
      console.error('PATCH /sheets/:sheetId error:', err);
      res.status(500).json({ ok: false, message: 'Error al actualizar hoja' });
    }
  }
);

router.delete(
  '/sheets/:sheetId',
  param('sheetId').isMongoId(),
  body('actor').optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: 'Sheet no existe' });

      // Borra cualquier matriz asociada (solo habrá una, pero por robustez llamamos a todas)
      const [m1, m2, m3, m4] = await Promise.all([
        MatrixBase.deleteOne({ sheet: sheet._id }),
        MatrixSphCyl.deleteOne({ sheet: sheet._id }),
        MatrixBifocal.deleteOne({ sheet: sheet._id }),
        MatrixProgresivo.deleteOne({ sheet: sheet._id }),
      ]);

      await InventorySheet.deleteOne({ _id: sheet._id });

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: 'SHEET_DELETE',
        details: { deleted: { base: m1.deletedCount, sph_cyl: m2.deletedCount, bifocal: m3.deletedCount, progresivo: m4.deletedCount } },
        actor
      });

      res.json({ ok: true, message: 'Hoja eliminada' });
    } catch (err) {
      console.error('DELETE /sheets/:sheetId error:', err);
      res.status(500).json({ ok: false, message: 'Error al eliminar hoja' });
    }
  }
);

/* ======================= ENDPOINTS ITEMS (compat API) ======================= */

router.get(
  '/sheets/:sheetId/items',
  param('sheetId').isMongoId(),
  handleValidation,
  async (req, res) => {
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok:false, message:'Sheet no existe' });

      const limit = Math.min(Number(req.query.limit ?? 5000), 20000);

      // BASE
      if (sheet.tipo_matriz === 'BASE') {
        const doc = await MatrixBase.findOne({ sheet: sheet._id });
        const baseMin = Number(req.query.baseMin ?? -1e6);
        const baseMax = Number(req.query.baseMax ??  +1e6);
        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const base = denormNum(k);
            if (base >= baseMin && base <= baseMax) {
              rows.push({ sheet: sheet._id, tipo_matriz: 'BASE', base, existencias: cell.existencias, sku: cell.sku });
            }
          }
        }
        rows = rows.sort((a,b)=>a.base-b.base).slice(0, limit);
        return res.json({ ok: true, data: rows });
      }

      // SPH_CYL
      if (sheet.tipo_matriz === 'SPH_CYL') {
        const doc = await MatrixSphCyl.findOne({ sheet: sheet._id });
        const sphMin = Number(req.query.sphMin ?? -6);
        const sphMax = Number(req.query.sphMax ??  6); // ⬅️ incluye positivos por defecto
        const cylMin = Number(req.query.cylMin ?? -6);
        const cylMax = Number(req.query.cylMax ??  0); // CYL negativos por defecto
        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const [sph, cyl] = parseKey(k);
            if (sph>=sphMin && sph<=sphMax && cyl>=cylMin && cyl<=cylMax) {
              rows.push({ sheet: sheet._id, tipo_matriz: 'SPH_CYL', sph, cyl, existencias: cell.existencias, sku: cell.sku });
            }
          }
        }
        rows = rows.sort((a,b)=> a.sph===b.sph ? a.cyl-b.cyl : a.sph-b.sph).slice(0, limit);
        return res.json({ ok: true, data: rows });
      }

      // SPH_ADD (Bifocal)
      if (sheet.tipo_matriz === 'SPH_ADD') {
        const doc = await MatrixBifocal.findOne({ sheet: sheet._id });
        const sphMin = Number(req.query.sphMin ?? -6);
        const sphMax = Number(req.query.sphMax ??  6); // por defecto mira hasta +6
        const addMin = Number(req.query.addMin ??  1.00);
        const addMax = Number(req.query.addMax ??  6.00);
        const eyes   = String(req.query.eyes ?? 'OD,OI').split(',').map(s=>s.trim().toUpperCase());
        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const [sph, add, bi, bd] = parseKey(k);
            if (sph>=sphMin && sph<=sphMax && add>=addMin && add<=addMax) {
              if (eyes.includes('OD')) rows.push({ sheet: sheet._id, tipo_matriz:'SPH_ADD', sph, add, eye:'OD', base_izq:bi, base_der:bd, existencias: cell.OD?.existencias ?? 0, sku: cell.OD?.sku });
              if (eyes.includes('OI')) rows.push({ sheet: sheet._id, tipo_matriz:'SPH_ADD', sph, add, eye:'OI', base_izq:bi, base_der:bd, existencias: cell.OI?.existencias ?? 0, sku: cell.OI?.sku });
            }
          }
        }
        rows = rows.sort((a,b)=> a.sph===b.sph ? (a.add===b.add ? a.eye.localeCompare(b.eye) : a.add-b.add) : a.sph-b.sph).slice(0, limit);
        return res.json({ ok: true, data: rows });
      }

      // BASE_ADD (Progresivo)
      if (sheet.tipo_matriz === 'BASE_ADD') {
        const doc = await MatrixProgresivo.findOne({ sheet: sheet._id });
        const addMin = Number(req.query.addMin ?? 0.75);
        const addMax = Number(req.query.addMax ?? 6.00);
        const eyes   = String(req.query.eyes ?? 'OD,OI').split(',').map(s=>s.trim().toUpperCase());
        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const [bi, bd, add] = parseKey(k);
            if (add>=addMin && add<=addMax) {
              if (eyes.includes('OD')) rows.push({ sheet: sheet._id, tipo_matriz:'BASE_ADD', add, eye:'OD', base_izq:bi, base_der:bd, existencias: cell.OD?.existencias ?? 0, sku: cell.OD?.sku });
              if (eyes.includes('OI')) rows.push({ sheet: sheet._id, tipo_matriz:'BASE_ADD', add, eye:'OI', base_izq:bi, base_der:bd, existencias: cell.OI?.existencias ?? 0, sku: cell.OI?.sku });
            }
          }
        }
        rows = rows.sort((a,b)=> a.add===b.add ? a.eye.localeCompare(b.eye) : a.add-b.add).slice(0, limit);
        return res.json({ ok: true, data: rows });
      }

      return res.json({ ok: true, data: [] });
    } catch (err) {
      console.error('GET /sheets/:sheetId/items error:', err);
      res.status(500).json({ ok:false, message:'Error al listar items' });
    }
  }
);

// Reseed opcional para completar datos por defecto
router.post(
  '/sheets/:sheetId/seed',
  param('sheetId').isMongoId(),
  body('actor').optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok:false, message:'Sheet no existe' });
      const stats = await seedFullForSheet(sheet, actor);
      await InventoryChangeLog.create({
        sheet: sheet._id, tipo_matriz: sheet.tipo_matriz,
        type: 'SEED_GENERATE', details: { inserted: stats.inserted, defaults: true }, actor
      });
      res.json({ ok:true, data: stats });
    } catch (err) {
      console.error('POST /sheets/:sheetId/seed error:', err);
      res.status(500).json({ ok:false, message:'Error al generar seed' });
    }
  }
);

router.post(
  '/sheets/:sheetId/chunk',
  param('sheetId').isMongoId(),
  body('rows').isArray({ min: 1 }),
  body('actor').optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok:false, message:'Sheet no existe' });

      const rows = req.body.rows || [];
      let upserts = 0;

      const touch = (field) => (doc) => { doc.markModified(field); return doc; };

      if (sheet.tipo_matriz === 'BASE') {
        const doc = await MatrixBase.findOneAndUpdate(
          { sheet: sheet._id },
          { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'BASE', cells: new Map() } },
          { new: true, upsert: true }
        );
        doc.set('cells', doc.cells || new Map());
        for (const r of rows) {
          const base = to2(r.base);
          const k = keyBase(base);
          const existencias = Number(r.existencias ?? 0);
          const prev = doc.cells.get(k) || {};
          doc.cells.set(k, {
            existencias,
            sku: prev.sku || makeSKU(sheet._id, 'BASE', { base }),
            updatedBy: actor
          });
          upserts++;
        }
        touch('cells')(doc);
        await doc.save();
      }

      if (sheet.tipo_matriz === 'SPH_CYL') {
        const doc = await MatrixSphCyl.findOneAndUpdate(
          { sheet: sheet._id },
          { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'SPH_CYL', cells: new Map() } },
          { new: true, upsert: true }
        );
        doc.set('cells', doc.cells || new Map());
        for (const r of rows) {
          const sph = to2(r.sph), cyl = to2(r.cyl);
          const k = keySphCyl(sph, cyl);
          const existencias = Number(r.existencias ?? 0);
          const prev = doc.cells.get(k) || {};
          doc.cells.set(k, {
            existencias,
            sku: prev.sku || makeSKU(sheet._id, 'SPH_CYL', { sph, cyl }),
            updatedBy: actor
          });
          upserts++;
        }
        touch('cells')(doc);
        await doc.save();
      }

      if (sheet.tipo_matriz === 'SPH_ADD') {
        const doc = await MatrixBifocal.findOneAndUpdate(
          { sheet: sheet._id },
          { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'SPH_ADD', cells: new Map() } },
          { new: true, upsert: true }
        );
        doc.set('cells', doc.cells || new Map());
        for (const r of rows) {
          const sph = to2(r.sph), add = to2(r.add);
          const eye = String(r.eye || 'OD').toUpperCase();
          const bi  = to2(r.base_izq ?? 0), bd = to2(r.base_der ?? 0);
          const k = keyBifocal(sph, add, bi, bd);
          const existencias = Number(r.existencias ?? 0);
          const prev = doc.cells.get(k) || { base_izq: bi, base_der: bd, OD: {}, OI: {} };
          const next = {
            base_izq: bi, base_der: bd,
            OD: prev.OD || {},
            OI: prev.OI || {},
            updatedBy: actor
          };
          next[eye] = {
            existencias,
            sku: (prev[eye]?.sku) || makeSKU(sheet._id, 'SPH_ADD', { sph, add, eye, base_izq: bi, base_der: bd })
          };
          doc.cells.set(k, next);
          upserts++;
        }
        touch('cells')(doc);
        await doc.save();
      }

      if (sheet.tipo_matriz === 'BASE_ADD') {
        const doc = await MatrixProgresivo.findOneAndUpdate(
          { sheet: sheet._id },
          { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'BASE_ADD', cells: new Map() } },
          { new: true, upsert: true }
        );
        doc.set('cells', doc.cells || new Map());
        for (const r of rows) {
          const add = to2(r.add);
          const eye = String(r.eye || 'OD').toUpperCase();
          const bi  = to2(r.base_izq ?? 0), bd = to2(r.base_der ?? 0);
          const k = keyProg(bi, bd, add);
          const existencias = Number(r.existencias ?? 0);
          const prev = doc.cells.get(k) || { base_izq: bi, base_der: bd, OD: {}, OI: {} };
          const next = {
            base_izq: bi, base_der: bd,
            OD: prev.OD || {},
            OI: prev.OI || {},
            updatedBy: actor
          };
          next[eye] = {
            existencias,
            sku: (prev[eye]?.sku) || makeSKU(sheet._id, 'BASE_ADD', { add, eye, base_izq: bi, base_der: bd })
          };
          doc.cells.set(k, next);
          upserts++;
        }
        touch('cells')(doc);
        await doc.save();
      }

      await InventoryChangeLog.create({
        sheet: sheet._id, tipo_matriz: sheet.tipo_matriz,
        type: 'BULK_UPSERT_MATRIX', details: { count: upserts }, actor
      });

      res.json({ ok: true, data: { upserted: upserts } });
    } catch (err) {
      console.error('POST /sheets/:sheetId/chunk error:', err);
      res.status(500).json({ ok:false, message:'Error al guardar chunk' });
    }
  }
);

module.exports = router;
