// src/inventory/services/chunkApply.service.js
const { to2 } = require("../utils/numbers");
const { makeSku, makeQr } = require("../utils/qr");
const {
  keyBase,
  keySphCyl,
  keyBifocal,
  keyProg,
  keyTorico,
  normalizeCylConvention,
} = require("../utils/keys");

async function applyChunkBase(models, sheet, rows, actor) {
  const { MatrixBase } = models;

  const doc = await MatrixBase.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: "BASE", cells: new Map() } },
    { new: true, upsert: true }
  );

  const updateData = {};
  const conflicts = [];
  let updated = 0;

  for (const row of rows) {
    const base = to2(row.base);
    const existencias = Number(row.existencias ?? 0);
    const k = keyBase(base);

    const existed = doc.cells.has(k);

    const current = existed
      ? doc.cells.get(k)
      : {
          existencias: 0,
          sku: makeSku(sheet._id, "BASE", { base }),
          qr: null,
          createdBy: actor,
          updatedBy: actor,
        };

    const prev = Number(current.existencias ?? 0);

    if (existed && prev === existencias && current.sku && current.qr)
      continue;

    if (row.baseline != null && Number(row.baseline) !== prev) {
      conflicts.push({ key: k, expected: Number(row.baseline), actual: prev, attempted: existencias });
      continue;
    }

    current.existencias = existencias;
    if (!current.sku) current.sku = makeSku(sheet._id, "BASE", { base });
    if (!current.qr) current.qr = makeQr(sheet._id, "BASE", { base });

    current.updatedBy = actor;
    if (!current.createdBy) current.createdBy = actor;

    doc.cells.set(k, current);
    updateData[`cells.${k}`] = current;
    updated++;
  }

  if (updated > 0) {
    await MatrixBase.updateOne({ sheet: sheet._id }, { $set: updateData });
  }
  return { updated, conflicts };
}

async function applyChunkSphCyl(models, sheet, rows, actor) {
  const { MatrixSphCyl } = models;

  const doc = await MatrixSphCyl.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: "SPH_CYL", cells: new Map() } },
    { new: true, upsert: true }
  );

  const updateData = {};
  const conflicts = [];
  let updated = 0;

  for (const row of rows) {
    const sph = to2(row.sph);
    let cyl = normalizeCylConvention(row.cyl);
    if (!Number.isFinite(sph) || !Number.isFinite(cyl)) continue;

    const existencias = Number(row.existencias ?? 0);
    const k = keySphCyl(sph, cyl);

    const existed = doc.cells.has(k);
    const current = existed
      ? doc.cells.get(k)
      : {
          existencias: 0,
          sku: makeSku(sheet._id, "SPH_CYL", { sph, cyl }),
          qr: null,
          createdBy: actor,
          updatedBy: actor,
        };

    const prev = Number(current.existencias ?? 0);

    if (existed && prev === existencias && current.sku && current.qr)
      continue;

    if (row.baseline != null && Number(row.baseline) !== prev) {
      conflicts.push({ key: k, expected: Number(row.baseline), actual: prev, attempted: existencias });
      continue;
    }

    current.existencias = existencias;
    if (!current.sku) current.sku = makeSku(sheet._id, "SPH_CYL", { sph, cyl });
    if (!current.qr) current.qr = makeQr(sheet._id, "SPH_CYL", { sph, cyl });

    current.updatedBy = actor;
    if (!current.createdBy) current.createdBy = actor;

    doc.cells.set(k, current);
    updateData[`cells.${k}`] = current;
    updated++;
  }

  if (updated > 0) {
    await MatrixSphCyl.updateOne({ sheet: sheet._id }, { $set: updateData });
  }
  return { updated, conflicts };
}

async function applyChunkBifocal(models, sheet, rows, actor) {
  const { MatrixBifocal } = models;

  const doc = await MatrixBifocal.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: "SPH_ADD", cells: new Map() } },
    { new: true, upsert: true }
  );

  const updateData = {};
  const conflicts = [];
  let updated = 0;

  for (const row of rows) {
    const sph = to2(row.sph);
    const add = to2(row.add);
    const eye = String(row.eye || "OD").toUpperCase();
    const base_izq = to2(row.base_izq ?? 0);
    const base_der = to2(row.base_der ?? 0);
    const existencias = Number(row.existencias ?? 0);

    const k = keyBifocal(sph, add, base_izq, base_der);
    const cell = doc.cells.get(k) || {
      base_izq,
      base_der,
      OD: { existencias: 0, sku: null, qr: null },
      OI: { existencias: 0, sku: null, qr: null },
      createdBy: actor,
      updatedBy: actor,
    };

    const eyeNode = eye === "OI" ? cell.OI : cell.OD;
    const prev = Number(eyeNode.existencias ?? 0);

    if (prev === existencias && eyeNode.sku && eyeNode.qr) continue;

    if (row.baseline != null && Number(row.baseline) !== prev) {
      conflicts.push({ key: `${k}|${eye}`, expected: Number(row.baseline), actual: prev, attempted: existencias });
      continue;
    }

    eyeNode.existencias = existencias;
    if (!eyeNode.sku)
      eyeNode.sku = makeSku(sheet._id, "SPH_ADD", { sph, add, eye, base_izq, base_der });
    if (!eyeNode.qr)
      eyeNode.qr = makeQr(sheet._id, "SPH_ADD", { sph, add, eye, base_izq, base_der });

    cell.base_izq = base_izq;
    cell.base_der = base_der;
    cell.updatedBy = actor;
    if (!cell.createdBy) cell.createdBy = actor;

    doc.cells.set(k, cell);
    updateData[`cells.${k}`] = cell;
    updated++;
  }

  if (updated > 0) {
    await MatrixBifocal.updateOne({ sheet: sheet._id }, { $set: updateData });
  }
  return { updated, conflicts };
}

