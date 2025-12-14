// src/inventory/utils/sku.js
const crypto = require("crypto");

const skuPart = (s, max = 10) => {
  const raw = String(s ?? "X")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toUpperCase();
  return (raw || "X").slice(0, max);
};

const skuAbbrev = (s, len = 3) => {
  if (!s) return "X".slice(0, len);
  const tokens = String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((t) => t.toUpperCase());
  if (!tokens.length) return "X".slice(0, len);

  if (tokens.length >= 2) {
    const initials = tokens
      .slice(0, 3)
      .map((t) => t[0])
      .join("");
    return (initials || tokens[0].slice(0, len)).slice(0, len);
  }
  return tokens[0].slice(0, len);
};

// candidato: PROV-MAR-TIP-MAT-BASE-TRT-HEX4
const makeSheetSkuCandidate = (sheetLike) => {
  const prov = skuAbbrev(
    sheetLike?.proveedor?.name || sheetLike?.proveedor || "PROV",
    3
  );
  const marc = skuAbbrev(
    sheetLike?.marca?.name || sheetLike?.marca || "MAR",
    3
  );
  const tipo = skuAbbrev(sheetLike?.tipo_matriz || "X", 3);
  const mat = skuAbbrev(sheetLike?.material || "MAT", 3);
  const base = skuAbbrev(sheetLike?.baseKey || "BAS", 3);

  const trat =
    Array.isArray(sheetLike?.tratamientos) && sheetLike.tratamientos.length
      ? skuAbbrev(sheetLike.tratamientos.join("-"), 3)
      : skuAbbrev(String(sheetLike?.tratamientos || ""), 3);

  const rnd = crypto.randomBytes(2).toString("hex").toUpperCase(); // HEX4

  const parts = [prov, marc, tipo];
  if (mat) parts.push(mat);
  if (base) parts.push(base);
  if (trat) parts.push(trat);
  parts.push(rnd);

  return parts.join("-");
};

/**
 * Genera un SKU único.
 * ✅ excludeId: ignora ese _id al checar colisiones (ideal para PATCH regenerando el SKU del mismo doc)
 */
const makeUniqueSheetSku = async (InventorySheetModel, sheetLike, excludeId = null) => {
  for (let i = 0; i < 10; i++) {
    const cand = makeSheetSkuCandidate(sheetLike);

    const query = { sku: cand };
    if (excludeId) query._id = { $ne: excludeId };

    const exists = await InventorySheetModel.exists(query);
    if (!exists) return cand;
  }

  // fallback: menos bonito pero altamente único
  const prov = skuPart(sheetLike?.proveedor?.name || sheetLike?.proveedor || "PROV", 8);
  const marc = skuPart(sheetLike?.marca?.name || sheetLike?.marca || "MAR", 8);

  let base = `${prov}-${marc}-${Date.now().toString(36).toUpperCase()}`;

  // por si acaso, asegurar unicidad del fallback también (con excludeId)
  for (let i = 0; i < 10; i++) {
    const query = { sku: base };
    if (excludeId) query._id = { $ne: excludeId };

    const exists = await InventorySheetModel.exists(query);
    if (!exists) return base;

    base = `${prov}-${marc}-${Date.now().toString(36).toUpperCase()}-${(i + 1)
      .toString(36)
      .toUpperCase()}`;
  }

  // último recurso: random fuerte
  return `${prov}-${marc}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

/**
 * Si no tiene SKU, lo crea.
 * ✅ excludeId opcional por si lo llamas desde flows que regeneran/validan evitando self-collision.
 */
const ensureSheetSku = async (InventorySheetModel, sheetDoc, sheetLikeForSku, excludeId = null) => {
  if (!sheetDoc) return null;
  if (sheetDoc.sku) return sheetDoc;

  const like = sheetLikeForSku || sheetDoc;
  sheetDoc.sku = await makeUniqueSheetSku(InventorySheetModel, like, excludeId || sheetDoc._id);
  await sheetDoc.save();
  return sheetDoc;
};

module.exports = {
  skuPart,
  skuAbbrev,
  makeSheetSkuCandidate,
  makeUniqueSheetSku,
  ensureSheetSku,
};
