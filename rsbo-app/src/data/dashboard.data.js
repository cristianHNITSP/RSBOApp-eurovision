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

/* Paleta del logo: colores de rol vívidos, sólidos y mate (sin gradientes).
   Los pills usan tokens CSS para adaptarse a claro/oscuro automáticamente. */
export const ROLE_META = {
  root: {
    label: 'Administrador del sistema',
    icon: 'fas fa-crown',
    ring: '#db3b4b',
    banner: '#db3b4b',
    pill: { background: 'var(--c-danger-alpha)', color: 'var(--c-danger)', border: '1px solid var(--c-danger-alpha)' }
  },
  eurovision: {
    label: 'Encargado Eurovisión',
    icon: 'fas fa-star',
    ring: '#a332bd',
    banner: '#a332bd',
    pill: { background: 'var(--c-primary-alpha)', color: 'var(--c-primary)', border: '1px solid var(--c-primary-alpha)' }
  },
  supervisor: {
    label: 'Supervisor de operaciones',
    icon: 'fas fa-eye',
    ring: '#0f97a8',
    banner: '#0f97a8',
    pill: { background: 'var(--c-cyan-alpha)', color: 'var(--c-cyan)', border: '1px solid var(--c-cyan-alpha)' }
  },
  ventas: {
    label: 'Personal de ventas',
    icon: 'fas fa-cart-shopping',
    ring: '#148a4e',
    banner: '#148a4e',
    pill: { background: 'var(--c-success-alpha)', color: 'var(--c-success)', border: '1px solid var(--c-success-alpha)' }
  },
  laboratorio: {
    label: 'Técnico de laboratorio',
    icon: 'fas fa-microscope',
    ring: '#176fdb',
    banner: '#176fdb',
    pill: { background: 'var(--c-info-alpha)', color: 'var(--c-info)', border: '1px solid var(--c-info-alpha)' }
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
];
