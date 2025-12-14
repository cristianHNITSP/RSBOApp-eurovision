// src/routes/inventory.routes.js
const express = require("express");
const router = express.Router();
const { body, param, validationResult, oneOf } = require("express-validator");

const InventorySheet = require("../models/InventorySheet");
const InventoryChangeLog = require("../models/InventoryChangeLog");
const crypto = require("crypto");

// Matrices por tipo (1 doc por hoja)
const MatrixBase = require("../models/matrix/MatrixBase");
const MatrixSphCyl = require("../models/matrix/MatrixSphCyl");
const MatrixBifocal = require("../models/matrix/MatrixBifocal");
const MatrixProgresivo = require("../models/matrix/MatrixProgresivo");

/* ============================ HELPERS ============================ */

const to2 = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
};
const isDef = (v) => v !== undefined && v !== null;

const actorFromBody = (req) => {
  const a = req?.body?.actor;
  return a && typeof a === "object"
    ? {
        userId: isDef(a.userId)
          ? String(a.userId)
          : isDef(a.id)
          ? String(a.id)
          : isDef(a._id)
          ? String(a._id)
          : null,
        name: isDef(a.name)
          ? String(a.name)
          : isDef(a.email)
          ? String(a.email)
          : null,
      }
    : null;
};

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ ok: false, errors: errors.array() });
  next();
};

// Rango numérico (↑ o ↓) con paso decimal (incluyente)
const frange = (start, end, step) => {
  const out = [];
  const st = Math.abs(Number(step));
  if (!Number.isFinite(st) || st <= 0) return out;

  const s = Number(start);
  const e = Number(end);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return out;

  const eps = 1e-9;
  if (s <= e) {
    for (let v = s; v <= e + eps; v += st) out.push(to2(v));
  } else {
    for (let v = s; v >= e - eps; v -= st) out.push(to2(v));
  }
  return out;
};

// Normalización numérica para keys
const normNum = (v) =>
  v === null || v === undefined
    ? "x"
    : Number(v) < 0
    ? `m${String(Math.abs(Number(v)).toFixed(2)).replace(".", "d")}`
    : String(Number(v).toFixed(2)).replace(".", "d");

const normStr = (s) => s || "x";

const denormNum = (s) => {
  if (s === "x") return null;
  if (String(s).startsWith("m"))
    return -Number(String(s).slice(1).replace("d", "."));
  return Number(String(s).replace("d", "."));
};

const keyBase = (base) => `${normNum(base)}`;
const keySphCyl = (sph, cyl) => `${normNum(sph)}|${normNum(cyl)}`;
const keyBifocal = (sph, add, bi, bd) =>
  `${normNum(sph)}|${normNum(add)}|${normNum(bi)}|${normNum(bd)}`;
const keyProg = (bi, bd, add) =>
  `${normNum(bi)}|${normNum(bd)}|${normNum(add)}`;

const parseKey = (key) => {
  try {
    return key.split("|").map(denormNum);
  } catch {
    return [null, null, null, null];
  }
};

// ====== Helpers: SKU / sheet identifiers ======
const skuPart = (s, max = 10) => {
  const raw = String(s ?? "X")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toUpperCase();
  return (raw || "X").slice(0, max);
};

const skuAbbrev = (s, len = 3) => {
  if (!s) return "X".slice(0, len);
  const tokens = String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((t) => t.toUpperCase());
  if (!tokens.length) return "X".slice(0, len);
  if (tokens.length >= 2) {
    const initials = tokens
      .slice(0, 3)
      .map((t) => t[0])
      .join("");
    return (initials || tokens[0].slice(0, len)).slice(0, len);
  }
  return tokens[0].slice(0, len);
};

// ✅ NUEVO: SKU basado en PROVEEDOR + MARCA + resto (y un sufijo random)
const makeSheetSkuCandidate = (sheetLike) => {
  // Formato: <PROV>-<MAR>-<TIP>-<MAT>-<BASE>-<TRT>-<HEX4>
  const prov = skuAbbrev(
    sheetLike?.proveedor?.name || sheetLike?.proveedor || "PROV",
    3
  );
  const marc = skuAbbrev(
    sheetLike?.marca?.name || sheetLike?.marca || "MAR",
    3
  );

  const tipo = skuAbbrev(sheetLike?.tipo_matriz || "X", 3);

  const mat = skuAbbrev(sheetLike?.material || "MAT", 3);
  const base = skuAbbrev(sheetLike?.baseKey || "BAS", 3);

  const trat =
    Array.isArray(sheetLike?.tratamientos) && sheetLike.tratamientos.length
      ? skuAbbrev(sheetLike.tratamientos.join("-"), 3)
      : skuAbbrev(String(sheetLike?.tratamientos || ""), 3);

  const rnd = crypto.randomBytes(2).toString("hex").toUpperCase();

  const parts = [prov, marc, tipo];
  if (mat) parts.push(mat);
  if (base) parts.push(base);
  if (trat) parts.push(trat);
  parts.push(rnd);

  return parts.join("-");
};

const makeUniqueSheetSku = async (sheetLike) => {
  for (let i = 0; i < 10; i++) {
    const cand = makeSheetSkuCandidate(sheetLike);
    const exists = await InventorySheet.exists({ sku: cand });
    if (!exists) return cand;
  }

  // fallback ultra seguro
  const prov = skuPart(sheetLike?.proveedor?.name || "PROV", 8);
  const marc = skuPart(sheetLike?.marca?.name || "MAR", 8);
  return `${prov}-${marc}-${Date.now().toString(36).toUpperCase()}`;
};

const ensureSheetSku = async (sheetDoc) => {
  if (!sheetDoc) return null;
  if (sheetDoc.sku) return sheetDoc;

  sheetDoc.sku = await makeUniqueSheetSku(sheetDoc);
  await sheetDoc.save();
  return sheetDoc;
};

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ====== SKU / CODEBAR ====== */

const fmt2 = (n) =>
  n === null || n === undefined || Number.isNaN(Number(n))
    ? "x"
    : Number(n).toFixed(2);

const makeSku = (_sheetId, tipo, coords = {}) => {
  switch (tipo) {
    case "BASE":
      return `BASE:${fmt2(coords.base)}`;
    case "SPH_CYL":
      return `SPH:${fmt2(coords.sph)}|CYL:${fmt2(coords.cyl)}`;
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

const BARCODE_PREFIX = "279"; // prefijo interno proveedor

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
  ].join("|");

  const numericPart = hashToDigits(core, 12 - BARCODE_PREFIX.length);
  const body12 = `${BARCODE_PREFIX}${numericPart}`;
  return `${body12}${ean13CheckDigit(body12)}`;
};

/* ===== Límites físicos (ÚNICOS para validar / pedir / mostrar) ===== */
const PHYSICAL_LIMITS = {
  BASE: { min: -40, max: 40 },
  SPH: { min: -40, max: 40 },
  CYL: { min: -15, max: 15 },
  ADD: { min: 0, max: 8 },
};

const clampRange = (rawMin, rawMax, physical) => {
  let lo = Number(rawMin);
  let hi = Number(rawMax);
  if (!Number.isFinite(lo)) lo = physical.min;
  if (!Number.isFinite(hi)) hi = physical.max;

  const min = Math.max(physical.min, lo);
  const max = Math.min(physical.max, hi);
  if (min > max) return null;
  return { min: to2(min), max: to2(max) };
};

const isMultipleOfStep = (value, step) => {
  const v = Number(value);
  const st = Number(step);
  if (!Number.isFinite(v) || !Number.isFinite(st) || st <= 0) return false;
  const absValue = Math.abs(v);
  const factor = Math.round(absValue / st);
  return Math.abs(factor * st - absValue) < 1e-6;
};

/* ===== defaultRangesByTipo: SOLO PARA SEED (plantilla inicial) ===== */
const defaultRangesByTipo = {
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

/* =================== Ranges meta helpers =================== */

function pickRange(src, fallback) {
  const r = src && typeof src === "object" ? src : {};
  const f = fallback && typeof fallback === "object" ? fallback : {};
  const start = Number(isDef(r.start) ? r.start : f.start);
  const end = Number(isDef(r.end) ? r.end : f.end);
  const step =
    Math.abs(Number(isDef(r.step) ? r.step : f.step)) ||
    Math.abs(Number(f.step)) ||
    0.25;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    !Number.isFinite(step) ||
    step <= 0
  )
    return null;
  return { start: to2(start), end: to2(end), step: to2(step) };
}

const rangeMinMax = (r) => {
  if (!r) return null;
  const a = Number(r.start);
  const b = Number(r.end);
  const step = Math.abs(Number(r.step || 0.25)) || 0.25;
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    !Number.isFinite(step) ||
    step <= 0
  )
    return null;
  return {
    min: to2(Math.min(a, b)),
    max: to2(Math.max(a, b)),
    step: to2(step),
  };
};

const clamp1 = (v, physical) => {
  const r = clampRange(v, v, physical);
  return r ? r.min : to2(v);
};

