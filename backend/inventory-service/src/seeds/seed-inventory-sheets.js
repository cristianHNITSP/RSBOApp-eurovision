'use strict';

/**
 * seed-inventory-sheets.js  (v2 – fix sku_1 dup key)
 *
 * Genera TODAS las combinaciones de planillas de inventario óptico.
 *
 * USO:
 *   node src/seeds/seed-inventory-sheets.js
 *   node src/seeds/seed-inventory-sheets.js --dry-run
 *   node src/seeds/seed-inventory-sheets.js --force
 */

require('dotenv').config();
const mongoose = require('mongoose');

// ── Modelos ──────────────────────────────────────────────────────────────────
const InventorySheet     = require('../models/InventorySheet');
const InventoryChangeLog = require('../models/InventoryChangeLog');
const MatrixBase         = require('../models/matrix/MatrixBase');
const MatrixSphCyl       = require('../models/matrix/MatrixSphCyl');
const MatrixBifocal      = require('../models/matrix/MatrixBifocal');
const MatrixProgresivo   = require('../models/matrix/MatrixProgresivo');

// ── ✅ SKU util — evita E11000 dup key { sku: null } ─────────────────────────
const { makeUniqueSheetSku } = require('../inventory/utils/sku');

// ── seed.service (opcional) ───────────────────────────────────────────────────
let seedRootForSheet = null;
try {
  ({ seedRootForSheet } = require('../inventory/services/seed.service'));
} catch (_) {
  console.warn('⚠️  seed.service no encontrado → matrices vacías');
}

// ── CLI flags ─────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');

// ── Catálogo de tratamientos ──────────────────────────────────────────────────
const POLAR_BASES   = ['Gris', 'Café', 'G15'];
const ESPEJO_COLORS = ['Verde', 'Rojo', 'Morado', 'Plata', 'Naranja'];

const TREATMENTS = {
  BCO:          { label: 'BCO',            variants: [] },
  AR:           { label: 'AR',             variants: [] },
  ANTIBLE:      { label: 'Antible',        variants: ['sin AR', 'con AR'] },
  FOTO:         { label: 'Foto',           variants: ['sin AR', 'con AR'] },
  FOTO_ANTIBLE: { label: 'Foto + Antible', variants: ['sin AR', 'con AR'] },
  TRANSITIONS: {
    label: 'Transitions',
    variantsByMaterial: {
      'CR-39':         ['Gris', 'Café', 'Verde'],
      'Policarbonato': ['Gris', 'Café']
    }
  },
  POLAR: {
    label: 'Polarizado',
    variants: [...POLAR_BASES]
  },
  POLAR_ESPEJO: {
    label: 'Polarizado + Espejado',
    variants: POLAR_BASES.flatMap(b => ESPEJO_COLORS.map(c => `Base ${b} + Espejo ${c}`))
  },
  CRISTAL_FOTO: { label: 'Fotocromático', variants: [] }
};

