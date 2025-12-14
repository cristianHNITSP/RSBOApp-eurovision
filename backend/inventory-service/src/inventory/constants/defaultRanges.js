// src/inventory/constants/defaultRanges.js
module.exports = {
  BASE: { base: { start: 0, end: 8, step: 0.5 } },
  SPH_CYL: {
    sph: { start: -6, end: 6, step: 0.25 },
    cyl: { start: -6, end: 0, step: 0.25 },
  },
  SPH_ADD: {
    sph: { start: -6, end: 6, step: 0.25 },
    add: { start: 1, end: 6, step: 0.25 },
  },
  BASE_ADD: {
    base: { start: -0.25, end: 8, step: 0.25 },
    add: { start: 1, end: 4, step: 0.25 },
  },
};
