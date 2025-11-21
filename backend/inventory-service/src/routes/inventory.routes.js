// src/routes/inventory.routes.js
const express = require('express');
const router = express.Router();
const { body, param, validationResult, oneOf } = require('express-validator');

const InventorySheet = require('../models/InventorySheet');
const InventoryChangeLog = require('../models/InventoryChangeLog');

// Matrices por tipo (1 doc por hoja)
const MatrixBase = require('../models/matrix/MatrixBase');
const MatrixSphCyl = require('../models/matrix/MatrixSphCyl');
const MatrixBifocal = require('../models/matrix/MatrixBifocal');
const MatrixProgresivo = require('../models/matrix/MatrixProgresivo');

/* ============================ HELPERS ============================ */

const to2 = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
};
const isDef = (v) => v !== undefined && v !== null;

const actorFromBody = (req) => {
  const a = req?.body?.actor;
  return a && typeof a === 'object'
    ? {
      userId: isDef(a.userId) ? String(a.userId) : null,
      name: isDef(a.name) ? String(a.name) : null
    }
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

// Normalización numérica para keys
const normNum = (v) =>
  v === null || v === undefined
    ? 'x'
    : (Number(v) < 0
      ? `m${String(Math.abs(Number(v)).toFixed(2)).replace('.', 'd')}`
      : String(Number(v).toFixed(2)).replace('.', 'd'));

const normStr = (s) => (s || 'x');

const denormNum = (s) => {
  if (s === 'x') return null;
  if (s.startsWith('m')) return -Number(s.slice(1).replace('d', '.'));
  return Number(s.replace('d', '.'));
};

const keyBase = (base) => `${normNum(base)}`;
const keySphCyl = (sph, cyl) => `${normNum(sph)}|${normNum(cyl)}`;
const keyBifocal = (sph, add, bi, bd) => `${normNum(sph)}|${normNum(add)}|${normNum(bi)}|${normNum(bd)}`;
const keyProg = (bi, bd, add) => `${normNum(bi)}|${normNum(bd)}|${normNum(add)}`;

const parseKey = (key) => key.split('|').map(denormNum);

/* ====== Generador de SKU (para búsquedas internas) ====== */

const fmt2 = (n) =>
  n === null || n === undefined || Number.isNaN(Number(n))
    ? 'x'
    : Number(n).toFixed(2);

const makeSku = (sheetId, tipo, coords = {}) => {
  // SKU legible y estable por tipo + coordenadas
  switch (tipo) {
    case 'BASE':
      return `BASE:${fmt2(coords.base)}`;
    case 'SPH_CYL':
      return `SPH:${fmt2(coords.sph)}|CYL:${fmt2(coords.cyl)}`;
    case 'SPH_ADD': // Bifocal
      return `BIF:SPH:${fmt2(coords.sph)}|ADD:${fmt2(coords.add)}|EYE:${coords.eye || 'OD'}|BI:${fmt2(
        coords.base_izq
      )}|BD:${fmt2(coords.base_der)}`;
    case 'BASE_ADD': // Progresivo
      return `PROG:BI:${fmt2(coords.base_izq)}|BD:${fmt2(coords.base_der)}|ADD:${fmt2(
        coords.add
      )}|EYE:${coords.eye || 'OD'}`;
    default:
      return `SKU:${tipo || 'X'}|${fmt2(coords.sph)}|${fmt2(coords.cyl)}|${fmt2(coords.add)}`;
  }
};

/* ====== Generador de CODEBAR (EAN-13 estable) ====== */

const BARCODE_PREFIX = '279'; // prefijo interno proveedor

const hashToDigits = (str, length) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  let body = String(hash);
  if (body.length > length) {
    body = body.slice(-length);
  } else if (body.length < length) {
    body = body.padStart(length, '0');
  }
  return body;
};

const ean13CheckDigit = (body12) => {
  const digits = body12.split('').map((d) => parseInt(d, 10) || 0);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const mod = sum % 10;
  return (10 - mod) % 10;
};

const makeCodebar = (sheetId, tipo, coords = {}) => {
  const core = [
    String(sheetId),
    tipo,
    normNum(coords.sph),
    normNum(coords.cyl),
    normNum(coords.add),
    normNum(coords.base),
    normStr(coords.eye),
    normNum(coords.base_izq),
    normNum(coords.base_der)
  ].join('|');

  const numericPart = hashToDigits(core, 12 - BARCODE_PREFIX.length);
  const body12 = `${BARCODE_PREFIX}${numericPart}`;
  const checkDigit = ean13CheckDigit(body12);
  return `${body12}${checkDigit}`; // 13 dígitos
};

/* ===== Límites físicos de dioptrías (muy amplios pero realistas) ===== */

const PHYSICAL_LIMITS = {
  BASE: { min: -40, max: 40 }, // curva base / potencia base
  SPH: { min: -40, max: 40 },
  CYL: { min: -15, max: 15 },
  ADD: { min: 0, max: 8 }
};

const clampRange = (rawMin, rawMax, physical) => {
  let lo = Number(rawMin);
  let hi = Number(rawMax);

  if (!Number.isFinite(lo)) lo = physical.min;
  if (!Number.isFinite(hi)) hi = physical.max;

  const min = Math.max(physical.min, lo);
  const max = Math.min(physical.max, hi);

  if (min > max) return null;
  return { min, max };
};

const isMultipleOfStep = (value, step) => {
  if (!Number.isFinite(value)) return false;
  const factor = Math.round(value / step);
  const diff = Math.abs(factor * step - value);
  return diff < 1e-6;
};

/* ===== Rangos por defecto por tipo (uso interno para seed/items/tabs) ===== */

