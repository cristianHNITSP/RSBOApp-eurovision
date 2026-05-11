const express = require("express");
const router = express.Router();
const { protect } = require("../utils/auth");
const LaboratoryOrder = require("../models/laboratory/LaboratoryOrder");
const Sale = require("../models/Sale");
const InventorySheet = require("../models/InventorySheet");
const ContactLensesSheet = require("../models/ContactLensesSheet");

router.get("/", protect(), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 7);
    const category = req.query.category; // 'all', 'bases-micas', 'optica', 'lentes-contacto'
    const q = String(req.query.q || "").trim();
    const skip = (page - 1) * limit;

    let orders = [];
    let sales = [];
    let total = 0;

    const searchConditions = q ? {
      $or: [
        { folio: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { cliente: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { clienteDisplay: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { clienteNombres: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { clienteApellidos: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }
      ]
    } : {};

    // ── Lógica de Filtrado por Categoría ──

    // 1. Pedidos de Laboratorio
    if (!category || category === 'all' || category === 'bases-micas' || category === 'lentes-contacto') {
      const orderFilter = { ...searchConditions };
      if (category === 'lentes-contacto') {
        orderFilter.tipo_matriz = "SPH_CYL_AXIS";
      } else if (category === 'bases-micas') {
        orderFilter.tipo_matriz = { $ne: "SPH_CYL_AXIS" };
      }

      const count = await LaboratoryOrder.countDocuments(orderFilter);
      total += count;
      orders = await LaboratoryOrder.find(orderFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'sheet', select: 'nombre tipo_matriz baseKey' })
        .lean();
    }

    // 2. Ventas Directas
    if (!category || category === 'all' || category === 'bases-micas' || category === 'lentes-contacto') {
      const saleFilter = { ...searchConditions };
      
      if (category === 'bases-micas' || category === 'lentes-contacto') {
        saleFilter.isReplica = { $ne: true };
      }

      const count = await Sale.countDocuments(saleFilter);
      total += count;
      sales = await Sale.find(saleFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'items.sheet', select: 'nombre tipo_matriz baseKey material' })
        .lean();
    }

    // Helpers para títulos descriptivos en el Backend
    const fv = (v) => Number(v ?? 0).toFixed(2);
    const eyeLbl = (e) => (e === 'OD' ? 'Ojo Der.' : e === 'OI' ? 'Ojo Izq.' : '');
    
    const buildItemTitle = (l, sheet) => {
      const sheetName = sheet?.nombre || l.micaType || "Producto";
      const t = l.tipo_matriz;
      let params = "";
      if (t === "BASE") params = `Base ${fv(l.params?.base)}`;
      if (t === "SPH_CYL") params = `Esq ${fv(l.params?.sph)} Cil ${fv(l.params?.cyl)}`;
      if (t === "SPH_CYL_AXIS") params = `Esq ${fv(l.params?.sph)} Cil ${fv(l.params?.cyl)} Eje ${l.params?.axis || 0}°`;
      if (t === "SPH_ADD") params = `${eyeLbl(l.eye)} Esq ${fv(l.params?.sph)} Add ${fv(l.params?.add)}`;
      
      return params ? `${sheetName} (${params})` : sheetName;
    };

    // Mapeo unificado para el Frontend
    const mappedOrders = orders.map(o => ({
      id: o._id,
      type: "LAB",
      ventaFolio: o.ventaFolio,
      labFolio: o.folio,
      status: o.status,
      labStatus: o.status,
      fecha: o.createdAt,
      cliente: o.clienteDisplay || o.cliente,
      phone: o.clienteContacto || "",
      note: o.note || "",
      totalMonto: o.totalMonto || 0,
      pago: o.pago || [],
      pagoDisplay: Array.isArray(o.pago) && o.pago.length ? o.pago.join("/") : "Sin especificar",
      actor: o.createdBy?.name || "Sistema",
      totalPiezas: (o.lines || []).reduce((sum, l) => sum + (l.qty || 0), 0),
      category: o.sheet?.tipo_matriz === "SPH_CYL_AXIS" ? "lentes-contacto" : "bases-micas",
      lineas: (o.lines || []).map(l => ({
        title: buildItemTitle(l, o.sheet),
        sku: l.sku || l.codebar || "N/A",
        sheetName: o.sheet?.nombre || "Sin plantilla",
        qty: l.qty,
        precio: l.precio,
        features: [
          l.eye ? `Ojo: ${l.eye}` : null,
          l.params?.sph != null ? `Esf: ${Number(l.params.sph).toFixed(2)}` : null,
          l.params?.cyl != null ? `Cil: ${Number(l.params.cyl).toFixed(2)}` : null,
          l.params?.axis != null ? `Eje: ${l.params.axis}°` : null,
          l.params?.add != null ? `Add: ${Number(l.params.add).toFixed(2)}` : null,
        ].filter(Boolean)
      }))
    }));

    const mappedSales = sales.map(s => {
      // ✅ Categorización Inteligente
      let cat = "bases-micas";
      if (s.isReplica) {
        cat = "optica";
      } else if (s.items?.length > 0) {
        const hasLC = s.items.some(i => 
          i.collection === 'lentes-contacto' || 
          i.category === 'contact-lenses' || 
          i.sheet?.tipo_matriz === "SPH_CYL_AXIS"
        );
        if (hasLC) cat = "lentes-contacto";
      }

      return {
        id: s._id,
        type: "DIRECT",
        ventaFolio: s.folio,
        labFolio: null,
        status: "completado",
        labStatus: null,
        fecha: s.createdAt,
        cliente: s.cliente,
        phone: s.clientePhone || "",
        note: "",
        totalMonto: s.total || 0,
        pago: s.pago || [],
        pagoDisplay: Array.isArray(s.pago) && s.pago.length ? s.pago.join("/") : "Sin especificar",
        actor: s.actor?.name || "Sistema",
        totalPiezas: (s.items || []).reduce((sum, i) => sum + (i.qty || 0), 0),
        category: cat,
        lineas: (s.items || []).map(i => {
          const feats = [];
          const sheetName = i.sheet?.nombre || (i.collection ? `Óptica · ${i.collection}` : "Venta Directa");
          
          const title = i.params ? `${sheetName} (${buildItemTitle(i, i.sheet)})` : sheetName;
          
          if (i.collection) feats.push(`Col: ${i.collection}`);
          if (i.sheet?.material) feats.push(`Mat: ${i.sheet.material}`);
          
          if (i.params) {
            if (i.params.sph != null) feats.push(`Esf: ${Number(i.params.sph).toFixed(2)}`);
            if (i.params.cyl != null) feats.push(`Cil: ${Number(i.params.cyl).toFixed(2)}`);
            if (i.params.axis != null) feats.push(`Eje: ${i.params.axis}°`);
            if (i.params.add != null) feats.push(`Add: ${Number(i.params.add).toFixed(2)}`);
            if (i.params.base != null) feats.push(`Base: ${Number(i.params.base).toFixed(2)}`);
          }
          
          return {
            title,
            sku: i.sku || "N/A",
            sheetName,
            qty: i.qty,
            precio: i.precio,
            features: feats
          };
        })
      };
    });

    let combined = [...mappedOrders, ...mappedSales];
    
    // ✅ Filtrado estricto por categoría post-mapeo
    if (category && category !== 'all') {
      combined = combined.filter(tx => tx.category === category);
    }

    combined.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const paginated = combined.slice(skip, skip + limit);

    res.json({
      ok: true,
      data: paginated,
      meta: { 
        total: combined.length, 
        page, 
        limit, 
        pages: Math.ceil(combined.length / limit) 
      }
    });
  } catch (e) {
    console.error("[TRANSACTIONS] List error:", e);
    res.status(500).json({ ok: false, message: "Error listando historial" });
  }
});

