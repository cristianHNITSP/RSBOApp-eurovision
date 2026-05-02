// src/routes/search.routes.js
/**
 * @fileoverview Búsqueda global — consulta planillas de inventario,
 *               órdenes de laboratorio y devuelve las rutas de la app.
 *
 * GET /api/search?q=<texto>&limit=<n>
 *
 * Response:
 * {
 *   routes : [ { id, label, icon, routeName, routePath, routeQuery?, category } ],
 *   sheets : [ { id, nombre, material, tipo_matriz, tipoLabel, tratamiento, variante, sku,
 *                proveedor, marca, ranges, category } ],
 *   orders : [ { id, folio, cliente, status } ]
 * }
 *
 * Diopter search:
 *   Si la query es un número (ej. "-2.50") se buscan plantillas cuyo rango
 *   SPH / CYL / ADD / BASE / AXIS contenga ese valor.
 */

const express      = require('express');
const router       = express.Router();
const { protect }  = require('../utils/auth');
const InventorySheet     = require('../models/InventorySheet');
const ContactLensesSheet = require('../models/ContactLensesSheet');
const LaboratoryOrder    = require('../models/laboratory/LaboratoryOrder');

// ── Mapa estático de rutas de la aplicación ──────────────────────────────────
// Mantén sincronizado con src/router/index.js del frontend.
const APP_ROUTES = [
  { id: 'r-home',        label: 'Inicio / Dashboard',              icon: 'home',            routeName: 'home',                       routePath: '/l/home',                        keywords: ['inicio', 'home', 'dashboard', 'panel'] },

  // Inventario
  { id: 'r-inv-bm',      label: 'Inventario - Bases y Micas',     icon: 'glasses',         routeName: 'inventario-bases-micas',     routePath: '/l/inventario/bases-micas',      keywords: ['inventario', 'bases', 'micas', 'bases micas', 'oftálmicas', 'lentes', 'stock', 'planillas'] },
  { id: 'r-inv-optica',  label: 'Inventario - Óptica',            icon: 'eye',             routeName: 'inventario-optica',          routePath: '/l/inventario/optica',           keywords: ['inventario', 'óptica', 'optica', 'stock', 'gafas', 'anteojos'] },
  { id: 'r-inv-lc',      label: 'Inventario - Lentes Contacto',   icon: 'circle',          routeName: 'inventario-lentes-contacto', routePath: '/l/inventario/lentes-contacto',  keywords: ['inventario', 'lentes', 'contacto', 'lentes de contacto', 'stock'] },

  // Ventas
  { id: 'r-ven-lab',     label: 'Ventas - Laboratorio',           icon: 'flask',           routeName: 'ventas-laboratorio',         routePath: '/l/ventas/laboratorio',          keywords: ['ventas', 'laboratorio', 'lab', 'órdenes', 'ordenes', 'pedidos'] },
  { id: 'r-ven-bm',      label: 'Ventas - Bases y Micas',         icon: 'glasses',         routeName: 'ventas-bases-micas',         routePath: '/l/ventas/bases-micas',          keywords: ['ventas', 'bases', 'micas', 'bases micas', 'órdenes'] },
  { id: 'r-ven-optica',  label: 'Ventas - Óptica',                icon: 'eye',             routeName: 'ventas-optica',              routePath: '/l/ventas/optica',               keywords: ['ventas', 'óptica', 'optica', 'gafas', 'órdenes', 'anteojos'] },
  { id: 'r-ven-lc',      label: 'Ventas - Lentes Contacto',       icon: 'circle',          routeName: 'ventas-lentes-contacto',     routePath: '/l/ventas/lentes-contacto',      keywords: ['ventas', 'lentes', 'contacto', 'lentes de contacto', 'órdenes'] },

  { id: 'r-usuarios',    label: 'Gestión de Usuarios',            icon: 'users',           routeName: 'usuarios',                   routePath: '/l/usuarios',                    keywords: ['usuarios', 'users', 'gestión', 'roles', 'permisos'] },
  { id: 'r-devol',       label: 'Devoluciones',                   icon: 'undo-alt',        routeName: 'devoluciones',               routePath: '/l/devoluciones',                keywords: ['devoluciones', 'devolución', 'retorno', 'reembolso', 'return'] },
  { id: 'r-config',      label: 'Configuración',                  icon: 'cog',             routeName: 'configuración',              routePath: '/l/config.panel',                keywords: ['config', 'configuración', 'ajustes', 'settings'] },
  { id: 'r-perfil',      label: 'Mi Perfil',                      icon: 'user-circle',     routeName: 'configuración',              routePath: '/l/config.panel',                routeQuery: { tab: 'profile' }, keywords: ['perfil', 'profile', 'cuenta', 'contraseña'] },
  { id: 'r-analiticas',  label: 'Analíticas',                     icon: 'chart-bar',       routeName: 'Análiticas',                 routePath: '/l/analiticas',                  keywords: ['analíticas', 'analytics', 'estadísticas', 'reportes', 'graficas'] },
  { id: 'r-ayuda',       label: 'Ayuda',                          icon: 'question-circle', routeName: 'Ayuda',                      routePath: '/l/ayuda',                       keywords: ['ayuda', 'help', 'soporte', 'faq'] },
];

