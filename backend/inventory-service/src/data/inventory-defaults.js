/**
 * @fileoverview Valores por defecto y rangos de matrices para el inventario.
 */

const DEFAULT_RANGES_BY_TIPO = {
  BASE: { base: { start: 0, end: 8, step: 0.5 } },
  SPH_CYL: {
    sph: { start: -6, end: 6, step: 0.25 },
    cyl: { start: -6, end: 6, step: 0.25 }
  },
  SPH_ADD: {
    sph: { start: -6, end: 6, step: 0.25 },
    add: { start: 0, end: 4, step: 0.25 }
  },
  BASE_ADD: {
    base: { start: 0, end: 8, step: 0.5 },
    add: { start: 0, end: 4, step: 0.25 }
  }
};

const DEFAULT_EXPIRY_MONTHS = 24;

module.exports = {
  DEFAULT_RANGES_BY_TIPO,
  DEFAULT_EXPIRY_MONTHS
};