/* ============================ TABS (FRONT) ============================ */
/**
 * ✅ IMPORTANTE:
 * - Tabs SIEMPRE salen de meta.ranges[tipo] si existe
 * - Si no existe, salen del defaultRangesByTipo (semilla)
 * - PERO SIEMPRE CLAMPED POR PHYSICAL_LIMITS
 * - Los tabs “0 arriba” se generan aquí (view logic)
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
        min: -6,
        max: 6,
        step: 0.25,
      };
      const cylR = rangeMinMax(eff.cyl || def.cyl) || {
        min: -6,
        max: 0,
        step: 0.25,
      };

      const sphClamp = clampRange(sphR.min, sphR.max, PHYSICAL_LIMITS.SPH) || {
        min: -6,
        max: 6,
      };
      const cylClamp = clampRange(cylR.min, cylR.max, PHYSICAL_LIMITS.CYL) || {
        min: -6,
        max: 0,
      };

      // SPH: ancla en 0
      const negEnd =
        sphClamp.min < 0 ? to2(sphClamp.min) : to2(-Math.max(0.25, sphR.step));
      const posEnd = sphClamp.max > 0 ? to2(sphClamp.max) : 0;

      // CYL: convención negativa a 0 (monofocal)
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
        min: -6,
        max: 6,
        step: 0.25,
      };
      const addR = rangeMinMax(eff.add || def.add) || {
        min: 1,
        max: 6,
        step: 0.25,
      };

      const sphClamp = clampRange(sphR.min, sphR.max, PHYSICAL_LIMITS.SPH) || {
        min: -6,
        max: 6,
      };
      const addClamp = clampRange(addR.min, addR.max, PHYSICAL_LIMITS.ADD) || {
        min: 1,
        max: 6,
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
        min: 0,
        max: 8,
        step: 0.5,
      };
      const baseClamp = clampRange(
        baseR.min,
        baseR.max,
        PHYSICAL_LIMITS.BASE
      ) || { min: 0, max: 8 };

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
        min: -0.25,
        max: 8,
        step: 0.25,
      };
      const addR = rangeMinMax(eff.add || def.add) || {
        min: 1,
        max: 4,
        step: 0.25,
      };

      const baseClamp = clampRange(
        baseR.min,
        baseR.max,
        PHYSICAL_LIMITS.BASE
      ) || { min: -0.25, max: 8 };
      const addClamp = clampRange(addR.min, addR.max, PHYSICAL_LIMITS.ADD) || {
        min: 1,
        max: 4,
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

/* ===================== AUTO-EXTENDER meta.ranges ===================== */
/**
 * ✅ Esto NO usa defaultRanges para limitar.
 * - defaultRanges solo sirve como “punto de partida” si no hay meta aún.
 * - Se extiende con base en los rows guardados, y clamped por PHYSICAL_LIMITS.
 */
const maybeExtendMetaRangesFromRows = async (sheet, rows) => {
  if (!sheet || !Array.isArray(rows) || rows.length === 0) return false;

  const tipo = sheet.tipo_matriz;
  const def = defaultRangesByTipo[tipo] || {};

  sheet.meta = sheet.meta && typeof sheet.meta === "object" ? sheet.meta : {};
  sheet.meta.ranges =
    sheet.meta.ranges && typeof sheet.meta.ranges === "object"
      ? sheet.meta.ranges
      : {};

  const current =
    sheet.meta.ranges[tipo] && typeof sheet.meta.ranges[tipo] === "object"
      ? sheet.meta.ranges[tipo]
      : def;

  const next = {
    base: current?.base
      ? { ...current.base }
      : def.base
      ? { ...def.base }
      : undefined,
    sph: current?.sph
      ? { ...current.sph }
      : def.sph
      ? { ...def.sph }
      : undefined,
    cyl: current?.cyl
      ? { ...current.cyl }
      : def.cyl
      ? { ...def.cyl }
      : undefined,
    add: current?.add
      ? { ...current.add }
      : def.add
      ? { ...def.add }
      : undefined,
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
      .map((r) => to2(r.cyl))
      .filter(Number.isFinite)
      .map((c) => (c > 0 ? -Math.abs(c) : c)); // ✅ fuerza convención negativa

    if (!sphs.length || !cyls.length) return false;

    const minSph = Math.min(...sphs);
    const maxSph = Math.max(...sphs);
    const minCyl = Math.min(...cyls);
    const maxCyl = Math.max(...cyls);

    const sphCur =
      pickRange(next.sph, def.sph) ||
      def.sph || { start: -6, end: 6, step: 0.25 };
    const cylCur =
      pickRange(next.cyl, def.cyl) ||
      def.cyl || { start: -6, end: 0, step: 0.25 };

    const sphStart = clamp1(
      Math.min(sphCur.start, minSph, 0),
      PHYSICAL_LIMITS.SPH
    );
    const sphEnd = clamp1(Math.max(sphCur.end, maxSph, 0), PHYSICAL_LIMITS.SPH);

    const cylStart = clamp1(
      Math.min(cylCur.start, minCyl, 0),
      PHYSICAL_LIMITS.CYL
    );
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
      pickRange(next.base, def.base) ||
      def.base || { start: 0, end: 8, step: 0.5 };

    if (!next.base) next.base = {};
    setIfDiff(
      next.base,
      "start",
      clamp1(Math.min(baseCur.start, minB, 0), PHYSICAL_LIMITS.BASE)
    );
    setIfDiff(
      next.base,
      "end",
      clamp1(Math.max(baseCur.end, maxB, 0), PHYSICAL_LIMITS.BASE)
    );
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
      pickRange(next.sph, def.sph) ||
      def.sph || { start: -6, end: 6, step: 0.25 };
    const addCur =
      pickRange(next.add, def.add) ||
      def.add || { start: 1, end: 6, step: 0.25 };

    if (!next.sph) next.sph = {};
    if (!next.add) next.add = {};

    setIfDiff(
      next.sph,
      "start",
      clamp1(Math.min(sphCur.start, minS, 0), PHYSICAL_LIMITS.SPH)
    );
    setIfDiff(
      next.sph,
      "end",
      clamp1(Math.max(sphCur.end, maxS, 0), PHYSICAL_LIMITS.SPH)
    );
    if (!isDef(next.sph.step)) next.sph.step = sphCur.step ?? 0.25;

    setIfDiff(
      next.add,
      "start",
      clamp1(Math.min(addCur.start, minA), PHYSICAL_LIMITS.ADD)
    );
    setIfDiff(
      next.add,
      "end",
      clamp1(Math.max(addCur.end, maxA), PHYSICAL_LIMITS.ADD)
    );
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
      pickRange(next.base, def.base) ||
      def.base || { start: -0.25, end: 8, step: 0.25 };
    const addCur =
      pickRange(next.add, def.add) ||
      def.add || { start: 1, end: 4, step: 0.25 };

    if (!next.base) next.base = {};
    if (!next.add) next.add = {};

    setIfDiff(
      next.base,
      "start",
      clamp1(Math.min(baseCur.start, minB, 0), PHYSICAL_LIMITS.BASE)
    );
    setIfDiff(
      next.base,
      "end",
      clamp1(Math.max(baseCur.end, maxB, 0), PHYSICAL_LIMITS.BASE)
    );
    if (!isDef(next.base.step)) next.base.step = baseCur.step ?? 0.25;

    setIfDiff(
      next.add,
      "start",
      clamp1(Math.min(addCur.start, minA), PHYSICAL_LIMITS.ADD)
    );
    setIfDiff(
      next.add,
      "end",
      clamp1(Math.max(addCur.end, maxA), PHYSICAL_LIMITS.ADD)
    );
    if (!isDef(next.add.step)) next.add.step = addCur.step ?? 0.25;
  }

  if (!changed) return false;

  sheet.meta.ranges[tipo] = next;
  sheet.markModified("meta");
  await sheet.save();
  return true;
};

/* ===================== SEED ===================== */

