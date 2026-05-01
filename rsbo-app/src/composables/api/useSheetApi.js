// src/composables/useSheetApi.js
//
// Composable que devuelve las funciones correctas de API según el contexto:
//   apiType = 'inventory'     → /api/inventory/...   (bases y micas oftálmicas)
//   apiType = 'contactlenses' → /api/contactlenses/... (lentes de contacto)
//
// Uso:
//   const { fetchItems, saveChunk, ... } = useSheetApi(() => props.apiType);
//
import {
  fetchItems,
  saveChunk,
  reseedSheet,
  getSheet,
  createSheet,
  updateSheet,
  moveSheetToTrash,
  listSheets
} from '@/services/inventory';

import {
  fetchContactLensItems,
  saveContactLensChunk,
  reseedContactLensSheet,
  getContactLensSheet,
  createContactLensSheet,
  updateContactLensSheet,
  moveContactLensSheetToTrash,
  listContactLensSheets
} from '@/services/contactlenses';

/**
 * @param {() => string} getApiType  — función que devuelve 'inventory' | 'contactlenses'
 */
export function useSheetApi(getApiType) {
  const isCL = () => {
    const v = typeof getApiType === 'function' ? getApiType() : getApiType;
    return v === 'contactlenses';
  };

  return {
    fetchItems:       (...a) => isCL() ? fetchContactLensItems(...a)       : fetchItems(...a),
    saveChunk:        (...a) => isCL() ? saveContactLensChunk(...a)        : saveChunk(...a),
    reseedSheet:      (...a) => isCL() ? reseedContactLensSheet(...a)      : reseedSheet(...a),
    getSheet:         (...a) => isCL() ? getContactLensSheet(...a)         : getSheet(...a),
    createSheet:      (...a) => isCL() ? createContactLensSheet(...a)      : createSheet(...a),
    updateSheet:      (...a) => isCL() ? updateContactLensSheet(...a)      : updateSheet(...a),
    moveSheetToTrash: (...a) => isCL() ? moveContactLensSheetToTrash(...a) : moveSheetToTrash(...a),
    listSheets:       (...a) => isCL() ? listContactLensSheets(...a)       : listSheets(...a),
  };
}
