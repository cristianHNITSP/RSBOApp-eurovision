/**
 * @fileoverview Datos y configuración para el Dashboard.
 */

export const DASHBOARD_CONFIG = {
  REFRESH_INTERVAL_MS: 2000,
  STALE_TIME_MS: 60000,
  MAX_VISIBLE_KPIS: (canSeeInventory, canSeeDevolutions) => {
    if (canSeeInventory) return 8;
    if (canSeeDevolutions) return 6;
    return 4;
  }
};

export const ROLE_META = {
  root: { 
    label: 'Administrador del sistema', 
    icon: 'fas fa-crown', 
    ring: '#dc2626', 
    banner: 'linear-gradient(90deg, #dc2626, #ea580c)', 
    pill: { background: 'rgba(220,38,38,.15)', color: '#dc2626', border: '1px solid rgba(220,38,38,.3)' } 
  },
  eurovision: { 
    label: 'Encargado Eurovisión', 
    icon: 'fas fa-star', 
    ring: '#906fe1', 
    banner: 'linear-gradient(90deg, #906fe1, #2563eb)', 
    pill: { background: 'rgba(144,111,225,.15)', color: '#906fe1', border: '1px solid rgba(144,111,225,.3)' } 
  },
  supervisor: { 
    label: 'Supervisor de operaciones', 
    icon: 'fas fa-eye', 
    ring: '#0891b2', 
    banner: 'linear-gradient(90deg, #0891b2, #0d9488)', 
    pill: { background: 'rgba(8,145,178,.15)', color: '#0891b2', border: '1px solid rgba(8,145,178,.3)' } 
  },
  ventas: { 
    label: 'Personal de ventas', 
    icon: 'fas fa-cart-shopping', 
    ring: '#16a34a', 
    banner: 'linear-gradient(90deg, #16a34a, #65a30d)', 
    pill: { background: 'rgba(22,163,74,.15)', color: '#16a34a', border: '1px solid rgba(22,163,74,.3)' } 
  },
  laboratorio: { 
    label: 'Técnico de laboratorio', 
    icon: 'fas fa-microscope', 
    ring: '#0284c7', 
    banner: 'linear-gradient(90deg, #0284c7, #906fe1)', 
    pill: { background: 'rgba(2,132,199,.15)', color: '#0284c7', border: '1px solid rgba(2,132,199,.3)' } 
  },
};

export const DEVOL_REASON_LABELS = {
  defecto_fabricacion:    'Defecto de fabricación',
  error_prescripcion:     'Error de prescripción',
  insatisfaccion_cliente: 'Insatisfacción',
  dano_transporte:        'Daño en transporte',
  lente_roto:             'Lente roto',
  pedido_incorrecto:      'Pedido incorrecto',
  garantia:               'Garantía',
  otro:                   'Otro',
};

export const KPI_TEMPLATES = [
  // Inventario optico
  { key:'sheets',         icon:'table-cells-large',   accent:'purple', title:'Catálogos de lentes',      caption:'Plantillas activas (bases y micas)',        requiresInventory:true },
  { key:'combinaciones',  icon:'layer-group',          accent:'blue',   title:'Graduaciones disponibles', caption:'Esférica, Cilíndrica, Adición',            requiresInventory:true },
  { key:'stock',          icon:'boxes-stacked',        accent:'green',  title:'Lentes en almacén',        caption:'Bases y micas (stock total)',              requiresInventory:true },
  { key:'alertas',        icon:'triangle-exclamation', accent:'orange', title:'⚠ Stock bajo en lentes',   caption:'Graduaciones con 0-2 unidades',            requiresInventory:true },
  // Tienda (Optica)
  { key:'optProd',        icon:'store',                accent:'cyan',   title:'Productos en tienda',      caption:'Armazones, soluciones, accesorios, etc.',  requiresInventory:true },
  { key:'optStock',       icon:'boxes-packing',        accent:'teal',   title:'Piezas totales tienda',    caption:'Stock acumulado de todos los productos',   requiresInventory:true },
  { key:'optAgotados',    icon:'box-open',             accent:'red',    title:'Agotados en tienda',       caption:'Productos con 0 unidades',                 requiresInventory:true },
  { key:'optValor',       icon:'coins',                accent:'green',  title:'Valor inventario tienda',  caption:'Valor estimado total en MXN',              requiresInventory:true },
  // Lentes de contacto
  { key:'clSheets',       icon:'eye',                  accent:'cyan',   title:'Catálogos de contacto',    caption:'Plantillas activas lentes de contacto',    requiresInventory:true },
  { key:'clStock',        icon:'boxes-stacked',        accent:'teal',   title:'Existencias contacto',     caption:'Piezas lentes de contacto',                requiresInventory:true },
  { key:'clAlertas',      icon:'triangle-exclamation', accent:'orange', title:'⚠ Stock bajo en contacto', caption:'Graduaciones con 0-2 unidades',            requiresInventory:true },
  { key:'clCoverage',     icon:'percent',              accent:'blue',   title:'Cobertura contacto',       caption: 'Cobertura del catálogo',                  requiresInventory:true },
  // Pedidos y operaciones
  { key:'pendientes',     icon:'clipboard-list',       accent:'orange', title:'Pendientes',               caption:'Abiertos o parciales',                     requiresOrders:true },
  { key:'cerrados30d',    icon:'circle-check',         accent:'green',  title:'Cerrados (30d)',            caption:'Últimos 30 días',                          requiresOrders:true },
  { key:'scansToday',     icon:'barcode',              accent:'cyan',   title:'Escaneos hoy',             caption:'Salidas por escáner',                      requiresLab:true },
  { key:'serviceLevel',   icon:'gauge-high',           accent:'purple', title:'Nivel de servicio',        caption: 'Pedidos sin errores',                    requiresReports:true },
  { key:'devPendientes',  icon:'rotate-left',          accent:'orange', title:'Devoluciones pendientes',  caption:'Esperando revisión',                       requiresDevolutions:true },
  { key:'devTotal30d',    icon:'arrow-rotate-left',    accent:'purple', title:'Devoluciones (30d)',        caption:'Este período',                             requiresDevolutions:true },
  { key:'corrections7d',  icon:'wrench',               accent:'red',    title:'Correcciones (7d)',         caption:'Solicitudes activas',                      requiresLab:true },
  { key:'cerradoHoy',     icon:'check',                accent:'green',  title:'Cerrados hoy',             caption:'Completados hoy',                          requiresOrders:true },
  // Ventas Consolidadas
  { key:'ventasMes',      icon:'sack-dollar',          accent:'green',  title:'Ingresos (Mes)',           caption:'Global: Lab + Óptica',                     requiresReports:true },
  { key:'ventasHoy',      icon:'money-bill-trend-up',  accent:'teal',   title:'Ventas Hoy',               caption:'Ingresos del día (Global)',               requiresReports:true },
];
