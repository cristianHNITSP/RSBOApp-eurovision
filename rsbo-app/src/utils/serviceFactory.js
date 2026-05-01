// src/utils/serviceFactory.js
// Factory que genera las funciones CRUD estándar de planillas para cualquier microservicio.
// Uso: const svc = createSheetService("/inventory", "INV")
import api from "@/api/axios";
import { logErr } from "@/api/logErr";

const DEV = import.meta.env.DEV;

/**
 * @param {string} base   - Prefijo de ruta, ej. "/inventory" o "/contactlenses"
 * @param {string} tag    - Prefijo de log, ej. "INV" o "CL"
 */
export function createSheetService(base, tag) {
  const T = `[${tag}][API]`;

  async function listSheets(params = {}) {
    if (DEV) console.groupCollapsed(`${T} listSheets`, params);
    try {
      const res = await api.get(`${base}/`, { params });
      if (DEV) console.log(`${T} listSheets response`, res?.status, res?.data);
      if (DEV) console.groupEnd();
      return res;
    } catch (err) {
      logErr(`${T} listSheets ERROR`, err);
      if (DEV) console.groupEnd();
      throw err;
    }
  }

  async function createSheet(payload) {
    if (DEV) console.groupCollapsed(`${T} createSheet payload`);
    if (DEV) console.log(payload);
    try {
      const res = await api.post(`${base}/sheets`, payload);
      if (DEV) console.log(`${T} createSheet response`, res?.status, res?.data);
      if (DEV) console.groupEnd();
      return res;
    } catch (err) {
      logErr(`${T} createSheet ERROR`, err);
      if (DEV) console.groupEnd();
      throw err;
    }
  }

  async function getSheet(sheetId) {
    if (DEV) console.groupCollapsed(`${T} getSheet`, sheetId);
    try {
      const res = await api.get(`${base}/sheets/${sheetId}`);
      if (DEV) console.log(`${T} getSheet response`, res?.status, res?.data);
      if (DEV) console.groupEnd();
      return res;
    } catch (err) {
      logErr(`${T} getSheet ERROR`, err);
      if (DEV) console.groupEnd();
      throw err;
    }
  }

  async function deleteSheet(sheetId, actor) {
    if (DEV) console.groupCollapsed(`${T} deleteSheet`, sheetId, actor);
    try {
      const res = await api.delete(`${base}/sheets/${sheetId}`, { data: { actor } });
      if (DEV) console.log(`${T} deleteSheet response`, res?.status, res?.data);
      if (DEV) console.groupEnd();
      return res;
    } catch (err) {
      logErr(`${T} deleteSheet ERROR`, err);
      if (DEV) console.groupEnd();
      throw err;
    }
  }

  async function moveSheetToTrash(sheetId, actor) {
    if (DEV) console.groupCollapsed(`${T} moveSheetToTrash`, sheetId, actor);
    try {
      const res = await api.patch(`${base}/sheets/${sheetId}/trash`, { actor });
      if (DEV) console.log(`${T} moveSheetToTrash response`, res?.status, res?.data);
      if (DEV) console.groupEnd();
      return res;
    } catch (err) {
      logErr(`${T} moveSheetToTrash ERROR`, err);
      if (DEV) console.groupEnd();
      throw err;
    }
  }

  async function updateSheet(sheetId, body) {
    if (DEV) console.groupCollapsed(`${T} updateSheet`, sheetId);
    if (DEV) console.log(`${T} updateSheet body`, body);
    try {
      const res = await api.patch(`${base}/sheets/${sheetId}`, body);
      if (DEV) console.log(`${T} updateSheet response`, res?.status, res?.data);
      if (DEV) console.groupEnd();
      return res;
    } catch (err) {
      logErr(`${T} updateSheet ERROR`, err);
      if (DEV) console.groupEnd();
      throw err;
    }
  }

  function restoreSheet(sheetId, actor) {
    return api.patch(`${base}/sheets/${sheetId}/restore`, { actor });
  }

  function reseedSheet(sheetId, actor) {
    if (DEV) console.log(`[${tag.toLowerCase()}.reseedSheet] sheetId:`, sheetId, "actor:", actor);
    return api.post(`${base}/sheets/${sheetId}/seed`, { actor });
  }

  function fetchItems(sheetId, query = {}) {
    if (DEV) console.log(`[${tag.toLowerCase()}.fetchItems] sheetId:`, sheetId, "query:", query);
    return api.get(`${base}/sheets/${sheetId}/items`, { params: query });
  }

  async function saveChunk(sheetId, rows, actor) {
    if (DEV) {
      console.log(
        `[${tag.toLowerCase()}.saveChunk] INICIO`,
        "sheetId:", sheetId,
        "| Array:", Array.isArray(rows),
        "| rows.length:", Array.isArray(rows) ? rows.length : "N/A",
        "| actor:", actor
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      if (DEV) console.warn(`[${tag.toLowerCase()}.saveChunk] rows vacío o no-array, NO se llama al backend`);
      return Promise.resolve({ data: { ok: true, data: { upserted: 0 } } });
    }

    try {
      // Spread para garantizar objetos planos (sin Proxy reactivo de Vue)
      const plainRows = rows.map(r => ({ ...r }));
      const payload = { rows: plainRows, actor };
      if (DEV) console.log(`[${tag.toLowerCase()}.saveChunk] row[0] JSON:`, JSON.stringify(plainRows[0]));
      const res = await api.post(`${base}/sheets/${sheetId}/chunk`, payload);
      if (DEV) console.log(`[${tag.toLowerCase()}.saveChunk] respuesta backend status:`, res?.status, "data:", res?.data);
      return res;
    } catch (err) {
      const errData = err?.response?.data;
      console.error(`[${tag.toLowerCase()}.saveChunk] ERROR ${err?.response?.status}`, errData);
      if (Array.isArray(errData?.errors)) {
        console.error(`[${tag.toLowerCase()}.saveChunk] errores de validación:`, JSON.stringify(errData.errors));
      }
      throw err;
    }
  }

  return {
    listSheets,
    createSheet,
    getSheet,
    deleteSheet,
    moveSheetToTrash,
    updateSheet,
    restoreSheet,
    reseedSheet,
    fetchItems,
    saveChunk
  };
}
