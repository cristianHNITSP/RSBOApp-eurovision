"use strict";

const mongoose = require("mongoose");
const Devolution = require("../models/Devolution");
const { handleAtomicSale } = require("../utils/saleHelper");
const Armazon = require("../models/Armazon");
const Accesorio = require("../models/Accesorio");
const Solucion = require("../models/Solucion");
const Estuche = require("../models/Estuche");
const Equipo = require("../models/Equipo");
const { broadcast } = require("../ws");

const MODELS = {
  armazones: Armazon,
  accesorios: Accesorio,
  soluciones: Solucion,
  estuches: Estuche,
  equipos: Equipo,
};

function actorFrom(req) {
  const u = req.user || {};
  return {
    userId: u.id || u._id || null,
    name: u.name || u.nombre || "Usuario",
  };
}

/**
 * POST /api/optica/devolutions
 */
exports.create = async (req, res) => {
  try {
    const { cliente, items, reason, folio, isReplica } = req.body;
    const actor = actorFrom(req);

    if (!cliente || !items || !items.length) {
      return res.status(400).json({ ok: false, message: "Datos incompletos para devolución" });
    }

    // 1. Persistencia del documento (Réplica o Local)
    const dev = await Devolution.create({
      ...req.body,
      folio: folio || `DEV-OPT-${Date.now()}`,
      actor: req.body.actor || actor,
      isReplica: Boolean(isReplica)
    });

    // 2. Si NO es réplica, procesar stock (Aunque usualmente en Óptica las devoluciones vendrán como réplica)
    if (!isReplica) {
        for (const it of items) {
            const Model = MODELS[it.collection];
            if (Model && it.documentId && it.restoreStock) {
                await handleAtomicSale(Model, it.collection, it.documentId, Math.abs(it.qty), actor, "DEVOLUTION");
            }
        }
    }

    broadcast("DEVOLUTION_CREATED", { folio: dev.folio, items: dev.items.length });

    res.status(201).json({ ok: true, data: dev });
  } catch (err) {
    console.error("[OPTICA][DEVOLUTION] Error:", err);
    res.status(500).json({ ok: false, message: "Error al procesar devolución" });
  }
};

/**
 * GET /api/optica/devolutions
 */
exports.list = async (req, res) => {
    try {
        const { status, q, page = 1, limit = 7 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (q) {
            filter.$or = [
                { folio: { $regex: q, $options: "i" } },
                { cliente: { $regex: q, $options: "i" } }
            ];
        }
        const p = Math.max(1, Number(page));
        const l = Math.max(1, Number(limit));

        const [items, total] = await Promise.all([
            Devolution.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
            Devolution.countDocuments(filter)
        ]);

        res.json({ ok: true, data: items, meta: { total, page: p, limit: l, pages: Math.ceil(total / l) } });
    } catch (err) {
        res.status(500).json({ ok: false, message: "Error al listar" });
    }
};

/**
 * PATCH /api/optica/devolutions/status/:idOrFolio
 */
exports.updateStatus = async (req, res) => {
    try {
        const { idOrFolio } = req.params;
        const { status, notes } = req.body;

        let dev = await Devolution.findOne({ 
            $or: [
                { _id: mongoose.Types.ObjectId.isValid(idOrFolio) ? idOrFolio : null },
                { folio: idOrFolio }
            ].filter(c => c._id || c.folio)
        });

        if (!dev) return res.status(404).json({ ok: false, message: "Devolución no encontrada" });

        dev.status = status;
        if (notes) dev.notes = (dev.notes || "") + "\n" + notes;
        await dev.save();

        res.json({ ok: true, data: dev });
    } catch (err) {
        res.status(500).json({ ok: false, message: "Error al actualizar estado" });
    }
};