const seedRootForSheet = async (sheet, actor) => {
  switch (sheet.tipo_matriz) {
    case "BASE": {
      const doc = await MatrixBase.findOneAndUpdate(
        { sheet: sheet._id },
        {
          $setOnInsert: {
            sheet: sheet._id,
            tipo_matriz: "BASE",
            cells: new Map(),
          },
        },
        { new: true, upsert: true }
      );
      doc.set("cells", doc.cells || new Map());
      const base = 0;
      const k = keyBase(base);
      if (!doc.cells.has(k)) {
        doc.cells.set(k, {
          existencias: 0,
          sku: makeSku(sheet._id, "BASE", { base }),
          codebar: null,
          createdBy: actor,
          updatedBy: actor,
        });
        doc.markModified("cells");
        await doc.save();
      }
      return doc;
    }

    case "SPH_CYL": {
      const doc = await MatrixSphCyl.findOneAndUpdate(
        { sheet: sheet._id },
        {
          $setOnInsert: {
            sheet: sheet._id,
            tipo_matriz: "SPH_CYL",
            cells: new Map(),
          },
        },
        { new: true, upsert: true }
      );
      doc.set("cells", doc.cells || new Map());
      const sph = 0;
      const cyl = 0;
      const k = keySphCyl(sph, cyl);
      if (!doc.cells.has(k)) {
        doc.cells.set(k, {
          existencias: 0,
          sku: makeSku(sheet._id, "SPH_CYL", { sph, cyl }),
          codebar: null,
          createdBy: actor,
          updatedBy: actor,
        });
        doc.markModified("cells");
        await doc.save();
      }
      return doc;
    }

    case "SPH_ADD": {
      const doc = await MatrixBifocal.findOneAndUpdate(
        { sheet: sheet._id },
        {
          $setOnInsert: {
            sheet: sheet._id,
            tipo_matriz: "SPH_ADD",
            cells: new Map(),
          },
        },
        { new: true, upsert: true }
      );
      doc.set("cells", doc.cells || new Map());
      const sph = 0;
      const add = 1.0;
      const bi = 0;
      const bd = 0;
      const k = keyBifocal(sph, add, bi, bd);
      if (!doc.cells.has(k)) {
        doc.cells.set(k, {
          base_izq: bi,
          base_der: bd,
          OD: {
            existencias: 0,
            sku: makeSku(sheet._id, "SPH_ADD", {
              sph,
              add,
              eye: "OD",
              base_izq: bi,
              base_der: bd,
            }),
            codebar: null,
          },
          OI: {
            existencias: 0,
            sku: makeSku(sheet._id, "SPH_ADD", {
              sph,
              add,
              eye: "OI",
              base_izq: bi,
              base_der: bd,
            }),
            codebar: null,
          },
          createdBy: actor,
          updatedBy: actor,
        });
        doc.markModified("cells");
        await doc.save();
      }
      return doc;
    }

    case "BASE_ADD": {
      const doc = await MatrixProgresivo.findOneAndUpdate(
        { sheet: sheet._id },
        {
          $setOnInsert: {
            sheet: sheet._id,
            tipo_matriz: "BASE_ADD",
            cells: new Map(),
          },
        },
        { new: true, upsert: true }
      );
      doc.set("cells", doc.cells || new Map());
      const bi = 0;
      const bd = 0;
      const add = 1.0;
      const k = keyProg(bi, bd, add);
      if (!doc.cells.has(k)) {
        doc.cells.set(k, {
          base_izq: bi,
          base_der: bd,
          OD: {
            existencias: 0,
            sku: makeSku(sheet._id, "BASE_ADD", {
              add,
              eye: "OD",
              base_izq: bi,
              base_der: bd,
            }),
            codebar: null,
          },
          OI: {
            existencias: 0,
            sku: makeSku(sheet._id, "BASE_ADD", {
              add,
              eye: "OI",
              base_izq: bi,
              base_der: bd,
            }),
            codebar: null,
          },
          createdBy: actor,
          updatedBy: actor,
        });
        doc.markModified("cells");
        await doc.save();
      }
      return doc;
    }

    default:
      return null;
  }
};

const seedFullForSheet = async (sheet, actor) => {
  const setCell = (cell) =>
    Object.assign(cell, { createdBy: actor, updatedBy: actor });
  const tipo = sheet.tipo_matriz;

  if (tipo === "BASE") {
    const doc = await MatrixBase.findOneAndUpdate(
      { sheet: sheet._id },
      {
        $setOnInsert: {
          sheet: sheet._id,
          tipo_matriz: "BASE",
          cells: new Map(),
        },
      },
      { new: true, upsert: true }
    );
    const rBase = defaultRangesByTipo.BASE.base;
    const baseRange = clampRange(
      Math.min(rBase.start, rBase.end),
      Math.max(rBase.start, rBase.end),
      PHYSICAL_LIMITS.BASE
    );
    if (!baseRange) return { inserted: 0 };

    const baseVals = frange(baseRange.min, baseRange.max, rBase.step);
    doc.set("cells", doc.cells || new Map());
    baseVals.forEach((base) => {
      const k = keyBase(base);
      if (!doc.cells.has(k)) {
        doc.cells.set(
          k,
          setCell({
            existencias: 0,
            sku: makeSku(sheet._id, "BASE", { base }),
            codebar: null,
          })
        );
      }
    });
    doc.markModified("cells");
    await doc.save();
    return { inserted: baseVals.length };
  }

  if (tipo === "SPH_CYL") {
    const doc = await MatrixSphCyl.findOneAndUpdate(
      { sheet: sheet._id },
      {
        $setOnInsert: {
          sheet: sheet._id,
          tipo_matriz: "SPH_CYL",
          cells: new Map(),
        },
      },
      { new: true, upsert: true }
    );

    const rSph = defaultRangesByTipo.SPH_CYL.sph;
    const rCyl = defaultRangesByTipo.SPH_CYL.cyl;

    const sphRange = clampRange(
      Math.min(rSph.start, rSph.end),
      Math.max(rSph.start, rSph.end),
      PHYSICAL_LIMITS.SPH
    );
    const cylRange = clampRange(
      Math.min(rCyl.start, rCyl.end),
      Math.max(rCyl.start, rCyl.end),
      PHYSICAL_LIMITS.CYL
    );
    if (!sphRange || !cylRange) return { inserted: 0 };

    const sphVals = frange(sphRange.min, sphRange.max, rSph.step);
    const cylVals = frange(cylRange.min, cylRange.max, rCyl.step);

    doc.set("cells", doc.cells || new Map());
    let count = 0;
    for (const sph of sphVals) {
      for (let cyl of cylVals) {
        cyl = cyl > 0 ? -Math.abs(cyl) : cyl;
        const k = keySphCyl(sph, cyl);
        if (!doc.cells.has(k)) {
          doc.cells.set(
            k,
            setCell({
              existencias: 0,
              sku: makeSku(sheet._id, "SPH_CYL", { sph, cyl }),
              codebar: null,
            })
          );
          count++;
        }
      }
    }
    doc.markModified("cells");
    await doc.save();
    return { inserted: count };
  }

  if (tipo === "SPH_ADD") {
    const doc = await MatrixBifocal.findOneAndUpdate(
      { sheet: sheet._id },
      {
        $setOnInsert: {
          sheet: sheet._id,
          tipo_matriz: "SPH_ADD",
          cells: new Map(),
        },
      },
      { new: true, upsert: true }
    );

    const rSph = defaultRangesByTipo.SPH_ADD.sph;
    const rAdd = defaultRangesByTipo.SPH_ADD.add;

    const sphRange = clampRange(
      Math.min(rSph.start, rSph.end),
      Math.max(rSph.start, rSph.end),
      PHYSICAL_LIMITS.SPH
    );
    const addRange = clampRange(
      Math.min(rAdd.start, rAdd.end),
      Math.max(rAdd.start, rAdd.end),
      PHYSICAL_LIMITS.ADD
    );
    if (!sphRange || !addRange) return { inserted: 0 };

    const sphVals = frange(sphRange.min, sphRange.max, rSph.step);
    const addVals = frange(addRange.min, addRange.max, rAdd.step);

    doc.set("cells", doc.cells || new Map());
    let count = 0;
    for (const sph of sphVals) {
      for (const add of addVals) {
        const bi = 0;
        const bd = 0;
        const k = keyBifocal(sph, add, bi, bd);
        if (!doc.cells.has(k)) {
          doc.cells.set(
            k,
            setCell({
              base_izq: bi,
              base_der: bd,
              OD: {
                existencias: 0,
                sku: makeSku(sheet._id, "SPH_ADD", {
                  sph,
                  add,
                  eye: "OD",
                  base_izq: bi,
                  base_der: bd,
                }),
                codebar: null,
              },
              OI: {
                existencias: 0,
                sku: makeSku(sheet._id, "SPH_ADD", {
                  sph,
                  add,
                  eye: "OI",
                  base_izq: bi,
                  base_der: bd,
                }),
                codebar: null,
              },
            })
          );
          count++;
        }
      }
    }
    doc.markModified("cells");
    await doc.save();
    return { inserted: count };
  }

  if (tipo === "BASE_ADD") {
    const doc = await MatrixProgresivo.findOneAndUpdate(
      { sheet: sheet._id },
      {
        $setOnInsert: {
          sheet: sheet._id,
          tipo_matriz: "BASE_ADD",
          cells: new Map(),
        },
      },
      { new: true, upsert: true }
    );

    const rBase = defaultRangesByTipo.BASE_ADD.base;
    const rAdd = defaultRangesByTipo.BASE_ADD.add;

    const baseRange = clampRange(
      Math.min(rBase.start, rBase.end),
      Math.max(rBase.start, rBase.end),
      PHYSICAL_LIMITS.BASE
    );
    const addRange = clampRange(
      Math.min(rAdd.start, rAdd.end),
      Math.max(rAdd.start, rAdd.end),
      PHYSICAL_LIMITS.ADD
    );
    if (!baseRange || !addRange) return { inserted: 0 };

    const baseVals = frange(baseRange.min, baseRange.max, rBase.step);
    const addVals = frange(addRange.min, addRange.max, rAdd.step);

    doc.set("cells", doc.cells || new Map());
    let count = 0;
    for (const b of baseVals) {
      for (const add of addVals) {
        const bi = b;
        const bd = b;
        const k = keyProg(bi, bd, add);
        if (!doc.cells.has(k)) {
          doc.cells.set(
            k,
            setCell({
              base_izq: bi,
              base_der: bd,
              OD: {
                existencias: 0,
                sku: makeSku(sheet._id, "BASE_ADD", {
                  add,
                  eye: "OD",
                  base_izq: bi,
                  base_der: bd,
                }),
                codebar: null,
              },
              OI: {
                existencias: 0,
                sku: makeSku(sheet._id, "BASE_ADD", {
                  add,
                  eye: "OI",
                  base_izq: bi,
                  base_der: bd,
                }),
                codebar: null,
              },
            })
          );
          count++;
        }
      }
    }
    doc.markModified("cells");
    await doc.save();
    return { inserted: count };
  }

  return { inserted: 0 };
};

