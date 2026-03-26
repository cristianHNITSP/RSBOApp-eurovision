// src/inventory/constants/defaultRanges.js
//
// Rangos de fallback por tipo_matriz.
// La fuente de verdad por baseKey esta en axisConfig.js (PER_BASE_AXIS).
// Estos valores se usan SOLO cuando no hay axisCfg per-base disponible.
// Son rangos uniformes simplificados; axisConfig maneja los pasos irregulares.
module.exports = {
  BASE: {
    base: { start: 0, end: 8, step: 0.5 },
  },
  SPH_CYL: {
    sph: { start: -6, end: 8, step: 0.25 },
    cyl: { start: -6, end: 0, step: 0.25 },
  },
  SPH_CYL_AXIS: {
    sph:  { start: -10, end: 6,     step: 0.25 },
    cyl:  { start: -2.25, end: -0.75, step: 0.5 },
    axis: { start: 180, end: 10,    step: 10 },
  },
  SPH_ADD: {
    sph: { start: -3, end: 11, step: 0.25 },
    add: { start: 1,  end: 4,  step: 0.25 },
  },
  BASE_ADD: {
    base: { start: 0, end: 3, step: 0.5 },
    add:  { start: 1, end: 4, step: 0.25 },
  },
};
