const express = require("express");
const router  = express.Router();
const Sale    = require("../models/Sale");
const { protect } = require("../utils/auth");
const { handleAtomicSale } = require("../utils/saleHelper");

// Modelos dinámicos para el decremento de stock
const Armazon = require("../models/Armazon");
const LenteContacto = require("../models/LenteContacto");
const Solucion = require("../models/Solucion");
const Accesorio = require("../models/Accesorio");
const Estuche = require("../models/Estuche");
const Equipo = require("../models/Equipo");

const MODELS = {
  armazones: Armazon,
  lentes: LenteContacto,
  soluciones: Solucion,
  accesorios: Accesorio,
  estuches: Estuche,
  equipos: Equipo
};

/**
 * POST /api/optica/sales
 * Registra una venta completa y descuenta stock de múltiples ítems.
 */
router.post("/", protect(), async (req, res) => {
  try {
    const { cliente, clientePhone, items, total, folio, pago } = req.body;
    const actor = req.user;

    if (!cliente || !items || !items.length) {
      return res.status(400).json({ ok: false, error: "Datos de venta incompletos" });
    }

    // 1. Procesar decremento de stock para cada ítem (Atomicidad individual por ahora)
    const processedItems = [];
    for (const it of items) {
      const Model = MODELS[it.collection];
      if (!Model) {
        console.warn(`[OPTICA][SALES] Colección no soportada: ${it.collection}`);
        continue;
      }

      const result = await handleAtomicSale(Model, it.collection, it.documentId, it.qty, actor);
      if (!result.ok) {
        // Si falla un ítem (ej: sin stock), detenemos y lanzamos error
        // NOTA: En un sistema real usaríamos transacciones de MongoDB si estuviéramos en la misma DB
        return res.status(result.status).json({ 
          ok: false, 
          error: `Error en ${it.sku}: ${result.message}`,
          current: result.current 
        });
      }

      processedItems.push({
        collection: it.collection,
        documentId: it.documentId,
        sku: it.sku,
        description: it.description || "",
        qty: it.qty,
        precio: it.precio || 0
      });
    }

    // 2. Generar Folio si no viene uno
    const finalFolio = folio || `VTA-OPT-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;

    // 3. Persistir el objeto Venta
    const sale = await Sale.create({
      folio: finalFolio,
      cliente,
      clientePhone: clientePhone || "",
      items: processedItems,
      total: total || 0,
      pago: pago || [],
      actor: { userId: actor.userId, name: actor.name }
    });

    console.log(`[OPTICA][SALES] Venta registrada: ${sale.folio} para ${cliente}`);

    return res.status(201).json({ ok: true, data: sale });
  } catch (err) {
    console.error("[OPTICA][SALES] Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/optica/sales/search
 * Buscador de ventas por nombre o folio.
 */
router.get("/search", protect(), async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    
    // Si no hay búsqueda, devolvemos las últimas 20 ventas por defecto (Historial)
    if (!q) {
      const sales = await Sale.find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      return res.json({ ok: true, data: sales });
    }

    if (q.length < 2) return res.json({ ok: true, data: [] });

    const terms = q.split(/\s+/).filter(Boolean);
    const searchConditions = terms.map(term => {
      const regex = new RegExp(term.replace(/[.*+?^{}()|[\]\\]/g, "\\$&"), "i");
      return {
        $or: [
          { folio: regex },
          { cliente: regex }
        ]
      };
    });

    const sales = await Sale.find({ $and: searchConditions })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.json({ ok: true, data: sales });
  } catch (err) {
    console.error("[OPTICA][SALES] Search error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
