/**
 * @fileoverview Helpers de validación reutilizables (express-validator).
 * Contrato común: en fallo responde 400 { ok:false, errors:[...] }.
 *
 * @module validators/_helpers
 */
const mongoose = require("mongoose");
const { body, param, query, validationResult } = require("express-validator");

/** Corta la cadena con 400 si hay errores de validación. */
function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }
  next();
}

/** :param debe ser un ObjectId de Mongo válido. */
const objectIdParam = (name) =>
  param(name).custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage(`${name} inválido`);

/** String acotado en body. */
const boundedString = (field, { min = 0, max = 255, required = false, location = body } = {}) => {
  let chain = location(field);
  chain = required ? chain.exists({ checkNull: true }).withMessage(`${field} requerido`) : chain.optional({ nullable: true });
  return chain.bail().isString().withMessage(`${field} debe ser texto`).trim().isLength({ min, max })
    .withMessage(`${field} debe tener entre ${min} y ${max} caracteres`);
};

/** Número ≥ 0 en body. */
const nonNegativeNumber = (field, { required = false, integer = false } = {}) => {
  let chain = body(field);
  chain = required ? chain.exists().withMessage(`${field} requerido`) : chain.optional({ nullable: true });
  const fn = integer ? "isInt" : "isFloat";
  return chain.bail()[fn]({ min: 0 }).withMessage(`${field} debe ser un número ≥ 0`);
};

/** Campo restringido a un conjunto de valores. */
const enumField = (field, allowed, { required = false, location = body } = {}) => {
  let chain = location(field);
  chain = required ? chain.exists().withMessage(`${field} requerido`) : chain.optional({ nullable: true });
  return chain.bail().isIn(allowed).withMessage(`${field} inválido`);
};

/** Booleano. */
const boolField = (field, { location = body } = {}) =>
  location(field).optional({ nullable: true }).isBoolean().withMessage(`${field} debe ser booleano`);

/** Fecha ISO8601. */
const isoDate = (field, { required = false } = {}) => {
  let chain = body(field);
  chain = required ? chain.exists().withMessage(`${field} requerido`) : chain.optional({ nullable: true });
  return chain.bail().isISO8601().withMessage(`${field} debe ser una fecha válida`).toDate();
};

/** Valida que un objeto serializado no exceda `maxBytes`. */
const boundedObjectBytes = (field, maxBytes, { location = body } = {}) =>
  location(field).custom((v) => {
    if (v == null) return true;
    if (typeof v !== "object") throw new Error(`${field} debe ser un objeto`);
    if (Buffer.byteLength(JSON.stringify(v), "utf8") > maxBytes) {
      throw new Error(`${field} excede el tamaño máximo (${maxBytes} bytes)`);
    }
    return true;
  });

module.exports = {
  runValidation, objectIdParam, boundedString, nonNegativeNumber,
  enumField, boolField, isoDate, boundedObjectBytes, body, param, query,
};
