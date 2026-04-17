/**
 * useAgGridFormulaBar.js
 * Lógica para sincronizar la barra de fórmulas con la celda activa del grid.
 */

import { ref } from "vue";
import { isNumeric } from "@/composables/ag-grid/useAgGridBase";

export function useAgGridFormulaBar({ gridApi, onMarkChanged, isEditableField }) {
  const formulaValue = ref("");
  let activeCell = null;

  const onCellClicked = (p) => {
    activeCell = p;
    formulaValue.value = p.value;
  };

  const onCellValueChanged = (p) => {
    if (activeCell && activeCell.rowIndex === p.rowIndex && activeCell.colDef.field === p.colDef.field) {
      formulaValue.value = p.newValue;
    }
    if (isEditableField(p.colDef.field)) {
      onMarkChanged(p.data, p.colDef.field, p.newValue, p.oldValue);
    }
  };

  function applyFxToGrid(val, { commit = false, rowIdGetter } = {}) {
    if (!activeCell || !gridApi.value || activeCell.data?.__loading) return;
    const field = activeCell.colDef.field;
    if (!isEditableField(field)) return;

    const raw = String(val ?? "").trim();
    if (!commit) {
      if (raw === "" || !isNumeric(raw)) return;
    }
    const newVal = isNumeric(raw) ? Number(raw) : 0;
    const oldVal = Number(activeCell.data?.[field] ?? 0);

    if (!commit && oldVal === newVal) return;

    if (activeCell.data) activeCell.data[field] = newVal;

    if (!commit) {
      gridApi.value.refreshCells?.({ rowNodes: activeCell.node ? [activeCell.node] : undefined, columns: [field], force: true });
      return;
    }

    const updatedRow = { ...(activeCell.data || {}), [field]: newVal };
    const rowId = rowIdGetter ? rowIdGetter(updatedRow) : String(updatedRow.id || updatedRow.sph || updatedRow.base);
    const node = gridApi.value.getRowNode(rowId);
    if (node) {
      node.setData(updatedRow);
      gridApi.value.flashCells?.({ rowNodes: [node], columns: [field] });
    }
    onMarkChanged(updatedRow, field, newVal, oldVal);
  }

  const onFxInput  = (val) => applyFxToGrid(val, { commit: false });
  const onFxCommit = (val, { rowIdGetter } = {}) => applyFxToGrid(val, { commit: true, rowIdGetter });

  return {
    formulaValue,
    onCellClicked,
    onCellValueChanged,
    onFxInput,
    onFxCommit,
  };
}
