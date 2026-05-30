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
      `<div class="stt-foot"><span class="stt-stock">${Number(params.value ?? 0)}</span>${badge}</div>`;
    this.eGui = el;
  }

  getGui() {
    return this.eGui;
  }
}
