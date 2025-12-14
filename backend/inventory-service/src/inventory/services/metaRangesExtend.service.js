// src/inventory/services/metaRangesExtend.service.js
const defaultRangesByTipo = require("../constants/defaultRanges");
const PHYSICAL_LIMITS = require("../constants/physicalLimits");
const { to2, isDef } = require("../utils/numbers");
const { clamp1, pickRange } = require("../utils/ranges");
const { normalizeCylConvention } = require("../utils/keys");

/**
 * ✅ NO usa defaults para limitar.
 * - defaultRanges solo como “punto de partida” si no hay meta aún
 * - se extiende con base en rows guardados
 * - clamp por PHYSICAL_LIMITS
 */
const maybeExtendMetaRangesFromRows = async (sheet, rows) => {
  if (!sheet || !Array.isArray(rows) || rows.length === 0) return false;

  const tipo = sheet.tipo_matriz;
  const def = defaultRangesByTipo[tipo] || {};

  sheet.meta = sheet.meta && typeof sheet.meta === "object" ? sheet.meta : {};
  sheet.meta.ranges =
    sheet.meta.ranges && typeof sheet.meta.ranges === "object" ? sheet.meta.ranges : {};

  const current =
    sheet.meta.ranges[tipo] && typeof sheet.meta.ranges[tipo] === "object"
      ? sheet.meta.ranges[tipo]
      : def;

  const next = {
    base: current?.base ? { ...current.base } : def.base ? { ...def.base } : undefined,
    sph: current?.sph ? { ...current.sph } : def.sph ? { ...def.sph } : undefined,
    cyl: current?.cyl ? { ...current.cyl } : def.cyl ? { ...def.cyl } : undefined,
    add: current?.add ? { ...current.add } : def.add ? { ...def.add } : undefined,
  };

  let changed = false;

  const setIfDiff = (obj, field, value) => {
    const v = to2(value);
    if (!obj || !Number.isFinite(v)) return;
    if (!Number.isFinite(Number(obj[field])) || to2(obj[field]) !== v) {
      obj[field] = v;
      changed = true;
    }
  };

  if (tipo === "SPH_CYL") {
    const sphs = rows.map((r) => to2(r.sph)).filter(Number.isFinite);
    const cyls = rows
      .map((r) => normalizeCylConvention(r.cyl))
      .filter(Number.isFinite);

    if (!sphs.length || !cyls.length) return false;

    const minSph = Math.min(...sphs);
    const maxSph = Math.max(...sphs);
    const minCyl = Math.min(...cyls);
    const maxCyl = Math.max(...cyls);

    const sphCur =
      pickRange(next.sph, def.sph) || def.sph || { start: -6, end: 6, step: 0.25 };
    const cylCur =
      pickRange(next.cyl, def.cyl) || def.cyl || { start: -6, end: 0, step: 0.25 };

    const sphStart = clamp1(Math.min(sphCur.start, minSph, 0), PHYSICAL_LIMITS.SPH);
    const sphEnd = clamp1(Math.max(sphCur.end, maxSph, 0), PHYSICAL_LIMITS.SPH);

    const cylStart = clamp1(Math.min(cylCur.start, minCyl, 0), PHYSICAL_LIMITS.CYL);
    const cylEnd = clamp1(Math.max(cylCur.end, maxCyl, 0), PHYSICAL_LIMITS.CYL);

    if (!next.sph) next.sph = {};
    if (!next.cyl) next.cyl = {};

    setIfDiff(next.sph, "start", sphStart);
    setIfDiff(next.sph, "end", sphEnd);
    if (!isDef(next.sph.step)) next.sph.step = sphCur.step ?? 0.25;

    setIfDiff(next.cyl, "start", cylStart);
    setIfDiff(next.cyl, "end", cylEnd);
    if (!isDef(next.cyl.step)) next.cyl.step = cylCur.step ?? 0.25;
  }

  if (tipo === "BASE") {
    const bases = rows.map((r) => to2(r.base)).filter(Number.isFinite);
    if (!bases.length) return false;

    const minB = Math.min(...bases);
    const maxB = Math.max(...bases);

    const baseCur =
      pickRange(next.base, def.base) || def.base || { start: 0, end: 8, step: 0.5 };

    if (!next.base) next.base = {};
    setIfDiff(next.base, "start", clamp1(Math.min(baseCur.start, minB, 0), PHYSICAL_LIMITS.BASE));
    setIfDiff(next.base, "end", clamp1(Math.max(baseCur.end, maxB, 0), PHYSICAL_LIMITS.BASE));
    if (!isDef(next.base.step)) next.base.step = baseCur.step ?? 0.25;
  }

  if (tipo === "SPH_ADD") {
    const sphs = rows.map((r) => to2(r.sph)).filter(Number.isFinite);
    const adds = rows.map((r) => to2(r.add)).filter(Number.isFinite);
    if (!sphs.length || !adds.length) return false;

    const minS = Math.min(...sphs);
    const maxS = Math.max(...sphs);
    const minA = Math.min(...adds);
    const maxA = Math.max(...adds);

    const sphCur =
      pickRange(next.sph, def.sph) || def.sph || { start: -6, end: 6, step: 0.25 };
    const addCur =
      pickRange(next.add, def.add) || def.add || { start: 1, end: 6, step: 0.25 };

    if (!next.sph) next.sph = {};
    if (!next.add) next.add = {};

    setIfDiff(next.sph, "start", clamp1(Math.min(sphCur.start, minS, 0), PHYSICAL_LIMITS.SPH));
    setIfDiff(next.sph, "end", clamp1(Math.max(sphCur.end, maxS, 0), PHYSICAL_LIMITS.SPH));
    if (!isDef(next.sph.step)) next.sph.step = sphCur.step ?? 0.25;

    setIfDiff(next.add, "start", clamp1(Math.min(addCur.start, minA), PHYSICAL_LIMITS.ADD));
    setIfDiff(next.add, "end", clamp1(Math.max(addCur.end, maxA), PHYSICAL_LIMITS.ADD));
    if (!isDef(next.add.step)) next.add.step = addCur.step ?? 0.25;
  }

  if (tipo === "BASE_ADD") {
    const bases = rows
      .map((r) => to2(r.base ?? r.base_izq ?? 0))
      .filter(Number.isFinite);
    const adds = rows.map((r) => to2(r.add)).filter(Number.isFinite);
    if (!bases.length || !adds.length) return false;

    const minB = Math.min(...bases);
    const maxB = Math.max(...bases);
    const minA = Math.min(...adds);
    const maxA = Math.max(...adds);

    const baseCur =
      pickRange(next.base, def.base) || def.base || { start: -0.25, end: 8, step: 0.25 };
    const addCur =
      pickRange(next.add, def.add) || def.add || { start: 1, end: 4, step: 0.25 };

    if (!next.base) next.base = {};
    if (!next.add) next.add = {};

    setIfDiff(next.base, "start", clamp1(Math.min(baseCur.start, minB, 0), PHYSICAL_LIMITS.BASE));
    setIfDiff(next.base, "end", clamp1(Math.max(baseCur.end, maxB, 0), PHYSICAL_LIMITS.BASE));
    if (!isDef(next.base.step)) next.base.step = baseCur.step ?? 0.25;

    setIfDiff(next.add, "start", clamp1(Math.min(addCur.start, minA), PHYSICAL_LIMITS.ADD));
    setIfDiff(next.add, "end", clamp1(Math.max(addCur.end, maxA), PHYSICAL_LIMITS.ADD));
    if (!isDef(next.add.step)) next.add.step = addCur.step ?? 0.25;
  }

  if (!changed) return false;

  sheet.meta.ranges[tipo] = next;
  sheet.markModified("meta");
  await sheet.save();
  return true;
};

module.exports = { maybeExtendMetaRangesFromRows };
