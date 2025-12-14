// src/inventory/utils/tabs.js
const PHYSICAL_LIMITS = require("../constants/physicalLimits");
const defaultRangesByTipo = require("../constants/defaultRanges");
const { to2 } = require("./numbers");
const { frange, clampRange, pickRange, rangeMinMax } = require("./ranges");

/**
 * - Tabs salen de meta.ranges[tipo] si existe
 * - Si no existe, salen del defaultRangesByTipo (semilla)
 * - SIEMPRE clamp por PHYSICAL_LIMITS
 * - “0 arriba” se genera aquí (view logic)
 */
const buildTabsForTipo = (sheetOrTipo) => {
  if (!sheetOrTipo) return [];
  const tipo =
    typeof sheetOrTipo === "string" ? sheetOrTipo : sheetOrTipo.tipo_matriz;
  if (!tipo) return [];

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
    sph: pickRange(metaRanges.sph, def.sph),
    cyl: pickRange(metaRanges.cyl, def.cyl),
    add: pickRange(metaRanges.add, def.add),
  };

  switch (tipo) {
    case "SPH_CYL": {
      const sphR = rangeMinMax(eff.sph || def.sph) || {
        min: -6, max: 6, step: 0.25,
      };
      const cylR = rangeMinMax(eff.cyl || def.cyl) || {
        min: -6, max: 0, step: 0.25,
      };

      const sphClamp = clampRange(sphR.min, sphR.max, PHYSICAL_LIMITS.SPH) || {
        min: -6, max: 6,
      };
      const cylClamp = clampRange(cylR.min, cylR.max, PHYSICAL_LIMITS.CYL) || {
        min: -6, max: 0,
      };

      const negEnd =
        sphClamp.min < 0 ? to2(sphClamp.min) : to2(-Math.max(0.25, sphR.step));
      const posEnd = sphClamp.max > 0 ? to2(sphClamp.max) : 0;

      const cylStart = to2(Math.min(cylClamp.min, 0));
      const cylEnd = 0;

      return [
        {
          id: "sph-neg",
          label: "SPH (-)",
          ranges: {
            sph: { start: 0, end: negEnd, step: sphR.step || 0.25 },
            cyl: { start: cylStart, end: cylEnd, step: cylR.step || 0.25 },
          },
        },
        {
          id: "sph-pos",
          label: "SPH (+)",
          ranges: {
            sph: { start: 0, end: posEnd, step: sphR.step || 0.25 },
            cyl: { start: cylStart, end: cylEnd, step: cylR.step || 0.25 },
          },
        },
      ];
    }

    case "SPH_ADD": {
      const sphR = rangeMinMax(eff.sph || def.sph) || {
        min: -6, max: 6, step: 0.25,
      };
      const addR = rangeMinMax(eff.add || def.add) || {
        min: 1, max: 6, step: 0.25,
      };

      const sphClamp = clampRange(sphR.min, sphR.max, PHYSICAL_LIMITS.SPH) || {
        min: -6, max: 6,
      };
      const addClamp = clampRange(addR.min, addR.max, PHYSICAL_LIMITS.ADD) || {
        min: 1, max: 6,
      };

      const negEnd = sphClamp.min < 0 ? to2(sphClamp.min) : to2(-0.25);
      const posEnd = sphClamp.max > 0 ? to2(sphClamp.max) : 0;

      const addCols = frange(addClamp.min, addClamp.max, addR.step || 0.25);

      return [
        {
          id: "sph-neg",
          label: "SPH (-)",
          ranges: {
            sph: { start: 0, end: negEnd, step: sphR.step || 0.25 },
            addCols,
          },
        },
        {
          id: "sph-pos",
          label: "SPH (+)",
          ranges: {
            sph: { start: 0, end: posEnd, step: sphR.step || 0.25 },
            addCols,
          },
        },
      ];
    }

    case "BASE": {
      const baseR = rangeMinMax(eff.base || def.base) || {
        min: 0, max: 8, step: 0.5,
      };
      const baseClamp = clampRange(baseR.min, baseR.max, PHYSICAL_LIMITS.BASE) || {
        min: 0, max: 8,
      };

      const negEnd = baseClamp.min < 0 ? to2(baseClamp.min) : to2(-0.25);
      const posEnd = baseClamp.max > 0 ? to2(baseClamp.max) : 0;

      return [
        {
          id: "base-neg",
          label: "BASE (-)",
          ranges: { base: { start: 0, end: negEnd, step: baseR.step || 0.25 } },
        },
        {
          id: "base-pos",
          label: "BASE (+)",
          ranges: { base: { start: 0, end: posEnd, step: baseR.step || 0.25 } },
        },
      ];
    }

    case "BASE_ADD": {
      const baseR = rangeMinMax(eff.base || def.base) || {
        min: -0.25, max: 8, step: 0.25,
      };
      const addR = rangeMinMax(eff.add || def.add) || {
        min: 1, max: 4, step: 0.25,
      };

      const baseClamp = clampRange(baseR.min, baseR.max, PHYSICAL_LIMITS.BASE) || {
        min: -0.25, max: 8,
      };
      const addClamp = clampRange(addR.min, addR.max, PHYSICAL_LIMITS.ADD) || {
        min: 1, max: 4,
      };

      const negEnd = baseClamp.min < 0 ? to2(baseClamp.min) : to2(-0.25);
      const posEnd = baseClamp.max > 0 ? to2(baseClamp.max) : 0;

      const addCols = frange(addClamp.min, addClamp.max, addR.step || 0.25);

      return [
        {
          id: "base-neg",
          label: "BASE (-) / ADD (+)",
          ranges: {
            base: { start: 0, end: negEnd, step: baseR.step || 0.25 },
            addCols,
          },
        },
        {
          id: "base-pos",
          label: "BASE (+) / ADD (+)",
          ranges: {
            base: { start: 0, end: posEnd, step: baseR.step || 0.25 },
            addCols,
          },
        },
      ];
    }

    default:
      return [];
  }
};

module.exports = { buildTabsForTipo };
