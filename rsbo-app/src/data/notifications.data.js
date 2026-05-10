/**
 * @fileoverview Datos y configuración para el Panel de Notificaciones.
 */

export const NOTIFICATION_CONFIG = {
  PRIORITY_ORDER: { 
    critical: 4, 
    high: 3, 
    medium: 2, 
    low: 1 
  },
  STALE_TIME_MS: 60_000,
  FETCH_LIMIT: 10,
  DEBOUNCE_MS: 800,
  ANIMATION_DURATION_MS: 300,
  DEFAULT_EMPTY_MESSAGE: 'No hay notificaciones pendientes.',
  LOADING_MESSAGE: 'Buscando actualizaciones...'
};

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  DANGER: 'danger',
  SUCCESS: 'success',
  INVENTORY_ALERT: 'inventory_alert'
};