router.get("/search", protect(), async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q || q.length < 2) return res.json({ ok: true, data: [] });

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

    const [orders, sales] = await Promise.all([
      LaboratoryOrder.find({ $and: searchConditions })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("sheet")
        .lean(),
      Sale.find({ $and: searchConditions })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("items.sheet")
        .lean()
    ]);

    const data = [
      ...orders.map(o => ({
        id: o._id,
        folio: o.folio,
        cliente: o.clienteDisplay || o.cliente,
        fecha: o.createdAt,
        type: "LAB",
        status: o.status,
        totalMonto: o.totalMonto || 0,
        pago: o.pago || [],
        lineas: (o.lines || []).map(l => ({
          title: l.micaType || "Pedido Lab",
          qty: l.qty,
          precio: l.precio,
          sheetName: o.sheet?.nombre || "Sin plantilla"
        }))
      })),
      ...sales.map(s => ({
        id: s._id,
        folio: s.folio,
        cliente: s.cliente,
        fecha: s.createdAt,
        type: "DIRECT",
        status: "completado",
        totalMonto: s.total || 0,
        pago: s.pago || [],
        lineas: (s.items || []).map(i => ({
          title: i.description || "Venta Directa",
          qty: i.qty,
          precio: i.precio,
          sheetName: i.sheet?.nombre || "N/A"
        }))
      }))
    ];

    // Ordenar combinados por fecha
    data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json({ ok: true, data: data.slice(0, 15) });
  } catch (e) {
    console.error("[TRANSACTIONS] Search error:", e);
    res.status(500).json({ ok: false, message: "Error buscando transacciones" });
  }
});

module.exports = router;
