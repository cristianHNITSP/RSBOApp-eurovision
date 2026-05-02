// src/services/contactlenses.js
import { createSheetService } from "@/utils/serviceFactory";

const _svc = createSheetService("/contactlenses", "CL");

// Re-exporta con los nombres originales para no romper ningún import existente
export const listContactLensSheets       = _svc.listSheets;
export const createContactLensSheet      = _svc.createSheet;
export const getContactLensSheet         = _svc.getSheet;
export const deleteContactLensSheet      = _svc.deleteSheet;
export const moveContactLensSheetToTrash = _svc.moveSheetToTrash;
export const updateContactLensSheet      = _svc.updateSheet;
export const restoreContactLensSheet     = _svc.restoreSheet;
export const purgeContactLensSheet       = _svc.purgeSheet;
export const reseedContactLensSheet      = _svc.reseedSheet;
export const fetchContactLensItems       = _svc.fetchItems;
export const saveContactLensChunk        = _svc.saveChunk;

import api from "@/api/axios";
export function registerContactLensSale(sheetId, payload) {
  return api.post(`/contactlenses/sheets/${sheetId}/sale`, payload);
}
