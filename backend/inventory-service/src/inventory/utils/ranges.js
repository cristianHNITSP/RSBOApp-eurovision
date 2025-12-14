// src/inventory/utils/ranges.js
const { to2, isDef } = require("./numbers");

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
  return { min: to2(Math.min(a, b)), max: to2(Math.max(a, b)), step: to2(step) };
};

const clamp1 = (v, physical) => {
  const r = clampRange(v, v, physical);
  return r ? r.min : to2(v);
};

module.exports = { frange, clampRange, pickRange, rangeMinMax, clamp1 };
