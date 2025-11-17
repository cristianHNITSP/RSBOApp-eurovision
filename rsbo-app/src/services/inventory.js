// src/services/inventory.js
import api from "@/api/axios";

const BASE = "/inventory";

// ===== SHEETS =====
export async function listSheets() {
  return api.get(`${BASE}/`);
}

export async function createSheet(payload) {
  return api.post(`${BASE}/sheets`, payload);
}

export async function getSheet(sheetId) {
  return api.get(`${BASE}/sheets/${sheetId}`);
}

export async function deleteSheet(sheetId, actor) {
  return api.delete(`${BASE}/sheets/${sheetId}`, { data: { actor } });
}

export async function updateSheet(sheetId, body) {
  return api.patch(`${BASE}/sheets/${sheetId}`, body);
}

// ===== ITEMS =====
export async function fetchItems(sheetId, query = {}) {
  return api.get(`${BASE}/sheets/${sheetId}/items`, { params: query });
}

export async function saveChunk(sheetId, rows, actor) {
  return api.post(`${BASE}/sheets/${sheetId}/chunk`, { rows, actor });
}