/* ===================== VALIDACIÓN CHUNK ===================== */

const validateChunkRows = (tipo, rows) => {
  const errors = [];

  rows.forEach((row, index) => {
    const path = `rows[${index}]`;

    const ex = row.existencias;
    if (ex !== undefined && ex !== null) {
      const exNum = Number(ex);
      if (!Number.isFinite(exNum) || exNum < 0) {
        errors.push({
          path: `${path}.existencias`,
          msg: "existencias debe ser numérico >= 0",
        });
      }
    }

    if (tipo === "BASE") {
      const baseVal = to2(row.base);
      if (!isDef(row.base) || !Number.isFinite(Number(row.base))) {
        errors.push({ path: `${path}.base`, msg: "base numérica requerida" });
      } else if (
        baseVal < PHYSICAL_LIMITS.BASE.min ||
        baseVal > PHYSICAL_LIMITS.BASE.max
      ) {
        errors.push({
          path: `${path}.base`,
          msg: `base fuera de límites (${PHYSICAL_LIMITS.BASE.min}..${PHYSICAL_LIMITS.BASE.max})`,
        });
      } else if (!isMultipleOfStep(baseVal, 0.5)) {
        errors.push({
          path: `${path}.base`,
          msg: "base debe ir en pasos de 0.5 D",
        });
      }
    }

    if (tipo === "SPH_CYL") {
      const sphVal = to2(row.sph);
      if (!isDef(row.sph) || !Number.isFinite(Number(row.sph))) {
        errors.push({ path: `${path}.sph`, msg: "sph numérico requerido" });
      } else if (
        sphVal < PHYSICAL_LIMITS.SPH.min ||
        sphVal > PHYSICAL_LIMITS.SPH.max
      ) {
        errors.push({
          path: `${path}.sph`,
          msg: `sph fuera de límites (${PHYSICAL_LIMITS.SPH.min}..${PHYSICAL_LIMITS.SPH.max})`,
        });
      } else if (!isMultipleOfStep(sphVal, 0.25)) {
        errors.push({
          path: `${path}.sph`,
          msg: "sph debe ir en pasos de 0.25 D",
        });
      }

      let cylVal = to2(row.cyl);
      if (!isDef(row.cyl) || !Number.isFinite(Number(row.cyl))) {
        errors.push({ path: `${path}.cyl`, msg: "cyl numérico requerido" });
      } else {
        if (cylVal > 0) cylVal = to2(-Math.abs(cylVal)); // ✅ convención
        if (
          cylVal < PHYSICAL_LIMITS.CYL.min ||
          cylVal > PHYSICAL_LIMITS.CYL.max
        ) {
          errors.push({
            path: `${path}.cyl`,
            msg: `cyl fuera de límites (${PHYSICAL_LIMITS.CYL.min}..${PHYSICAL_LIMITS.CYL.max})`,
          });
        }
        const isZero = Math.abs(cylVal) < 1e-6;
        if (!isZero && !isMultipleOfStep(cylVal, 0.25)) {
          errors.push({
            path: `${path}.cyl`,
            msg: "cyl debe ir en pasos de 0.25 D",
          });
        }
      }
    }

    if (tipo === "SPH_ADD") {
      const sphVal = to2(row.sph);
      const addVal = to2(row.add);

      if (!isDef(row.sph) || !Number.isFinite(Number(row.sph))) {
        errors.push({ path: `${path}.sph`, msg: "sph numérico requerido" });
      } else if (
        sphVal < PHYSICAL_LIMITS.SPH.min ||
        sphVal > PHYSICAL_LIMITS.SPH.max
      ) {
        errors.push({
          path: `${path}.sph`,
          msg: `sph fuera de límites (${PHYSICAL_LIMITS.SPH.min}..${PHYSICAL_LIMITS.SPH.max})`,
        });
      } else if (!isMultipleOfStep(sphVal, 0.25)) {
        errors.push({
          path: `${path}.sph`,
          msg: "sph debe ir en pasos de 0.25 D",
        });
      }

      if (!isDef(row.add) || !Number.isFinite(Number(row.add))) {
        errors.push({ path: `${path}.add`, msg: "add numérico requerido" });
      } else if (
        addVal < PHYSICAL_LIMITS.ADD.min ||
        addVal > PHYSICAL_LIMITS.ADD.max
      ) {
        errors.push({
          path: `${path}.add`,
          msg: `add fuera de límites (${PHYSICAL_LIMITS.ADD.min}..${PHYSICAL_LIMITS.ADD.max})`,
        });
      } else if (!isMultipleOfStep(addVal, 0.25)) {
        errors.push({
          path: `${path}.add`,
          msg: "add debe ir en pasos de 0.25 D",
        });
      }

      const eye = String(row.eye || "").toUpperCase();
      if (!["OD", "OI"].includes(eye))
        errors.push({ path: `${path}.eye`, msg: "eye debe ser OD u OI" });

      ["base_izq", "base_der"].forEach((field) => {
        if (!isDef(row[field])) return;
        const num = Number(row[field]);
        if (!Number.isFinite(num)) {
          errors.push({
            path: `${path}.${field}`,
            msg: `${field} numérico inválido`,
          });
        } else if (
          num < PHYSICAL_LIMITS.BASE.min ||
          num > PHYSICAL_LIMITS.BASE.max
        ) {
          errors.push({
            path: `${path}.${field}`,
            msg: `${field} fuera de límites (${PHYSICAL_LIMITS.BASE.min}..${PHYSICAL_LIMITS.BASE.max})`,
          });
        } else if (!isMultipleOfStep(to2(num), 0.25)) {
          errors.push({
            path: `${path}.${field}`,
            msg: `${field} debe ir en pasos de 0.25 D`,
          });
        }
      });
    }

    if (tipo === "BASE_ADD") {
      const addVal = to2(row.add);

      if (!isDef(row.add) || !Number.isFinite(Number(row.add))) {
        errors.push({ path: `${path}.add`, msg: "add numérico requerido" });
      } else if (
        addVal < PHYSICAL_LIMITS.ADD.min ||
        addVal > PHYSICAL_LIMITS.ADD.max
      ) {
        errors.push({
          path: `${path}.add`,
          msg: `add fuera de límites (${PHYSICAL_LIMITS.ADD.min}..${PHYSICAL_LIMITS.ADD.max})`,
        });
      } else if (!isMultipleOfStep(addVal, 0.25)) {
        errors.push({
          path: `${path}.add`,
          msg: "add debe ir en pasos de 0.25 D",
        });
      }

      const eye = String(row.eye || "").toUpperCase();
      if (!["OD", "OI"].includes(eye))
        errors.push({ path: `${path}.eye`, msg: "eye debe ser OD u OI" });

      ["base", "base_izq", "base_der"].forEach((field) => {
        if (!isDef(row[field])) return;
        const num = Number(row[field]);
        if (!Number.isFinite(num)) {
          errors.push({
            path: `${path}.${field}`,
            msg: `${field} numérico inválido`,
          });
        } else if (
          num < PHYSICAL_LIMITS.BASE.min ||
          num > PHYSICAL_LIMITS.BASE.max
        ) {
          errors.push({
            path: `${path}.${field}`,
            msg: `${field} fuera de límites (${PHYSICAL_LIMITS.BASE.min}..${PHYSICAL_LIMITS.BASE.max})`,
          });
        } else if (!isMultipleOfStep(to2(num), 0.25)) {
          errors.push({
            path: `${path}.${field}`,
            msg: `${field} debe ir en pasos de 0.25 D`,
          });
        }
      });
    }
  });

  return errors;
};

/* ===================== APPLY CHUNK ===================== */

