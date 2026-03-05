// src/services/inventory.js
import api from "@/api/axios";

const BASE = "/inventory";

const logErr = (tag, err) => {
  console.error(tag, {
    status: err?.response?.status,
    data: err?.response?.data,
    message: err?.message
  });
};

// ===== SHEETS =====
export async function listSheets(params = {}) {
  console.groupCollapsed("[INV][API] listSheets", params);
  try {
    const res = await api.get(`${BASE}/`, { params });
    console.log("[INV][API] listSheets response", res?.status, res?.data);
    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[INV][API] listSheets ERROR", err);
    console.groupEnd();
    throw err;
  }
}

export async function createSheet(payload) {
  console.groupCollapsed("[INV][API] createSheet payload");
  console.log(payload);

  // vistazo rápido a datos de compra
  console.log("[INV][API] createSheet purchase subset", {
    numFactura: payload?.numFactura,
    loteProducto: payload?.loteProducto,
    fechaCompra: payload?.fechaCompra,
    fechaCaducidad: payload?.fechaCaducidad
  });

  try {
    const res = await api.post(`${BASE}/sheets`, payload);
    console.log("[INV][API] createSheet response", res?.status, res?.data);

    const sheet = res?.data?.data?.sheet;
    console.log("[INV][API] createSheet sheet purchase in response", {
      numFactura: sheet?.numFactura,
      loteProducto: sheet?.loteProducto,
      fechaCompra: sheet?.fechaCompra,
      fechaCaducidad: sheet?.fechaCaducidad,
      responseKeys: sheet ? Object.keys(sheet) : []
    });

    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[INV][API] createSheet ERROR", err);
    console.groupEnd();
    throw err;
  }
}

export async function getSheet(sheetId) {
  console.groupCollapsed("[INV][API] getSheet", sheetId);
  try {
    const res = await api.get(`${BASE}/sheets/${sheetId}`);
    console.log("[INV][API] getSheet response", res?.status, res?.data);
    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[INV][API] getSheet ERROR", err);
    console.groupEnd();
    throw err;
  }
}

export async function deleteSheet(sheetId, actor) {
  console.groupCollapsed("[INV][API] deleteSheet", sheetId, actor);
  try {
    const res = await api.delete(`${BASE}/sheets/${sheetId}`, { data: { actor } });
    console.log("[INV][API] deleteSheet response", res?.status, res?.data);
    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[INV][API] deleteSheet ERROR", err);
    console.groupEnd();
    throw err;
  }
}

export async function moveSheetToTrash(sheetId, actor) {
  console.groupCollapsed("[INV][API] moveSheetToTrash", sheetId, actor);
  try {
    const res = await api.patch(`${BASE}/sheets/${sheetId}/trash`, { actor });
    console.log("[INV][API] moveSheetToTrash response", res?.status, res?.data);
    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[INV][API] moveSheetToTrash ERROR", err);
    console.groupEnd();
    throw err;
  }
}

export async function updateSheet(sheetId, body) {
  console.groupCollapsed("[INV][API] updateSheet", sheetId);
  console.log("[INV][API] updateSheet body", body);
  console.log("[INV][API] updateSheet purchase subset", {
    numFactura: body?.numFactura,
    loteProducto: body?.loteProducto,
    fechaCompra: body?.fechaCompra,
    fechaCaducidad: body?.fechaCaducidad
  });

  try {
    const res = await api.patch(`${BASE}/sheets/${sheetId}`, body);
    console.log("[INV][API] updateSheet response", res?.status, res?.data);

    const sheet = res?.data?.data?.sheet;
    console.log("[INV][API] updateSheet sheet purchase in response", {
      numFactura: sheet?.numFactura,
      loteProducto: sheet?.loteProducto,
      fechaCompra: sheet?.fechaCompra,
      fechaCaducidad: sheet?.fechaCaducidad,
      responseKeys: sheet ? Object.keys(sheet) : []
    });

    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[INV][API] updateSheet ERROR", err);
    console.groupEnd();
    throw err;
  }
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
    "sheetId:",
    sheetId,
    "| Array:",
    Array.isArray(rows),
    "| rows.length:",
    Array.isArray(rows) ? rows.length : "N/A",
    "| actor:",
    actor
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("[inventory.saveChunk] rows vacío o no-array, NO se llama al backend");
    return Promise.resolve({ data: { ok: true, data: { upserted: 0 } } });
  }

  try {
    const payload = { rows, actor };
    console.log("[inventory.saveChunk] payload ejemplo row[0]:", rows[0]);

    const res = await api.post(`${BASE}/sheets/${sheetId}/chunk`, payload);

    console.log("[inventory.saveChunk] respuesta backend status:", res?.status, "data:", res?.data);
    return res;
  } catch (err) {
    console.error("[inventory.saveChunk] ERROR", err?.response?.status, err?.response?.data || err);
    throw err;
  }
}