const defaultRangesByTipo = {
  BASE: {
    base: {
      start: PHYSICAL_LIMITS.BASE.min,
      end: PHYSICAL_LIMITS.BASE.max,
      step: 1
    }
  },
  SPH_CYL: {
    sph: {
      start: PHYSICAL_LIMITS.SPH.min,
      end: PHYSICAL_LIMITS.SPH.max,
      step: 0.25
    },
    cyl: {
      start: PHYSICAL_LIMITS.CYL.min,
      end: PHYSICAL_LIMITS.CYL.max,
      step: 0.25
    }
  },
  SPH_ADD: {
    sph: {
      start: PHYSICAL_LIMITS.SPH.min,
      end: PHYSICAL_LIMITS.SPH.max,
      step: 0.25
    },
    add: {
      start: PHYSICAL_LIMITS.ADD.min,
      end: PHYSICAL_LIMITS.ADD.max,
      step: 0.25
    }
  },
  BASE_ADD: {
    base: {
      start: PHYSICAL_LIMITS.BASE.min,
      end: PHYSICAL_LIMITS.BASE.max,
      step: 1
    },
    add: {
      start: PHYSICAL_LIMITS.ADD.min,
      end: PHYSICAL_LIMITS.ADD.max,
      step: 0.25
    }
  }
};


/* ===== Tabs de ayuda para el front (solo usan defaults) ===== */
const buildTabsForTipo = (sheetOrTipo) => {
  if (!sheetOrTipo) return [];

  const tipo = typeof sheetOrTipo === 'string'
    ? sheetOrTipo
    : sheetOrTipo.tipo_matriz;

  if (!tipo) return [];

  const def = defaultRangesByTipo[tipo] || {};
  const ranges = {
    base: def.base || null,
    sph: def.sph || null,
    cyl: def.cyl || null,
    add: def.add || null
  };

  switch (tipo) {
    case 'SPH_CYL': {
      if (!ranges.sph || !ranges.cyl) return [];
      const sphNegEnd = Math.min(0, ranges.sph.end);
      const sphPosStart = Math.max(0, ranges.sph.start);
      return [
        {
          id: 'sph-neg',
          label: 'SPH (-)',
          ranges: {
            sph: { start: ranges.sph.start, end: sphNegEnd, step: ranges.sph.step },
            cyl: { ...ranges.cyl }
          }
        },
        {
          id: 'sph-pos',
          label: 'SPH (+)',
          ranges: {
            sph: { start: sphPosStart, end: ranges.sph.end, step: ranges.sph.step },
            cyl: { ...ranges.cyl }
          }
        }
      ];
    }
    case 'SPH_ADD': { // Bifocal
      if (!ranges.sph || !ranges.add) return [];
      const sphNegEnd = Math.min(0, ranges.sph.end);
      const sphPosStart = Math.max(0, ranges.sph.start);
      const addCols = frange(ranges.add.start, ranges.add.end, ranges.add.step);
      return [
        {
          id: 'sph-neg',
          label: 'SPH (-)',
          ranges: {
            sph: { start: ranges.sph.start, end: sphNegEnd, step: ranges.sph.step },
            addCols
          }
        },
        {
          id: 'sph-pos',
          label: 'SPH (+)',
          ranges: {
            sph: { start: sphPosStart, end: ranges.sph.end, step: ranges.sph.step },
            addCols
          }
        }
      ];
    }
    case 'BASE':
      // Sin tabs internas, pero los rangos se usan para seed/items
      return [];
    case 'BASE_ADD': { // Progresivo
      if (!ranges.base || !ranges.add) return [];
      return [
        {
          id: 'base-add',
          label: 'BASE / ADD +',
          ranges: {
            base: { ...ranges.base },
            addCols: frange(ranges.add.start, ranges.add.end, ranges.add.step)
          }
        }
      ];
    }
    default:
      return [];
  }
};

/* ============== Seeds por tipo (Map en documentos Matrix*) ============== */

