// src/services/inventory.js
import api from "@/api/axios";

const BASE = "/inventory";

// ===== SHEETS =====
export async function listSheets(params = {}) {
  return api.get(`${BASE}/`, { params });
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

export async function moveSheetToTrash(sheetId, actor) {
  return api.patch(`${BASE}/sheets/${sheetId}/trash`, { actor });
}

export async function updateSheet(sheetId, body) {
  return api.patch(`${BASE}/sheets/${sheetId}`, body);
}

export async function restoreSheet(sheetId, actor) {
  return api.patch(`${BASE}/sheets/${sheetId}/restore`, { actor });
}

export async function reseedSheet(sheetId, actor) {
  console.log("[inventory.reseedSheet] sheetId:", sheetId, "actor:", actor);
  return api.post(`${BASE}/sheets/${sheetId}/seed`, { actor });
}

// ===== ITEMS =====
export async function fetchItems(sheetId, query = {}) {
  console.log("[inventory.fetchItems] sheetId:", sheetId, "query:", query);
  return api.get(`${BASE}/sheets/${sheetId}/items`, { params: query });
}

// ⚠️ IMPORTANTE: aquí rows debe ser un ARRAY puro
export async function saveChunk(sheetId, rows, actor) {
  console.log(
    "[inventory.saveChunk] INICIO",
    "sheetId:", sheetId,
    "| Array:", Array.isArray(rows),
    "| rows.length:", Array.isArray(rows) ? rows.length : "N/A",
    "| actor:", actor
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn(
      "[inventory.saveChunk] rows vacío o no-array, NO se llama al backend"
    );
    return Promise.resolve({ data: { ok: true, data: { upserted: 0 } } });
  }

  try {
    const payload = { rows, actor };
    console.log("[inventory.saveChunk] payload ejemplo row[0]:", rows[0]);

    const res = await api.post(
      `${BASE}/sheets/${sheetId}/chunk`,
      payload
    );

    console.log(
      "[inventory.saveChunk] respuesta backend status:",
      res?.status,
      "data:",
      res?.data
    );
    return res;
  } catch (err) {
    console.error(
      "[inventory.saveChunk] ERROR",
      err?.response?.status,
      err?.response?.data || err
    );
    throw err;
  }
}
