// src/services/inventory.js
import { createSheetService } from "@/utils/serviceFactory";
import api from "@/api/axios";

const _svc = createSheetService("/inventory", "INV");

export const listSheets        = _svc.listSheets;
export const createSheet       = _svc.createSheet;
export const getSheet          = _svc.getSheet;
export const deleteSheet       = _svc.deleteSheet;
export const moveSheetToTrash  = _svc.moveSheetToTrash;
export const updateSheet       = _svc.updateSheet;
export const restoreSheet      = _svc.restoreSheet;
export const reseedSheet       = _svc.reseedSheet;
export const fetchItems        = _svc.fetchItems;
export const saveChunk         = _svc.saveChunk;

// ── Función con logging extendido de campos de compra (mantiene comportamiento original) ──
export async function createSheetWithPurchase(payload) {
  const { logErr } = await import("@/api/logErr");
  console.groupCollapsed("[INV][API] createSheet payload");
  console.log(payload);
  console.log("[INV][API] createSheet purchase subset", {
    numFactura:    payload?.numFactura,
    loteProducto:  payload?.loteProducto,
    fechaCompra:   payload?.fechaCompra,
    fechaCaducidad: payload?.fechaCaducidad
  });
  try {
    const res = await api.post("/inventory/sheets", payload);
    const sheet = res?.data?.data?.sheet;
    console.log("[INV][API] createSheet sheet purchase in response", {
      numFactura:    sheet?.numFactura,
      loteProducto:  sheet?.loteProducto,
      fechaCompra:   sheet?.fechaCompra,
      fechaCaducidad: sheet?.fechaCaducidad,
      responseKeys:  sheet ? Object.keys(sheet) : []
    });
    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[INV][API] createSheet ERROR", err);
    console.groupEnd();
    throw err;
  }
}

export async function updateSheetWithPurchase(sheetId, body) {
  const { logErr } = await import("@/api/logErr");
  console.groupCollapsed("[INV][API] updateSheet", sheetId);
  console.log("[INV][API] updateSheet body", body);
  console.log("[INV][API] updateSheet purchase subset", {
    numFactura:    body?.numFactura,
    loteProducto:  body?.loteProducto,
    fechaCompra:   body?.fechaCompra,
    fechaCaducidad: body?.fechaCaducidad
  });
  try {
    const res = await api.patch(`/inventory/sheets/${sheetId}`, body);
    const sheet = res?.data?.data?.sheet;
    console.log("[INV][API] updateSheet sheet purchase in response", {
      numFactura:    sheet?.numFactura,
      loteProducto:  sheet?.loteProducto,
      fechaCompra:   sheet?.fechaCompra,
      fechaCaducidad: sheet?.fechaCaducidad,
      responseKeys:  sheet ? Object.keys(sheet) : []
    });
    console.groupEnd();
    return res;
  } catch (err) {
    logErr("[INV][API] updateSheet ERROR", err);
    console.groupEnd();
    throw err;
  }
}
