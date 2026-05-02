// src/composables/useSheetApi.js
//
// Composable que devuelve las funciones correctas de API según el contexto:
//   apiType = 'inventory'     → /api/inventory/...   (bases y micas oftálmicas)
//   apiType = 'contactlenses' → /api/contactlenses/... (lentes de contacto)
//
// Uso:
//   const { fetchItems, saveChunk, ... } = useSheetApi(() => props.apiType);
//
import { labToast } from "@/composables/shared/useLabToast.js";
import {
  fetchItems,
  saveChunk,
  reseedSheet,
  listSheets,
  getSheet as _getSheetRaw,
  createSheet,
  updateSheet,
  moveSheetToTrash,
  restoreSheet,
  purgeSheet
} from '@/services/inventory';

import {
  fetchContactLensItems,
  saveContactLensChunk,
  reseedContactLensSheet,
  listContactLensSheets,
  getContactLensSheet as _getCLSheetRaw,
  createContactLensSheet,
  updateContactLensSheet,
  moveContactLensSheetToTrash,
  restoreContactLensSheet,
  purgeContactLensSheet
} from '@/services/contactlenses';

/**
 * @param {() => string} getApiType  — función que devuelve 'inventory' | 'contactlenses'
 */
export function useSheetApi(getApiType) {
  const isCL = () => {
    const v = typeof getApiType === 'function' ? getApiType() : getApiType;
    return v === 'contactlenses';
  };

  const getSheetSmart = async (sheetId) => {
    try {
      return await (isCL() ? _getCLSheetRaw(sheetId) : _getSheetRaw(sheetId));
    } catch (err) {
      const data = err?.response?.data;
      if (err?.response?.status === 410 || (data && (data.message === "Sheet eliminada (soft-delete)" || String(data.message).includes("soft-delete")))) {
        console.warn(`[useSheetApi] Sheet ${sheetId} is soft-deleted. Triggering auto-close and cleanup.`);
        labToast.warning("Esta planilla está en la papelera y no se puede abrir.");
        
        // Notificar a todos los componentes que esta ID debe desaparecer de listas locales
        window.dispatchEvent(new CustomEvent("sheet-deleted-externally", { detail: { sheetId } }));
        
        // Intentar limpiar de recientes si es posible
        try {
           window.dispatchEvent(new CustomEvent("recent-template-cleanup", { detail: { sheetId } }));
        } catch (e) { /* silent */ }
      }
      throw err;
    }
  };
 
  const moveTrashSmart = async (...a) => {
    const res = await (isCL() ? moveContactLensSheetToTrash(...a) : moveSheetToTrash(...a));
    const sheetId = a[0];
    window.dispatchEvent(new CustomEvent("sheet-deleted-externally", { detail: { sheetId } }));
    return res;
  };
 
  const restoreSheetSmart = async (...a) => {
    const res = await (isCL() ? restoreContactLensSheet(...a) : restoreSheet(...a));
    const sheetId = a[0];
    window.dispatchEvent(new CustomEvent("sheet-restored-externally", { detail: { sheetId } }));
    return res;
  };
 
  const purgeSheetSmart = async (...a) => {
    const res = await (isCL() ? purgeContactLensSheet(...a) : purgeSheet(...a));
    const sheetId = a[0];
    window.dispatchEvent(new CustomEvent("sheet-purged-externally", { detail: { sheetId } }));
    return res;
  };

  return {
    fetchItems:       (...a) => isCL() ? fetchContactLensItems(...a)       : fetchItems(...a),
    saveChunk:        (...a) => isCL() ? saveContactLensChunk(...a)        : saveChunk(...a),
    reseedSheet:      (...a) => isCL() ? reseedContactLensSheet(...a)      : reseedSheet(...a),
    getSheet:         getSheetSmart,
    createSheet:      (...a) => isCL() ? createContactLensSheet(...a)      : createSheet(...a),
    updateSheet:      (...a) => isCL() ? updateContactLensSheet(...a)      : updateSheet(...a),
    moveSheetToTrash: moveTrashSmart,
    restoreSheet:     restoreSheetSmart,
    purgeSheet:       purgeSheetSmart,
    listSheets:       (...a) => isCL() ? listContactLensSheets(...a)       : listSheets(...a),
  };
}
