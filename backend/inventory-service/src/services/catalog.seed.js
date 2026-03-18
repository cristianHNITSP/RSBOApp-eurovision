/**
 * Seeds catalog with default bases and treatments if collections are empty.
 * Safe to call on every startup — idempotent.
 */

const CatalogBase      = require('../models/CatalogBase');
const CatalogTreatment = require('../models/CatalogTreatment');
const { TREATMENTS, BASES_CONFIG } = require('../seeds/catalog-data');

const DEFAULT_BASES      = Object.values(BASES_CONFIG);
const DEFAULT_TREATMENTS = Object.values(TREATMENTS);

async function seedCatalog() {
  try {
    const [baseCount, treatmentCount] = await Promise.all([
      CatalogBase.countDocuments(),
      CatalogTreatment.countDocuments(),
    ]);

    const ops = [];

    if (baseCount === 0) {
      ops.push(
        CatalogBase.insertMany(DEFAULT_BASES)
          .then(() => console.log(`✅ Catalog: seeded ${DEFAULT_BASES.length} bases`))
      );
    } else {
      console.log(`ℹ️  Catalog: ${baseCount} bases already exist — skipping seed`);
    }

    if (treatmentCount === 0) {
      ops.push(
        CatalogTreatment.insertMany(DEFAULT_TREATMENTS)
          .then(() => console.log(`✅ Catalog: seeded ${DEFAULT_TREATMENTS.length} treatments`))
      );
    } else {
      console.log(`ℹ️  Catalog: ${treatmentCount} treatments already exist — skipping seed`);
    }

    if (ops.length) await Promise.all(ops);
  } catch (err) {
    console.error('❌ catalog.seed error:', err);
  }
}

module.exports = { seedCatalog };
