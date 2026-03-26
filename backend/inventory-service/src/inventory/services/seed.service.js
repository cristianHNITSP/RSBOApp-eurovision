// src/inventory/services/seed.service.js
const defaultRangesByTipo = require("../constants/defaultRanges");
const PHYSICAL_LIMITS = require("../constants/physicalLimits");

const { frange, clampRange } = require("../utils/ranges");
const { makeSku } = require("../utils/barcode");
const { keyBase, keySphCyl, keyBifocal, keyProg, keyTorico, normalizeCylConvention } = require("../utils/keys");
const { PER_BASE_AXIS } = require("../utils/axisConfig");

async function seedRootForSheet(models, sheet, actor) {
  const { MatrixBase, MatrixSphCyl, MatrixBifocal, MatrixProgresivo, MatrixTorico } = models;

  switch (sheet.tipo_matriz) {
    case "BASE": {
      const doc = await MatrixBase.findOneAndUpdate(
        { sheet: sheet._id },
        { $setOnInsert: { sheet: sheet._id, tipo_matriz: "BASE", cells: new Map() } },
        { new: true, upsert: true }
      );
      doc.set("cells", doc.cells || new Map());

      const base = 0;
      const k = keyBase(base);
      if (!doc.cells.has(k)) {
        doc.cells.set(k, {
          existencias: 0,
          sku: makeSku(sheet._id, "BASE", { base }),
          codebar: null,
          createdBy: actor,
          updatedBy: actor,
        });
        doc.markModified("cells");
        await doc.save();
      }
      return doc;
    }

    case "SPH_CYL": {
      const doc = await MatrixSphCyl.findOneAndUpdate(
        { sheet: sheet._id },
        { $setOnInsert: { sheet: sheet._id, tipo_matriz: "SPH_CYL", cells: new Map() } },
        { new: true, upsert: true }
      );
      doc.set("cells", doc.cells || new Map());

      const sph = 0;
      const cyl = 0;
      const k = keySphCyl(sph, cyl);
      if (!doc.cells.has(k)) {
        doc.cells.set(k, {
          existencias: 0,
          sku: makeSku(sheet._id, "SPH_CYL", { sph, cyl }),
          codebar: null,
          createdBy: actor,
          updatedBy: actor,
        });
        doc.markModified("cells");
        await doc.save();
      }
      return doc;
    }

    case "SPH_ADD": {
      const doc = await MatrixBifocal.findOneAndUpdate(
        { sheet: sheet._id },
        { $setOnInsert: { sheet: sheet._id, tipo_matriz: "SPH_ADD", cells: new Map() } },
        { new: true, upsert: true }
      );
      doc.set("cells", doc.cells || new Map());

      const sph = 0;
      const add = 1.0;
      const bi = 0;
      const bd = 0;
      const k = keyBifocal(sph, add, bi, bd);

      if (!doc.cells.has(k)) {
        doc.cells.set(k, {
          base_izq: bi,
          base_der: bd,
          OD: {
            existencias: 0,
            sku: makeSku(sheet._id, "SPH_ADD", { sph, add, eye: "OD", base_izq: bi, base_der: bd }),
            codebar: null,
          },
          OI: {
            existencias: 0,
            sku: makeSku(sheet._id, "SPH_ADD", { sph, add, eye: "OI", base_izq: bi, base_der: bd }),
            codebar: null,
          },
          createdBy: actor,
          updatedBy: actor,
        });
        doc.markModified("cells");
        await doc.save();
      }
      return doc;
    }

    case "BASE_ADD": {
      const doc = await MatrixProgresivo.findOneAndUpdate(
        { sheet: sheet._id },
        { $setOnInsert: { sheet: sheet._id, tipo_matriz: "BASE_ADD", cells: new Map() } },
        { new: true, upsert: true }
      );
      doc.set("cells", doc.cells || new Map());

      const bi = 0;
      const bd = 0;
      const add = 1.0;
      const k = keyProg(bi, bd, add);

      if (!doc.cells.has(k)) {
        doc.cells.set(k, {
          base_izq: bi,
          base_der: bd,
          OD: {
            existencias: 0,
            sku: makeSku(sheet._id, "BASE_ADD", { add, eye: "OD", base_izq: bi, base_der: bd }),
            codebar: null,
          },
          OI: {
            existencias: 0,
            sku: makeSku(sheet._id, "BASE_ADD", { add, eye: "OI", base_izq: bi, base_der: bd }),
            codebar: null,
          },
          createdBy: actor,
          updatedBy: actor,
        });
        doc.markModified("cells");
        await doc.save();
      }
      return doc;
    }

    case "SPH_CYL_AXIS": {
      if (!MatrixTorico) return null;
      const doc = await MatrixTorico.findOneAndUpdate(
        { sheet: sheet._id },
        { $setOnInsert: { sheet: sheet._id, tipo_matriz: "SPH_CYL_AXIS", cells: new Map() } },
        { new: true, upsert: true }
      );
      doc.set("cells", doc.cells || new Map());

      const sph = 0;
      const cyl = 0;
      const axis = 180;
      const k = keyTorico(sph, cyl, axis);
      if (!doc.cells.has(k)) {
        doc.cells.set(k, {
          existencias: 0,
          sku: makeSku(sheet._id, "SPH_CYL_AXIS", { sph, cyl, axis }),
          codebar: null,
          createdBy: actor,
          updatedBy: actor,
        });
        doc.markModified("cells");
        await doc.save();
      }
      return doc;
    }

    default:
      return null;
  }
}

