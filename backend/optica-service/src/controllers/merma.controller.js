"use strict";

const MermaLog = require("../models/MermaLog");
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
 * POST /api/optica/mermas
 */
exports.create = async (req, res) => {
  try {
    const { collection, documentId, sku, qty, reason, notes, origin } = req.body;
    const actor = actorFrom(req);

    if (!collection || !documentId || !qty || !reason) {
      return res.status(400).json({ ok: false, message: "Datos incompletos para registro de merma" });
    }

    const Model = MODELS[collection];
    if (!Model) {
      return res.status(400).json({ ok: false, message: `Colección no válida: ${collection}` });
    }

    const skipMutation = Boolean(req.body.skipMutation);
    let stockBefore = 0, stockAfter = 0;
    let finalSku = sku;

    if (skipMutation) {
      // Intentar obtener stock actual sin mutar
      const doc = await Model.findById(documentId).lean();
      stockBefore = doc?.stock || 0;
      stockAfter = stockBefore;
      finalSku = sku || doc?.sku || "";
    } else {
      // 1. Ejecutar mutación atómica de stock
      const result = await handleAtomicSale(Model, collection, documentId, -Math.abs(qty), actor, "MERMA");
      if (!result.ok) {
        return res.status(result.status || 400).json({ ok: false, message: result.message });
      }
      stockBefore = result.data.prevStock;
      stockAfter = result.data.newStock;
      finalSku = sku || result.data.sku;
    }

    // 1.5 Obtener valor financiero (Snapshot)
    const doc = await Model.findById(documentId).lean();
    const unitValue = doc?.precio || 0;
    const unitCost  = doc?.costo  || 0; // Si existe costo en el futuro

    // 2. Generar folio MRM-OPT-XXXX
    const count = await MermaLog.countDocuments();
    const folio = `MRM-OPT-${Date.now().toString().slice(-4)}-${(count + 1).toString().padStart(4, '0')}`;

    // 3. Crear el log de merma
    const merma = await MermaLog.create({
      folio,
      origin: origin || "INVENTARIO",
      collection,
      documentId,
      sku: finalSku,
      description: req.body.description || doc?.nombre || doc?.modelo || "",
      qty: Math.abs(Number(qty)),
      reason,
      notes: notes || "",
      unitValue,
      unitCost,
      stockBefore,
      stockAfter,
      isReplica: skipMutation,
      actor
    });

    // 4. Notificar creación de merma
    broadcast("MERMA_CREATED", {
      id: merma._id,
      folio: merma.folio,
      collection,
      qty: merma.qty
    });

    res.status(201).json({ ok: true, data: merma });
  } catch (err) {
    console.error("[OPTICA][MERMA] Create error:", err);
    res.status(500).json({ ok: false, message: "Error al registrar merma" });
  }
};

/**
 * GET /api/optica/mermas
 */
exports.list = async (req, res) => {
  try {
    const { collection, reason, dateFrom, dateTo, page = 1, limit = 7, isReplica } = req.query;
    const q = {};

    if (collection) q.collection = collection;
    if (reason) q.reason = reason;
    if (isReplica !== undefined && isReplica !== null) {
      q.isReplica = isReplica === "true" || isReplica === true;
    }
    if (dateFrom || dateTo) {
      q.createdAt = {};
      if (dateFrom) q.createdAt.$gte = new Date(dateFrom);
      if (dateTo) q.createdAt.$lte = new Date(dateTo);
    }

    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));

    const [items, total] = await Promise.all([
      MermaLog.find(q)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      MermaLog.countDocuments(q)
    ]);

    res.json({
      ok: true,
      data: items,
      meta: { page: p, limit: l, total, pages: Math.ceil(total / l) }
    });
  } catch (err) {
    console.error("[OPTICA][MERMA] List error:", err);
    res.status(500).json({ ok: false, message: "Error al listar mermas" });
  }
};

/**
 * GET /api/optica/mermas/:id
 */
exports.detail = async (req, res) => {
  try {
    const merma = await MermaLog.findById(req.params.id).lean();
    if (!merma) return res.status(404).json({ ok: false, message: "Merma no encontrada" });
    res.json({ ok: true, data: merma });
  } catch (err) {
    console.error("[OPTICA][MERMA] Detail error:", err);
    res.status(500).json({ ok: false, message: "Error al obtener detalle de merma" });
  }
};