const applyChunkBase = async (sheet, rows, actor) => {
  const doc = await MatrixBase.findOneAndUpdate(
    { sheet: sheet._id },
    {
      $setOnInsert: { sheet: sheet._id, tipo_matriz: "BASE", cells: new Map() },
    },
    { new: true, upsert: true }
  );

  doc.set("cells", doc.cells || new Map());
  let updated = 0;

  for (const row of rows) {
    const base = to2(row.base);
    const existencias = Number(row.existencias ?? 0);
    const k = keyBase(base);

    const existed = doc.cells.has(k);

    const current = existed
      ? doc.cells.get(k)
      : {
          existencias: 0,
          sku: makeSku(sheet._id, "BASE", { base }),
          codebar: null,
          createdBy: actor,
          updatedBy: actor,
        };

    const prev = Number(current.existencias ?? 0);

    // ✅ SOLO “NO-OP” si ya existía en DB y no cambió nada
    if (
      existed &&
      prev === existencias &&
      current.sku &&
      (existencias === 0 || current.codebar)
    )
      continue;

    current.existencias = existencias;
    if (!current.sku) current.sku = makeSku(sheet._id, "BASE", { base });
    if (existencias > 0 && !current.codebar)
      current.codebar = makeCodebar(sheet._id, "BASE", { base });

    current.updatedBy = actor;
    if (!current.createdBy) current.createdBy = actor;

    doc.cells.set(k, current);
    updated++;
  }

  doc.markModified("cells");
  await doc.save();
  return { updated };
};

const applyChunkSphCyl = async (sheet, rows, actor) => {
  const doc = await MatrixSphCyl.findOneAndUpdate(
    { sheet: sheet._id },
    {
      $setOnInsert: {
        sheet: sheet._id,
        tipo_matriz: "SPH_CYL",
        cells: new Map(),
      },
    },
    { new: true, upsert: true }
  );

  doc.set("cells", doc.cells || new Map());
  let updated = 0;

  for (const row of rows) {
    let sph = to2(row.sph);
    let cyl = to2(row.cyl);
    if (!Number.isFinite(sph) || !Number.isFinite(cyl)) continue;
    if (cyl > 0) cyl = to2(-Math.abs(cyl)); // ✅ convención
    const existencias = Number(row.existencias ?? 0);

    const k = keySphCyl(sph, cyl);

    const existed = doc.cells.has(k);
    const current = existed
      ? doc.cells.get(k)
      : {
          existencias: 0,
          sku: makeSku(sheet._id, "SPH_CYL", { sph, cyl }),
          codebar: null,
          createdBy: actor,
          updatedBy: actor,
        };

    const prev = Number(current.existencias ?? 0);

    // ✅ SOLO “NO-OP” si ya existía en DB y no cambió nada
    if (
      existed &&
      prev === existencias &&
      current.sku &&
      (existencias === 0 || current.codebar)
    )
      continue;

    current.existencias = existencias;
    if (!current.sku) current.sku = makeSku(sheet._id, "SPH_CYL", { sph, cyl });
    if (existencias > 0 && !current.codebar)
      current.codebar = makeCodebar(sheet._id, "SPH_CYL", { sph, cyl });

    current.updatedBy = actor;
    if (!current.createdBy) current.createdBy = actor;

    doc.cells.set(k, current);
    updated++;
  }

  doc.markModified("cells");
  await doc.save();
  return { updated };
};

const applyChunkBifocal = async (sheet, rows, actor) => {
  const doc = await MatrixBifocal.findOneAndUpdate(
    { sheet: sheet._id },
    {
      $setOnInsert: {
        sheet: sheet._id,
        tipo_matriz: "SPH_ADD",
        cells: new Map(),
      },
    },
    { new: true, upsert: true }
  );

  doc.set("cells", doc.cells || new Map());
  let updated = 0;

  for (const row of rows) {
    const sph = to2(row.sph);
    const add = to2(row.add);
    const eye = String(row.eye || "OD").toUpperCase();
    const base_izq = to2(row.base_izq ?? 0);
    const base_der = to2(row.base_der ?? 0);
    const existencias = Number(row.existencias ?? 0);

    const k = keyBifocal(sph, add, base_izq, base_der);
    const cell = doc.cells.get(k) || {
      base_izq,
      base_der,
      OD: { existencias: 0, sku: null, codebar: null },
      OI: { existencias: 0, sku: null, codebar: null },
      createdBy: actor,
      updatedBy: actor,
    };

    const eyeNode = eye === "OI" ? cell.OI : cell.OD;
    const prev = Number(eyeNode.existencias ?? 0);
    if (
      prev === existencias &&
      eyeNode.sku &&
      (existencias === 0 || eyeNode.codebar)
    )
      continue;

    eyeNode.existencias = existencias;
    if (!eyeNode.sku)
      eyeNode.sku = makeSku(sheet._id, "SPH_ADD", {
        sph,
        add,
        eye,
        base_izq,
        base_der,
      });
    if (existencias > 0 && !eyeNode.codebar)
      eyeNode.codebar = makeCodebar(sheet._id, "SPH_ADD", {
        sph,
        add,
        eye,
        base_izq,
        base_der,
      });

    cell.base_izq = base_izq;
    cell.base_der = base_der;
    cell.updatedBy = actor;
    if (!cell.createdBy) cell.createdBy = actor;

    doc.cells.set(k, cell);
    updated++;
  }

  doc.markModified("cells");
  await doc.save();
  return { updated };
};

const applyChunkProgresivo = async (sheet, rows, actor) => {
  const doc = await MatrixProgresivo.findOneAndUpdate(
    { sheet: sheet._id },
    {
      $setOnInsert: {
        sheet: sheet._id,
        tipo_matriz: "BASE_ADD",
        cells: new Map(),
      },
    },
    { new: true, upsert: true }
  );

  doc.set("cells", doc.cells || new Map());
  let updated = 0;

  for (const row of rows) {
    const add = to2(row.add);
    const eye = String(row.eye || "OD").toUpperCase();
    const base_izq = to2(row.base_izq ?? row.base ?? 0);
    const base_der = to2(row.base_der ?? row.base ?? 0);
    const existencias = Number(row.existencias ?? 0);

    const k = keyProg(base_izq, base_der, add);
    const cell = doc.cells.get(k) || {
      base_izq,
      base_der,
      OD: { existencias: 0, sku: null, codebar: null },
      OI: { existencias: 0, sku: null, codebar: null },
      createdBy: actor,
      updatedBy: actor,
    };

    const eyeNode = eye === "OI" ? cell.OI : cell.OD;
    const prev = Number(eyeNode.existencias ?? 0);
    if (
      prev === existencias &&
      eyeNode.sku &&
      (existencias === 0 || eyeNode.codebar)
    )
      continue;

    eyeNode.existencias = existencias;
    if (!eyeNode.sku)
      eyeNode.sku = makeSku(sheet._id, "BASE_ADD", {
        add,
        eye,
        base_izq,
        base_der,
      });
    if (existencias > 0 && !eyeNode.codebar)
      eyeNode.codebar = makeCodebar(sheet._id, "BASE_ADD", {
        add,
        eye,
        base_izq,
        base_der,
      });

    cell.base_izq = base_izq;
    cell.base_der = base_der;
    cell.updatedBy = actor;
    if (!cell.createdBy) cell.createdBy = actor;

    doc.cells.set(k, cell);
    updated++;
  }

  doc.markModified("cells");
  await doc.save();
  return { updated };
};

/* ======================= ENDPOINTS SHEETS ======================= */

router.get("/", async (req, res) => {
  try {
    const includeDeleted = String(req.query.includeDeleted) === "true";
    const q = String(req.query.q || "").trim();

    const query = includeDeleted ? {} : { isDeleted: { $ne: true } };

    // búsqueda “localizable” (nombre/material/baseKey/tratamientos/sku)
    if (q) {
      const rx = new RegExp(escapeRegExp(q), "i");
      query.$or = [
        { sku: rx },
        { nombre: rx },
        { material: rx },
        { baseKey: rx },
        { tratamientos: rx },

        // ✅ nuevo
        { "proveedor.name": rx },
        { "marca.name": rx },
      ];
    }

    // búsqueda exacta por sku
    if (req.query.sku) {
      query.sku = String(req.query.sku).trim().toUpperCase();
    }

    const sheets = await InventorySheet.find(query).sort({
      updatedAt: -1,
      createdAt: -1,
    });

    // backfill: si hay planillas viejas sin sku, se lo generamos
    for (const s of sheets) {
      if (!s.sku) {
        try {
          await ensureSheetSku(s);
        } catch (e) {
          console.warn("SKU backfill fail:", s?._id, e?.message || e);
        }
      }
    }

    const data = sheets.map((s) => ({
      ...s.toObject(),
      tabs: buildTabsForTipo(s),
      physicalLimits: PHYSICAL_LIMITS,
    }));

    res.json({ ok: true, data });
  } catch (err) {
    console.error("GET /inventory error:", err);
    res.status(500).json({ ok: false, message: "Error al listar hojas" });
  }
});

/* ===================== ✅ Normalizador proveedor/marca ===================== */
const normalizeParty = (raw) => {
  // acepta: undefined, null, string, {id,name}
  if (!raw) return { id: null, name: "" };

  if (typeof raw === "string") {
    const name = raw.trim();
    return { id: null, name };
  }

  if (typeof raw === "object") {
    const id = isDef(raw.id) && String(raw.id).trim() ? String(raw.id).trim() : null;
    const name = isDef(raw.name) ? String(raw.name).trim() : "";
    return { id, name };
  }

  return { id: null, name: "" };
};

