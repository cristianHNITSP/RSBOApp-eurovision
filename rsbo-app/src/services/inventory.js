// src/services/inventory.js
import axios from "axios";

const api = axios.create({
  baseURL: "/api/inventory",
  timeout: 20000,
});

// ===== SHEETS =====
export async function listSheets() {
  return api.get("/");
}

export async function createSheet(payload) {
  return api.post("/sheets", payload);
}

export async function getSheet(sheetId) {
  return api.get(`/sheets/${sheetId}`);
}

export async function deleteSheet(sheetId, actor) {
  return api.delete(`/sheets/${sheetId}`, { data: { actor } });
}

export async function updateSheet(sheetId, body) {
  return api.patch(`/sheets/${sheetId}`, body);
}

// ===== ITEMS =====
export async function fetchItems(sheetId, query = {}) {
  return api.get(`/sheets/${sheetId}/items`, { params: query });
}

export async function saveChunk(sheetId, rows, actor) {
  return api.post(`/sheets/${sheetId}/chunk`, { rows, actor });
}