// Crea 1 celda raíz (mínimo) según tipo (existencias 0, codebar null, sku generado)
const seedRootForSheet = async (sheet, actor) => {
  switch (sheet.tipo_matriz) {
    case 'BASE': {
      const doc = await MatrixBase.findOneAndUpdate(
        { sheet: sheet._id },
        { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'BASE', cells: new Map() } },
        { new: true, upsert: true }
      );
      const base = 0;
      const k = keyBase(base);
      doc.set('cells', doc.cells || new Map());
      if (!doc.cells.has(k)) {
        doc.cells.set(k, {
          existencias: 0,
          sku: makeSku(sheet._id, 'BASE', { base }),
          codebar: null,
          createdBy: actor,
          updatedBy: actor
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
      const sph = 0;
      const cyl = 0;
      const k = keySphCyl(sph, cyl);
      doc.set('cells', doc.cells || new Map());
      if (!doc.cells.has(k)) {
        doc.cells.set(k, {
          existencias: 0,
          sku: makeSku(sheet._id, 'SPH_CYL', { sph, cyl }),
          codebar: null,
          createdBy: actor,
          updatedBy: actor
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
      const sph = 0;
      const add = 1.0;
      const bi = 0;
      const bd = 0;
      const k = keyBifocal(sph, add, bi, bd);
      doc.set('cells', doc.cells || new Map());
      if (!doc.cells.has(k)) {
        doc.cells.set(k, {
          base_izq: bi,
          base_der: bd,
          OD: {
            existencias: 0,
            sku: makeSku(sheet._id, 'SPH_ADD', { sph, add, eye: 'OD', base_izq: bi, base_der: bd }),
            codebar: null
          },
          OI: {
            existencias: 0,
            sku: makeSku(sheet._id, 'SPH_ADD', { sph, add, eye: 'OI', base_izq: bi, base_der: bd }),
            codebar: null
          },
          createdBy: actor,
          updatedBy: actor
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
      const bi = 0;
      const bd = 0;
      const add = 1.0;
      const k = keyProg(bi, bd, add);
      doc.set('cells', doc.cells || new Map());
      if (!doc.cells.has(k)) {
        doc.cells.set(k, {
          base_izq: bi,
          base_der: bd,
          OD: {
            existencias: 0,
            sku: makeSku(sheet._id, 'BASE_ADD', { add, eye: 'OD', base_izq: bi, base_der: bd }),
            codebar: null
          },
          OI: {
            existencias: 0,
            sku: makeSku(sheet._id, 'BASE_ADD', { add, eye: 'OI', base_izq: bi, base_der: bd }),
            codebar: null
          },
          createdBy: actor,
          updatedBy: actor
        });
        doc.markModified('cells');
        await doc.save();
      }
      return doc;
    }
  }
};

// Genera matriz completa usando SOLO rangos por defecto (no lee sheet.rangos)
const seedFullForSheet = async (sheet, actor) => {
  const setBaseCell = (cell) =>
    Object.assign(cell, { createdBy: actor, updatedBy: actor });

  const tipo = sheet.tipo_matriz;

  if (tipo === 'BASE') {
    const doc = await MatrixBase.findOneAndUpdate(
      { sheet: sheet._id },
      { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'BASE', cells: new Map() } },
      { new: true, upsert: true }
    );
    const rBase = defaultRangesByTipo.BASE.base;
    const baseRange = clampRange(rBase.start, rBase.end, PHYSICAL_LIMITS.BASE);
    if (!baseRange) return { inserted: 0 };

    const baseVals = frange(baseRange.min, baseRange.max, rBase.step);
    doc.set('cells', doc.cells || new Map());
    baseVals.forEach((base) => {
      const k = keyBase(base);
      if (!doc.cells.has(k)) {
        doc.cells.set(
          k,
          setBaseCell({
            existencias: 0,
            sku: makeSku(sheet._id, 'BASE', { base }),
            codebar: null
          })
        );
      }
    });
    doc.markModified('cells');
    await doc.save();
    return { inserted: baseVals.length };
  }

  if (tipo === 'SPH_CYL') {
    const doc = await MatrixSphCyl.findOneAndUpdate(
      { sheet: sheet._id },
      { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'SPH_CYL', cells: new Map() } },
      { new: true, upsert: true }
    );

    const rSph = defaultRangesByTipo.SPH_CYL.sph;
    const rCyl = defaultRangesByTipo.SPH_CYL.cyl;

    const sphRange = clampRange(rSph.start, rSph.end, PHYSICAL_LIMITS.SPH);
    const cylRange = clampRange(rCyl.start, rCyl.end, PHYSICAL_LIMITS.CYL);
    if (!sphRange || !cylRange) return { inserted: 0 };

    const sphVals = frange(sphRange.min, sphRange.max, rSph.step);
    const cylVals = frange(cylRange.min, cylRange.max, rCyl.step);

    doc.set('cells', doc.cells || new Map());
    let count = 0;
    for (const sph of sphVals) {
      for (const cyl of cylVals) {
        const k = keySphCyl(sph, cyl);
        if (!doc.cells.has(k)) {
          doc.cells.set(
            k,
            setBaseCell({
              existencias: 0,
              sku: makeSku(sheet._id, 'SPH_CYL', { sph, cyl }),
              codebar: null
            })
          );
          count++;
        }
      }
    }
    doc.markModified('cells');
    await doc.save();
    return { inserted: count };
  }

  if (tipo === 'SPH_ADD') {
    const doc = await MatrixBifocal.findOneAndUpdate(
      { sheet: sheet._id },
      { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'SPH_ADD', cells: new Map() } },
      { new: true, upsert: true }
    );

    const rSph = defaultRangesByTipo.SPH_ADD.sph;
    const rAdd = defaultRangesByTipo.SPH_ADD.add;

    const sphRange = clampRange(rSph.start, rSph.end, PHYSICAL_LIMITS.SPH);
    const addRange = clampRange(rAdd.start, rAdd.end, PHYSICAL_LIMITS.ADD);
    if (!sphRange || !addRange) return { inserted: 0 };

    const sphVals = frange(sphRange.min, sphRange.max, rSph.step);
    const addVals = frange(addRange.min, addRange.max, rAdd.step);

    doc.set('cells', doc.cells || new Map());
    let count = 0;
    for (const sph of sphVals) {
      for (const add of addVals) {
        const bi = 0;
        const bd = 0;
        const k = keyBifocal(sph, add, bi, bd);
        if (!doc.cells.has(k)) {
          doc.cells.set(
            k,
            setBaseCell({
              base_izq: bi,
              base_der: bd,
              OD: {
                existencias: 0,
                sku: makeSku(sheet._id, 'SPH_ADD', { sph, add, eye: 'OD', base_izq: bi, base_der: bd }),
                codebar: null
              },
              OI: {
                existencias: 0,
                sku: makeSku(sheet._id, 'SPH_ADD', { sph, add, eye: 'OI', base_izq: bi, base_der: bd }),
                codebar: null
              }
            })
          );
          count++;
        }
      }
    }
    doc.markModified('cells');
    await doc.save();
    return { inserted: count };
  }

  if (tipo === 'BASE_ADD') {
    const doc = await MatrixProgresivo.findOneAndUpdate(
      { sheet: sheet._id },
      { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'BASE_ADD', cells: new Map() } },
      { new: true, upsert: true }
    );
    const rBase = defaultRangesByTipo.BASE_ADD.base;
    const rAdd = defaultRangesByTipo.BASE_ADD.add;

    const baseRange = clampRange(rBase.start, rBase.end, PHYSICAL_LIMITS.BASE);
    const addRange = clampRange(rAdd.start, rAdd.end, PHYSICAL_LIMITS.ADD);
    if (!baseRange || !addRange) return { inserted: 0 };

    const baseVals = frange(baseRange.min, baseRange.max, rBase.step);
    const addVals = frange(addRange.min, addRange.max, rAdd.step);

    doc.set('cells', doc.cells || new Map());
    let count = 0;
    for (const b of baseVals) {
      for (const add of addVals) {
        const bi = b;
        const bd = b;
        const k = keyProg(bi, bd, add);
        if (!doc.cells.has(k)) {
          doc.cells.set(k, {
            base_izq: bi,
            base_der: bd,
            OD: {
              existencias: 0,
              sku: makeSku(sheet._id, 'BASE_ADD', { add, eye: 'OD', base_izq: bi, base_der: bd }),
              codebar: null
            },
            OI: {
              existencias: 0,
              sku: makeSku(sheet._id, 'BASE_ADD', { add, eye: 'OI', base_izq: bi, base_der: bd }),
              codebar: null
            },
            createdBy: actor,
            updatedBy: actor
          });
          count++;
        }
      }
    }
    doc.markModified('cells');
    await doc.save();
    return { inserted: count };
  }

  return { inserted: 0 };
};

/* ========== Validación y helpers para /chunk (guardar cambios) ========== */

const validateChunkRows = (tipo, rows) => {
  const errors = [];

  rows.forEach((row, index) => {
    const path = `rows[${index}]`;

    const ex = row.existencias;
    if (ex !== undefined && ex !== null) {
      const exNum = Number(ex);
      if (!Number.isFinite(exNum) || exNum < 0) {
        errors.push({
          path: `${path}.existencias`,
          msg: 'existencias debe ser numérico >= 0'
        });
      }
    }

    if (tipo === 'BASE') {
      if (!isDef(row.base) || !Number.isFinite(Number(row.base))) {
        errors.push({ path: `${path}.base`, msg: 'base numérica requerida' });
      } else {
        const baseVal = to2(row.base);
        if (baseVal < PHYSICAL_LIMITS.BASE.min || baseVal > PHYSICAL_LIMITS.BASE.max) {
          errors.push({
            path: `${path}.base`,
            msg: `base fuera de límites físicos (${PHYSICAL_LIMITS.BASE.min} a ${PHYSICAL_LIMITS.BASE.max} D)`
          });
        }
      }
    }

    if (tipo === 'SPH_CYL') {
      if (!isDef(row.sph) || !Number.isFinite(Number(row.sph))) {
        errors.push({ path: `${path}.sph`, msg: 'sph numérico requerido' });
      } else {
        const sphVal = to2(row.sph);
        if (sphVal < PHYSICAL_LIMITS.SPH.min || sphVal > PHYSICAL_LIMITS.SPH.max) {
          errors.push({
            path: `${path}.sph`,
            msg: `sph fuera de límites físicos (${PHYSICAL_LIMITS.SPH.min} a ${PHYSICAL_LIMITS.SPH.max} D)`
          });
        }
        if (!isMultipleOfStep(sphVal, 0.25)) {
          errors.push({
            path: `${path}.sph`,
            msg: 'sph debe ir en pasos de 0.25 D'
          });
        }
      }

      if (!isDef(row.cyl) || !Number.isFinite(Number(row.cyl))) {
        errors.push({ path: `${path}.cyl`, msg: 'cyl numérico requerido' });
      } else {
        const cylVal = to2(row.cyl);
        if (cylVal < PHYSICAL_LIMITS.CYL.min || cylVal > PHYSICAL_LIMITS.CYL.max) {
          errors.push({
            path: `${path}.cyl`,
            msg: `cyl fuera de límites físicos (${PHYSICAL_LIMITS.CYL.min} a ${PHYSICAL_LIMITS.CYL.max} D)`
          });
        }
        if (!isMultipleOfStep(cylVal, 0.25)) {
          errors.push({
            path: `${path}.cyl`,
            msg: 'cyl debe ir en pasos de 0.25 D'
          });
        }
      }
    }

    if (tipo === 'SPH_ADD') {
      if (!isDef(row.sph) || !Number.isFinite(Number(row.sph))) {
        errors.push({ path: `${path}.sph`, msg: 'sph numérico requerido' });
      } else {
        const sphVal = to2(row.sph);
        if (sphVal < PHYSICAL_LIMITS.SPH.min || sphVal > PHYSICAL_LIMITS.SPH.max) {
          errors.push({
            path: `${path}.sph`,
            msg: `sph fuera de límites físicos (${PHYSICAL_LIMITS.SPH.min} a ${PHYSICAL_LIMITS.SPH.max} D)`
          });
        }
        if (!isMultipleOfStep(sphVal, 0.25)) {
          errors.push({
            path: `${path}.sph`,
            msg: 'sph debe ir en pasos de 0.25 D'
          });
        }
      }

      if (!isDef(row.add) || !Number.isFinite(Number(row.add))) {
        errors.push({ path: `${path}.add`, msg: 'add numérico requerido' });
      } else {
        const addVal = to2(row.add);
        if (addVal < PHYSICAL_LIMITS.ADD.min || addVal > PHYSICAL_LIMITS.ADD.max) {
          errors.push({
            path: `${path}.add`,
            msg: `add fuera de límites físicos (${PHYSICAL_LIMITS.ADD.min} a ${PHYSICAL_LIMITS.ADD.max} D)`
          });
        }
        if (!isMultipleOfStep(addVal, 0.25)) {
          errors.push({
            path: `${path}.add`,
            msg: 'add debe ir en pasos de 0.25 D'
          });
        }
      }

      const eye = String(row.eye || '').toUpperCase();
      if (!['OD', 'OI'].includes(eye)) {
        errors.push({ path: `${path}.eye`, msg: 'eye debe ser OD u OI' });
      }

      // Bases opcionales pero dentro de rango físico si vienen
      ['base_izq', 'base_der'].forEach((field) => {
        if (isDef(row[field])) {
          const num = Number(row[field]);
          if (!Number.isFinite(num)) {
            errors.push({ path: `${path}.${field}`, msg: `${field} numérico inválido` });
          } else if (num < PHYSICAL_LIMITS.BASE.min || num > PHYSICAL_LIMITS.BASE.max) {
            errors.push({
              path: `${path}.${field}`,
              msg: `${field} fuera de límites físicos (${PHYSICAL_LIMITS.BASE.min} a ${PHYSICAL_LIMITS.BASE.max} D)`
            });
          }
        }
      });
    }

    if (tipo === 'BASE_ADD') {
      if (!isDef(row.add) || !Number.isFinite(Number(row.add))) {
        errors.push({ path: `${path}.add`, msg: 'add numérico requerido' });
      } else {
        const addVal = to2(row.add);
        if (addVal < PHYSICAL_LIMITS.ADD.min || addVal > PHYSICAL_LIMITS.ADD.max) {
          errors.push({
            path: `${path}.add`,
            msg: `add fuera de límites físicos (${PHYSICAL_LIMITS.ADD.min} a ${PHYSICAL_LIMITS.ADD.max} D)`
          });
        }
        if (!isMultipleOfStep(addVal, 0.25)) {
          errors.push({
            path: `${path}.add`,
            msg: 'add debe ir en pasos de 0.25 D'
          });
        }
      }

      const eye = String(row.eye || '').toUpperCase();
      if (!['OD', 'OI'].includes(eye)) {
        errors.push({ path: `${path}.eye`, msg: 'eye debe ser OD u OI' });
      }

      // base, base_izq, base_der opcionales pero dentro de rango físico si vienen
      ['base', 'base_izq', 'base_der'].forEach((field) => {
        if (isDef(row[field])) {
          const num = Number(row[field]);
          if (!Number.isFinite(num)) {
            errors.push({ path: `${path}.${field}`, msg: `${field} numérico inválido` });
          } else if (num < PHYSICAL_LIMITS.BASE.min || num > PHYSICAL_LIMITS.BASE.max) {
            errors.push({
              path: `${path}.${field}`,
              msg: `${field} fuera de límites físicos (${PHYSICAL_LIMITS.BASE.min} a ${PHYSICAL_LIMITS.BASE.max} D)`
            });
          }
        }
      });
    }
  });

  return errors;
};

const applyChunkBase = async (sheet, rows, actor) => {
  const doc = await MatrixBase.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'BASE', cells: new Map() } },
    { new: true, upsert: true }
  );

  doc.set('cells', doc.cells || new Map());
  let updated = 0;

  for (const row of rows) {
    const base = to2(row.base);
    const existencias = Number(row.existencias ?? 0);
    const k = keyBase(base);

    const current =
      doc.cells.get(k) || {
        existencias: 0,
        sku: makeSku(sheet._id, 'BASE', { base }),
        codebar: null,
        createdBy: actor,
        updatedBy: actor
      };

    const prev = Number(current.existencias ?? 0);
    if (prev === existencias && current.codebar) {
      // Nada cambió en existencias y ya tenía codebar
      continue;
    }

    current.existencias = existencias;

    // 🔹 SKU siempre estable (se crea si no existe)
    if (!current.sku) {
      current.sku = makeSku(sheet._id, 'BASE', { base });
    }

    // 🔹 Codebar sólo se genera cuando hay existencias > 0
    if (existencias > 0 && !current.codebar) {
      current.codebar = makeCodebar(sheet._id, 'BASE', { base });
    }

    current.updatedBy = actor;
    if (!current.createdBy) current.createdBy = actor;

    doc.cells.set(k, current);
    updated++;
  }

  doc.markModified('cells');
  await doc.save();
  return { updated };
};

const applyChunkSphCyl = async (sheet, rows, actor) => {
  const doc = await MatrixSphCyl.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'SPH_CYL', cells: new Map() } },
    { new: true, upsert: true }
  );

  doc.set('cells', doc.cells || new Map());
  let updated = 0;

  for (const row of rows) {
    const sph = to2(row.sph);
    const cyl = to2(row.cyl);
    const existencias = Number(row.existencias ?? 0);
    const k = keySphCyl(sph, cyl);

    const current =
      doc.cells.get(k) || {
        existencias: 0,
        sku: makeSku(sheet._id, 'SPH_CYL', { sph, cyl }),
        codebar: null,
        createdBy: actor,
        updatedBy: actor
      };

    const prev = Number(current.existencias ?? 0);
    if (prev === existencias && current.codebar) {
      continue;
    }

    current.existencias = existencias;

    if (!current.sku) {
      current.sku = makeSku(sheet._id, 'SPH_CYL', { sph, cyl });
    }

    if (existencias > 0 && !current.codebar) {
      current.codebar = makeCodebar(sheet._id, 'SPH_CYL', { sph, cyl });
    }

    current.updatedBy = actor;
    if (!current.createdBy) current.createdBy = actor;

    doc.cells.set(k, current);
    updated++;
  }

  doc.markModified('cells');
  await doc.save();
  return { updated };
};

