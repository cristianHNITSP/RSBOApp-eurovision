const MatrixBase = require("../models/matrix/MatrixBase");
const MatrixSphCyl = require("../models/matrix/MatrixSphCyl");
const MatrixBifocal = require("../models/matrix/MatrixBifocal");
const MatrixProgresivo = require("../models/matrix/MatrixProgresivo");
const InventorySheet = require("../models/InventorySheet");

// Lentes de Contacto
const ContactLensesSheet = require("../models/ContactLensesSheet");
const CLMatrixEsferico = require("../models/contactlenses/CLMatrixEsferico");
const CLMatrixTorico = require("../models/contactlenses/CLMatrixTorico");
const CLMatrixMultifocal = require("../models/contactlenses/CLMatrixMultifocal");
const CLMatrixColorido = require("../models/contactlenses/CLMatrixColorido");

const { StockError, mutateMatrixCell } = require("../services/stock.service");
const { broadcast } = require("../ws");

/**
 * Helper para decodificar valores de clave (ej: "m1d25" -> -1.25)
 */
function decodeVal(v) {
  if (!v) return 0;
  let s = String(v).replace("d", ".");
  if (s.startsWith("m")) s = "-" + s.substring(1);
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Helper para extraer parámetros de una clave de matriz según su tipo.
 */
function decodeKeyParams(key, type) {
  const parts = String(key || "").split("|");
  const p = parts.map(decodeVal);

  switch (type) {
    case "BASE": 
      return { base: p[0] || 0 };
    case "SPH_CYL": 
      return { sph: p[0] || 0, cyl: p[1] || 0 };
    case "SPH_CYL_AXIS": 
      return { sph: p[0] || 0, cyl: p[1] || 0, axis: p[2] || 0 };
    case "SPH_ADD": 
      return { sph: p[0] || 0, add: p[1] || 0 };
    case "BASE_ADD": 
      return { base: p[0] || 0, add: p[1] || 0 };
    default: 
      return {};
  }
}

/**
 * Helper para aplanar una matriz según su tipo.
 */
function flattenCells(matrixDoc, type) {
  const items = [];
  const cells = matrixDoc.cells; // Map en Mongoose
  
  const entries = (cells instanceof Map) ? Array.from(cells.entries()) : Object.entries(cells || {});

  for (const [k, cell] of entries) {
    if (!cell) continue;

    // Si la celda no tiene params, intentamos decodificarlos de la clave
    const decodedParams = decodeKeyParams(k, type);
    const safeParams = { ...decodedParams, ...(cell.params || {}) };
    
    if (type === "BASE" || type === "SPH_CYL" || type === "SPH_CYL_AXIS") {
      items.push({
        ...safeParams, // Promover de forma segura (prioridad a los reales si existen)
        _k: k,
        sheetId: matrixDoc.sheet,
        type,
        existencias: Number(cell.existencias || 0),
        sku: cell.sku || "",
        codebar: cell.codebar || "",
        params: safeParams,
        matrixKey: k
      });
    } else {
      // Bifocal o Progresivo (tienen OD/OI)
      if (cell.OD) {
        const odParams = { ...safeParams, ...(cell.OD.params || {}) };
        items.push({
          ...odParams,
          _k: `${k}_OD`,
          sheetId: matrixDoc.sheet,
          type,
          eye: "OD",
          existencias: Number(cell.OD.existencias || 0),
          sku: cell.OD.sku || "",
          codebar: cell.OD.codebar || "",
          params: { ...odParams, eye: "OD" },
          matrixKey: k
        });
      }
      if (cell.OI) {
        const oiParams = { ...safeParams, ...(cell.OI.params || {}) };
        items.push({
          ...oiParams,
          _k: `${k}_OI`,
          sheetId: matrixDoc.sheet,
          type,
          eye: "OI",
          existencias: Number(cell.OI.existencias || 0),
          sku: cell.OI.sku || "",
          codebar: cell.OI.codebar || "",
          params: { ...oiParams, eye: "OI" },
          matrixKey: k
        });
      }
    }
  }
  return items;
}

/**
 * GET /api/inventory/sales-catalog/items
 */
exports.getItems = async (req, res) => {
  try {
    const { sheetId, q, stockFilter, page = 1, limit = 7, axis, axisMin, axisMax, category = 'inventory' } = req.query;
    if (!sheetId) return res.status(400).json({ ok: false, message: "sheetId requerido" });

    // Validar ObjectId para evitar crashes
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(sheetId)) {
      return res.status(400).json({ ok: false, message: "ID de planilla inválido" });
    }

    let sheet;
    const isLC = category === 'contact-lenses';

    if (!isLC) {
      sheet = await InventorySheet.findById(sheetId).lean();
    } else {
      sheet = await ContactLensesSheet.findById(sheetId).lean();
    }
    
    if (!sheet) return res.status(404).json({ ok: false, message: "Planilla no encontrada" });

    let Model;
    if (!isLC) {
      switch (sheet.tipo_matriz) {
        case "BASE": Model = MatrixBase; break;
        case "SPH_CYL": Model = MatrixSphCyl; break;
        case "SPH_ADD": Model = MatrixBifocal; break;
        case "BASE_ADD": Model = MatrixProgresivo; break;
        default: return res.status(400).json({ ok: false, message: "Tipo de matriz no soportado" });
      }
    } else {
      switch (sheet.tipo_matriz) {
        case "BASE": Model = CLMatrixEsferico; break;
        case "SPH_CYL": Model = CLMatrixEsferico; break;
        case "SPH_CYL_AXIS": Model = CLMatrixTorico; break;
        case "SPH_ADD": Model = CLMatrixMultifocal; break;
        default: Model = CLMatrixColorido;
      }
    }

    if (!Model) return res.status(400).json({ ok: false, message: "Modelo no definido para esta matriz" });

    const doc = await Model.findOne({ sheet: sheetId }).lean();
    if (!doc) {
      return res.json({ ok: true, data: [], meta: { total: 0, page: 1, pages: 0 } });
    }

    let allItems = flattenCells(doc, sheet.tipo_matriz);
    console.log(`[SalesCatalog] ${category} | sheet: ${sheetId} | items: ${allItems.length}`);

    // Filtrado por query (q)
    if (q) {
      const query = String(q).toLowerCase();
      allItems = allItems.filter(it => {
        const inCodebar = String(it.codebar || "").toLowerCase().includes(query);
        const inSku = String(it.sku || "").toLowerCase().includes(query);
        // Búsqueda en params (ej: "base: 1.00")
        const paramsMatch = it.params && Object.values(it.params).some(v => String(v).toLowerCase().includes(query));
        return inCodebar || inSku || paramsMatch;
      });
    }

    // Filtrado por ejes (específico para LC Torico)
    if (sheet.tipo_matriz === "SPH_CYL_AXIS") {
      if (axis) {
        allItems = allItems.filter(it => Number(it.params?.axis) === Number(axis));
      } else if (axisMin || axisMax) {
        allItems = allItems.filter(it => {
          const val = Number(it.params?.axis);
          if (axisMin && val < Number(axisMin)) return false;
          if (axisMax && val > Number(axisMax)) return false;
          return true;
        });
      }
    }

    // Filtrado por stock
    if (stockFilter === "withStock") {
      allItems = allItems.filter(it => it.existencias > 0);
    }

    // Paginación manual (ya que los docs son Mapas gigantes)
    const total = allItems.length;
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));
    const pages = Math.ceil(total / l);
    const start = (p - 1) * l;
    const data = allItems.slice(start, start + l);

    res.json({
      ok: true,
      data,
      meta: { total, page: p, limit: l, pages }
    });
  } catch (err) {
    console.error("[SalesCatalog] getItems error:", err);
    res.status(500).json({ ok: false, message: "Error al obtener ítems del catálogo" });
  }
};

