// src/inventory/utils/numbers.js
const to2 = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
};

const isDef = (v) => v !== undefined && v !== null;

const fmt2 = (n) =>
  n === null || n === undefined || Number.isNaN(Number(n))
    ? "x"
    : Number(n).toFixed(2);

const isMultipleOfStep = (value, step) => {
  const v = Number(value);
  const st = Number(step);
  if (!Number.isFinite(v) || !Number.isFinite(st) || st <= 0) return false;
  const absValue = Math.abs(v);
  const factor = Math.round(absValue / st);
  return Math.abs(factor * st - absValue) < 1e-6;
};

module.exports = { to2, isDef, fmt2, isMultipleOfStep };
