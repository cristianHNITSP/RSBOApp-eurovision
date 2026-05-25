import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { basesMicasRowData } from '../config/basesMicasGrid.js';
import { buildEmptyRow, parseClipboardTsv } from '../utils/basesMicasUtils.jsx';
import { TEMPLATE_DATA, DELETED_TEMPLATE_DATA } from '../config/data.js';

const MAX_HISTORY = 50;

export const useBasesMicas = () => {
  const [rowData, setRowData] = useState(null);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isDeletedMenuOpen, setIsDeletedMenuOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [templateValues, setTemplateValues] = useState({});
  const [gridApi, setGridApi] = useState(null);
  const [selectionCount, setSelectionCount] = useState(0);

  const [activeTemplates,  setActiveTemplates]  = useState(TEMPLATE_DATA);
  const [deletedTemplates, setDeletedTemplates] = useState(DELETED_TEMPLATE_DATA);

  // ── History (undo/redo) ─────────────────────────────────────
  // Snapshots de rowData. Solo las mutaciones de la rejilla (cut/paste/
  // createRow/deleteSelected) pasan por commitMutation. Refresh y carga
  // inicial NO se registran (no son ediciones del usuario).
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Ref a rowData para leer el valor actual desde callbacks estables sin
  // re-crear handlers cada vez que rowData cambia.
  const rowDataRef = useRef(rowData);
  useEffect(() => { rowDataRef.current = rowData; }, [rowData]);

  const isCreatingRef = useRef(isCreating);
  useEffect(() => { isCreatingRef.current = isCreating; }, [isCreating]);

  useEffect(() => {
    const t = setTimeout(() => setRowData(basesMicasRowData), 1800);
    return () => clearTimeout(t);
  }, []);

  const commitMutation = useCallback((producer) => {
    const current = rowDataRef.current ?? [];
    const next = producer(current);
    setRowData(next);
    setUndoStack((u) => {
      const nu = [...u, current];
      return nu.length > MAX_HISTORY ? nu.slice(-MAX_HISTORY) : nu;
    });
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((u) => {
      if (!u.length) return u;
      const previous = u[u.length - 1];
      const current = rowDataRef.current ?? [];
      setRowData(previous);
      setRedoStack((r) => {
        const nr = [current, ...r];
        return nr.length > MAX_HISTORY ? nr.slice(0, MAX_HISTORY) : nr;
      });
      return u.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((r) => {
      if (!r.length) return r;
      const next = r[0];
      const current = rowDataRef.current ?? [];
      setRowData(next);
      setUndoStack((u) => {
        const nu = [...u, current];
        return nu.length > MAX_HISTORY ? nu.slice(-MAX_HISTORY) : nu;
      });
      return r.slice(1);
    });
  }, []);

  // Atajos de teclado: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Y o Ctrl/Cmd+Shift+Z = redo
  useEffect(() => {
    const isEditableTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k !== 'z' && k !== 'y') return;
      // En modo formulario o sobre inputs/textareas el atajo lo gestiona el SO/navegador
      if (isCreatingRef.current || isEditableTarget(document.activeElement)) return;
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo]);

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
    commitMutation((prev) => prev.filter((r) => !selectedSet.has(r)));
  };

  const handlePaste = async () => {
    try {
      if (!navigator.clipboard?.readText) return;
      const text = await navigator.clipboard.readText();
      if (!text?.trim()) return;
      const newRows = parseClipboardTsv(text);
      if (newRows.length) commitMutation((prev) => [...prev, ...newRows]);
    } catch {
      /* clipboard read denegado por el navegador */
    }
  };

  const handleCreateRow = () =>
    commitMutation((prev) => [...prev, buildEmptyRow()]);

  const handleDeleteSelected = () => {
    if (!gridApi) return;
    const selected = gridApi.getSelectedRows();
    if (!selected.length) return;
    const selectedSet = new Set(selected);
    commitMutation((prev) => prev.filter((r) => !selectedSet.has(r)));
  };

  const handleSendToTrash = useCallback((id) => {
    setActiveTemplates((prev) => {
      const tabs = ['todas', 'creadas', 'abiertas'];
      let found = null;
      for (const k of tabs) {
        found = prev[k]?.find((it) => it.id === id);
        if (found) break;
      }
      if (!found) return prev;

      const next = { ...prev };
      tabs.forEach((k) => {
        next[k] = (prev[k] ?? []).filter((it) => it.id !== found.id && it.sku !== found.sku);
      });

      setDeletedTemplates((prevDel) => {
        if (prevDel.some((it) => it.sku === found.sku)) return prevDel;
        return [found, ...prevDel];
      });

      return next;
    });
  }, []);

  const handleRestoreTemplate = useCallback((id) => {
    setDeletedTemplates((prev) => {
      const found = prev.find((it) => it.id === id);
      if (!found) return prev;

      setActiveTemplates((prevAct) => {
        const dedupe = (list) => (list ?? []).filter((it) => it.id !== found.id && it.sku !== found.sku);
        return {
          ...prevAct,
          todas:    [found, ...dedupe(prevAct.todas)],
          creadas:  [found, ...dedupe(prevAct.creadas)],
          abiertas: prevAct.abiertas ?? [],
        };
      });

      return prev.filter((it) => it.id !== id);
    });
  }, []);

  const handleDeleteTemplateForever = useCallback((id) => {
    setDeletedTemplates((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const actions = useMemo(() => ({
    handleFormChange, handleToggleCreate, handleGridReady, handleSelectionChanged,
    handleCopy, handleExportCsv, handleRefresh, handleAutosize, handleClearFilters,
    handleDeselectAll, handleFormSave, handleFormReset, handleCut, handlePaste,
    handleCreateRow, handleDeleteSelected,
    handleUndo, handleRedo,
    handleSendToTrash, handleRestoreTemplate, handleDeleteTemplateForever,
  }), [gridApi, handleUndo, handleRedo, handleSendToTrash, handleRestoreTemplate, handleDeleteTemplateForever]);

  return {
    state: {
      rowData, isTemplateMenuOpen, isDeletedMenuOpen, isCreating,
      templateValues, gridApi, selectionCount,
      activeTemplates, deletedTemplates,
      canUndo, canRedo,
    },
    actions: {
      setRowData, setIsTemplateMenuOpen, setIsDeletedMenuOpen, setIsCreating,
      setTemplateValues, setGridApi, setSelectionCount,
      ...actions
    }
  };
};
