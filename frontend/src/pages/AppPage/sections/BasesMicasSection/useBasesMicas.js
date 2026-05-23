import { useState, useEffect, useMemo } from 'react';
import { basesMicasRowData } from './basesMicasGrid.js';
import { buildEmptyRow, parseClipboardTsv } from './basesMicasUtils.jsx';

export const useBasesMicas = () => {
  const [rowData, setRowData] = useState(null);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isDeletedMenuOpen, setIsDeletedMenuOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [templateValues, setTemplateValues] = useState({});
  const [gridApi, setGridApi] = useState(null);
  const [selectionCount, setSelectionCount] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setRowData(basesMicasRowData), 1800);
    return () => clearTimeout(t);
  }, []);

  const handleFormChange = (fieldId, value) =>
    setTemplateValues(prev => ({ ...prev, [fieldId]: value }));

  const handleToggleCreate = () => {
    setIsCreating(prev => {
      if (prev) setTemplateValues({});
      return !prev;
    });
  };

  const handleGridReady = (params) => setGridApi(params.api);
  const handleSelectionChanged = (params) => setSelectionCount(params.api.getSelectedRows().length);

  const handleCopy = () => gridApi?.copySelectedRowsToClipboard();
  const handleExportCsv = () => gridApi?.exportDataAsCsv({ fileName: 'bases-y-micas.csv' });
  const handleRefresh = () => { setRowData(null); setTimeout(() => setRowData(basesMicasRowData), 600); };
  const handleAutosize = () => gridApi?.autoSizeAllColumns();
  const handleClearFilters = () => gridApi?.setFilterModel(null);
  const handleDeselectAll = () => gridApi?.deselectAll();
  const handleFormSave = () => { /* TODO: persist plantilla */ handleToggleCreate(); };
  const handleFormReset = () => setTemplateValues({});

  const handleCut = () => {
    if (!gridApi) return;
    const selected = gridApi.getSelectedRows();
    if (!selected.length) return;
    gridApi.copySelectedRowsToClipboard();
    const selectedSet = new Set(selected);
    setRowData((prev) => (prev ?? []).filter((r) => !selectedSet.has(r)));
  };

  const handlePaste = async () => {
    try {
      if (!navigator.clipboard?.readText) return;
      const text = await navigator.clipboard.readText();
      if (!text?.trim()) return;
      const newRows = parseClipboardTsv(text);
      if (newRows.length) setRowData((prev) => [...(prev ?? []), ...newRows]);
    } catch {
      /* clipboard read denegado por el navegador */
    }
  };

  const handleCreateRow = () =>
    setRowData((prev) => [...(prev ?? []), buildEmptyRow()]);

  const handleDeleteSelected = () => {
    if (!gridApi) return;
    const selected = gridApi.getSelectedRows();
    if (!selected.length) return;
    const selectedSet = new Set(selected);
    setRowData((prev) => (prev ?? []).filter((r) => !selectedSet.has(r)));
  };

  const actions = useMemo(() => ({
    handleFormChange, handleToggleCreate, handleGridReady, handleSelectionChanged,
    handleCopy, handleExportCsv, handleRefresh, handleAutosize, handleClearFilters,
    handleDeselectAll, handleFormSave, handleFormReset, handleCut, handlePaste,
    handleCreateRow, handleDeleteSelected
  }), [gridApi]);

  return {
    state: {
      rowData, isTemplateMenuOpen, isDeletedMenuOpen, isCreating,
      templateValues, gridApi, selectionCount
    },
    actions: {
      setRowData, setIsTemplateMenuOpen, setIsDeletedMenuOpen, setIsCreating,
      setTemplateValues, setGridApi, setSelectionCount,
      ...actions
    }
  };
};
