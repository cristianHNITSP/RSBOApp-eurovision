// src/services/inventory.js
import api from "@/api/axios";
const BASE = "/inventory";

// ===== SHEETS =====
export async function listSheets(params = {}) {
  return api.get(`${BASE}/`, { params }); // p.ej. { includeDeleted: true }
}

export async function createSheet(payload) {
  return api.post(`${BASE}/sheets`, payload);
}

export async function getSheet(sheetId) {
  return api.get(`${BASE}/sheets/${sheetId}`);
}

// Mantén este si quieres seguir usando DELETE (opcional)
export async function deleteSheet(sheetId, actor) {
  return api.delete(`${BASE}/sheets/${sheetId}`, { data: { actor } });
}

// Ruta ORIGINAL solicitada: mover a papelera (soft-delete)
export async function moveSheetToTrash(sheetId, actor) {
  return api.patch(`${BASE}/sheets/${sheetId}/trash`, { actor });
}

export async function updateSheet(sheetId, body) {
  return api.patch(`${BASE}/sheets/${sheetId}`, body);
}

// ♻️ opcional: restaurar
export async function restoreSheet(sheetId, actor) {
  return api.patch(`${BASE}/sheets/${sheetId}/restore`, { actor });
}

// ===== ITEMS =====
export async function fetchItems(sheetId, query = {}) {
  return api.get(`${BASE}/sheets/${sheetId}/items`, { params: query });
}

export async function saveChunk(sheetId, rows, actor) {
  return api.post(`${BASE}/sheets/${sheetId}/chunk`, { rows, actor });
}
