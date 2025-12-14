// src/inventory/utils/keys.js
const { to2 } = require("./numbers");

const normNum = (v) =>
  v === null || v === undefined
    ? "x"
    : Number(v) < 0
    ? `m${String(Math.abs(Number(v)).toFixed(2)).replace(".", "d")}`
    : String(Number(v).toFixed(2)).replace(".", "d");

const normStr = (s) => s || "x";

const denormNum = (s) => {
  if (s === "x") return null;
  if (String(s).startsWith("m"))
    return -Number(String(s).slice(1).replace("d", "."));
  return Number(String(s).replace("d", "."));
};

const keyBase = (base) => `${normNum(base)}`;
const keySphCyl = (sph, cyl) => `${normNum(sph)}|${normNum(cyl)}`;
const keyBifocal = (sph, add, bi, bd) =>
  `${normNum(sph)}|${normNum(add)}|${normNum(bi)}|${normNum(bd)}`;
const keyProg = (bi, bd, add) =>
  `${normNum(bi)}|${normNum(bd)}|${normNum(add)}`;

const parseKey = (key) => {
  try {
    return key.split("|").map(denormNum);
  } catch {
    return [null, null, null, null];
  }
};

// convención CYL: fuerza negativo si viene positivo
const normalizeCylConvention = (cyl) => {
  const c = to2(cyl);
  if (!Number.isFinite(c)) return c;
  return c > 0 ? to2(-Math.abs(c)) : c;
};

module.exports = {
  normNum,
  normStr,
  denormNum,
  keyBase,
  keySphCyl,
  keyBifocal,
  keyProg,
  parseKey,
  normalizeCylConvention,
};