async function applyChunkProgresivo(models, sheet, rows, actor) {
  const { MatrixProgresivo } = models;

  const doc = await MatrixProgresivo.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: "BASE_ADD", cells: new Map() } },
    { new: true, upsert: true }
  );

  const updateData = {};
  const conflicts = [];
  let updated = 0;

  for (const row of rows) {
    const add = to2(row.add);
    const eye = String(row.eye || "OD").toUpperCase();
    const base_izq = to2(row.base_izq ?? row.base ?? 0);
    const base_der = to2(row.base_der ?? row.base ?? 0);
    const existencias = Number(row.existencias ?? 0);

    const k = keyProg(base_izq, base_der, add);
    const cell = doc.cells.get(k) || {
      base_izq,
      base_der,
      OD: { existencias: 0, sku: null, qr: null },
      OI: { existencias: 0, sku: null, qr: null },
      createdBy: actor,
      updatedBy: actor,
    };

    const eyeNode = eye === "OI" ? cell.OI : cell.OD;
    const prev = Number(eyeNode.existencias ?? 0);

    if (prev === existencias && eyeNode.sku && eyeNode.qr) continue;

    if (row.baseline != null && Number(row.baseline) !== prev) {
      conflicts.push({ key: `${k}|${eye}`, expected: Number(row.baseline), actual: prev, attempted: existencias });
      continue;
    }

    eyeNode.existencias = existencias;
    if (!eyeNode.sku)
      eyeNode.sku = makeSku(sheet._id, "BASE_ADD", { add, eye, base_izq, base_der });
    if (!eyeNode.qr)
      eyeNode.qr = makeQr(sheet._id, "BASE_ADD", { add, eye, base_izq, base_der });

    cell.base_izq = base_izq;
    cell.base_der = base_der;
    cell.updatedBy = actor;
    if (!cell.createdBy) cell.createdBy = actor;

    doc.cells.set(k, cell);
    updateData[`cells.${k}`] = cell;
    updated++;
  }

  if (updated > 0) {
    await MatrixProgresivo.updateOne({ sheet: sheet._id }, { $set: updateData });
  }
  return { updated, conflicts };
}

async function applyChunkTorico(models, sheet, rows, actor) {
  const { MatrixTorico } = models;

  const doc = await MatrixTorico.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: "SPH_CYL_AXIS", cells: new Map() } },
    { new: true, upsert: true }
  );

  const updateData = {};
  const conflicts = [];
  let updated = 0;
  for (const row of rows) {
    const sph = to2(row.sph);
    let cyl = normalizeCylConvention(row.cyl);
    const axis = Number(row.axis);
    if (!Number.isFinite(sph) || !Number.isFinite(cyl) || !Number.isFinite(axis)) continue;

    const existencias = Number(row.existencias ?? 0);
    const k = keyTorico(sph, cyl, axis);

    const existed = doc.cells.has(k);
    const current = existed
      ? doc.cells.get(k)
      : {
          existencias: 0,
          sku: makeSku(sheet._id, "SPH_CYL_AXIS", { sph, cyl, axis }),
          qr: null,
          createdBy: actor,
          updatedBy: actor,
        };

    const prev = Number(current.existencias ?? 0);

    if (existed && prev === existencias && current.sku && current.qr)
      continue;

    if (row.baseline != null && Number(row.baseline) !== prev) {
      conflicts.push({ key: k, expected: Number(row.baseline), actual: prev, attempted: existencias });
      continue;
    }

    current.existencias = existencias;
    if (!current.sku) current.sku = makeSku(sheet._id, "SPH_CYL_AXIS", { sph, cyl, axis });
    if (!current.qr) current.qr = makeQr(sheet._id, "SPH_CYL_AXIS", { sph, cyl, axis });

    current.updatedBy = actor;
    if (!current.createdBy) current.createdBy = actor;

    doc.cells.set(k, current);
    updateData[`cells.${k}`] = current;
    updated++;
  }

  if (updated > 0) {
    // Actualización atómica quirúrgica en lugar de doc.save()
    await MatrixTorico.updateOne({ sheet: sheet._id }, { $set: updateData });
  }
  return { updated, conflicts };
}

module.exports = {
  applyChunkBase,
  applyChunkSphCyl,
  applyChunkBifocal,
  applyChunkProgresivo,
  applyChunkTorico,
};
