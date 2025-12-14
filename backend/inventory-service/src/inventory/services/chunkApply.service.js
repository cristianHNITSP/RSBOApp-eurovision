// src/inventory/services/chunkApply.service.js
const { to2 } = require("../utils/numbers");
const { makeSku, makeCodebar } = require("../utils/barcode");
const {
  keyBase,
  keySphCyl,
  keyBifocal,
  keyProg,
  normalizeCylConvention,
} = require("../utils/keys");

async function applyChunkBase(models, sheet, rows, actor) {
  const { MatrixBase } = models;

  const doc = await MatrixBase.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: "BASE", cells: new Map() } },
    { new: true, upsert: true }
  );

  doc.set("cells", doc.cells || new Map());
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
          codebar: null,
          createdBy: actor,
          updatedBy: actor,
        };

    const prev = Number(current.existencias ?? 0);

    if (existed && prev === existencias && current.sku && (existencias === 0 || current.codebar))
      continue;

    current.existencias = existencias;
    if (!current.sku) current.sku = makeSku(sheet._id, "BASE", { base });
    if (existencias > 0 && !current.codebar) current.codebar = makeCodebar(sheet._id, "BASE", { base });

    current.updatedBy = actor;
    if (!current.createdBy) current.createdBy = actor;

    doc.cells.set(k, current);
    updated++;
  }

  doc.markModified("cells");
  await doc.save();
  return { updated };
}

async function applyChunkSphCyl(models, sheet, rows, actor) {
  const { MatrixSphCyl } = models;

  const doc = await MatrixSphCyl.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: "SPH_CYL", cells: new Map() } },
    { new: true, upsert: true }
  );

  doc.set("cells", doc.cells || new Map());
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
          codebar: null,
          createdBy: actor,
          updatedBy: actor,
        };

    const prev = Number(current.existencias ?? 0);

    if (existed && prev === existencias && current.sku && (existencias === 0 || current.codebar))
      continue;

    current.existencias = existencias;
    if (!current.sku) current.sku = makeSku(sheet._id, "SPH_CYL", { sph, cyl });
    if (existencias > 0 && !current.codebar) current.codebar = makeCodebar(sheet._id, "SPH_CYL", { sph, cyl });

    current.updatedBy = actor;
    if (!current.createdBy) current.createdBy = actor;

    doc.cells.set(k, current);
    updated++;
  }

  doc.markModified("cells");
  await doc.save();
  return { updated };
}

async function applyChunkBifocal(models, sheet, rows, actor) {
  const { MatrixBifocal } = models;

  const doc = await MatrixBifocal.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: "SPH_ADD", cells: new Map() } },
    { new: true, upsert: true }
  );

  doc.set("cells", doc.cells || new Map());
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
      OD: { existencias: 0, sku: null, codebar: null },
      OI: { existencias: 0, sku: null, codebar: null },
      createdBy: actor,
      updatedBy: actor,
    };

    const eyeNode = eye === "OI" ? cell.OI : cell.OD;
    const prev = Number(eyeNode.existencias ?? 0);

    if (prev === existencias && eyeNode.sku && (existencias === 0 || eyeNode.codebar)) continue;

    eyeNode.existencias = existencias;
    if (!eyeNode.sku)
      eyeNode.sku = makeSku(sheet._id, "SPH_ADD", { sph, add, eye, base_izq, base_der });
    if (existencias > 0 && !eyeNode.codebar)
      eyeNode.codebar = makeCodebar(sheet._id, "SPH_ADD", { sph, add, eye, base_izq, base_der });

    cell.base_izq = base_izq;
    cell.base_der = base_der;
    cell.updatedBy = actor;
    if (!cell.createdBy) cell.createdBy = actor;

    doc.cells.set(k, cell);
    updated++;
  }

  doc.markModified("cells");
  await doc.save();
  return { updated };
}

async function applyChunkProgresivo(models, sheet, rows, actor) {
  const { MatrixProgresivo } = models;

  const doc = await MatrixProgresivo.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: "BASE_ADD", cells: new Map() } },
    { new: true, upsert: true }
  );

  doc.set("cells", doc.cells || new Map());
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
      OD: { existencias: 0, sku: null, codebar: null },
      OI: { existencias: 0, sku: null, codebar: null },
      createdBy: actor,
      updatedBy: actor,
    };

    const eyeNode = eye === "OI" ? cell.OI : cell.OD;
    const prev = Number(eyeNode.existencias ?? 0);

    if (prev === existencias && eyeNode.sku && (existencias === 0 || eyeNode.codebar)) continue;

    eyeNode.existencias = existencias;
    if (!eyeNode.sku)
      eyeNode.sku = makeSku(sheet._id, "BASE_ADD", { add, eye, base_izq, base_der });
    if (existencias > 0 && !eyeNode.codebar)
      eyeNode.codebar = makeCodebar(sheet._id, "BASE_ADD", { add, eye, base_izq, base_der });

    cell.base_izq = base_izq;
    cell.base_der = base_der;
    cell.updatedBy = actor;
    if (!cell.createdBy) cell.createdBy = actor;

    doc.cells.set(k, cell);
    updated++;
  }

  doc.markModified("cells");
  await doc.save();
  return { updated };
}

module.exports = {
  applyChunkBase,
  applyChunkSphCyl,
  applyChunkBifocal,
  applyChunkProgresivo,
};