router.post(
  "/sheets",
  oneOf([
    body("nombre").isString().trim().notEmpty(),
    body("name").isString().trim().notEmpty(),
  ]),

  // ✅ FIX: nullable + falsy para no romper cuando mandas null/""
  body("proveedor").optional({ nullable: true }).isObject(),
  body("proveedor.name").optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body("proveedor.id").optional({ nullable: true, checkFalsy: true }).isString().trim(),

  body("marca").optional({ nullable: true }).isObject(),
  body("marca.name").optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body("marca.id").optional({ nullable: true, checkFalsy: true }).isString().trim(),

  body("baseKey").isString().trim().notEmpty(),
  body("material").isString().trim().notEmpty(),
  body("tipo_matriz").isIn(["BASE", "SPH_CYL", "SPH_ADD", "BASE_ADD"]),
  body("tratamientos").optional().isArray(),
  body("actor").optional().isObject(),
  body("seed").optional().isBoolean(),
  body("sku").optional().isString().trim().isLength({ min: 6, max: 60 }),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const nombre = (req.body.nombre ?? req.body.name).trim();

      const proveedor = normalizeParty(req.body.proveedor);
      const marca = normalizeParty(req.body.marca);

      const sheetSku = isDef(req.body.sku)
        ? String(req.body.sku).trim().toUpperCase()
        : null;

      const sheetLikeForSku = {
        proveedor,
        marca,
        tipo_matriz: req.body.tipo_matriz,
        baseKey: req.body.baseKey,
        material: req.body.material,
        tratamientos: req.body.tratamientos || [],
      };

      const sheet = await InventorySheet.create({
        nombre,
        proveedor,
        marca,
        sku: sheetSku || (await makeUniqueSheetSku(sheetLikeForSku)),
        baseKey: req.body.baseKey,
        material: req.body.material,
        tipo_matriz: req.body.tipo_matriz,
        tratamientos: req.body.tratamientos || [],
        meta: req.body.meta || {},
        owner: actor,
        createdBy: actor,
        updatedBy: actor,
      });

      const matrixDoc = await seedRootForSheet(sheet, actor);

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "SHEET_CREATE",
        details: { nombre: sheet.nombre, matrixId: matrixDoc?._id || null },
        actor,
      });

      let seedStats = { inserted: 0 };
      if (req.body.seed === true) {
        seedStats = await seedFullForSheet(sheet, actor);
        await InventoryChangeLog.create({
          sheet: sheet._id,
          tipo_matriz: sheet.tipo_matriz,
          type: "SEED_GENERATE",
          details: { inserted: seedStats.inserted, defaults: true },
          actor,
        });
      }

      res.status(201).json({
        ok: true,
        data: {
          sheet,
          tabs: buildTabsForTipo(sheet),
          physicalLimits: PHYSICAL_LIMITS,
          seed: seedStats,
        },
      });
    } catch (err) {
      console.error("POST /sheets error:", err);
      res.status(500).json({
        ok: false,
        message: "Error al crear hoja",
        details: String(err?.message || err),
      });
    }
  }
);

router.get(
  "/sheets/:sheetId",
  param("sheetId").isMongoId(),
  handleValidation,
  async (req, res) => {
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet)
        return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (sheet.isDeleted)
        return res
          .status(410)
          .json({ ok: false, message: "Sheet eliminada (soft-delete)" });

      // backfill SKU si falta
      if (!sheet.sku) {
        try {
          await ensureSheetSku(sheet);
        } catch (e) {
          console.warn("SKU backfill fail sheet:", sheet?._id, e?.message || e);
        }
      }

      res.json({
        ok: true,
        data: {
          sheet,
          tabs: buildTabsForTipo(sheet),
          physicalLimits: PHYSICAL_LIMITS,
        },
      });
    } catch (err) {
      console.error("GET /sheets/:sheetId error:", err);
      res.status(500).json({ ok: false, message: "Error al obtener hoja" });
    }
  }
);

// Obtener planilla por SKU (exacto)
router.get("/sheets/by-sku/:sku", async (req, res) => {
  try {
    const sku = String(req.params.sku || "")
      .trim()
      .toUpperCase();
    if (!sku)
      return res.status(400).json({ ok: false, message: "SKU requerido" });

    const sheet = await InventorySheet.findOne({
      sku,
      isDeleted: { $ne: true },
    });
    if (!sheet)
      return res
        .status(404)
        .json({ ok: false, message: "No existe planilla con ese SKU" });

    res.json({
      ok: true,
      data: {
        sheet,
        tabs: buildTabsForTipo(sheet),
        physicalLimits: PHYSICAL_LIMITS,
      },
    });
  } catch (err) {
    console.error("GET /sheets/by-sku/:sku error:", err);
    res.status(500).json({ ok: false, message: "Error al buscar por SKU" });
  }
});

router.patch(
  "/sheets/:sheetId",
  param("sheetId").isMongoId(),
  oneOf([
    body("nombre").optional().isString().trim().notEmpty(),
    body("name").optional().isString().trim().notEmpty(),
  ]),
  body("tratamientos").optional().isArray(),

  // ✅ FIX: nullable + falsy
  body("proveedor").optional({ nullable: true }).isObject(),
  body("proveedor.name").optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body("proveedor.id").optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body("marca").optional({ nullable: true }).isObject(),
  body("marca.name").optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body("marca.id").optional({ nullable: true, checkFalsy: true }).isString().trim(),

  // ✅ meta parcial (NO reemplazar todo el meta)
  body("meta").optional().isObject(),
  body("meta.observaciones").optional().isString(),
  body("meta.notas").optional().isString(),
  body("meta.ranges").optional().isObject(),

  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet)
        return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (sheet.isDeleted)
        return res
          .status(410)
          .json({ ok: false, message: "Sheet eliminada (soft-delete)" });

      // ✅ aplica cambios sin pisar meta completo
      if (isDef(req.body.nombre) || isDef(req.body.name)) {
        sheet.nombre = (req.body.nombre ?? req.body.name).trim();
      }

      if (isDef(req.body.tratamientos)) {
        sheet.tratamientos = req.body.tratamientos;
      }

      if (isDef(req.body.proveedor)) {
        sheet.proveedor = normalizeParty(req.body.proveedor);
      }

      if (isDef(req.body.marca)) {
        sheet.marca = normalizeParty(req.body.marca);
      }

      if (req.body.meta && typeof req.body.meta === "object") {
        sheet.meta = sheet.meta && typeof sheet.meta === "object" ? sheet.meta : {};

        if (isDef(req.body.meta.observaciones))
          sheet.meta.observaciones = String(req.body.meta.observaciones || "");
        if (isDef(req.body.meta.notas))
          sheet.meta.notas = String(req.body.meta.notas || "");

        if (req.body.meta.ranges && typeof req.body.meta.ranges === "object") {
          sheet.meta.ranges = req.body.meta.ranges;
        }

        sheet.markModified("meta");
      }

      sheet.updatedBy = actor;
      sheet.updatedAt = new Date();
      await sheet.save();

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "SHEET_UPDATE",
        details: {
          nombre: sheet.nombre,
          proveedor: sheet.proveedor,
          marca: sheet.marca,
          tratamientos: sheet.tratamientos,
          metaChanged: !!req.body.meta,
        },
        actor,
      });

      return res.json({
        ok: true,
        data: {
          sheet,
          tabs: buildTabsForTipo(sheet),
          physicalLimits: PHYSICAL_LIMITS,
        },
      });
    } catch (err) {
      console.error("PATCH /sheets/:sheetId error:", err);
      return res
        .status(500)
        .json({ ok: false, message: "Error al actualizar hoja" });
    }
  }
);

// ✅ Enviar a papelera (soft-delete) => PATCH /sheets/:sheetId/trash
router.patch(
  "/sheets/:sheetId/trash",
  param("sheetId").isMongoId(),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet)
        return res.status(404).json({ ok: false, message: "Sheet no existe" });

      // si ya estaba en papelera, responde ok (idempotente)
      if (sheet.isDeleted) {
        return res.json({
          ok: true,
          message: "Hoja ya estaba en papelera",
          data: {
            sheet,
            tabs: buildTabsForTipo(sheet),
            physicalLimits: PHYSICAL_LIMITS,
          },
        });
      }

      sheet.isDeleted = true;
      sheet.deletedAt = new Date();
      sheet.deletedBy = actor;
      sheet.updatedBy = actor;
      sheet.updatedAt = new Date();
      await sheet.save();

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "SHEET_TRASH",
        details: { isDeleted: true },
        actor,
      });

      return res.json({
        ok: true,
        message: "Hoja enviada a papelera",
        data: {
          sheet,
          tabs: buildTabsForTipo(sheet),
          physicalLimits: PHYSICAL_LIMITS,
        },
      });
    } catch (err) {
      console.error("PATCH /sheets/:sheetId/trash error:", err);
      return res
        .status(500)
        .json({ ok: false, message: "Error al enviar a papelera" });
    }
  }
);