const TIPO_MATRIZ_LABELS = {
  BASE:         'Monofocal (Base)',
  SPH_CYL:      'Monofocal Esf-Cil',
  SPH_CYL_AXIS: 'Tórico (CL)',
  SPH_ADD:      'Bifocal',
  BASE_ADD:     'Progresivo'
};

// ── Helpers de búsqueda numérica (rango de dioptrias) ────────────────────────
/**
 * Devuelve condiciones MongoDB para verificar que `val` cae dentro
 * de un rango almacenado en `field` (con subfields .start y .end).
 * Soporta rangos ascendentes (start ≤ end) y descendentes (axis: start > end).
 */
function inRange(field, val) {
  return {
    $or: [
      // Rango ascendente: start ≤ val ≤ end
      { $and: [{ [`${field}.start`]: { $lte: val } }, { [`${field}.end`]: { $gte: val } }] },
      // Rango descendente: end ≤ val ≤ start  (ej. axis: 180 → 10)
      { $and: [{ [`${field}.end`]:   { $lte: val } }, { [`${field}.start`]: { $gte: val } }] }
    ]
  };
}

/**
 * Normaliza texto: minúsculas + quita tildes.
 */
function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ── GET /api/search ──────────────────────────────────────────────────────────
router.get('/', protect(), async (req, res) => {
  try {
    const q     = String(req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20);

    if (!q || q.length < 2) {
      return res.json({ routes: [], sheets: [], orders: [] });
    }

    // ── 1. Rutas ─────────────────────────────────────────────────────────────
    const qNorm = normalize(q);
    const matched = APP_ROUTES.filter(r => {
      const haystack = normalize([r.label, ...r.keywords].join(' '));
      return haystack.includes(qNorm);
    }).map(r => ({ ...r, category: 'Páginas' }));

    // ── 2. Planillas oftálmicas ───────────────────────────────────────────────
    const regex    = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const numVal   = parseFloat(q);
    const isNumber = !isNaN(numVal) && /^[-+]?\d+(\.\d+)?$/.test(q.trim());

    // Tipos que coinciden por nombre (ej. "tórico" → SPH_CYL_AXIS)
    const matchingTipos = Object.entries(TIPO_MATRIZ_LABELS)
      .filter(([, label]) => normalize(label).includes(qNorm))
      .map(([code]) => code);

    // Condiciones de texto base (compartidas por ambas colecciones)
    const textOr = [
      { nombre:           regex },
      { material:         regex },
      { tratamiento:      regex },
      { variante:         regex },
      { sku:              regex },
      { baseKey:          regex },
      { 'proveedor.name': regex },
      { 'marca.name':     regex },
      { tipo_matriz:      regex },
    ];

    if (matchingTipos.length) {
      textOr.push({ tipo_matriz: { $in: matchingTipos } });
    }

    // Condiciones de rango numérico para bases/micas
    const invNumericOr = isNumber ? [
      inRange('ranges.sph',  numVal),
      inRange('ranges.cyl',  numVal),
      inRange('ranges.add',  numVal),
      inRange('ranges.base', numVal),
    ] : [];

    // Condiciones de rango numérico para lentes de contacto (agrega axis)
    const clNumericOr = isNumber ? [
      ...invNumericOr,
      inRange('ranges.axis', numVal),
    ] : [];

    const invSheetQuery = {
      isDeleted: { $ne: true },
      $or: [...textOr, ...invNumericOr]
    };

    const clSheetQuery = {
      isDeleted: { $ne: true },
      $or: [...textOr, ...clNumericOr]
    };

    const sheetFields = {
      nombre: 1, material: 1, tipo_matriz: 1,
      tratamiento: 1, variante: 1, sku: 1, baseKey: 1,
      proveedor: 1, marca: 1, ranges: 1
    };

    const orderQuery = {
      status: { $ne: 'cancelado' },
      $or: [
        { folio:   regex },
        { cliente: regex }
      ]
    };
    const orderFields = { folio: 1, cliente: 1, status: 1 };

    const [invSheets, clSheets, labOrders] = await Promise.all([
      InventorySheet.find(invSheetQuery, sheetFields).lean().limit(limit),
      ContactLensesSheet.find(clSheetQuery, sheetFields).lean().limit(limit),
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
      ranges:      s.ranges          || null,
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
