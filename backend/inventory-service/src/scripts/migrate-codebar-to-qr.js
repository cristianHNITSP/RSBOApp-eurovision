'use strict';

/**
 * migrate-codebar-to-qr.js
 *
 * Migra el campo legado `codebar` (EAN-13, perezoso, sólo con stock > 0) al nuevo
 * `qr` (código QR interno, determinístico, único por dioptría y por ojo) en TODAS
 * las matrices de inventario óptico y de lentes de contacto.
 *
 * Para cada celda:
 *   - calcula el `qr` con makeQr() a partir de las coordenadas (idempotente),
 *   - elimina el viejo `codebar`.
 *
 * USO:
 *   node src/scripts/migrate-codebar-to-qr.js            # aplica
 *   node src/scripts/migrate-codebar-to-qr.js --dry-run  # sólo reporta
 */

require('dotenv').config();
const mongoose = require('mongoose');

const { makeQr } = require('../inventory/utils/barcode');
const { parseKey } = require('../inventory/utils/keys');

// Matrices de inventario óptico (armazones/micas) + lentes de contacto.
const MODELS = [
  { tipo: 'BASE',         model: require('../models/matrix/MatrixBase') },
  { tipo: 'SPH_CYL',      model: require('../models/matrix/MatrixSphCyl') },
  { tipo: 'SPH_ADD',      model: require('../models/matrix/MatrixBifocal') },
  { tipo: 'BASE_ADD',     model: require('../models/matrix/MatrixProgresivo') },
  { tipo: 'BASE',         model: require('../models/contactlenses/CLMatrixEsferico') },
  { tipo: 'SPH_CYL',      model: require('../models/contactlenses/CLMatrixColorido') },
  { tipo: 'SPH_ADD',      model: require('../models/contactlenses/CLMatrixBifocal') },
  { tipo: 'BASE_ADD',     model: require('../models/contactlenses/CLMatrixMultifocal') },
  { tipo: 'SPH_CYL_AXIS', model: require('../models/contactlenses/CLMatrixTorico') },
];

const DRY_RUN = process.argv.includes('--dry-run');

/** Recalcula el qr de una celda de un solo nodo (BASE / SPH_CYL / SPH_CYL_AXIS). */
function qrSingle(sheetId, tipo, key) {
  const [a, b, c] = parseKey(key);
  if (tipo === 'BASE') return makeQr(sheetId, 'BASE', { base: a });
  if (tipo === 'SPH_CYL') return makeQr(sheetId, 'SPH_CYL', { sph: a, cyl: b });
  if (tipo === 'SPH_CYL_AXIS') return makeQr(sheetId, 'SPH_CYL_AXIS', { sph: a, cyl: b, axis: c });
  return null;
}

/** Recalcula el qr de un nodo de ojo (SPH_ADD / BASE_ADD). */
function qrEye(sheetId, tipo, key, cell, eye) {
  const parts = parseKey(key);
  const base_izq = Number(cell.base_izq ?? 0);
  const base_der = Number(cell.base_der ?? 0);
  if (tipo === 'SPH_ADD') {
    // key = sph|add|bi|bd
    const [sph, add] = parts;
    return makeQr(sheetId, 'SPH_ADD', { sph, add, eye, base_izq, base_der });
  }
  // BASE_ADD: key = bi|bd|add
  const add = parts[2];
  return makeQr(sheetId, 'BASE_ADD', { add, eye, base_izq, base_der });
}

async function migrateModel({ tipo, model }) {
  const name = model.modelName;
  const docs = await model.find({}).cursor();

  let docCount = 0;
  let cellCount = 0;

  for (let doc = await docs.next(); doc != null; doc = await docs.next()) {
    if (!doc.cells || doc.cells.size === 0) continue;
    const sheetId = String(doc.sheet);
    let changed = false;

    for (const [key, raw] of doc.cells.entries()) {
      const cell = typeof raw.toObject === 'function' ? raw.toObject() : { ...raw };

      if (tipo === 'SPH_ADD' || tipo === 'BASE_ADD') {
        for (const eye of ['OD', 'OI']) {
          const node = cell[eye];
          if (!node) continue;
          node.qr = qrEye(sheetId, tipo, key, cell, eye);
          delete node.codebar;
          cellCount++;
        }
      } else {
        cell.qr = qrSingle(sheetId, tipo, key);
        delete cell.codebar;
        cellCount++;
      }

      if (!DRY_RUN) doc.cells.set(key, cell);
      changed = true;
    }

    if (changed && !DRY_RUN) {
      doc.markModified('cells');
      await doc.save();
    }
    docCount++;
  }

  console.log(`  • ${name} (${tipo}): ${docCount} matrices, ${cellCount} celdas`);
}

async function main() {
  const MONGO_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/optica';

  await mongoose.connect(MONGO_URI);
  console.log('✅  MongoDB conectado');
  if (DRY_RUN) console.log('🔵  DRY-RUN — no se escribirá nada\n');

  for (const entry of MODELS) {
    await migrateModel(entry);
  }

  await mongoose.disconnect();
  console.log('\n✅  Migración codebar → qr completada');
}

main().catch((err) => {
  console.error('❌  Migración falló:', err);
  process.exit(1);
});
