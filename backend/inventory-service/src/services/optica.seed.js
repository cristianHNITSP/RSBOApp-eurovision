/**
 * @fileoverview Seed idempotente del registro de categorías de óptica.
 *
 * Se ejecuta en cada arranque del contenedor. Inserta SOLO las categorías que
 * falten (upsert con $setOnInsert): nunca sobreescribe una categoría existente
 * ni elimina categorías añadidas manualmente por el usuario.
 */
const OpticaCategory = require("../models/optica/OpticaCategory");
const { OPTICA_CATEGORIES, OPTICA_STOCK_THRESHOLDS } = require("../data/optica.constants");

async function seedOpticaCategories() {
  try {
    // 1) Upsert idempotente de las categorías (no pisa ediciones manuales).
    const ops = OPTICA_CATEGORIES.map((c) => ({
      updateOne: {
        filter: { key: c.key },
        update: {
          $setOnInsert: {
            key: c.key,
            model: c.model,
            label: c.label,
            icon: c.icon,
            order: c.order,
            skuPrefix: c.skuPrefix,
            hasStock: c.hasStock,
            stockThresholds: c.stockThresholds || OPTICA_STOCK_THRESHOLDS,
            searchFields: c.searchFields || [],
            dictionaries: c.dictionaries || {},
            active: true,
          },
        },
        upsert: true,
      },
    }));

    const result = await OpticaCategory.bulkWrite(ops, { ordered: false });
    const inserted = result.upsertedCount || 0;

    // 2) Backfill: categorías ya existentes sin skuPrefix/dictionaries (de versiones
    //    previas) reciben los valores por defecto SIN pisar las que ya los tengan.
    const backfill = OPTICA_CATEGORIES.map((c) => ({
      updateOne: {
        filter: {
          key: c.key,
          $or: [
            { skuPrefix: { $in: [null, "", "OPT"] } },
            { dictionaries: { $exists: false } },
            { dictionaries: {} },
            { stockThresholds: { $exists: false } },
          ],
        },
        update: {
          $set: {
            skuPrefix: c.skuPrefix,
            dictionaries: c.dictionaries || {},
            stockThresholds: c.stockThresholds || OPTICA_STOCK_THRESHOLDS,
          },
        },
      },
    }));
    const bf = await OpticaCategory.bulkWrite(backfill, { ordered: false });

    console.log(
      inserted > 0
        ? `✅ Óptica: sembradas ${inserted} categoría(s) nueva(s)`
        : `ℹ️  Óptica: categorías ya existen` +
            (bf.modifiedCount ? ` — backfill de diccionarios en ${bf.modifiedCount}` : " — sin cambios")
    );
  } catch (err) {
    console.error("❌ optica.seed error:", err.message);
  }
}

module.exports = { seedOpticaCategories };
