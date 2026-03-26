// src/inventory/utils/tabs.js
const PHYSICAL_LIMITS = require("../constants/physicalLimits");
const defaultRangesByTipo = require("../constants/defaultRanges");
const { to2 } = require("./numbers");
const { frange, clampRange, pickRange, rangeMinMax } = require("./ranges");
const { PER_BASE_AXIS } = require("./axisConfig");

/**
 * buildTabsForTipo(sheetOrTipo)
 *
 * Genera los tabs para el frontend con sus rangos y ejes pre-computados.
 * Cuando se pasa un sheet completo (con baseKey), se usan los ejes
 * de axisConfig.js como fuente de verdad.
 * Cuando se pasa solo un string de tipo, se usan los defaultRanges.
 *
 * Cada tab incluye:
 *   - id / label
 *   - ranges  → para compatibilidad y validacion
 *   - axis    → arrays pre-computados para el frontend (no genera ejes propiamente)
 */
const buildTabsForTipo = (sheetOrTipo) => {
  if (!sheetOrTipo) return [];
  const tipo =
    typeof sheetOrTipo === "string" ? sheetOrTipo : sheetOrTipo.tipo_matriz;
  if (!tipo) return [];

  // Ejes per-baseKey (fuente de verdad cuando hay sheet completo)
  const baseKey = typeof sheetOrTipo === "object" ? sheetOrTipo.baseKey : null;
  const axisCfg = (baseKey && PER_BASE_AXIS[baseKey]) || {};

  // Rangos del sheet (meta.ranges) o defaults por tipo
  const def = defaultRangesByTipo[tipo] || {};
  const metaRanges =
    typeof sheetOrTipo === "object" &&
    sheetOrTipo?.meta?.ranges &&
    sheetOrTipo.meta.ranges[tipo] &&
    typeof sheetOrTipo.meta.ranges[tipo] === "object"
      ? sheetOrTipo.meta.ranges[tipo]
      : {};

  const eff = {
    base: pickRange(metaRanges.base, def.base),
    sph:  pickRange(metaRanges.sph,  def.sph),
    cyl:  pickRange(metaRanges.cyl,  def.cyl),
    add:  pickRange(metaRanges.add,  def.add),
  };

  switch (tipo) {

    // ── SPH_CYL (monofocalEsfCil) ──────────────────────────────────────────
    case "SPH_CYL": {
      // CYL axis (display, absoluto) — usa axisCfg si disponible
      const cylAxis = axisCfg.cylAxis
        ? axisCfg.cylAxis
        : (() => {
            const cylR = rangeMinMax(eff.cyl || def.cyl) || { min: -6, max: 0, step: 0.25 };
            const cylClamp = clampRange(cylR.min, cylR.max, PHYSICAL_LIMITS.CYL) || { min: -6, max: 0 };
            const cylAbsMax = to2(Math.abs(Math.min(cylClamp.min, 0)));
            return frange(0, cylAbsMax, cylR.step || 0.25).map(to2);
          })();

      // SPH axes — usa axisCfg (con pasos no uniformes) si disponible
      if (axisCfg.sphNegAxis && axisCfg.sphPosAxis) {
        return [
          {
            id: "sph-neg",
            label: "SPH (-)",
            ranges: { sph: { start: 0, end: to2(Math.min(...axisCfg.sphNegAxis)), step: 0.25 }, cyl: { start: -6, end: 0, step: 0.25 } },
            axis: { sph: axisCfg.sphNegAxis, cyl: cylAxis },
          },
          {
            id: "sph-pos",
            label: "SPH (+)",
            ranges: { sph: { start: 0, end: to2(Math.max(...axisCfg.sphPosAxis)), step: 0.25 }, cyl: { start: -6, end: 0, step: 0.25 } },
            axis: { sph: axisCfg.sphPosAxis, cyl: cylAxis },
          },
        ];
      }

      // Fallback: rangos uniformes
      const sphR = rangeMinMax(eff.sph || def.sph) || { min: -6, max: 6, step: 0.25 };
      const sphClamp = clampRange(sphR.min, sphR.max, PHYSICAL_LIMITS.SPH) || { min: -6, max: 6 };
      const negEnd = sphClamp.min < 0 ? to2(sphClamp.min) : to2(-Math.max(0.25, sphR.step));
      const posEnd = sphClamp.max > 0 ? to2(sphClamp.max) : 0;
      const sphStep = sphR.step || 0.25;
      const cylR = rangeMinMax(eff.cyl || def.cyl) || { min: -6, max: 0, step: 0.25 };
      const cylStep = cylR.step || 0.25;
      const cylStart = to2(Math.min((clampRange(cylR.min, cylR.max, PHYSICAL_LIMITS.CYL) || { min: -6, max: 0 }).min, 0));

      return [
        {
          id: "sph-neg",
          label: "SPH (-)",
          ranges: { sph: { start: 0, end: negEnd, step: sphStep }, cyl: { start: cylStart, end: 0, step: cylStep } },
          axis: { sph: frange(0, negEnd, sphStep).map(to2), cyl: cylAxis },
        },
        {
          id: "sph-pos",
          label: "SPH (+)",
          ranges: { sph: { start: 0, end: posEnd, step: sphStep }, cyl: { start: cylStart, end: 0, step: cylStep } },
          axis: { sph: frange(0, posEnd, sphStep).map(to2), cyl: cylAxis },
        },
      ];
    }

    // ── SPH_ADD (bifocal, bifocalFT, bifocalYounger) ───────────────────────
    case "SPH_ADD": {
      const addAxis = axisCfg.addAxis
        ? axisCfg.addAxis
        : (() => {
            const addR = rangeMinMax(eff.add || def.add) || { min: 1, max: 6, step: 0.25 };
            const addClamp = clampRange(addR.min, addR.max, PHYSICAL_LIMITS.ADD) || { min: 1, max: 6 };
            return frange(addClamp.min, addClamp.max, addR.step || 0.25).map(to2);
          })();

      if (axisCfg.sphAxis) {
        const neg = axisCfg.sphAxis.filter((v) => v <= 0);
        const pos = axisCfg.sphAxis.filter((v) => v >= 0);
        return [
          {
            id: "sph-neg",
            label: "SPH (-)",
            ranges: { sph: { start: 0, end: to2(Math.min(...neg)), step: 0.25 }, addCols: addAxis },
            axis: { sph: neg.sort((a, b) => b - a), add: addAxis },
          },
          {
            id: "sph-pos",
            label: "SPH (+)",
            ranges: { sph: { start: 0, end: to2(Math.max(...pos)), step: 0.25 }, addCols: addAxis },
            axis: { sph: pos.sort((a, b) => a - b), add: addAxis },
          },
        ];
      }

      // Fallback: rangos uniformes
      const sphR = rangeMinMax(eff.sph || def.sph) || { min: -6, max: 6, step: 0.25 };
      const sphClamp = clampRange(sphR.min, sphR.max, PHYSICAL_LIMITS.SPH) || { min: -6, max: 6 };
      const negEnd = sphClamp.min < 0 ? to2(sphClamp.min) : to2(-0.25);
      const posEnd = sphClamp.max > 0 ? to2(sphClamp.max) : 0;
      const sphStep = sphR.step || 0.25;

      return [
        {
          id: "sph-neg",
          label: "SPH (-)",
          ranges: { sph: { start: 0, end: negEnd, step: sphStep }, addCols: addAxis },
          axis: { sph: frange(0, negEnd, sphStep).map(to2), add: addAxis },
        },
        {
          id: "sph-pos",
          label: "SPH (+)",
          ranges: { sph: { start: 0, end: posEnd, step: sphStep }, addCols: addAxis },
          axis: { sph: frange(0, posEnd, sphStep).map(to2), add: addAxis },
        },
      ];
    }

    // ── BASE (monofocal) ───────────────────────────────────────────────────
    case "BASE": {
      if (axisCfg.baseAxis) {
        const neg = axisCfg.baseAxis.filter((v) => v <= 0);
        const pos = axisCfg.baseAxis.filter((v) => v >= 0);
        return [
          {
            id: "base-neg",
            label: "BASE (-)",
            ranges: { base: { start: 0, end: neg.length > 1 ? to2(Math.min(...neg)) : to2(-0.5), step: 0.5 } },
            axis: { base: neg.sort((a, b) => b - a) },
          },
          {
            id: "base-pos",
            label: "BASE (+)",
            ranges: { base: { start: 0, end: to2(Math.max(...pos)), step: 0.5 } },
            axis: { base: pos.sort((a, b) => a - b) },
          },
        ];
      }

      // Fallback
      const baseR = rangeMinMax(eff.base || def.base) || { min: 0, max: 8, step: 0.5 };
      const baseClamp = clampRange(baseR.min, baseR.max, PHYSICAL_LIMITS.BASE) || { min: 0, max: 8 };
      const negEnd = baseClamp.min < 0 ? to2(baseClamp.min) : to2(-0.25);
      const posEnd = baseClamp.max > 0 ? to2(baseClamp.max) : 0;
      const baseStep = baseR.step || 0.5;

      return [
        {
          id: "base-neg",
          label: "BASE (-)",
          ranges: { base: { start: 0, end: negEnd, step: baseStep } },
          axis: { base: frange(0, negEnd, baseStep).map(to2) },
        },
        {
          id: "base-pos",
          label: "BASE (+)",
          ranges: { base: { start: 0, end: posEnd, step: baseStep } },
          axis: { base: frange(0, posEnd, baseStep).map(to2) },
        },
      ];
    }

    // ── BASE_ADD (progresivo) ──────────────────────────────────────────────
    case "BASE_ADD": {
      const addAxis = axisCfg.addAxis
        ? axisCfg.addAxis
        : (() => {
            const addR = rangeMinMax(eff.add || def.add) || { min: 1, max: 4, step: 0.25 };
            const addClamp = clampRange(addR.min, addR.max, PHYSICAL_LIMITS.ADD) || { min: 1, max: 4 };
            return frange(addClamp.min, addClamp.max, addR.step || 0.25).map(to2);
          })();

      if (axisCfg.baseAxis) {
        const neg = axisCfg.baseAxis.filter((v) => v <= 0);
        const pos = axisCfg.baseAxis.filter((v) => v >= 0);
        return [
          {
            id: "base-neg",
            label: "BASE (-) / ADD (+)",
            ranges: { base: { start: 0, end: neg.length > 1 ? to2(Math.min(...neg)) : to2(-0.25), step: 0.25 }, addCols: addAxis },
            axis: { base: neg.sort((a, b) => b - a), add: addAxis },
          },
          {
            id: "base-pos",
            label: "BASE (+) / ADD (+)",
            ranges: { base: { start: 0, end: to2(Math.max(...pos)), step: 0.5 }, addCols: addAxis },
            axis: { base: pos.sort((a, b) => a - b), add: addAxis },
          },
        ];
      }

      // Fallback
      const baseR = rangeMinMax(eff.base || def.base) || { min: -0.25, max: 8, step: 0.25 };
      const baseClamp = clampRange(baseR.min, baseR.max, PHYSICAL_LIMITS.BASE) || { min: -0.25, max: 8 };
      const negEnd = baseClamp.min < 0 ? to2(baseClamp.min) : to2(-0.25);
      const posEnd = baseClamp.max > 0 ? to2(baseClamp.max) : 0;
      const baseStep = baseR.step || 0.25;

      return [
        {
          id: "base-neg",
          label: "BASE (-) / ADD (+)",
          ranges: { base: { start: 0, end: negEnd, step: baseStep }, addCols: addAxis },
          axis: { base: frange(0, negEnd, baseStep).map(to2), add: addAxis },
        },
        {
          id: "base-pos",
          label: "BASE (+) / ADD (+)",
          ranges: { base: { start: 0, end: posEnd, step: baseStep }, addCols: addAxis },
          axis: { base: frange(0, posEnd, baseStep).map(to2), add: addAxis },
        },
      ];
    }

    // ── SPH_CYL_AXIS (tórico CL) ─────────────────────────────────────────────
    case "SPH_CYL_AXIS": {
      // CYL axis (display, absoluto)
      const cylAxis = axisCfg.cylAxis
        ? axisCfg.cylAxis
        : (() => {
            const cylR = rangeMinMax(eff.cyl || def.cyl) || { min: -6, max: 0, step: 0.25 };
            const cylClamp = clampRange(cylR.min, cylR.max, PHYSICAL_LIMITS.CYL) || { min: -6, max: 0 };
            const cylAbsMax = to2(Math.abs(Math.min(cylClamp.min, 0)));
            return frange(0, cylAbsMax, cylR.step || 0.25).map(to2);
          })();

      // AXIS degrees
      const axisAxis = axisCfg.axisAxis
        ? axisCfg.axisAxis
        : frange(180, 10, 10).map(to2);

      // SPH axes
      if (axisCfg.sphNegAxis && axisCfg.sphPosAxis) {
        return [
          {
            id: "sph-neg",
            label: "SPH (-)",
            ranges: { sph: { start: 0, end: to2(Math.min(...axisCfg.sphNegAxis)), step: 0.25 }, cyl: { start: -6, end: 0, step: 0.25 } },
            axis: { sph: axisCfg.sphNegAxis, cyl: cylAxis, degrees: axisAxis },
          },
          {
            id: "sph-pos",
            label: "SPH (+)",
            ranges: { sph: { start: to2(Math.min(...axisCfg.sphPosAxis)), end: to2(Math.max(...axisCfg.sphPosAxis)), step: 0.25 }, cyl: { start: -6, end: 0, step: 0.25 } },
            axis: { sph: axisCfg.sphPosAxis, cyl: cylAxis, degrees: axisAxis },
          },
        ];
      }

      // Fallback: rangos uniformes
      const sphR = rangeMinMax(eff.sph || def.sph) || { min: -20, max: 10, step: 0.25 };
      const sphClamp = clampRange(sphR.min, sphR.max, PHYSICAL_LIMITS.SPH) || { min: -20, max: 10 };
      const negEnd = sphClamp.min < 0 ? to2(sphClamp.min) : to2(-0.25);
      const posEnd = sphClamp.max > 0 ? to2(sphClamp.max) : 0;
      const sphStep = sphR.step || 0.25;

      return [
        {
          id: "sph-neg",
          label: "SPH (-)",
          ranges: { sph: { start: 0, end: negEnd, step: sphStep }, cyl: { start: -6, end: 0, step: 0.25 } },
          axis: { sph: frange(0, negEnd, sphStep).map(to2), cyl: cylAxis, degrees: axisAxis },
        },
        {
          id: "sph-pos",
          label: "SPH (+)",
          ranges: { sph: { start: 0, end: posEnd, step: sphStep }, cyl: { start: -6, end: 0, step: 0.25 } },
          axis: { sph: frange(0, posEnd, sphStep).map(to2), cyl: cylAxis, degrees: axisAxis },
        },
      ];
    }

    default:
      return [];
  }
};

module.exports = { buildTabsForTipo };
