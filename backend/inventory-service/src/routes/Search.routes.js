// src/routes/search.routes.js
/**
 * @fileoverview Búsqueda global — consulta planillas de inventario,
 *               órdenes de laboratorio y devuelve las rutas de la app.
 *
 * GET /api/search?q=<texto>&limit=<n>
 *
 * Response:
 * {
 *   routes : [ { id, label, icon, routeName, routeQuery?, category } ],
 *   sheets : [ { id, nombre, material, tipo_matriz, tratamiento, variante, sku, proveedor, marca } ],
 *   orders : [ { id, folio, cliente, status } ]
 * }
 */

const express      = require('express');
const router       = express.Router();
//const authMiddleware = require('../middlewares/auth.middleware');
const InventorySheet     = require('../models/InventorySheet');
const ContactLensesSheet = require('../models/ContactLensesSheet');
const LaboratoryOrder    = require('../models/laboratory/LaboratoryOrder');

// ── Mapa estático de rutas de la aplicación ──────────────────────────────────
// Mantén sincronizado con src/router/index.js del frontend.
const APP_ROUTES = [
  { id: 'r-home',        label: 'Inicio / Dashboard',              icon: 'home',            routeName: 'home',                         routePath: '/l/home',                          keywords: ['inicio', 'home', 'dashboard', 'panel'] },

  // Inventario
  { id: 'r-inv-bm',      label: 'Inventario - Bases y Micas',     icon: 'glasses',         routeName: 'inventario-bases-micas',       routePath: '/l/inventario/bases-micas',        keywords: ['inventario', 'bases', 'micas', 'bases micas', 'oftálmicas', 'lentes', 'stock', 'planillas'] },
  { id: 'r-inv-optica',  label: 'Inventario - Óptica',            icon: 'eye',             routeName: 'inventario-optica',            routePath: '/l/inventario/optica',             keywords: ['inventario', 'óptica', 'optica', 'stock', 'gafas', 'anteojos'] },
  { id: 'r-inv-lc',      label: 'Inventario - Lentes Contacto',   icon: 'circle',          routeName: 'inventario-lentes-contacto',   routePath: '/l/inventario/lentes-contacto',    keywords: ['inventario', 'lentes', 'contacto', 'lentes de contacto', 'stock'] },

  // Ventas
  { id: 'r-ven-lab',     label: 'Ventas - Laboratorio',           icon: 'flask',           routeName: 'ventas-laboratorio',           routePath: '/l/ventas/laboratorio',            keywords: ['ventas', 'laboratorio', 'lab', 'órdenes', 'ordenes', 'pedidos'] },
  { id: 'r-ven-bm',      label: 'Ventas - Bases y Micas',         icon: 'glasses',         routeName: 'ventas-bases-micas',           routePath: '/l/ventas/bases-micas',            keywords: ['ventas', 'bases', 'micas', 'bases micas', 'órdenes'] },
  { id: 'r-ven-optica',  label: 'Ventas - Óptica',                icon: 'eye',             routeName: 'ventas-optica',                routePath: '/l/ventas/optica',                 keywords: ['ventas', 'óptica', 'optica', 'gafas', 'órdenes', 'anteojos'] },
  { id: 'r-ven-lc',      label: 'Ventas - Lentes Contacto',       icon: 'circle',          routeName: 'ventas-lentes-contacto',       routePath: '/l/ventas/lentes-contacto',        keywords: ['ventas', 'lentes', 'contacto', 'lentes de contacto', 'órdenes'] },

  { id: 'r-usuarios',    label: 'Gestión de Usuarios',            icon: 'users',           routeName: 'usuarios',                     routePath: '/l/usuarios',                      keywords: ['usuarios', 'users', 'gestión', 'roles', 'permisos'] },
  { id: 'r-config',      label: 'Configuración',                  icon: 'cog',             routeName: 'configuración',                routePath: '/l/config.panel',                  keywords: ['config', 'configuración', 'ajustes', 'settings'] },
  { id: 'r-perfil',      label: 'Mi Perfil',                      icon: 'user-circle',     routeName: 'configuración',                routePath: '/l/config.panel',                  routeQuery: { tab: 'profile' }, keywords: ['perfil', 'profile', 'cuenta', 'contraseña'] },
  { id: 'r-analiticas',  label: 'Analíticas',                     icon: 'chart-bar',       routeName: 'Análiticas',                   routePath: '/l/analiticas',                    keywords: ['analíticas', 'analytics', 'estadísticas', 'reportes', 'graficas'] },
  { id: 'r-ayuda',       label: 'Ayuda',                          icon: 'question-circle', routeName: 'Ayuda',                        routePath: '/l/ayuda',                         keywords: ['ayuda', 'help', 'soporte', 'faq'] },
];

