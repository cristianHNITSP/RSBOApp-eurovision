/**
 * useExcelExport.js — Genera archivos XLSX con formato profesional
 * usando los colores del proyecto RSBO (tokens.css).
 */
import ExcelJS from "exceljs";

// ── Paleta RSBO ──
const COLORS = {
  primary:      "906FE1",
  primaryDark:  "7957D5",
  primaryLight: "9A6DFF",
  white:        "FFFFFF",
  textDark:     "0F172A",
  textSecondary:"4B5563",
  textMuted:    "94A3B8",
  bgSubtle:     "F9FAFB",
  bgMuted:      "F3F4F6",
  border:       "E5E7EB",
  success:      "22C55E",
  warning:      "F59E0B",
  danger:       "EF4444",
  headerBg:     "F5F3FF",   // --ag-header-bg token
  headerText:   "4527A0",   // --ag-header-text token
  oddRow:       "FBFBFF",   // --ag-odd-row token
};

const FONT_BODY = "Segoe UI";
const FONT_BRAND = "Segoe UI";

/**
 * Genera y descarga un archivo XLSX estilizado.
 *
 * @param {Object} opts
 * @param {string} opts.filename      — nombre del archivo (sin extensión)
 * @param {string} opts.sheetName     — nombre de la hoja
 * @param {string} opts.title         — título del reporte (fila cabecera)
 * @param {string} [opts.subtitle]    — subtítulo opcional
 * @param {Array<{key:string, label:string, width?:number, transform?:Function, align?:string}>} opts.columns
 * @param {Array<Object>} opts.rows
 * @param {Array<{label:string, value:string|number}>} [opts.summaryCards] — tarjetas de resumen
 */