router.delete(
  "/sheets/:sheetId",
  param("sheetId").isMongoId(),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet)
        return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (sheet.isDeleted)
        return res.json({ ok: true, message: "Hoja ya estaba eliminada" });

      sheet.isDeleted = true;
      sheet.deletedAt = new Date();
      sheet.deletedBy = actor;
      sheet.updatedBy = actor;
      await sheet.save();

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "SHEET_SOFT_DELETE",
        details: { isDeleted: true },
        actor,
      });

      res.json({ ok: true, message: "Hoja eliminada (soft-delete)" });
    } catch (err) {
      console.error("DELETE /sheets/:sheetId error:", err);
      res.status(500).json({ ok: false, message: "Error al eliminar hoja" });
    }
  }
);

router.patch(
  "/sheets/:sheetId/restore",
  param("sheetId").isMongoId(),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet)
        return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (!sheet.isDeleted)
        return res.json({ ok: true, message: "Hoja ya está activa" });

      sheet.isDeleted = false;
      sheet.deletedAt = null;
      sheet.deletedBy = { userId: null, name: null };
      sheet.updatedBy = actor;
      await sheet.save();

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "SHEET_RESTORE",
        details: { isDeleted: false },
        actor,
      });

      res.json({
        ok: true,
        data: {
          sheet,
          tabs: buildTabsForTipo(sheet),
          physicalLimits: PHYSICAL_LIMITS,
        },
      });
    } catch (err) {
      console.error("PATCH /sheets/:sheetId/restore error:", err);
      res.status(500).json({ ok: false, message: "Error al restaurar hoja" });
    }
  }
);

/* ======================= ITEMS ======================= */

router.get(
  "/sheets/:sheetId/items",
  param("sheetId").isMongoId(),
  handleValidation,
  async (req, res) => {
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet)
        return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (sheet.isDeleted)
        return res
          .status(410)
          .json({ ok: false, message: "Sheet eliminada (soft-delete)" });

      const limit = Math.min(Number(req.query.limit ?? 5000), 20000);

      if (sheet.tipo_matriz === "BASE") {
        const doc = await MatrixBase.findOne({ sheet: sheet._id });

        const baseRange = clampRange(
          isDef(req.query.baseMin)
            ? Number(req.query.baseMin)
            : PHYSICAL_LIMITS.BASE.min,
          isDef(req.query.baseMax)
            ? Number(req.query.baseMax)
            : PHYSICAL_LIMITS.BASE.max,
          PHYSICAL_LIMITS.BASE
        );
        if (!baseRange)
          return res
            .status(400)
            .json({ ok: false, message: "Rango BASE inválido" });

        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const base = denormNum(k);
            if (
              Number.isFinite(base) &&
              base >= baseRange.min &&
              base <= baseRange.max
            ) {
              rows.push({
                sheet: sheet._id,
                tipo_matriz: "BASE",
                base,
                existencias: cell.existencias ?? 0,
                sku: cell.sku || null,
                codebar: cell.codebar || null,
              });
            }
          }
        }

        rows = rows.sort((a, b) => a.base - b.base).slice(0, limit);
        return res.json({ ok: true, data: rows });
      }

      if (sheet.tipo_matriz === "SPH_CYL") {
        const doc = await MatrixSphCyl.findOne({ sheet: sheet._id });

        const sphRange = clampRange(
          isDef(req.query.sphMin)
            ? Number(req.query.sphMin)
            : PHYSICAL_LIMITS.SPH.min,
          isDef(req.query.sphMax)
            ? Number(req.query.sphMax)
            : PHYSICAL_LIMITS.SPH.max,
          PHYSICAL_LIMITS.SPH
        );
        const cylRange = clampRange(
          isDef(req.query.cylMin)
            ? Number(req.query.cylMin)
            : PHYSICAL_LIMITS.CYL.min,
          isDef(req.query.cylMax)
            ? Number(req.query.cylMax)
            : PHYSICAL_LIMITS.CYL.max,
          PHYSICAL_LIMITS.CYL
        );
        if (!sphRange)
          return res
            .status(400)
            .json({ ok: false, message: "Rango SPH inválido" });
        if (!cylRange)
          return res
            .status(400)
            .json({ ok: false, message: "Rango CYL inválido" });

        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const [sph, cyl] = parseKey(k);
            if (
              Number.isFinite(sph) &&
              Number.isFinite(cyl) &&
              sph >= sphRange.min &&
              sph <= sphRange.max &&
              cyl >= cylRange.min &&
              cyl <= cylRange.max
            ) {
              rows.push({
                sheet: sheet._id,
                tipo_matriz: "SPH_CYL",
                sph,
                cyl,
                existencias: cell.existencias ?? 0,
                sku: cell.sku || null,
                codebar: cell.codebar || null,
              });
            }
          }
        }

        rows = rows
          .sort((a, b) => (a.sph === b.sph ? a.cyl - b.cyl : a.sph - b.sph))
          .slice(0, limit);

        return res.json({ ok: true, data: rows });
      }

      if (sheet.tipo_matriz === "SPH_ADD") {
        const doc = await MatrixBifocal.findOne({ sheet: sheet._id });

        const sphRange = clampRange(
          isDef(req.query.sphMin)
            ? Number(req.query.sphMin)
            : PHYSICAL_LIMITS.SPH.min,
          isDef(req.query.sphMax)
            ? Number(req.query.sphMax)
            : PHYSICAL_LIMITS.SPH.max,
          PHYSICAL_LIMITS.SPH
        );
        const addRange = clampRange(
          isDef(req.query.addMin)
            ? Number(req.query.addMin)
            : PHYSICAL_LIMITS.ADD.min,
          isDef(req.query.addMax)
            ? Number(req.query.addMax)
            : PHYSICAL_LIMITS.ADD.max,
          PHYSICAL_LIMITS.ADD
        );
        if (!sphRange)
          return res
            .status(400)
            .json({ ok: false, message: "Rango SPH inválido" });
        if (!addRange)
          return res
            .status(400)
            .json({ ok: false, message: "Rango ADD inválido" });

        const eyes = String(req.query.eyes ?? "OD,OI")
          .split(",")
          .map((s) => s.trim().toUpperCase());

        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const [sph, add, bi, bd] = parseKey(k);
            if (
              Number.isFinite(sph) &&
              Number.isFinite(add) &&
              sph >= sphRange.min &&
              sph <= sphRange.max &&
              add >= addRange.min &&
              add <= addRange.max
            ) {
              if (eyes.includes("OD"))
                rows.push({
                  sheet: sheet._id,
                  tipo_matriz: "SPH_ADD",
                  sph,
                  add,
                  eye: "OD",
                  base_izq: bi,
                  base_der: bd,
                  existencias: cell.OD?.existencias ?? 0,
                  sku: cell.OD?.sku || null,
                  codebar: cell.OD?.codebar || null,
                });
              if (eyes.includes("OI"))
                rows.push({
                  sheet: sheet._id,
                  tipo_matriz: "SPH_ADD",
                  sph,
                  add,
                  eye: "OI",
                  base_izq: bi,
                  base_der: bd,
                  existencias: cell.OI?.existencias ?? 0,
                  sku: cell.OI?.sku || null,
                  codebar: cell.OI?.codebar || null,
                });
            }
          }
        }

        rows = rows
          .sort((a, b) =>
            a.sph === b.sph
              ? a.add === b.add
                ? a.eye.localeCompare(b.eye)
                : a.add - b.add
              : a.sph - b.sph
          )
          .slice(0, limit);

        return res.json({ ok: true, data: rows });
      }

      if (sheet.tipo_matriz === "BASE_ADD") {
        const doc = await MatrixProgresivo.findOne({ sheet: sheet._id });

        const addRange = clampRange(
          isDef(req.query.addMin)
            ? Number(req.query.addMin)
            : PHYSICAL_LIMITS.ADD.min,
          isDef(req.query.addMax)
            ? Number(req.query.addMax)
            : PHYSICAL_LIMITS.ADD.max,
          PHYSICAL_LIMITS.ADD
        );
        if (!addRange)
          return res
            .status(400)
            .json({ ok: false, message: "Rango ADD inválido" });

        const eyes = String(req.query.eyes ?? "OD,OI")
          .split(",")
          .map((s) => s.trim().toUpperCase());

        let rows = [];
        if (doc?.cells) {
          for (const [k, cell] of doc.cells.entries()) {
            const [bi, bd, add] = parseKey(k);
            if (
              Number.isFinite(add) &&
              add >= addRange.min &&
              add <= addRange.max
            ) {
              if (eyes.includes("OD"))
                rows.push({
                  sheet: sheet._id,
                  tipo_matriz: "BASE_ADD",
                  add,
                  eye: "OD",
                  base_izq: bi,
                  base_der: bd,
                  existencias: cell.OD?.existencias ?? 0,
                  sku: cell.OD?.sku || null,
                  codebar: cell.OD?.codebar || null,
                });
              if (eyes.includes("OI"))
                rows.push({
                  sheet: sheet._id,
                  tipo_matriz: "BASE_ADD",
                  add,
                  eye: "OI",
                  base_izq: bi,
                  base_der: bd,
                  existencias: cell.OI?.existencias ?? 0,
                  sku: cell.OI?.sku || null,
                  codebar: cell.OI?.codebar || null,
                });
            }
          }
        }

        rows = rows
          .sort((a, b) =>
            a.add === b.add ? a.eye.localeCompare(b.eye) : a.add - b.add
          )
          .slice(0, limit);

        return res.json({ ok: true, data: rows });
      }

      return res.json({ ok: true, data: [] });
    } catch (err) {
      console.error("GET /sheets/:sheetId/items error:", err);
      res.status(500).json({ ok: false, message: "Error al listar items" });
    }
  }
);

