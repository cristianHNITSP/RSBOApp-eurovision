// src/inventory/utils/barcode.js
const { BARCODE_PREFIX } = require("../constants/barcode");
const { fmt2 } = require("./numbers");
const { normNum, normStr } = require("./keys");

const hashToDigits = (str, length) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;

  let body = String(hash);
  if (body.length > length) body = body.slice(-length);
  else if (body.length < length) body = body.padStart(length, "0");
  return body;
};

const ean13CheckDigit = (body12) => {
  const digits = String(body12)
    .split("")
    .map((d) => parseInt(d, 10) || 0);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  const mod = sum % 10;
  return (10 - mod) % 10;
};

const makeSku = (_sheetId, tipo, coords = {}) => {
  switch (tipo) {
    case "BASE":
      return `BASE:${fmt2(coords.base)}`;
    case "SPH_CYL":
      return `SPH:${fmt2(coords.sph)}|CYL:${fmt2(coords.cyl)}`;
    case "SPH_CYL_AXIS":
      return `SPH:${fmt2(coords.sph)}|CYL:${fmt2(coords.cyl)}|AXIS:${coords.axis}`;
    case "SPH_ADD":
      return `BIF:SPH:${fmt2(coords.sph)}|ADD:${fmt2(coords.add)}|EYE:${
        coords.eye || "OD"
      }|BI:${fmt2(coords.base_izq)}|BD:${fmt2(coords.base_der)}`;
    case "BASE_ADD":
      return `PROG:BI:${fmt2(coords.base_izq)}|BD:${fmt2(
        coords.base_der
      )}|ADD:${fmt2(coords.add)}|EYE:${coords.eye || "OD"}`;
    default:
      return `SKU:${tipo || "X"}`;
  }
};

const makeCodebar = (sheetId, tipo, coords = {}) => {
  const core = [
    String(sheetId),
    tipo,
    normNum(coords.sph),
    normNum(coords.cyl),
    normNum(coords.add),
    normNum(coords.base),
    normStr(coords.eye),
    normNum(coords.base_izq),
    normNum(coords.base_der),
    normNum(coords.axis),
  ].join("|");

  const numericPart = hashToDigits(core, 12 - BARCODE_PREFIX.length);
  const body12 = `${BARCODE_PREFIX}${numericPart}`;
  return `${body12}${ean13CheckDigit(body12)}`;
};

module.exports = { makeSku, makeCodebar, hashToDigits, ean13CheckDigit };
