/**
 * @fileoverview Datos y configuración para el módulo de Encargos (BackOrders).
 */

export const BACKORDER_CONFIG = {
  CATEGORIES: [
    { id: "BASES_MICAS", label: "Bases y Micas" },
    { id: "LENTES_CONTACTO", label: "Lentes de Contacto" },
    { id: "OPTICA", label: "Óptica" },
  ],
  STATUS_COLORS: {
    SOLICITADO: "#3b82f6",
    PEDIDO_PROVEEDOR: "#f59e0b",
    RECIBIDO: "#06b6d4",
    LISTO_ENTREGA: "#8b5cf6",
    ENTREGADO: "#10b981",
    CANCELADO: "#6b7280",
    DEFAULT: "#ddd"
  },
  SEARCH_DEBOUNCE_MS: 400
};

export const BACKORDER_LABELS = {
  HERO: {
    PILL: 'LOGÍSTICA',
    TITLE: 'Gestionar Encargos',
    SUBTITLE: 'Seguimiento de cristales, lentes y trabajos de óptica en proceso.'
  },
  EMPTY_STATES: {
    LOADING: 'Sincronizando con el laboratorio...',
    NO_RESULTS: 'No se encontraron encargos en esta categoría.'
  }
};
