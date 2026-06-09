"use strict";

const { OpticaProduct } = require("../../../models/optica/OpticaProduct");
const { OPTICA_CATEGORIES, CATEGORY_BY_KEY, KEY_BY_MODEL } = require("../../../data/optica.constants");
const { escapeRegex } = require("../text.util");

// Unión de los searchFields de todas las categorías (una sola colección física).
const SEARCH_FIELDS = [...new Set(OPTICA_CATEGORIES.flatMap((c) => c.searchFields))];

const PROJECTION = SEARCH_FIELDS.reduce(
  (acc, f) => ((acc[f] = 1), acc),
  { __t: 1, marca: 1, modelo: 1, nombre: 1, sku: 1, stock: 1 }
);

/** Etiqueta legible independiente de la categoría. */
function labelOf(doc) {
  const main = [doc.marca, doc.modelo || doc.nombre].filter(Boolean).join(" ").trim();
  return main || doc.nombre || doc.sku || "Producto";
}

/**
 * Provider de ÓPTICA: busca en `opticaproducts` (modelo base con discriminators)
 * por la unión de searchFields. Devuelve `categoria` (key) + `sku` para el deep-link
 * (Optica.vue → focusBySku aísla el producto).
 */
const opticaProvider = {
  key: "optica",
  async search({ q, limit }) {
    const rx = new RegExp(escapeRegex(q), "i");
    const docs = await OpticaProduct
      .find({ isDeleted: { $ne: true }, $or: SEARCH_FIELDS.map((f) => ({ [f]: rx })) }, PROJECTION)
      .lean()
      .limit(limit);

    return docs.map((d) => {
      const categoria = KEY_BY_MODEL[d.__t] || null;
      return {
        type: "optica",
        id: String(d._id),
        sku: d.sku || "",
        categoria,
        label: labelOf(d),
        tipoLabel: CATEGORY_BY_KEY[categoria]?.label || categoria || "Óptica",
        icon: CATEGORY_BY_KEY[categoria]?.icon || "glasses",
        stock: typeof d.stock === "number" ? d.stock : null,
      };
    });
  },
};

module.exports = { opticaProvider };
