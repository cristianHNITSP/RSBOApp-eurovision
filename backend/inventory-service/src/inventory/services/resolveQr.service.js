// src/inventory/services/resolveQr.service.js
const mongoose = require("mongoose");
const { parseQr } = require("../utils/qr");
const { isFlatMatrix } = require("../../utils/matrix");

/**
 * Construye un resolvedor de QR para una familia (inventario o lentes de contacto).
 * Decodifica el QR para ir directo a la hoja (O(1)) y, dentro de ESA hoja, casa el
 * `qr` almacenado en la celda — sin reconstruir la key (evita desalineaciones).
 *
 * @param {object} deps
 * @param {import('mongoose').Model} deps.SheetModel  modelo de la hoja (Inventory/ContactLenses)
 * @param {(tipo: string) => import('mongoose').Model|null} deps.getModel  matriz por tipo
 * @param {Record<string, string|null>} deps.segmentByTipo  segmento de endpoint de celda por tipo
 * @returns {(qr: string) => Promise<{ status: number, message?: string, data?: object }>}
 */
function makeResolveQr({ SheetModel, getModel, segmentByTipo }) {
  const ok = (sheet, parsed, key, eye, item) => ({
    status: 200,
    data: {
      sheet: { _id: sheet._id, nombre: sheet.nombre, sku: sheet.sku, tipo_matriz: sheet.tipo_matriz },
      tipo: sheet.tipo_matriz,
      coords: parsed.coords,
      key,
      eye,
      existencias: Number(item?.existencias || 0),
      segment: segmentByTipo[sheet.tipo_matriz] || null,
    },
  });

  return async function resolveQr(qr) {
    const raw = String(qr || "").trim();
    const parsed = parseQr(raw);
    if (!parsed || !mongoose.isValidObjectId(parsed.sheetId)) {
      return { status: 400, message: "QR inválido" };
    }

    const sheet = await SheetModel.findOne({ _id: parsed.sheetId, isDeleted: { $ne: true } }).lean();
    if (!sheet) return { status: 404, message: "Hoja no encontrada o eliminada" };

    const Model = getModel(sheet.tipo_matriz);
    if (!Model) return { status: 404, message: "Tipo de matriz no soportado" };

    const doc = await Model.findOne({ sheet: sheet._id }).lean();
    const cells = doc?.cells || {};
    const flat = isFlatMatrix(sheet.tipo_matriz);

    for (const [key, cell] of Object.entries(cells)) {
      if (flat) {
        if (cell?.qr === raw) return ok(sheet, parsed, key, null, cell);
      } else {
        if (cell?.OD?.qr === raw) return ok(sheet, parsed, key, "OD", cell.OD);
        if (cell?.OI?.qr === raw) return ok(sheet, parsed, key, "OI", cell.OI);
      }
    }

    return { status: 404, message: "Dioptría no encontrada en la hoja" };
  };
}

module.exports = { makeResolveQr };