/* ======================= RESEED ======================= */

router.post(
  "/sheets/:sheetId/seed",
  param("sheetId").isMongoId(),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);
    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet)
        return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (sheet.isDeleted)
        return res
          .status(410)
          .json({ ok: false, message: "Sheet eliminada (soft-delete)" });

      const stats = await seedFullForSheet(sheet, actor);

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "SEED_GENERATE",
        details: { inserted: stats.inserted, defaults: true },
        actor,
      });

      res.json({ ok: true, data: stats });
    } catch (err) {
      console.error("POST /sheets/:sheetId/seed error:", err);
      res.status(500).json({ ok: false, message: "Error al generar seed" });
    }
  }
);

/* ======================= ✅ UPDATE UNA CELDA SPH_CYL ======================= */

router.put(
  "/sheets/:sheetId/sph-cyl/cell",
  param("sheetId").isMongoId(),
  body("sph").exists(),
  body("cyl").exists(),
  body("existencias").optional(),
  body("delta").optional(),
  body("sku").optional(),
  body("codebar").optional(),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req) || { userId: null, name: "system" };

    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet || sheet.isDeleted)
        return res
          .status(404)
          .json({ ok: false, message: "Hoja no encontrada" });
      if (sheet.tipo_matriz !== "SPH_CYL")
        return res
          .status(400)
          .json({ ok: false, message: "Esta hoja no es SPH_CYL" });

      let sph = to2(req.body.sph);
      let cyl = to2(req.body.cyl);

      if (!Number.isFinite(sph) || !Number.isFinite(cyl))
        return res
          .status(400)
          .json({ ok: false, message: "SPH/CYL inválidos" });
      if (cyl > 0) cyl = to2(-Math.abs(cyl)); // ✅ convención

      // ✅ validación física
      if (sph < PHYSICAL_LIMITS.SPH.min || sph > PHYSICAL_LIMITS.SPH.max)
        return res.status(400).json({
          ok: false,
          message: `SPH fuera de límites (${PHYSICAL_LIMITS.SPH.min}..${PHYSICAL_LIMITS.SPH.max})`,
        });
      if (!isMultipleOfStep(sph, 0.25))
        return res
          .status(400)
          .json({ ok: false, message: "SPH debe ir en pasos de 0.25" });

      if (cyl < PHYSICAL_LIMITS.CYL.min || cyl > PHYSICAL_LIMITS.CYL.max)
        return res.status(400).json({
          ok: false,
          message: `CYL fuera de límites (${PHYSICAL_LIMITS.CYL.min}..${PHYSICAL_LIMITS.CYL.max})`,
        });

      const cylIsZero = Math.abs(cyl) < 1e-6;
      if (!cylIsZero && !isMultipleOfStep(cyl, 0.25))
        return res
          .status(400)
          .json({ ok: false, message: "CYL debe ir en pasos de 0.25" });

      const key = keySphCyl(sph, cyl);

      let doc = await MatrixSphCyl.findOne({ sheet: sheet._id });
      if (!doc)
        doc = new MatrixSphCyl({
          sheet: sheet._id,
          tipo_matriz: "SPH_CYL",
          cells: new Map(),
        });

      doc.set("cells", doc.cells || new Map());

      const prev = doc.cells.get(key) || {
        existencias: 0,
        sku: null,
        codebar: null,
        createdBy: actor,
      };
      const before = Number(prev.existencias ?? 0);

      let after;
      if (isDef(req.body.existencias)) after = Number(req.body.existencias);
      else if (isDef(req.body.delta)) after = before + Number(req.body.delta);
      else
        return res
          .status(400)
          .json({ ok: false, message: "Envía existencias o delta" });

      if (!Number.isFinite(after) || after < 0)
        return res.status(400).json({
          ok: false,
          message: "Existencias resultantes inválidas (<0)",
        });

      let finalSku = isDef(req.body.sku)
        ? String(req.body.sku)
        : prev.sku || makeSku(sheet._id, "SPH_CYL", { sph, cyl });
      let finalCodebar = isDef(req.body.codebar)
        ? req.body.codebar === null
          ? null
          : String(req.body.codebar)
        : prev.codebar;

      if (after > 0 && !finalCodebar)
        finalCodebar = makeCodebar(sheet._id, "SPH_CYL", { sph, cyl });

      const nextCell = {
        ...prev,
        existencias: after,
        sku: finalSku,
        codebar: finalCodebar,
        createdBy: prev.createdBy || actor,
        updatedBy: actor,
      };

      doc.cells.set(key, nextCell);
      doc.markModified("cells");
      await doc.save();

      // ✅ extiende meta.ranges para que el front RENDERICE
      let axisExtended = false;
      let axisExtendError = null;
      try {
        axisExtended = await maybeExtendMetaRangesFromRows(sheet, [
          { sph, cyl, existencias: after },
        ]);
      } catch (e) {
        axisExtended = false;
        axisExtendError = e?.message || String(e);
      }

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: "SPH_CYL",
        sph,
        cyl,
        type: "CELL_UPDATE",
        details: {
          key,
          before,
          after,
          delta: after - before,
          axisExtended,
          axisExtendError,
        },
        actor,
      });

      return res.json({
        ok: true,
        key,
        before,
        after,
        cell: nextCell,
        axisExtended,
        axisExtendError,
      });
    } catch (err) {
      console.error("PUT /sheets/:sheetId/sph-cyl/cell error:", err);
      return res.status(500).json({
        ok: false,
        message: "Error interno",
        error: String(err?.message || err),
      });
    }
  }
);

/* ======================= CHUNK SAVE ======================= */

router.post(
  "/sheets/:sheetId/chunk",
  param("sheetId").isMongoId(),
  body("rows").isArray().withMessage("rows debe ser un arreglo"),
  body("actor").optional().isObject(),
  handleValidation,
  async (req, res) => {
    const actor = actorFromBody(req);

    try {
      const sheet = await InventorySheet.findById(req.params.sheetId);
      if (!sheet)
        return res.status(404).json({ ok: false, message: "Sheet no existe" });
      if (sheet.isDeleted)
        return res
          .status(410)
          .json({ ok: false, message: "Sheet eliminada (soft-delete)" });

      const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
      if (!rows.length) return res.json({ ok: true, data: { upserted: 0 } });

      const validationErrors = validateChunkRows(sheet.tipo_matriz, rows);
      if (validationErrors.length) {
        return res.status(400).json({
          ok: false,
          message: "Datos inválidos en rows",
          errors: validationErrors,
        });
      }

      let result;
      let usedRowsForExtend = rows;

      switch (sheet.tipo_matriz) {
        case "BASE":
          result = await applyChunkBase(sheet, rows, actor);
          break;

        case "SPH_CYL": {
          const normalizedRows = rows.map((r) => {
            let cyl = r.cyl;
            if (Number.isFinite(Number(cyl)) && Number(cyl) > 0)
              cyl = -Math.abs(Number(cyl));
            return { ...r, cyl };
          });
          result = await applyChunkSphCyl(sheet, normalizedRows, actor);
          usedRowsForExtend = normalizedRows;
          break;
        }

        case "SPH_ADD":
          result = await applyChunkBifocal(sheet, rows, actor);
          break;

        case "BASE_ADD":
          result = await applyChunkProgresivo(sheet, rows, actor);
          break;

        default:
          return res.status(400).json({
            ok: false,
            message: `tipo_matriz no soportado: ${sheet.tipo_matriz}`,
          });
      }

      let axisExtended = false;
      let axisExtendError = null;
      try {
        axisExtended = await maybeExtendMetaRangesFromRows(
          sheet,
          usedRowsForExtend
        );
      } catch (e) {
        axisExtended = false;
        axisExtendError = e?.message || String(e);
      }

      await InventoryChangeLog.create({
        sheet: sheet._id,
        tipo_matriz: sheet.tipo_matriz,
        type: "CHUNK_SAVE",
        details: {
          upserted: result.updated,
          rowsCount: rows.length,
          axisExtended,
          axisExtendError,
        },
        actor,
      });

      return res.json({
        ok: true,
        data: { upserted: result.updated, axisExtended, axisExtendError },
      });
    } catch (err) {
      console.error("POST /sheets/:sheetId/chunk error:", err);
      res.status(500).json({ ok: false, message: "Error al guardar chunk" });
    }
  }
);

module.exports = router;