const applyChunkBifocal = async (sheet, rows, actor) => {
  const doc = await MatrixBifocal.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'SPH_ADD', cells: new Map() } },
    { new: true, upsert: true }
  );

  doc.set('cells', doc.cells || new Map());
  let updated = 0;

  for (const row of rows) {
    const sph = to2(row.sph);
    const add = to2(row.add);
    const eye = String(row.eye || 'OD').toUpperCase();
    const base_izq = to2(row.base_izq ?? 0);
    const base_der = to2(row.base_der ?? 0);
    const existencias = Number(row.existencias ?? 0);

    const k = keyBifocal(sph, add, base_izq, base_der);
    const cell =
      doc.cells.get(k) || {
        base_izq,
        base_der,
        OD: { existencias: 0, sku: null, codebar: null },
        OI: { existencias: 0, sku: null, codebar: null },
        createdBy: actor,
        updatedBy: actor
      };

    const eyeNode = eye === 'OI' ? cell.OI : cell.OD;
    const prev = Number(eyeNode.existencias ?? 0);
    if (prev === existencias && eyeNode.codebar) {
      continue;
    }

    eyeNode.existencias = existencias;

    if (!eyeNode.sku) {
      eyeNode.sku = makeSku(sheet._id, 'SPH_ADD', { sph, add, eye, base_izq, base_der });
    }

    if (existencias > 0 && !eyeNode.codebar) {
      eyeNode.codebar = makeCodebar(sheet._id, 'SPH_ADD', {
        sph,
        add,
        eye,
        base_izq,
        base_der
      });
    }

    cell.base_izq = base_izq;
    cell.base_der = base_der;
    cell.updatedBy = actor;
    if (!cell.createdBy) cell.createdBy = actor;

    doc.cells.set(k, cell);
    updated++;
  }

  doc.markModified('cells');
  await doc.save();
  return { updated };
};

