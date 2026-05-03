const express = require("express");
const router = express.Router();
const { protect } = require("../utils/auth");
const LaboratoryOrder = require("../models/laboratory/LaboratoryOrder");
const axios = require("axios");

const OPTICA_SERVICE_URL = process.env.OPTICA_SERVICE_URL || "http://optica-service:3000";

/**
 * GET /api/transactions
 * Lista las últimas transacciones combinadas (Laboratorio y Óptica).
 */
router.get("/", protect(), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    
    // 1. Obtener órdenes de laboratorio
    const orders = await LaboratoryOrder.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const labData = orders.map(o => ({
      id: o._id,
      folio: o.folio,
      cliente: o.clienteDisplay || o.cliente,
      fecha: o.createdAt,
      type: "LAB",
      status: o.status,
      total: o.totalMonto || 0,
      pago: o.pago || [],
      items: o.lines.map(l => ({
        id: l.lineId || l._id,
        title: l.micaType && l.sheetNombre ? `${l.micaType} | ${l.sheetNombre}` : (l.title || l.codebar || 'Producto'),
        qty: l.qty,
        precio: l.precio,
        sku: l.sku
      }))
    }));

    // 2. Obtener ventas de óptica
    let opticaData = [];
    try {
      const opticaRes = await axios.get(`${OPTICA_SERVICE_URL}/api/optica/sales/search`, {
        params: { q: "" },
        headers: { "x-service-token": process.env.INTERNAL_SERVICE_TOKEN }
      });
      if (opticaRes.data && opticaRes.data.ok) {
        opticaData = opticaRes.data.data.map(s => ({
          id: s._id,
          folio: s.folio,
          cliente: s.cliente,
          fecha: s.createdAt,
          type: "VNT",
          status: "completado",
          total: s.total || 0,
          pago: s.pago || [],
          items: s.items.map(it => ({
            id: it.documentId,
            title: it.description || it.sku,
            qty: it.qty,
            precio: it.precio,
            sku: it.sku,
            collection: it.collection
          }))
        }));
      }
    } catch (optErr) {
      console.warn("[TRANSACTIONS] Optica list failed:", optErr.message);
    }

    // Unificamos y ordenamos
    const data = [...labData, ...opticaData].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, limit);

    res.json({ ok: true, data });
  } catch (e) {
    console.error("[TRANSACTIONS] List error:", e);
    res.status(500).json({ ok: false, message: "Error listando historial" });
  }
});

/**
 * GET /api/transactions/search
 * Busca transacciones (órdenes de laboratorio) por folio o nombre del cliente.
 */
router.get("/search", protect(), async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q || q.length < 2) return res.json({ ok: true, data: [] });

    // Dividimos la búsqueda en términos para soportar búsqueda por fragmentos (ej: "juan perez")
    const terms = q.split(/\s+/).filter(Boolean);
    const searchConditions = terms.map(term => {
      const regex = new RegExp(term.replace(/[.*+?^{}()|[\]\\]/g, "\\$&"), "i");
      return {
        $or: [
          { folio: regex },
          { cliente: regex },
          { clienteDisplay: regex },
          { clienteNombres: regex },
          { clienteApellidos: regex }
        ]
      };
    });

    // Buscamos en LaboratoryOrder
    const orders = await LaboratoryOrder.find({ $and: searchConditions })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

    // Mapeamos LAB
    const labData = orders.map(o => ({
      id: o._id,
      folio: o.folio,
      cliente: o.clienteDisplay || o.cliente,
      fecha: o.createdAt,
      type: "LAB",
      status: o.status,
      total: o.totalMonto || 0,
      pago: o.pago || [],
      items: o.lines.map(l => ({
        id: l.lineId || l._id,
        title: l.micaType && l.sheetNombre ? `${l.micaType} | ${l.sheetNombre}` : (l.title || l.codebar || 'Producto'),
        params: l.params,
        qty: l.qty,
        precio: l.precio,
        codebar: l.codebar,
        sku: l.sku,
        sheetId: l.sheet,
        matrixKey: l.matrixKey,
        eye: l.eye
      }))
    }));

    // Buscamos en OpticaService (Ventas Directas)
    let opticaData = [];
    try {
      const opticaRes = await axios.get(`${OPTICA_SERVICE_URL}/api/optica/sales/search`, {
        params: { q },
        headers: { "x-service-token": process.env.INTERNAL_SERVICE_TOKEN }
      });
      if (opticaRes.data && opticaRes.data.ok) {
        opticaData = opticaRes.data.data.map(s => ({
          id: s._id,
          folio: s.folio,
          cliente: s.cliente,
          fecha: s.createdAt,
          type: "VNT",
          status: "completado",
          total: s.total || 0,
          pago: s.pago || [],
          items: s.items.map(it => ({
            id: it._id || it.documentId,
            title: it.description || it.sku,
            qty: it.qty,
            precio: it.precio,
            sku: it.sku,
            collection: it.collection,
            documentId: it.documentId
          }))
        }));
      }
    } catch (optErr) {
      console.warn("[TRANSACTIONS] Optica search failed:", optErr.message);
    }

    // Unificamos y ordenamos por fecha
    const data = [...labData, ...opticaData].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json({ ok: true, data });
  } catch (e) {
    console.error("[TRANSACTIONS] Search error:", e);
    res.status(500).json({ ok: false, message: "Error buscando transacciones" });
  }
});

module.exports = router;
