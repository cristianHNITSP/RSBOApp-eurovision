/**
 * @fileoverview Datos y configuración para el módulo de Inventario.
 */

export const INVENTORY_CONFIG = {
  STALE_TIME_MS: 300_000, // 5 minutos
  FETCH_LIMIT: 50,
  TABS: {
    NEW: 'nueva',
    SPH_NEG: 'sph-neg',
    BASE_NEG: 'base-neg'
  }
};

export const INVENTORY_LABELS = {
  TITLE: 'Bases y Micas',
  SUBTITLE: 'Inventario',
  DESCRIPTION: 'Gestiona el stock de planillas oftálmicas: monofocal, bifocal, progresivo y base.',
  QUICK_CARDS: [
    { title: 'Agregar planilla', text: 'Selecciona el tipo, material y tratamiento', icon: 'fas fa-plus-square' },
    { title: 'Guardar cambios', text: 'Edita el stock y pulsa "Guardar cambios"', icon: 'fas fa-save' },
    { title: 'Exportar a Excel', text: 'Descarga el inventario como archivo de Excel', icon: 'fas fa-file-export' }
  ]
};