// ── Configuración de bases ────────────────────────────────────────────────────
const BASES_CONFIG = {
  monofocal: {
    label:        'Monofocal (Base)',
    tipo_matriz:  'BASE',
    materiales:   ['Policarbonato', 'CR-39', '1.56', '1.61 MR-8', '1.67', '1.74', 'Cristal'],
    tratamientos: ['BCO', 'AR', 'ANTIBLE', 'FOTO', 'FOTO_ANTIBLE', 'TRANSITIONS', 'POLAR', 'POLAR_ESPEJO', 'CRISTAL_FOTO']
  },
  progresivo: {
    label:        'Progresivo (Base + ADD)',
    tipo_matriz:  'BASE_ADD',
    materiales:   ['Policarbonato', 'CR-39', '1.56', '1.61 MR-8', '1.67', '1.74'],
    tratamientos: ['BCO', 'AR', 'ANTIBLE', 'FOTO', 'FOTO_ANTIBLE', 'TRANSITIONS']
  },
  monofocalEsfCil: {
    label:        'Monofocal Esférico-Cilíndrico (SPH/CYL)',
    tipo_matriz:  'SPH_CYL',
    materiales:   ['Policarbonato', 'CR-39', '1.56', '1.61 MR-8', '1.67', '1.74'],
    tratamientos: ['BCO', 'AR', 'ANTIBLE', 'FOTO', 'FOTO_ANTIBLE', 'TRANSITIONS', 'POLAR', 'POLAR_ESPEJO']
  },
  bifocal: {
    label:        'Bifocal (SPH + ADD)',
    tipo_matriz:  'SPH_ADD',
    materiales:   ['Policarbonato', 'CR-39', '1.56', '1.61 MR-8', '1.67', '1.74'],
    tratamientos: ['BCO', 'AR', 'ANTIBLE', 'FOTO', 'FOTO_ANTIBLE', 'TRANSITIONS']
  },
  bifocalFT: {
    label:        'Bifocal F.T (SPH + ADD)',
    tipo_matriz:  'SPH_ADD',
    materiales:   ['Policarbonato', 'CR-39'],
    tratamientos: ['BCO', 'AR', 'ANTIBLE', 'FOTO', 'FOTO_ANTIBLE', 'TRANSITIONS']
  },
  bifocalYounger: {
    label:        'Bifocal Younger (SPH + ADD)',
    tipo_matriz:  'SPH_ADD',
    materiales:   ['Policarbonato', 'CR-39'],
    tratamientos: ['BCO', 'AR', 'ANTIBLE', 'FOTO', 'FOTO_ANTIBLE', 'TRANSITIONS']
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const composeTratamientoDisplay = (tratamiento, variante) => {
  const t = String(tratamiento || '').trim();
  const v = String(variante   || '').trim();
  if (!t) return '';
  return v ? `${t} (${v})` : t;
};

function resolveVariants(baseKey, material, tratamientoKey) {
  const trt = TREATMENTS[tratamientoKey];
  if (!trt) return [];

  // Cristal solo acepta BCO y CRISTAL_FOTO
  if (material === 'Cristal') {
    if (!['BCO', 'CRISTAL_FOTO'].includes(tratamientoKey)) return [];
  }

  // POLAR y POLAR_ESPEJO: solo monofocal/esf-cil + CR-39/Poli
  if (['POLAR', 'POLAR_ESPEJO'].includes(tratamientoKey)) {
    if (!['monofocal', 'monofocalEsfCil'].includes(baseKey)) return [];
    if (!['CR-39', 'Policarbonato'].includes(material))      return [];
  }

  // TRANSITIONS: variantes por material
  if (tratamientoKey === 'TRANSITIONS') {
    const vars = trt.variantsByMaterial?.[material];
    if (!vars || !vars.length) return [];
    return vars.map(v => ({ tratamiento: trt.label, variante: v }));
  }

  if (!trt.variants || !trt.variants.length) {
    return [{ tratamiento: trt.label, variante: '' }];
  }

  return trt.variants.map(v => ({ tratamiento: trt.label, variante: v }));
}

function buildAllSheetPayloads() {
  const list = [];
  for (const [baseKey, baseCfg] of Object.entries(BASES_CONFIG)) {
    for (const material of baseCfg.materiales) {
      for (const tratamientoKey of baseCfg.tratamientos) {
        for (const { tratamiento, variante } of resolveVariants(baseKey, material, tratamientoKey)) {
          const displayTrat = composeTratamientoDisplay(tratamiento, variante);
          const nombre      = [baseCfg.label, material, displayTrat].filter(Boolean).join(' | ');
          list.push({
            nombre,
            baseKey,
            material,
            tipo_matriz:  baseCfg.tipo_matriz,
            tratamiento:  tratamiento || null,
            variante:     variante    || null,
            tratamientos: displayTrat ? [displayTrat] : [],
            proveedor:    { id: null, name: '' },
            marca:        { id: null, name: '' },
            meta:         { observaciones: '', notas: '' }
          });
        }
      }
    }
  }
  return list;
}

async function createEmptyMatrix(sheet) {
  const ModelByTipo = {
    BASE:     MatrixBase,
    SPH_CYL:  MatrixSphCyl,
    SPH_ADD:  MatrixBifocal,
    BASE_ADD: MatrixProgresivo
  };
  const Model = ModelByTipo[sheet.tipo_matriz];
  if (!Model) return;
  await Model.findOneAndUpdate(
    { sheet: sheet._id },
    { $setOnInsert: { sheet: sheet._id, tipo_matriz: sheet.tipo_matriz, cells: new Map() } },
    { upsert: true, new: true }
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const MONGO_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI   ||
    'mongodb://localhost:27017/optica';

  await mongoose.connect(MONGO_URI);
  console.log('✅  MongoDB conectado');
  if (DRY_RUN) console.log('🔵  DRY-RUN activado — no se escribirá nada\n');
  if (FORCE)   console.log('🟡  FORCE — se recrearán planillas existentes\n');

  const actor  = { userId: 'seed-script', name: 'Seed Script' };
  const models = { MatrixBase, MatrixSphCyl, MatrixBifocal, MatrixProgresivo };

  const allPayloads = buildAllSheetPayloads();

  // Resumen por tipo
  const byTipo = {};
  for (const p of allPayloads) byTipo[p.tipo_matriz] = (byTipo[p.tipo_matriz] || 0) + 1;
  console.log('📊  Combinaciones a sembrar:');
  for (const [tipo, n] of Object.entries(byTipo))
    console.log(`     ${tipo.padEnd(10)} → ${n}`);
  console.log(`     ${'TOTAL'.padEnd(10)} → ${allPayloads.length}\n`);

  let created = 0, skipped = 0, errors = 0;

  for (const payload of allPayloads) {
    try {
      // ── Detección de duplicados ────────────────────────────────────────────
      const existing = await InventorySheet.findOne({
        nombre:      payload.nombre,
        material:    payload.material,
        tipo_matriz: payload.tipo_matriz,
        isDeleted:   { $ne: true }
      });

      if (existing && !FORCE) {
        process.stdout.write(`  ⏩  SKIP  ${payload.nombre}\n`);
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        process.stdout.write(`  🔵  DRY   ${payload.nombre}\n`);
        created++;
        continue;
      }

      // ── FORCE: borrar existente ────────────────────────────────────────────
      if (existing && FORCE) {
        await InventorySheet.deleteOne({ _id: existing._id });
        for (const M of [MatrixBase, MatrixSphCyl, MatrixBifocal, MatrixProgresivo])
          await M.deleteOne({ sheet: existing._id }).catch(() => {});
      }

      // ── ✅ GENERAR SKU ANTES DE INSERTAR ───────────────────────────────────
      // makeUniqueSheetSku garantiza unicidad y evita que sku quede null,
      // lo que provocaba E11000 dup key en el índice sku_1.
      const skuContext = {
        proveedor:    payload.proveedor,
        marca:        payload.marca,
        tipo_matriz:  payload.tipo_matriz,
        baseKey:      payload.baseKey,
        material:     payload.material,
        tratamientos: payload.tratamientos
      };
      const sku = await makeUniqueSheetSku(InventorySheet, skuContext);

      // ── Crear InventorySheet ───────────────────────────────────────────────
      const sheet = await InventorySheet.create({
        ...payload,
        sku,          // ← nunca null
        owner:     actor,
        createdBy: actor,
        updatedBy: actor
      });

      // ── Crear estructura de matriz ─────────────────────────────────────────
      if (seedRootForSheet) {
        await seedRootForSheet(models, sheet, actor);
      } else {
        await createEmptyMatrix(sheet);
      }

      // ── Auditoría ──────────────────────────────────────────────────────────
      await InventoryChangeLog.create({
        sheet:       sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type:        'SHEET_CREATE',
        details: {
          nombre:      sheet.nombre,
          sku:         sheet.sku,
          seedScript:  true,
          baseKey:     sheet.baseKey,
          material:    sheet.material,
          tratamiento: sheet.tratamiento,
          variante:    sheet.variante
        },
        actor
      });

      process.stdout.write(
        `  ✅  ${sheet.tipo_matriz.padEnd(9)}` +
        ` | ${sheet.sku.padEnd(14)}` +
        ` | ${sheet.material.padEnd(15)}` +
        ` | ${sheet.nombre}\n`
      );
      created++;

    } catch (err) {
      console.error(`  ❌  ERROR: ${payload.nombre}\n      ${err.message}`);
      errors++;
    }
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`  ✅ Creadas  : ${created}`);
  console.log(`  ⏩ Omitidas : ${skipped}`);
  console.log(`  ❌ Errores  : ${errors}`);
  console.log('══════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('MongoDB desconectado. Seed finalizado.');
  process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});