const applyChunkProgresivo = async (sheet, rows, actor) => {
  const doc = await MatrixProgresivo.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: 'BASE_ADD', cells: new Map() } },
    { new: true, upsert: true }
  );

  doc.set('cells', doc.cells || new Map());
  let updated = 0;

  for (const row of rows) {
    const add = to2(row.add);
    const eye = String(row.eye || 'OD').toUpperCase();
    const base_izq = to2(row.base_izq ?? row.base ?? 0);
    const base_der = to2(row.base_der ?? row.base ?? 0);
    const existencias = Number(row.existencias ?? 0);

    const k = keyProg(base_izq, base_der, add);
    const cell =
      doc.cells.get(k) || {
        base_izq,
        base_der,
        OD: { existencias: 0, sku: null, codebar: null },
        OI: { existencias: 0, sku: null, codebar: null },
        createdBy: actor,
        updatedBy: actor
      };

    const eyeNode = eye === 'OI' ? cell.OI : cell.OD;
    const prev = Number(eyeNode.existencias ?? 0);
    if (prev === existencias && eyeNode.codebar) {
      continue;
    }

    eyeNode.existencias = existencias;

    if (!eyeNode.sku) {
      eyeNode.sku = makeSku(sheet._id, 'BASE_ADD', { add, eye, base_izq, base_der });
    }

    if (existencias > 0 && !eyeNode.codebar) {
      eyeNode.codebar = makeCodebar(sheet._id, 'BASE_ADD', {
        add,
        eye,
        base_izq,
        base_der
      });
    }

    cell.base_izq = base_izq;
    cell.base_der = base_der;
    cell.updatedBy = actor;
    if (!cell.createdBy) cell.createdBy = actor;

    doc.cells.set(k, cell);
    updated++;
  }

  doc.markModified('cells');
  await doc.save();
  return { updated };
};