/**
 * PATCH /api/inventory/sales-catalog/items/:sku/stock
 */
exports.updateStock = async (req, res) => {
  try {
    const { sku } = req.params;
    const { delta, movementType, actor, sheetId, matrixKey, eye, category = 'inventory' } = req.body;

    if (!sheetId || !matrixKey) {
      return res.status(400).json({ ok: false, message: "sheetId y matrixKey requeridos" });
    }

    let sheet;
    if (category === 'contact-lenses') {
      sheet = await ContactLensesSheet.findById(sheetId);
    } else {
      sheet = await InventorySheet.findById(sheetId);
    }
    
    if (!sheet) return res.status(404).json({ ok: false, message: "Planilla no encontrada" });

    // Mutamos el stock usando el servicio centralizado
    const result = await mutateMatrixCell({
      sheet,
      matrixKey,
      eye: eye || null,
      delta: Number(delta),
      type: movementType || "VENTA_DIRECTA",
      actor: actor || { name: "Ventas System" },
      sku
    });

    // Notificar vía WebSockets para actualización en tiempo real
    broadcast("INVENTORY_CHUNK_SAVED", { sheetIds: [sheetId], sheetId });

    res.json({
      ok: true,
      data: {
        stockBefore: result.stockBefore,
        stockAfter: result.stockAfter,
        sku
      }
    });
  } catch (err) {
    console.error("[SalesCatalog] updateStock error:", err);
    if (err instanceof StockError) {
      return res.status(err.status || 400).json({ ok: false, message: err.message, code: err.code });
    }
    res.status(500).json({ ok: false, message: "Error al actualizar stock" });
  }
};
