'use strict';

/**
 * seed-catalog.js
 *
 * Siembra CatalogBase y CatalogTreatment en MongoDB.
 * Idempotente por defecto; usa --force para sobrescribir.
 *
 * USO:
 *   node src/seeds/seed-catalog.js
 *   node src/seeds/seed-catalog.js --dry-run
 *   node src/seeds/seed-catalog.js --force
 */

require('dotenv').config();
const mongoose = require('mongoose');

const CatalogBase      = require('../models/CatalogBase');
const CatalogTreatment = require('../models/CatalogTreatment');
const { TREATMENTS, BASES_CONFIG } = require('./catalog-data');

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');

const DEFAULT_BASES      = Object.values(BASES_CONFIG);
const DEFAULT_TREATMENTS = Object.values(TREATMENTS);

async function seedBases() {
  const existing = await CatalogBase.countDocuments();
  if (existing > 0 && !FORCE) {
    console.log(`ℹ️  Bases: ${existing} ya existen — omitiendo (usa --force para sobrescribir)`);
    return;
  }

  if (FORCE && existing > 0) {
    if (!DRY_RUN) await CatalogBase.deleteMany({});
    console.log(`🟡  Bases: eliminadas ${existing} existentes`);
  }

  console.log(`\n📋  Bases a sembrar (${DEFAULT_BASES.length}):`);
  for (const b of DEFAULT_BASES) {
    console.log(`     [${b.tipo_matriz.padEnd(8)}]  ${b.label}`);
    if (!DRY_RUN) {
      await CatalogBase.findOneAndUpdate(
        { key: b.key },
        { $setOnInsert: b },
        { upsert: true, new: true }
      );
    }
  }
  if (!DRY_RUN) console.log(`✅  Bases: ${DEFAULT_BASES.length} sembradas`);
  else          console.log(`🔵  DRY-RUN — bases no escritas`);
}

async function seedTreatments() {
  const existing = await CatalogTreatment.countDocuments();
  if (existing > 0 && !FORCE) {
    console.log(`ℹ️  Tratamientos: ${existing} ya existen — omitiendo (usa --force para sobrescribir)`);
    return;
  }

  if (FORCE && existing > 0) {
    if (!DRY_RUN) await CatalogTreatment.deleteMany({});
    console.log(`🟡  Tratamientos: eliminados ${existing} existentes`);
  }

  console.log(`\n💊  Tratamientos a sembrar (${DEFAULT_TREATMENTS.length}):`);
  for (const t of DEFAULT_TREATMENTS) {
    const varDesc = t.variants.length
      ? `${t.variants.length} variantes`
      : Object.keys(t.variantsByMaterial).length
        ? `variantes por material`
        : 'sin variantes';
    console.log(`     [${t.key.padEnd(13)}]  ${t.label.padEnd(35)} — ${varDesc}`);
    if (!DRY_RUN) {
      await CatalogTreatment.findOneAndUpdate(
        { key: t.key },
        { $setOnInsert: t },
        { upsert: true, new: true }
      );
    }
  }
  if (!DRY_RUN) console.log(`✅  Tratamientos: ${DEFAULT_TREATMENTS.length} sembrados`);
  else          console.log(`🔵  DRY-RUN — tratamientos no escritos`);
}

async function main() {
  const MONGO_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI   ||
    'mongodb://localhost:27017/optica';

  await mongoose.connect(MONGO_URI);
  console.log('✅  MongoDB conectado');
  if (DRY_RUN) console.log('🔵  DRY-RUN activado — no se escribirá nada');
  if (FORCE)   console.log('🟡  FORCE — se recrearán registros existentes');

  await seedBases();
  await seedTreatments();

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  Seed de catálogo finalizado.');
  console.log('══════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