/* ======================= ENDPOINTS SHEETS ======================= */

// Listar (excluye eliminadas por defecto)
router.get('/', async (req, res) => {
  try {
    const includeDeleted = String(req.query.includeDeleted) === 'true';
    const query = includeDeleted ? {} : { isDeleted: { $ne: true } };
    const sheets = await InventorySheet.find(query).sort({ updatedAt: -1, createdAt: -1 });
    const data = sheets.map((s) => ({
      ...s.toObject(),
      tabs: buildTabsForTipo(s) // basado en defaults
    }));
    res.json({ ok: true, data });
  } catch (err) {
    console.error('GET /inventory error:', err);
    res.status(500).json({ ok: false, message: 'Error al listar hojas' });
  }
});

// Crear
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

      res.status(201).json({
        ok: true,
        data: {
          sheet,
          rootItem: null,
          tabs: buildTabsForTipo(sheet),
          seed: seedStats
        }
      });
    } catch (err) {
      console.error('POST /sheets error:', err);
      const details = err?.errors
        ? Object.fromEntries(
          Object.entries(err.errors).map(([k, v]) => [k, v?.message || String(v)])
        )
        : err?.message || 'unknown';
      res.status(500).json({ ok: false, message: 'Error al crear hoja', details });
    }
  }
);

// Obtener por id
router.get(
  '/sheets/:sheetId',
  param('sheetId').isMongoId(),
  handleValidation,
  async (req, res) => {
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: 'Sheet no existe' });
      if (sheet.isDeleted)
        return res.status(410).json({ ok: false, message: 'Sheet eliminada (soft-delete)' });
      res.json({
        ok: true,
        data: { sheet, tabs: buildTabsForTipo(sheet) }
      });
    } catch (err) {
      console.error('GET /sheets/:sheetId error:', err);
      res.status(500).json({ ok: false, message: 'Error al obtener hoja' });
    }
  }
);

// Actualizar
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
      if (sheet.isDeleted)
        return res.status(410).json({ ok: false, message: 'Sheet eliminada (soft-delete)' });

      const updates = { updatedBy: actor, updatedAt: new Date() };
      if (isDef(req.body.nombre) || isDef(req.body.name))
        updates.nombre = (req.body.nombre ?? req.body.name).trim();
      if (isDef(req.body.tratamientos)) updates.tratamientos = req.body.tratamientos;
      if (isDef(req.body.meta)) updates.meta = req.body.meta;

      const updated = await InventorySheet.findByIdAndUpdate(sheet._id, updates, { new: true });

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: 'SHEET_UPDATE',
        details: updates,
        actor
      });

      res.json({
        ok: true,
        data: { sheet: updated, tabs: buildTabsForTipo(updated) }
      });
    } catch (err) {
      console.error('PATCH /sheets/:sheetId error:', err);
      res.status(500).json({ ok: false, message: 'Error al actualizar hoja' });
    }
  }
);

/* ===== Soft-Delete (DELETE clásico) ===== */
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
      if (sheet.isDeleted) return res.json({ ok: true, message: 'Hoja ya estaba eliminada' });

      sheet.isDeleted = true;
      sheet.deletedAt = new Date();
      sheet.deletedBy = actor;
      sheet.updatedBy = actor;
      await sheet.save();

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: 'SHEET_SOFT_DELETE',
        details: { isDeleted: true },
        actor
      });

      res.json({ ok: true, message: 'Hoja eliminada (soft-delete)' });
    } catch (err) {
      console.error('DELETE /sheets/:sheetId error:', err);
      res.status(500).json({ ok: false, message: 'Error al eliminar hoja' });
    }
  }
);

/* ===== Soft-Delete (RUTA ORIGINAL: mover a papelera) ===== */
router.patch(
  '/sheets/:sheetId/trash',
  param('sheetId').isMongoId(),
  body('actor').optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: 'Sheet no existe' });
      if (sheet.isDeleted) return res.json({ ok: true, message: 'Hoja ya estaba en papelera' });

      sheet.isDeleted = true;
      sheet.deletedAt = new Date();
      sheet.deletedBy = actor;
      sheet.updatedBy = actor;
      await sheet.save();

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: 'SHEET_SOFT_DELETE',
        details: { movedTo: 'trash', isDeleted: true },
        actor
      });

      res.json({ ok: true, message: 'Hoja enviada a papelera' });
    } catch (err) {
      console.error('PATCH /sheets/:sheetId/trash error:', err);
      res.status(500).json({ ok: false, message: 'Error al enviar a papelera' });
    }
  }
);

// Restaurar
router.patch(
  '/sheets/:sheetId/restore',
  param('sheetId').isMongoId(),
  body('actor').optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: 'Sheet no existe' });
      if (!sheet.isDeleted) return res.json({ ok: true, message: 'Hoja ya está activa' });

      sheet.isDeleted = false;
      sheet.deletedAt = null;
      sheet.deletedBy = { userId: null, name: null };
      sheet.updatedBy = actor;
      await sheet.save();

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: 'SHEET_RESTORE',
        details: { isDeleted: false },
        actor
      });

      res.json({
        ok: true,
        data: { sheet, tabs: buildTabsForTipo(sheet) }
      });
    } catch (err) {
      console.error('PATCH /sheets/:sheetId/restore error:', err);
      res.status(500).json({ ok: false, message: 'Error al restaurar hoja' });
    }
  }
);

/* ======================= ENDPOINTS ITEMS ======================= */