export async function exportToXlsx({
  filename,
  sheetName = "Reporte",
  title = "Reporte RSBO",
  subtitle,
  columns,
  rows,
  summaryCards,
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RSBO — Sistema de Gestion Optica";
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName, {
    properties: { defaultRowHeight: 22 },
    views: [{ state: "frozen", ySplit: 0 }], // will update after header rows
  });

  let currentRow = 1;

  // ── Brand header row ──
  const brandRow = ws.getRow(currentRow);
  ws.mergeCells(currentRow, 1, currentRow, columns.length);
  const brandCell = brandRow.getCell(1);
  brandCell.value = "RSBO — Sistema de Gestion Optica";
  brandCell.font = { name: FONT_BRAND, size: 10, bold: false, color: { argb: COLORS.white } };
  brandCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.primaryDark } };
  brandCell.alignment = { horizontal: "right", vertical: "middle" };
  brandRow.height = 26;
  currentRow++;

  // ── Title row ──
  const titleRow = ws.getRow(currentRow);
  ws.mergeCells(currentRow, 1, currentRow, columns.length);
  const titleCell = titleRow.getCell(1);
  titleCell.value = title;
  titleCell.font = { name: FONT_BRAND, size: 16, bold: true, color: { argb: COLORS.primaryDark } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg } };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };
  titleRow.height = 36;
  currentRow++;

  // ── Subtitle / date row ──
  const dateStr = new Date().toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
  const subRow = ws.getRow(currentRow);
  ws.mergeCells(currentRow, 1, currentRow, columns.length);
  const subCell = subRow.getCell(1);
  subCell.value = subtitle ? `${subtitle}  |  ${dateStr}` : `Generado el ${dateStr}`;
  subCell.font = { name: FONT_BODY, size: 9, italic: true, color: { argb: COLORS.textMuted } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg } };
  subCell.alignment = { horizontal: "left", vertical: "middle" };
  subRow.height = 22;
  currentRow++;

  // ── Summary cards row (optional) ──
  if (summaryCards?.length) {
    currentRow++; // spacer
    const cardRow = ws.getRow(currentRow);
    cardRow.height = 30;
    for (let i = 0; i < summaryCards.length && i < columns.length; i++) {
      const cell = cardRow.getCell(i + 1);
      cell.value = `${summaryCards[i].label}: ${summaryCards[i].value}`;
      cell.font = { name: FONT_BODY, size: 10, bold: true, color: { argb: COLORS.primaryDark } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.bgMuted } };
      cell.border = {
        top:    { style: "thin", color: { argb: COLORS.border } },
        bottom: { style: "thin", color: { argb: COLORS.border } },
        left:   { style: "thin", color: { argb: COLORS.border } },
        right:  { style: "thin", color: { argb: COLORS.border } },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
    currentRow++;
  }

  currentRow++; // spacer before data header

  // ── Column headers ──
  const headerRowNum = currentRow;
  const headerRow = ws.getRow(currentRow);
  headerRow.height = 30;
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.label;
    cell.font = { name: FONT_BODY, size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.primary } };
    cell.alignment = {
      horizontal: col.align || "left",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      bottom: { style: "medium", color: { argb: COLORS.primaryDark } },
    };
  });
  currentRow++;

  // Freeze panes at the header
  ws.views = [{ state: "frozen", ySplit: headerRowNum, xSplit: 0 }];

  // ── Data rows ──
  rows.forEach((row, ri) => {
    const dataRow = ws.getRow(currentRow);
    dataRow.height = 22;
    const isEven = ri % 2 === 0;

    columns.forEach((col, ci) => {
      const raw = typeof col.transform === "function" ? col.transform(row) : row?.[col.key];
      const cell = dataRow.getCell(ci + 1);
      cell.value = raw ?? "";
      cell.font = { name: FONT_BODY, size: 10, color: { argb: COLORS.textDark } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? COLORS.white : COLORS.oddRow },
      };
      cell.alignment = {
        horizontal: col.align || "left",
        vertical: "middle",
      };
      cell.border = {
        bottom: { style: "hair", color: { argb: COLORS.border } },
      };
    });
    currentRow++;
  });

  // ── Footer row ──
  const footerRow = ws.getRow(currentRow);
  ws.mergeCells(currentRow, 1, currentRow, columns.length);
  const footerCell = footerRow.getCell(1);
  footerCell.value = `Total: ${rows.length} registros  |  RSBO  |  ${dateStr}`;
  footerCell.font = { name: FONT_BODY, size: 9, bold: true, color: { argb: COLORS.white } };
  footerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.primary } };
  footerCell.alignment = { horizontal: "center", vertical: "middle" };
  footerRow.height = 26;

  // ── Column widths ──
  columns.forEach((col, i) => {
    const wsCol = ws.getColumn(i + 1);
    if (col.width) {
      wsCol.width = col.width;
    } else {
      // Auto width: header length + padding, min 12
      const maxDataLen = rows.slice(0, 50).reduce((mx, r) => {
        const raw = typeof col.transform === "function" ? col.transform(r) : r?.[col.key];
        return Math.max(mx, String(raw ?? "").length);
      }, col.label.length);
      wsCol.width = Math.max(12, Math.min(maxDataLen + 4, 45));
    }
  });

  // ── Auto-filter on data ──
  ws.autoFilter = {
    from: { row: headerRowNum, column: 1 },
    to: { row: headerRowNum + rows.length, column: columns.length },
  };

  // ── Download ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename || "reporte"}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Helper para exportar datos de AG-Grid como XLSX.
 * Extrae columnas y filas visibles del gridApi.
 */
export async function exportAgGridToXlsx(gridApi, { filename, sheetName, title, subtitle, summaryCards } = {}) {
  if (!gridApi) return;

  // Obtener definiciones de columnas visibles
  const colDefs = (typeof gridApi.getColumns === "function"
    ? gridApi.getColumns()
    : gridApi.columnModel?.getColumns?.() || []
  ).filter(c => c.isVisible?.() ?? c.visible !== false);

  const columns = colDefs.map(c => {
    const def = c.getColDef?.() || c.colDef || c;
    return {
      key: def.field || def.colId || "",
      label: typeof def.headerName === "string" ? def.headerName : (def.field || ""),
      width: def.width ? Math.round(def.width / 7) : undefined,
      align: def.type === "numericColumn" || def.cellClass?.includes?.("right") ? "right" : "left",
    };
  }).filter(c => c.key);

  // Obtener filas (modelo del display)
  const rows = [];
  const rowCount = gridApi.getDisplayedRowCount?.() ?? 0;
  for (let i = 0; i < rowCount; i++) {
    const rowNode = gridApi.getDisplayedRowAtIndex(i);
    if (rowNode?.data) rows.push(rowNode.data);
  }

  await exportToXlsx({
    filename: filename || `reporte_${new Date().toISOString().slice(0, 10)}`,
    sheetName: sheetName || "Inventario",
    title: title || "Reporte de Inventario",
    subtitle,
    columns,
    rows,
    summaryCards,
  });
}
