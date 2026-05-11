const Armazon = require("../models/Armazon");
const Solucion = require("../models/Solucion");
const Accesorio = require("../models/Accesorio");
const Estuche = require("../models/Estuche");
const Equipo = require("../models/Equipo");
const { handleAtomicSale } = require("../utils/saleHelper");

const MODELS = {
  armazones: Armazon,
  soluciones: Solucion,
  accesorios: Accesorio,
  estuches: Estuche,
  equipos: Equipo
};

/**
 * GET /api/optica/sales-catalog/items
 * List items for sales with pagination and filtering.
 */
exports.getItems = async (req, res) => {
  try {
    const { collection, q, stockFilter, page = 1, limit = 7 } = req.query;

    if (!collection) {
      return res.status(400).json({ ok: false, message: "collection requerida" });
    }

    const Model = MODELS[collection];
    if (!Model) {
      return res.status(400).json({ ok: false, message: "Colección no soportada" });
    }

    const filter = { isDeleted: false };

    // Search query
    if (q) {
      const query = String(q).trim();
      const terms = query.split(/\s+/).filter(Boolean);
      
      const searchConditions = terms.map(term => {
        const regex = new RegExp(term.replace(/[.*+?^{}()|[\]\\]/g, "\\$&"), "i");
        return {
          $or: [
            { sku: regex },
            { marca: regex },
            { modelo: regex },
            { color: regex },
            { name: regex }, // For items like accesorios
            { brand: regex }, // Brand/Model aliases
            { model: regex }
          ]
        };
      });
      
      if (searchConditions.length > 0) {
        filter.$and = searchConditions;
      }
    }

    // Stock filter
    if (stockFilter === "withStock") {
      filter.stock = { $gt: 0 };
    } else if (stockFilter === "zero") {
      filter.stock = 0;
    }

    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      Model.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .lean(),
      Model.countDocuments(filter)
    ]);

    // Map fields to a standard format for the UI if needed
    const data = items.map(it => ({
      ...it,
      existencias: it.stock ?? 0,
      precioVenta: it.precio ?? 0,
      _k: it._id.toString()
    }));

    const pages = Math.ceil(total / l);

    res.json({
      ok: true,
      data,
      meta: {
        total,
        page: p,
        limit: l,
        pages
      }
    });
  } catch (err) {
    console.error("[Optica][SalesCatalog] getItems error:", err);
    res.status(500).json({ ok: false, message: "Error al obtener ítems del catálogo de óptica" });
  }
};

/**
 * PATCH /api/optica/sales-catalog/items/:sku/stock
 * Atomic stock update for direct sales.
 */
exports.updateStock = async (req, res) => {
  try {
    const { sku } = req.params;
    const { delta, collection, actor, documentId } = req.body;

    if (!collection || !documentId) {
      return res.status(400).json({ ok: false, message: "collection y documentId requeridos" });
    }

    const Model = MODELS[collection];
    if (!Model) {
      return res.status(400).json({ ok: false, message: "Colección no soportada" });
    }

    // Usamos el helper existente para decrementos atómicos
    const result = await handleAtomicSale(Model, collection, documentId, Math.abs(delta), actor || { name: "Ventas System" });

    if (!result.ok) {
      return res.status(result.status || 400).json({ ok: false, message: result.message });
    }

    res.json({
      ok: true,
      data: {
        stockBefore: result.before,
        stockAfter: result.current,
        sku
      }
    });
  } catch (err) {
    console.error("[Optica][SalesCatalog] updateStock error:", err);
    res.status(500).json({ ok: false, message: "Error al actualizar stock de óptica" });
  }
};
