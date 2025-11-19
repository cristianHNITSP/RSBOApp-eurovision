// src/services/inventory.js
import api, { sendRequest } from "@/api/axios"; // si quieres usar sendRequest aquí
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

// 🔁 Reseed completo de matriz (usa POST /inventory/sheets/:sheetId/seed)
export async function reseedSheet(sheetId, actor) {
  return api.post(`${BASE}/sheets/${sheetId}/seed`, { actor });
}

// ===== ITEMS =====
export async function fetchItems(sheetId, query = {}) {
  return api.get(`${BASE}/sheets/${sheetId}/items`, { params: query });
}

// ⚠️ IMPORTANTE: aquí rows debe ser un ARRAY puro
export async function saveChunk(sheetId, rows, actor) {
  // Pequeña protección para no pegarle al backend con rows vacíos
  if (!Array.isArray(rows) || rows.length === 0) {
    return Promise.resolve({ data: { ok: true, data: { upserted: 0 } } });
  }

  return api.post(`${BASE}/sheets/${sheetId}/chunk`, { rows, actor });
}
