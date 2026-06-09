// src/inventory/utils/qr.js
const { fmt2 } = require("./numbers");
const { normNum, normStr, denormNum } = require("./keys");

// Prefijo del QR interno, único por (hoja, dioptría, ojo).
const QR_PREFIX = "RSBO";

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

/**
 * Genera el código QR interno, único por (hoja, dioptría, ojo).
 *
 * Es DETERMINÍSTICO y SIN PÉRDIDA: incorpora todas las coordenadas normalizadas,
 * por lo que dos dioptrías/ojos distintos nunca producen el mismo QR y re-sembrar
 * la misma celda devuelve siempre el mismo valor (idempotente).
 */
const makeQr = (sheetId, tipo, coords = {}) =>
  [
    QR_PREFIX,
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

const denormStr = (s) => (s === "x" || s === undefined || s === null ? null : String(s));

/**
 * Inverso de `makeQr`: decodifica un QR interno a sus partes.
 * @returns {{ sheetId, tipo, coords }} o `null` si el formato no es válido.
 */
const parseQr = (qr) => {
  const raw = String(qr || "").trim();
  if (!raw) return null;
  const parts = raw.split("|");
  if (parts.length !== 11 || parts[0] !== QR_PREFIX) return null;

  const [, sheetId, tipo, sph, cyl, add, base, eye, base_izq, base_der, axis] = parts;
  if (!sheetId || !tipo) return null;

  return {
    sheetId,
    tipo,
    coords: {
      sph: denormNum(sph),
      cyl: denormNum(cyl),
      add: denormNum(add),
      base: denormNum(base),
      eye: denormStr(eye),
      base_izq: denormNum(base_izq),
      base_der: denormNum(base_der),
      axis: denormNum(axis),
    },
  };
};

module.exports = { makeSku, makeQr, parseQr, QR_PREFIX };
