// src/utils/ean13.js
// Utilidades EAN-13: validación, normalización y generación de SVG de código de barras.

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

function checksumEan13(d12) {
  const digits = d12.split("").map((x) => Number(x));
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

export function normalizeEan13(raw) {
  const d = onlyDigits(raw);
  if (d.length === 12) return d + String(checksumEan13(d));
  if (d.length === 13) return d;
  return "";
}

export function isEan13(raw) {
  const d = onlyDigits(raw);
  if (d.length !== 13) return false;
  return Number(d[12]) === checksumEan13(d.slice(0, 12));
}

export function ean13SvgString(value, scale = 2, height = 90) {
  const quiet = 10;
  const L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
  const G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
  const R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];
  const PARITY = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];

  const ean = normalizeEan13(value);
  if (!ean) return "";

  const first = Number(ean[0]);
  const left = ean.slice(1, 7).split("").map(Number);
  const right = ean.slice(7, 13).split("").map(Number);
  const parity = PARITY[first];

  let bits = "101";
  for (let i = 0; i < 6; i++) bits += parity[i] === "L" ? L[left[i]] : G[left[i]];
  bits += "01010";
  for (let i = 0; i < 6; i++) bits += R[right[i]];
  bits += "101";

  const isGuardBit = (i) => (i >= 0 && i <= 2) || (i >= 45 && i <= 49) || (i >= 92 && i <= 94);
  const sc = Math.max(1, Number(scale || 2));
  const normalH = Math.max(40, Number(height || 90));
  const guardH = normalH + 10;
  const textH = 18;
  const w = (bits.length + quiet * 2) * sc;
  const hSvg = guardH + textH + 6;

  let rects = [];
  let runStart = -1;
  let runGuard = false;

  for (let i = 0; i < bits.length; i++) {
    const bit = bits[i];
    const guard = isGuardBit(i);

    if (bit === "1" && runStart === -1) {
      runStart = i;
      runGuard = guard;
    } else if (bit === "1" && runStart !== -1 && runGuard !== guard) {
      rects.push({ start: runStart, end: i - 1, guard: runGuard });
      runStart = i;
      runGuard = guard;
    } else if (bit === "0" && runStart !== -1) {
      rects.push({ start: runStart, end: i - 1, guard: runGuard });
      runStart = -1;
    }
  }
  if (runStart !== -1) rects.push({ start: runStart, end: bits.length - 1, guard: runGuard });

  const rectsSvg = rects
    .map((r) => `<rect x="${(quiet + r.start) * sc}" y="6" width="${(r.end - r.start + 1) * sc}" height="${r.guard ? guardH : normalH}" fill="#000" />`)
    .join("");

  return `<svg width="${w}" height="${hSvg}" viewBox="0 0 ${w} ${hSvg}" role="img" aria-label="Barcode EAN-13" style="display:block">
  <rect x="0" y="0" width="${w}" height="${hSvg}" fill="#fff"></rect>
  ${rectsSvg}
  <text x="${w / 2}" y="${guardH + textH}" text-anchor="middle" font-size="14" fill="#111"
    font-family="ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace">${ean}</text>
</svg>`;
}
