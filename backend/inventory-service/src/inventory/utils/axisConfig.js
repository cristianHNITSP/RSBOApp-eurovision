'use strict';

/**
 * axisConfig.js
 *
 * Fuente unica de verdad para los ejes de cada tipo de lente.
 * Define los valores exactos (incluyendo pasos no uniformes) por baseKey.
 *
 * Usado por:
 *   - seed.service.js     → seedFullForSheet
 *   - tabs.js             → buildTabsForTipo (axis pre-computados para el frontend)
 */

const { to2 } = require('./numbers');

/** Genera un rango uniforme incluyente */
function rangeArr(start, end, step) {
  const out = [];
  const s = to2(start);
  const e = to2(end);
  const st = Math.abs(to2(step));
  if (st <= 0) return out;
  const eps = 1e-9;
  if (s <= e) {
    for (let v = s; v <= e + eps; v += st) out.push(to2(v));
  } else {
    for (let v = s; v >= e - eps; v -= st) out.push(to2(v));
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funciones constructoras de ejes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BASE monofocal / bifocal / Younger:
 *   0.25, luego 0.5 → 8 en paso 0.50
 *   8.5, 10, 12, 14 (paso irregular de 2 en 2)
 */
function buildBifocalBaseAxis() {
  return [0.25, ...rangeArr(0.5, 8, 0.5), 8.5, 10, 12, 14];
}

/**
 * BASE progresivo:
 *   0 → 3 en paso 0.50
 */
function buildProgresivoBaseAxis() {
  return rangeArr(0, 3, 0.5);
}

/**
 * SPH negativo monofocalEsfCil:
 *   0 → -6 en paso 0.25  (eje uniforme)
 *   -8, -10, -12, -14, -16 (paso irregular de 2 en 2)
 */
function buildEsfCilSphNegAxis() {
  return [...rangeArr(0, -6, 0.25), -8, -10, -12, -14, -16];
}

/**
 * SPH positivo monofocalEsfCil:
 *   0 → +8 en paso 0.25
 */
function buildEsfCilSphPosAxis() {
  return rangeArr(0, 8, 0.25);
}

/**
 * CYL display (valores absolutos, positivos):
 *   0 → 6 en paso 0.25
 * Nota: en el backend los CYL se almacenan negativos (convencion).
 *       El frontend usa estos valores para mostrar encabezados.
 */
function buildCylDisplayAxis() {
  return rangeArr(0, 6, 0.25);
}

/**
 * SPH para bifocal / bifocalFT / bifocalYounger:
 *   -3 → +11 en paso 0.25
 */
function buildBifocalSphAxis() {
  return rangeArr(-3, 11, 0.25);
}

/**
 * ADD para bifocales y progresivos:
 *   1 → maxAdd en paso 0.25
 */
function buildAddAxis(maxAdd) {
  return rangeArr(1, maxAdd, 0.25);
}

// ─────────────────────────────────────────────────────────────────────────────
// Funciones constructoras — Lentes de contacto tóricos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SPH negativo tórico CL:
 *   0 → -20 en paso 0.25 (uniforme)
 */
function buildToricoSphNegAxis() {
  return rangeArr(0, -20, 0.25);
}

/**
 * SPH positivo tórico CL:
 *   +0.75 → +10.0 en paso 0.25
 */
function buildToricoSphPosAxis() {
  return rangeArr(0.75, 10.0, 0.25);
}

/**
 * CYL display tórico CL (valores absolutos, positivos):
 *   0.75, 1.25, 1.75, 2.25  (paso 0.5)
 */
function buildToricoClCylAxis() {
  return rangeArr(0.75, 2.25, 0.5);
}

/**
 * Eje de grados (axis) tórico CL:
 *   180, 170, 160, ..., 10  (paso 10)
 */
function buildToricoAxisDegrees() {
  return rangeArr(180, 10, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapa por baseKey
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PER_BASE_AXIS
 * Cada entrada define los ejes de esa base.
 *
 * Claves:
 *   baseAxis   → eje BASE (tipo BASE o BASE_ADD)
 *   sphNegAxis → eje SPH lado negativo (tipo SPH_CYL)
 *   sphPosAxis → eje SPH lado positivo (tipo SPH_CYL)
 *   cylAxis    → eje CYL display (absoluto, positivo)
 *   sphAxis    → eje SPH completo (tipo SPH_ADD)
 *   addAxis    → eje ADD
 */
const PER_BASE_AXIS = {

  // ── BASE type ──────────────────────────────────────────────────────────────
  monofocal: {
    baseAxis: buildBifocalBaseAxis(),
  },

  // ── SPH_CYL type ───────────────────────────────────────────────────────────
  monofocalEsfCil: {
    sphNegAxis: buildEsfCilSphNegAxis(),   // [0, -0.25, ..., -6, -8, ..., -16]
    sphPosAxis: buildEsfCilSphPosAxis(),   // [0, 0.25, ..., 8]
    cylAxis:    buildCylDisplayAxis(),     // [0, 0.25, ..., 6]
  },

  // ── SPH_ADD types ──────────────────────────────────────────────────────────
  bifocal: {
    sphAxis: buildBifocalSphAxis(),        // [-3, -2.75, ..., 11]
    addAxis: buildAddAxis(4),              // [1, 1.25, ..., 4]
  },
  bifocalFT: {
    sphAxis: buildBifocalSphAxis(),
    addAxis: buildAddAxis(4),
  },
  bifocalYounger: {
    sphAxis: buildBifocalSphAxis(),
    addAxis: buildAddAxis(4),
  },

  // ── BASE_ADD type ──────────────────────────────────────────────────────────
  progresivo: {
    baseAxis: buildProgresivoBaseAxis(),   // [0, 0.5, 1, 1.5, 2, 2.5, 3]
    addAxis:  buildAddAxis(4),             // [1, 1.25, ..., 4]
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Lentes de contacto
  // ════════════════════════════════════════════════════════════════════════════

  // ── CL BASE (esférico) — mismos ejes que monofocal ────────────────────────
  esferico: {
    baseAxis: buildBifocalBaseAxis(),      // [0, 0.5, ..., 8, 8.5, 10, 12, 14]
  },

  // ── CL SPH_CYL (colorido) — mismos ejes que monofocalEsfCil ──────────────
  colorido: {
    sphNegAxis: buildEsfCilSphNegAxis(),   // [0, -0.25, ..., -6, -8, ..., -16]
    sphPosAxis: buildEsfCilSphPosAxis(),   // [0, 0.25, ..., 8]
    cylAxis:    buildCylDisplayAxis(),     // [0, 0.25, ..., 6]
  },

  // ── CL SPH_CYL_AXIS (tórico) ─────────────────────────────────────────────
  torico: {
    sphNegAxis: buildToricoSphNegAxis(),   // [0, -0.25, ..., -20]
    sphPosAxis: buildToricoSphPosAxis(),   // [0.75, 1.00, ..., 10]
    cylAxis:    buildToricoClCylAxis(),    // [0.75, 1.25, 1.75, 2.25]
    axisAxis:   buildToricoAxisDegrees(),  // [180, 170, ..., 10]
  },

  // ── CL BASE_ADD (multifocal) — mismos ejes que progresivo ─────────────────
  multifocal: {
    baseAxis: buildProgresivoBaseAxis(),   // [0, 0.5, 1, 1.5, 2, 2.5, 3]
    addAxis:  buildAddAxis(4),             // [1, 1.25, ..., 4]
  },
};

module.exports = { PER_BASE_AXIS };