router.get(
  '/sheets/:sheetId/items',
  param('sheetId').isMongoId(),
  handleValidation,
  async (req, res) => {
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: 'Sheet no existe' });
      if (sheet.isDeleted)
        return res.status(410).json({ ok: false, message: 'Sheet eliminada (soft-delete)' });

      const limit = Math.min(Number(req.query.limit ?? 5000), 20000);
      const defRanges = defaultRangesByTipo[sheet.tipo_matriz] || {};

      // BASE
      if (sheet.tipo_matriz === 'BASE') {
        const doc = await MatrixBase.findOne({ sheet: sheet._id });
        const defBase = defRanges.base || { start: 0, end: 8 };

        const rawBaseMin = isDef(req.query.baseMin)
          ? Number(req.query.baseMin)
          : Number(defBase.start);
        const rawBaseMax = isDef(req.query.baseMax)
          ? Number(req.query.baseMax)
          : Number(defBase.end);

        const baseRange = clampRange(rawBaseMin, rawBaseMax, PHYSICAL_LIMITS.BASE);
        if (!baseRange) {
          return res.status(400).json({
            ok: false,
            message: `Rango de BASE inválido. Debe estar entre ${PHYSICAL_LIMITS.BASE.min} y ${PHYSICAL_LIMITS.BASE.max} D`
          });
        }
        const { min: baseMin, max: baseMax } = baseRange;

        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const base = denormNum(k);
            if (base >= baseMin && base <= baseMax) {
              rows.push({
                sheet: sheet._id,
                tipo_matriz: 'BASE',
                base,
                existencias: cell.existencias ?? 0,
                sku: cell.sku || null,
                codebar: cell.codebar || null
              });
            }
          }
        }
        rows = rows.sort((a, b) => a.base - b.base).slice(0, limit);
        return res.json({ ok: true, data: rows });
      }

      // SPH_CYL
      if (sheet.tipo_matriz === 'SPH_CYL') {
        const doc = await MatrixSphCyl.findOne({ sheet: sheet._id });

        const defSph = defRanges.sph || { start: -6, end: 6 };
        const defCyl = defRanges.cyl || { start: -6, end: 0 };

        const rawSphMin = isDef(req.query.sphMin)
          ? Number(req.query.sphMin)
          : Number(defSph.start);
        const rawSphMax = isDef(req.query.sphMax)
          ? Number(req.query.sphMax)
          : Number(defSph.end);
        const rawCylMin = isDef(req.query.cylMin)
          ? Number(req.query.cylMin)
          : Number(defCyl.start);
        const rawCylMax = isDef(req.query.cylMax)
          ? Number(req.query.cylMax)
          : Number(defCyl.end);

        const sphRange = clampRange(rawSphMin, rawSphMax, PHYSICAL_LIMITS.SPH);
        const cylRange = clampRange(rawCylMin, rawCylMax, PHYSICAL_LIMITS.CYL);

        if (!sphRange) {
          return res.status(400).json({
            ok: false,
            message: `Rango de SPH inválido. Debe estar entre ${PHYSICAL_LIMITS.SPH.min} y ${PHYSICAL_LIMITS.SPH.max} D`
          });
        }
        if (!cylRange) {
          return res.status(400).json({
            ok: false,
            message: `Rango de CYL inválido. Debe estar entre ${PHYSICAL_LIMITS.CYL.min} y ${PHYSICAL_LIMITS.CYL.max} D`
          });
        }

        const { min: sphMin, max: sphMax } = sphRange;
        const { min: cylMin, max: cylMax } = cylRange;

        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const [sph, cyl] = parseKey(k);
            if (sph >= sphMin && sph <= sphMax && cyl >= cylMin && cyl <= cylMax) {
              rows.push({
                sheet: sheet._id,
                tipo_matriz: 'SPH_CYL',
                sph,
                cyl,
                existencias: cell.existencias ?? 0,
                sku: cell.sku || null,
                codebar: cell.codebar || null
              });
            }
          }
        }
        rows = rows
          .sort((a, b) => (a.sph === b.sph ? a.cyl - b.cyl : a.sph - b.sph))
          .slice(0, limit);
        return res.json({ ok: true, data: rows });
      }

      // SPH_ADD (Bifocal)
      if (sheet.tipo_matriz === 'SPH_ADD') {
        const doc = await MatrixBifocal.findOne({ sheet: sheet._id });

        const defSph = defRanges.sph || { start: -6, end: 6 };
        const defAdd = defRanges.add || { start: 1.0, end: 6.0 };

        const rawSphMin = isDef(req.query.sphMin)
          ? Number(req.query.sphMin)
          : Number(defSph.start);
        const rawSphMax = isDef(req.query.sphMax)
          ? Number(req.query.sphMax)
          : Number(defSph.end);
        const rawAddMin = isDef(req.query.addMin)
          ? Number(req.query.addMin)
          : Number(defAdd.start);
        const rawAddMax = isDef(req.query.addMax)
          ? Number(req.query.addMax)
          : Number(defAdd.end);

        const sphRange = clampRange(rawSphMin, rawSphMax, PHYSICAL_LIMITS.SPH);
        const addRange = clampRange(rawAddMin, rawAddMax, PHYSICAL_LIMITS.ADD);

        if (!sphRange) {
          return res.status(400).json({
            ok: false,
            message: `Rango de SPH inválido. Debe estar entre ${PHYSICAL_LIMITS.SPH.min} y ${PHYSICAL_LIMITS.SPH.max} D`
          });
        }
        if (!addRange) {
          return res.status(400).json({
            ok: false,
            message: `Rango de ADD inválido. Debe estar entre ${PHYSICAL_LIMITS.ADD.min} y ${PHYSICAL_LIMITS.ADD.max} D`
          });
        }

        const { min: sphMin, max: sphMax } = sphRange;
        const { min: addMin, max: addMax } = addRange;

        const eyes = String(req.query.eyes ?? 'OD,OI')
          .split(',')
          .map((s) => s.trim().toUpperCase());

        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const [sph, add, bi, bd] = parseKey(k);
            if (sph >= sphMin && sph <= sphMax && add >= addMin && add <= addMax) {
              if (eyes.includes('OD')) {
                rows.push({
                  sheet: sheet._id,
                  tipo_matriz: 'SPH_ADD',
                  sph,
                  add,
                  eye: 'OD',
                  base_izq: bi,
                  base_der: bd,
                  existencias: cell.OD?.existencias ?? 0,
                  sku: cell.OD?.sku || null,
                  codebar: cell.OD?.codebar || null
                });
              }
              if (eyes.includes('OI')) {
                rows.push({
                  sheet: sheet._id,
                  tipo_matriz: 'SPH_ADD',
                  sph,
                  add,
                  eye: 'OI',
                  base_izq: bi,
                  base_der: bd,
                  existencias: cell.OI?.existencias ?? 0,
                  sku: cell.OI?.sku || null,
                  codebar: cell.OI?.codebar || null
                });
              }
            }
          }
        }
        rows = rows
          .sort((a, b) =>
            a.sph === b.sph
              ? a.add === b.add
                ? a.eye.localeCompare(b.eye)
                : a.add - b.add
              : a.sph - b.sph
          )
          .slice(0, limit);
        return res.json({ ok: true, data: rows });
      }

      // BASE_ADD (Progresivo)
      if (sheet.tipo_matriz === 'BASE_ADD') {
        const doc = await MatrixProgresivo.findOne({ sheet: sheet._id });

        const defAdd = defRanges.add || { start: 0.75, end: 6.0 };

        const rawAddMin = isDef(req.query.addMin)
          ? Number(req.query.addMin)
          : Number(defAdd.start);
        const rawAddMax = isDef(req.query.addMax)
          ? Number(req.query.addMax)
          : Number(defAdd.end);

        const addRange = clampRange(rawAddMin, rawAddMax, PHYSICAL_LIMITS.ADD);
        if (!addRange) {
          return res.status(400).json({
            ok: false,
            message: `Rango de ADD inválido. Debe estar entre ${PHYSICAL_LIMITS.ADD.min} y ${PHYSICAL_LIMITS.ADD.max} D`
          });
        }

        const { min: addMin, max: addMax } = addRange;

        const eyes = String(req.query.eyes ?? 'OD,OI')
          .split(',')
          .map((s) => s.trim().toUpperCase());
        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const [bi, bd, add] = parseKey(k);
            if (add >= addMin && add <= addMax) {
              if (eyes.includes('OD')) {
                rows.push({
                  sheet: sheet._id,
                  tipo_matriz: 'BASE_ADD',
                  add,
                  eye: 'OD',
                  base_izq: bi,
                  base_der: bd,
                  existencias: cell.OD?.existencias ?? 0,
                  sku: cell.OD?.sku || null,
                  codebar: cell.OD?.codebar || null
                });
              }
              if (eyes.includes('OI')) {
                rows.push({
                  sheet: sheet._id,
                  tipo_matriz: 'BASE_ADD',
                  add,
                  eye: 'OI',
                  base_izq: bi,
                  base_der: bd,
                  existencias: cell.OI?.existencias ?? 0,
                  sku: cell.OI?.sku || null,
                  codebar: cell.OI?.codebar || null
                });
              }
            }
          }
        }
        rows = rows
          .sort((a, b) =>
            a.add === b.add ? a.eye.localeCompare(b.eye) : a.add - b.add
          )
          .slice(0, limit);
        return res.json({ ok: true, data: rows });
      }

      return res.json({ ok: true, data: [] });
    } catch (err) {
      console.error('GET /sheets/:sheetId/items error:', err);
      res.status(500).json({ ok: false, message: 'Error al listar items' });
    }
  }
);

