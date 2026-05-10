const crypto = require("crypto");

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
    const initials = tokens.slice(0, 3).map((t) => t[0]).join("");
    return (initials || tokens[0].slice(0, len)).slice(0, len);
  }
  return tokens[0].slice(0, len);
};

const generateSku = (data) => {
  const prov = skuAbbrev(data.proveedor?.name || data.proveedor || "PROV", 3);
  const marc = skuAbbrev(data.marca?.name || data.marca || "MAR", 3);
  const tipo = skuAbbrev(data.tipo_matriz || data.tipo || "X", 3);
  const mat  = skuAbbrev(data.material || "MAT", 3);
  const rnd  = crypto.randomBytes(2).toString("hex").toUpperCase();

  return `${prov}-${marc}-${tipo}-${mat}-${rnd}`;
};

const generateFolio = (prefix = "GEN") => {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rnd  = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}-${date}-${rnd}`;
};

const autoGenerateHook = (prefix, field = "sku") => async (request) => {
  if (request.method === "post" && !request.payload[field]) {
    if (field === "sku") {
      request.payload[field] = generateSku(request.payload);
    } else {
      request.payload[field] = generateFolio(prefix);
    }
  }
  return request;
};

module.exports = { generateSku, generateFolio, autoGenerateHook };
