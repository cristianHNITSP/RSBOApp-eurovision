// src/services/contactlenses.js
import api from "@/api/axios";

const BASE = "/contactlenses";

const logErr = (tag, err) => {
  console.error(tag, {
    status: err?.response?.status,
    data: err?.response?.data,
    message: err?.message
  });
};

// ===== SHEETS =====
export async function listContactLensSheets(params = {}) {
  console.groupCollapsed("[CL][API] listContactLensSheets", params);
  try {
    const res = await api.get(`${BASE}/`, { params });
    console.log("[CL][API] listContactLensSheets response", res?.status, res?.data);
    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[CL][API] listContactLensSheets ERROR", err);
    console.groupEnd();
    throw err;
  }
}

export async function createContactLensSheet(payload) {
  console.groupCollapsed("[CL][API] createContactLensSheet payload");
  console.log(payload);
  try {
    const res = await api.post(`${BASE}/sheets`, payload);
    console.log("[CL][API] createContactLensSheet response", res?.status, res?.data);
    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[CL][API] createContactLensSheet ERROR", err);
    console.groupEnd();
    throw err;
  }
}

export async function getContactLensSheet(sheetId) {
  console.groupCollapsed("[CL][API] getContactLensSheet", sheetId);
  try {
    const res = await api.get(`${BASE}/sheets/${sheetId}`);
    console.log("[CL][API] getContactLensSheet response", res?.status, res?.data);
    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[CL][API] getContactLensSheet ERROR", err);
    console.groupEnd();
    throw err;
  }
}

export async function deleteContactLensSheet(sheetId, actor) {
  console.groupCollapsed("[CL][API] deleteContactLensSheet", sheetId, actor);
  try {
    const res = await api.delete(`${BASE}/sheets/${sheetId}`, { data: { actor } });
    console.log("[CL][API] deleteContactLensSheet response", res?.status, res?.data);
    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[CL][API] deleteContactLensSheet ERROR", err);
    console.groupEnd();
    throw err;
  }
}

export async function moveContactLensSheetToTrash(sheetId, actor) {
  console.groupCollapsed("[CL][API] moveContactLensSheetToTrash", sheetId, actor);
  try {
    const res = await api.patch(`${BASE}/sheets/${sheetId}/trash`, { actor });
    console.log("[CL][API] moveContactLensSheetToTrash response", res?.status, res?.data);
    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[CL][API] moveContactLensSheetToTrash ERROR", err);
    console.groupEnd();
    throw err;
  }
}

export async function updateContactLensSheet(sheetId, body) {
  console.groupCollapsed("[CL][API] updateContactLensSheet", sheetId);
  console.log("[CL][API] updateContactLensSheet body", body);
  try {
    const res = await api.patch(`${BASE}/sheets/${sheetId}`, body);
    console.log("[CL][API] updateContactLensSheet response", res?.status, res?.data);
    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[CL][API] updateContactLensSheet ERROR", err);
    console.groupEnd();
    throw err;
  }
}

export async function restoreContactLensSheet(sheetId, actor) {
  return api.patch(`${BASE}/sheets/${sheetId}/restore`, { actor });
}

export async function reseedContactLensSheet(sheetId, actor) {
  console.log("[contactlenses.reseedContactLensSheet] sheetId:", sheetId, "actor:", actor);
  return api.post(`${BASE}/sheets/${sheetId}/seed`, { actor });
}

// ===== ITEMS =====
export async function fetchContactLensItems(sheetId, query = {}) {
  console.log("[contactlenses.fetchContactLensItems] sheetId:", sheetId, "query:", query);
  return api.get(`${BASE}/sheets/${sheetId}/items`, { params: query });
}

export async function saveContactLensChunk(sheetId, rows, actor) {
  console.log(
    "[contactlenses.saveContactLensChunk] INICIO",
    "sheetId:", sheetId,
    "| Array:", Array.isArray(rows),
    "| rows.length:", Array.isArray(rows) ? rows.length : "N/A",
    "| actor:", actor
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("[contactlenses.saveContactLensChunk] rows vacío o no-array, NO se llama al backend");
    return Promise.resolve({ data: { ok: true, data: { upserted: 0 } } });
  }

  try {
    const payload = { rows, actor };
    console.log("[contactlenses.saveContactLensChunk] payload ejemplo row[0]:", rows[0]);
    const res = await api.post(`${BASE}/sheets/${sheetId}/chunk`, payload);
    console.log("[contactlenses.saveContactLensChunk] respuesta backend status:", res?.status, "data:", res?.data);
    return res;
  } catch (err) {
    console.error("[contactlenses.saveContactLensChunk] ERROR", err?.response?.status, err?.response?.data || err);
    throw err;
  }
}
