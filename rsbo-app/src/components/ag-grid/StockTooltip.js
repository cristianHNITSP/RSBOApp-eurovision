/**
 * StockTooltip.js — Tooltip nativo (ITooltipComp) de AG Grid Community.
 *
 * Renderiza una tarjeta con:
 *  - las coordenadas de la celda como chips etiquetados (BASE/SPH/CYL/ADD/Ojo/Eje)
 *  - el valor de stock
 *  - un badge de estado (Sin stock / Crítico / Disponible)
 *
 * Recibe lo específico por tipo y el clasificador de stock desde `params.context`
 * (lo arma AgGridSheet.vue con el descriptor + useStockRules). Estilos: AgGridSheet.css.
 */
// ===================== QR TEST START =====================
// Bloque de PRUEBAS: renderiza el QR interno de la celda dentro del tooltip al hacer hover.
// Para desactivarlo: borrar este bloque + la línea `qrTestBlock(params)` en init()
// y el passthrough `__qr` en los descriptors (ver descriptors/monofocal.js).
import QRCode from "qrcode";

function qrTestBlock(params) {
  try {
    const field = params?.colDef?.field;
    const value = field && params?.data ? params.data[`${field}__qr`] : null;
    if (!value) return "";

    // API síncrona de `qrcode`: matriz de módulos → SVG inline.
    const qr = QRCode.create(String(value), { errorCorrectionLevel: "M" });
    const size = qr.modules.size;
    const data = qr.modules.data;
    let rects = "";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (data[r * size + c]) rects += `<rect x="${c}" y="${r}" width="1" height="1"/>`;
      }
    }
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="58" height="58" ` +
      `viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
      `<rect width="${size}" height="${size}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;

    return `<div class="stt-qr-test" style="margin-top:4px;text-align:center;line-height:0">${svg}</div>`;
  } catch {
    return "";
  }
}
// ====================== QR TEST END ======================

export class StockTooltip {
  init(params) {
    const ctx = params.context || {};
    const parts = (ctx.tooltipParts && ctx.tooltipParts(params)) || [];
    const status = ctx.stockStatus ? ctx.stockStatus(params) : null;

    const chips = parts
      .filter((p) => p && p.value !== "" && p.value != null)
      .map(
        (p) =>
          `<span class="stt-chip"><span class="stt-chip__label">${p.label}</span>` +
          `<span class="stt-chip__val">${p.value}</span></span>`
      )
      .join("");

    const badge = status
      ? `<span class="stt-badge stt-badge--${status.cls}">${status.label}</span>`
      : "";

    const el = document.createElement("div");
    el.className = "ag-stock-tooltip";
    el.innerHTML =
      `<div class="stt-coords">${chips}</div>` +
      `<div class="stt-foot"><span class="stt-stock">${Number(params.value ?? 0)}</span>${badge}</div>` +
      qrTestBlock(params); // === QR TEST === (eliminar esta línea para desactivar la prueba)
    this.eGui = el;
  }

  getGui() {
    return this.eGui;
  }
}