async function seedFullForSheet(models, sheet, actor) {
  const { MatrixBase, MatrixSphCyl, MatrixBifocal, MatrixProgresivo, MatrixTorico } = models;

  const setCell = (cell) => Object.assign(cell, { createdBy: actor, updatedBy: actor });
  const tipo = sheet.tipo_matriz;

  // Configuracion de ejes por baseKey (fuente de verdad)
  const axisCfg = PER_BASE_AXIS[sheet.baseKey] || {};

  // ─── BASE (monofocal) ────────────────────────────────────────────────────
  if (tipo === "BASE") {
    const doc = await MatrixBase.findOneAndUpdate(
      { sheet: sheet._id },
      { $setOnInsert: { sheet: sheet._id, tipo_matriz: "BASE", cells: new Map() } },
      { new: true, upsert: true }
    );

    // Eje BASE: usa config per-base si existe, sino fallback a defaultRanges
    let baseVals;
    if (axisCfg.baseAxis) {
      baseVals = axisCfg.baseAxis;
    } else {
      const rBase = defaultRangesByTipo.BASE.base;
      const baseRange = clampRange(
        Math.min(rBase.start, rBase.end),
        Math.max(rBase.start, rBase.end),
        PHYSICAL_LIMITS.BASE
      );
      if (!baseRange) return { inserted: 0 };
      baseVals = frange(baseRange.min, baseRange.max, rBase.step);
    }

    doc.set("cells", doc.cells || new Map());

    baseVals.forEach((base) => {
      const k = keyBase(base);
      if (!doc.cells.has(k)) {
        doc.cells.set(
          k,
          setCell({ existencias: 0, sku: makeSku(sheet._id, "BASE", { base }), codebar: null })
        );
      }
    });

    doc.markModified("cells");
    await doc.save();
    return { inserted: baseVals.length };
  }

  // ─── SPH_CYL (monofocalEsfCil) ───────────────────────────────────────────
  if (tipo === "SPH_CYL") {
    const doc = await MatrixSphCyl.findOneAndUpdate(
      { sheet: sheet._id },
      { $setOnInsert: { sheet: sheet._id, tipo_matriz: "SPH_CYL", cells: new Map() } },
      { new: true, upsert: true }
    );

    // Eje SPH: combina neg + pos, deduplica el 0
    let sphVals;
    if (axisCfg.sphNegAxis && axisCfg.sphPosAxis) {
      const sphSet = new Map();
      [...axisCfg.sphNegAxis, ...axisCfg.sphPosAxis].forEach((v) => sphSet.set(String(v), v));
      sphVals = [...sphSet.values()].sort((a, b) => a - b);
    } else {
      const rSph = defaultRangesByTipo.SPH_CYL.sph;
      const sphRange = clampRange(Math.min(rSph.start, rSph.end), Math.max(rSph.start, rSph.end), PHYSICAL_LIMITS.SPH);
      if (!sphRange) return { inserted: 0 };
      sphVals = frange(sphRange.min, sphRange.max, rSph.step);
    }

    // Eje CYL: cylAxis es display (positivo), convertir a backend (negativo)
    let cylVals;
    if (axisCfg.cylAxis) {
      // cylAxis = [0, 0.25, ..., 6] → backend: [0, -0.25, ..., -6]
      cylVals = axisCfg.cylAxis.map((v) => (v === 0 ? 0 : -v));
    } else {
      const rCyl = defaultRangesByTipo.SPH_CYL.cyl;
      const cylRange = clampRange(Math.min(rCyl.start, rCyl.end), Math.max(rCyl.start, rCyl.end), PHYSICAL_LIMITS.CYL);
      if (!cylRange) return { inserted: 0 };
      cylVals = frange(cylRange.min, cylRange.max, rCyl.step);
    }

    doc.set("cells", doc.cells || new Map());
    let count = 0;

    for (const sph of sphVals) {
      for (let cyl of cylVals) {
        cyl = normalizeCylConvention(cyl);
        const k = keySphCyl(sph, cyl);
        if (!doc.cells.has(k)) {
          doc.cells.set(
            k,
            setCell({ existencias: 0, sku: makeSku(sheet._id, "SPH_CYL", { sph, cyl }), codebar: null })
          );
          count++;
        }
      }
    }

    doc.markModified("cells");
    await doc.save();
    return { inserted: count };
  }

  // ─── SPH_ADD (bifocal, bifocalFT, bifocalYounger) ────────────────────────
  if (tipo === "SPH_ADD") {
    const doc = await MatrixBifocal.findOneAndUpdate(
      { sheet: sheet._id },
      { $setOnInsert: { sheet: sheet._id, tipo_matriz: "SPH_ADD", cells: new Map() } },
      { new: true, upsert: true }
    );

    let sphVals;
    if (axisCfg.sphAxis) {
      sphVals = axisCfg.sphAxis;
    } else {
      const rSph = defaultRangesByTipo.SPH_ADD.sph;
      const sphRange = clampRange(Math.min(rSph.start, rSph.end), Math.max(rSph.start, rSph.end), PHYSICAL_LIMITS.SPH);
      if (!sphRange) return { inserted: 0 };
      sphVals = frange(sphRange.min, sphRange.max, rSph.step);
    }

    let addVals;
    if (axisCfg.addAxis) {
      addVals = axisCfg.addAxis;
    } else {
      const rAdd = defaultRangesByTipo.SPH_ADD.add;
      const addRange = clampRange(Math.min(rAdd.start, rAdd.end), Math.max(rAdd.start, rAdd.end), PHYSICAL_LIMITS.ADD);
      if (!addRange) return { inserted: 0 };
      addVals = frange(addRange.min, addRange.max, rAdd.step);
    }

    doc.set("cells", doc.cells || new Map());
    let count = 0;

    for (const sph of sphVals) {
      for (const add of addVals) {
        const bi = 0;
        const bd = 0;
        const k = keyBifocal(sph, add, bi, bd);

        if (!doc.cells.has(k)) {
          doc.cells.set(
            k,
            setCell({
              base_izq: bi,
              base_der: bd,
              OD: { existencias: 0, sku: makeSku(sheet._id, "SPH_ADD", { sph, add, eye: "OD", base_izq: bi, base_der: bd }), codebar: null },
              OI: { existencias: 0, sku: makeSku(sheet._id, "SPH_ADD", { sph, add, eye: "OI", base_izq: bi, base_der: bd }), codebar: null },
            })
          );
          count++;
        }
      }
    }

    doc.markModified("cells");
    await doc.save();
    return { inserted: count };
  }

  // ─── BASE_ADD (progresivo) ────────────────────────────────────────────────
  if (tipo === "BASE_ADD") {
    const doc = await MatrixProgresivo.findOneAndUpdate(
      { sheet: sheet._id },
      { $setOnInsert: { sheet: sheet._id, tipo_matriz: "BASE_ADD", cells: new Map() } },
      { new: true, upsert: true }
    );

    let baseVals;
    if (axisCfg.baseAxis) {
      baseVals = axisCfg.baseAxis;
    } else {
      const rBase = defaultRangesByTipo.BASE_ADD.base;
      const baseRange = clampRange(Math.min(rBase.start, rBase.end), Math.max(rBase.start, rBase.end), PHYSICAL_LIMITS.BASE);
      if (!baseRange) return { inserted: 0 };
      baseVals = frange(baseRange.min, baseRange.max, rBase.step);
    }

    let addVals;
    if (axisCfg.addAxis) {
      addVals = axisCfg.addAxis;
    } else {
      const rAdd = defaultRangesByTipo.BASE_ADD.add;
      const addRange = clampRange(Math.min(rAdd.start, rAdd.end), Math.max(rAdd.start, rAdd.end), PHYSICAL_LIMITS.ADD);
      if (!addRange) return { inserted: 0 };
      addVals = frange(addRange.min, addRange.max, rAdd.step);
    }

    doc.set("cells", doc.cells || new Map());
    let count = 0;

    for (const b of baseVals) {
      for (const add of addVals) {
        const bi = b;
        const bd = b;
        const k = keyProg(bi, bd, add);

        if (!doc.cells.has(k)) {
          doc.cells.set(
            k,
            setCell({
              base_izq: bi,
              base_der: bd,
              OD: { existencias: 0, sku: makeSku(sheet._id, "BASE_ADD", { add, eye: "OD", base_izq: bi, base_der: bd }), codebar: null },
              OI: { existencias: 0, sku: makeSku(sheet._id, "BASE_ADD", { add, eye: "OI", base_izq: bi, base_der: bd }), codebar: null },
            })
          );
          count++;
        }
      }
    }

    doc.markModified("cells");
    await doc.save();
    return { inserted: count };
  }

  // ─── SPH_CYL_AXIS (tórico CL) ────────────────────────────────────────────
  if (tipo === "SPH_CYL_AXIS" && MatrixTorico) {
    const doc = await MatrixTorico.findOneAndUpdate(
      { sheet: sheet._id },
      { $setOnInsert: { sheet: sheet._id, tipo_matriz: "SPH_CYL_AXIS", cells: new Map() } },
      { new: true, upsert: true }
    );

    // SPH axes
    let sphVals;
    if (axisCfg.sphNegAxis && axisCfg.sphPosAxis) {
      const sphSet = new Map();
      [...axisCfg.sphNegAxis, ...axisCfg.sphPosAxis].forEach((v) => sphSet.set(String(v), v));
      sphVals = [...sphSet.values()].sort((a, b) => a - b);
    } else {
      const rSph = defaultRangesByTipo.SPH_CYL_AXIS?.sph || { start: -20, end: 10, step: 0.25 };
      const sphRange = clampRange(Math.min(rSph.start, rSph.end), Math.max(rSph.start, rSph.end), PHYSICAL_LIMITS.SPH);
      if (!sphRange) return { inserted: 0 };
      sphVals = frange(sphRange.min, sphRange.max, rSph.step);
    }

    // CYL axis (display positivo → backend negativo)
    let cylVals;
    if (axisCfg.cylAxis) {
      cylVals = axisCfg.cylAxis.map((v) => (v === 0 ? 0 : -v));
    } else {
      const rCyl = defaultRangesByTipo.SPH_CYL_AXIS?.cyl || { start: -6, end: 0, step: 0.25 };
      const cylRange = clampRange(Math.min(rCyl.start, rCyl.end), Math.max(rCyl.start, rCyl.end), PHYSICAL_LIMITS.CYL);
      if (!cylRange) return { inserted: 0 };
      cylVals = frange(cylRange.min, cylRange.max, rCyl.step);
    }

    // AXIS degrees
    let axisVals;
    if (axisCfg.axisAxis) {
      axisVals = axisCfg.axisAxis;
    } else {
      axisVals = frange(180, 10, 10);
    }

    doc.set("cells", doc.cells || new Map());
    let count = 0;

    for (const sph of sphVals) {
      for (let cyl of cylVals) {
        cyl = normalizeCylConvention(cyl);
        for (const axis of axisVals) {
          const k = keyTorico(sph, cyl, axis);
          if (!doc.cells.has(k)) {
            doc.cells.set(
              k,
              setCell({ existencias: 0, sku: makeSku(sheet._id, "SPH_CYL_AXIS", { sph, cyl, axis }), codebar: null })
            );
            count++;
          }
        }
      }
    }

    doc.markModified("cells");
    await doc.save();
    return { inserted: count };
  }

  return { inserted: 0 };
}

module.exports = { seedRootForSheet, seedFullForSheet };