// Reseed opcional (regenera estructura, sin codebar, con sku)
router.post(
  '/sheets/:sheetId/seed',
  param('sheetId').isMongoId(),
  body('actor').optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: 'Sheet no existe' });
      if (sheet.isDeleted)
        return res.status(410).json({ ok: false, message: 'Sheet eliminada (soft-delete)' });
      const stats = await seedFullForSheet(sheet, actor);
      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: 'SEED_GENERATE',
        details: { inserted: stats.inserted, defaults: true },
        actor
      });
      res.json({ ok: true, data: stats });
    } catch (err) {
      console.error('POST /sheets/:sheetId/seed error:', err);
      res.status(500).json({ ok: false, message: 'Error al generar seed' });
    }
  }
);

/* ======================= GUARDAR CHUNK ======================= */

router.post(
  '/sheets/:sheetId/chunk',
  param('sheetId').isMongoId(),
  body('rows').isArray().withMessage('rows debe ser un arreglo'),
  body('actor').optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet) return res.status(404).json({ ok: false, message: 'Sheet no existe' });
      if (sheet.isDeleted)
        return res.status(410).json({ ok: false, message: 'Sheet eliminada (soft-delete)' });

      const rows = Array.isArray(req.body.rows) ? req.body.rows : [];

      if (!rows.length) {
        return res.json({ ok: true, data: { upserted: 0 } });
      }

      console.log(
        'POST /inventory/sheets/%s/chunk → tipo_matriz=%s, rows=%s',
        req.params.sheetId,
        sheet.tipo_matriz,
        rows.length
      );
      if (rows.length) {
        console.log('Ejemplo row[0]:', rows[0]);
      }

      const validationErrors = validateChunkRows(sheet.tipo_matriz, rows);
      if (validationErrors.length) {
        return res.status(400).json({
          ok: false,
          message: 'Datos inválidos en rows',
          errors: validationErrors
        });
      }

      let result;
      switch (sheet.tipo_matriz) {
        case 'BASE':
          result = await applyChunkBase(sheet, rows, actor);
          break;
        case 'SPH_CYL':
          result = await applyChunkSphCyl(sheet, rows, actor);
          break;
        case 'SPH_ADD':
          result = await applyChunkBifocal(sheet, rows, actor);
          break;
        case 'BASE_ADD':
          result = await applyChunkProgresivo(sheet, rows, actor);
          break;
        default:
          return res.status(400).json({
            ok: false,
            message: `tipo_matriz no soportado: ${sheet.tipo_matriz}`
          });
      }

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: 'CHUNK_SAVE',
        details: { upserted: result.updated, rowsCount: rows.length },
        actor
      });

      console.log(
        'POST /inventory/sheets/%s/chunk fin → upserted=%s',
        req.params.sheetId,
        result.updated
      );

      return res.json({ ok: true, data: { upserted: result.updated } });
    } catch (err) {
      console.error('POST /sheets/:sheetId/chunk error:', err);
      res.status(500).json({ ok: false, message: 'Error al guardar chunk' });
    }
  }
);

module.exports = router;
