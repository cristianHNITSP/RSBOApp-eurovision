"use strict";

const Sale = require("../models/Sale");
const InventorySheet = require("../models/InventorySheet");
const ContactLensesSheet = require("../models/ContactLensesSheet");
const { mutateMatrixCell, StockError } = require("../services/stock.service");
const { generateFolio } = require("../utils/folio");
const { broadcast } = require("../ws");

/**
 * POST /api/inventory/sales
 * Registra una venta completa de Bases, Micas o Lentes de Contacto.
 */
exports.registerSale = async (req, res) => {
  try {
    const { cliente, clientePhone, items, total, pago } = req.body;
    const actor = req.user;

    if (!cliente || !items || !items.length) {
      return res.status(400).json({ ok: false, message: "Datos de venta incompletos" });
    }

    const processedItems = [];
    const affectedSheetIds = new Set();
    const isReplica = Boolean(req.body.isReplica);

    for (const it of req.body.items) {
      if (isReplica) {
        // En réplicas, confiamos en los datos que vienen y NO mutamos stock
        processedItems.push({
          ...it,
          // Aseguramos que los campos de Óptica se mapeen si existen
          collection: it.collection || null,
          documentId: it.documentId || null,
          sheet: it.sheet || null,
          matrixKey: it.matrixKey || null
        });
        continue;
      }

      // Soportamos tanto 'sheet' como 'sheetId' para compatibilidad
      const { sheet: sheetIdRaw, sheetId, matrixKey, eye, qty, sku, category, description, collection, params } = it;
      const sheetRef = sheetIdRaw || sheetId;

      let sheet;
      if (category === 'contact-lenses' || collection === 'lentes-contacto') {
        sheet = await ContactLensesSheet.findById(sheetRef);
      } else {
        sheet = await InventorySheet.findById(sheetRef);
        if (!sheet) sheet = await ContactLensesSheet.findById(sheetRef);
      }

      if (!sheet) {
        throw new Error(`Planilla ${sheetRef} no encontrada para el ítem ${sku}`);
      }

      // Mutación atómica de stock (Solo para ventas locales)
      const result = await mutateMatrixCell({
        sheet,
        matrixKey,
        eye: eye || null,
        delta: -Math.abs(Number(qty)),
        type: "VENTA_DIRECTA",
        actor: { userId: actor.id, name: actor.name || actor.username },
        sku
      });

      // Determinar el modelo de la planilla para la población dinámica
      const sheetModel = (category === 'contact-lenses' || collection === 'lentes-contacto') 
        ? 'ContactLensesSheet' 
        : 'InventorySheet';

      processedItems.push({
        sheet: sheetRef,
        sheetModel: sheetModel, // ✅ Requerido por refPath
        matrixKey,
        sku,
        description: description || "",
        qty: Math.abs(Number(qty)),
        precio: it.precio || 0,
        collection: collection || (sheetModel === 'ContactLensesSheet' ? 'lentes-contacto' : 'bases-micas'),
        params: params || null   // ✅ Guardamos las dioptrías/parámetros para auditoría
      });

      affectedSheetIds.add(String(sheetRef));
    }

    // Generar Folio (Si no viene en la réplica)
    const folio = req.body.folio || await generateFolio("VTA-INV", Sale);

    // Persistir Venta
    const sale = await Sale.create({
      folio,
      cliente,
      clientePhone: clientePhone || "",
      items: processedItems,
      total: total || 0,
      pago: pago || [],
      actor: req.body.actor || { userId: actor.id, name: actor.name || actor.username },
      isReplica
    });

    // Notificar WebSockets
    broadcast("INVENTORY_CHUNK_SAVED", { sheetIds: Array.from(affectedSheetIds) });

    res.status(201).json({ ok: true, data: sale });
  } catch (err) {
    console.error("[INVENTORY][SALES] Error:", err);
    if (err instanceof StockError) {
      return res.status(err.status || 400).json({ ok: false, message: err.message, code: err.code });
    }
    res.status(500).json({ ok: false, message: err.message });
  }
};

/**
 * GET /api/inventory/sales
 */
exports.listSales = async (req, res) => {
  try {
    const { page = 1, limit = 7, dateFrom, dateTo, q } = req.query;
    const filter = {};

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    if (q) {
      filter.$or = [
        { folio: { $regex: q, $options: "i" } },
        { cliente: { $regex: q, $options: "i" } }
      ];
    }

    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));

    const [items, total] = await Promise.all([
      Sale.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Sale.countDocuments(filter)
    ]);

    res.json({
      ok: true,
      data: items,
      meta: { page: p, limit: l, total, pages: Math.ceil(total / l) }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Error al listar ventas" });
  }
};