const TIPO_MATRIZ_LABELS = {
  BASE:         'Monofocal (Base)',
  SPH_CYL:      'Monofocal Esf-Cil',
  SPH_CYL_AXIS: 'Tórico (CL)',
  SPH_ADD:      'Bifocal',
  BASE_ADD:     'Progresivo'
};

// ── GET /api/search ──────────────────────────────────────────────────────────
router.get('/'//, authMiddleware
    , async (req, res) => {
  try {
    const q     = String(req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20);

    if (!q || q.length < 2) {
      return res.json({ routes: [], sheets: [] });
    }

    // ── 1. Rutas ─────────────────────────────────────────────────────────────
    const qLower  = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const matched = APP_ROUTES.filter(r => {
      const haystack = [r.label, ...r.keywords].join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return haystack.includes(qLower);
    }).map(r => ({ ...r, category: 'Páginas' }));

    // ── 2. Planillas oftálmicas ───────────────────────────────────────────────
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const sheetQuery = {
      isDeleted: { $ne: true },
      $or: [
        { nombre:           regex },
        { material:         regex },
        { tratamiento:      regex },
        { variante:         regex },
        { sku:              regex },
        { baseKey:          regex },
        { 'proveedor.name': regex },
        { 'marca.name':     regex }
      ]
    };
    const sheetFields = { nombre: 1, material: 1, tipo_matriz: 1, tratamiento: 1, variante: 1, sku: 1, baseKey: 1, proveedor: 1, marca: 1 };

    const orderQuery = {
      status: { $ne: 'cancelado' },
      $or: [
        { folio:   regex },
        { cliente: regex }
      ]
    };
    const orderFields = { folio: 1, cliente: 1, status: 1 };

    const [invSheets, clSheets, labOrders] = await Promise.all([
      InventorySheet.find(sheetQuery, sheetFields).lean().limit(limit),
      ContactLensesSheet.find(sheetQuery, sheetFields).lean().limit(limit),
      LaboratoryOrder.find(orderQuery, orderFields).sort({ createdAt: -1 }).lean().limit(limit)
    ]);

    const mapSheet = (s, category) => ({
      id:          String(s._id),
      nombre:      s.nombre,
      material:    s.material,
      tipo_matriz: s.tipo_matriz,
      tipoLabel:   TIPO_MATRIZ_LABELS[s.tipo_matriz] || s.tipo_matriz,
      tratamiento: s.tratamiento  || '',
      variante:    s.variante     || '',
      sku:         s.sku          || '',
      proveedor:   s.proveedor?.name || '',
      marca:       s.marca?.name     || '',
      category
    });

    const sheetsResult = [
      ...invSheets.map(s => mapSheet(s, 'Planillas oftálmicas')),
      ...clSheets.map(s => mapSheet(s, 'Lentes de contacto'))
    ].slice(0, limit);

    const ordersResult = labOrders.map(o => ({
      id:      String(o._id),
      folio:   o.folio,
      cliente: o.cliente,
      status:  o.status
    }));

    return res.json({ routes: matched, sheets: sheetsResult, orders: ordersResult });

  } catch (err) {
    console.error('Error en búsqueda global:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;