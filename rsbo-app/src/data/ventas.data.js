/**
 * @fileoverview Datos y configuración para el módulo de Ventas.
 */

export const VENTAS_CONFIG = {
  CATEGORY_KEYS: ['bases-micas', 'optica', 'lentes-contacto'],
  HISTORY_LIMIT: 20,
  VOUCHER_WIDTH: 560,
  CLOSURE_MODAL_WIDTH: 500,
  TABS: {
    BASES: 'bases-micas',
    OPTICA: 'optica',
    CONTACTO: 'lentes-contacto',
    HISTORIAL: 'historial',
    CORTES: 'cortes'
  }
};

export const CATALOG_METADATA = {
  'optica': {
    placeholder: 'Seleccionar colección...',
    icon: 'fa-tags',
    codeLabel: 'SKU'
  },
  'lentes-contacto': {
    placeholder: 'Buscar planilla...',
    icon: 'fa-circle',
    codeLabel: 'código'
  },
  'bases-micas': {
    placeholder: 'Buscar planilla...',
    icon: 'fa-layer-group',
    codeLabel: 'código'
  },
  'default': {
    placeholder: 'Buscar...',
    icon: 'fa-search',
    codeLabel: 'código'
  }
};

export const SALES_LABELS = {
  HERO: {
    TITLE: 'Terminal de Ventas',
    SUBTITLE: 'Gestión de operaciones comerciales y facturación'
  },
  BUTTONS: {
    CASH_CLOSURE: 'Corte de Caja',
    CHECKOUT: 'Registrar Venta',
    CLEAR_CART: 'Vaciar Carrito'
  }
};
