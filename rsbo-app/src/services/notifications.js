// src/services/notifications.js
import api from '@/api/axios';

const BASE = '/notification';

/** Lista notificaciones visibles para el usuario autenticado */
export const fetchNotifications = (params = {}) =>
  api.get(BASE, { params });

/** Conteo de nuevas (acepta since timestamp) */
export const fetchActiveCount = (since) =>
  api.get(`${BASE}/count`, { params: { since } });

/**
 * Crea o acumula una notificación agrupada.
 * @param {{
 *   groupKey: string,
 *   title: string,
 *   messageTemplate: string,  // usa {count} como placeholder, ej: "{count} pedidos pendientes"
 *   type?: 'info'|'warning'|'danger'|'success',
 *   priority?: 'low'|'medium'|'high'|'critical',
 *   targetRoles?: string[],
 *   isGlobal?: boolean
 * }} payload
 */
export const createGroupedNotification = (payload) =>
  api.post(`${BASE}/grouped`, payload);


/** Alterna el pin de una notificación para el usuario actual */
export const pinNotification = (id) =>
  api.patch(`${BASE}/${id}/pin`, {});

/** Descarta permanentemente una notificación para el usuario actual */
export const dismissNotifApi = (id) =>
  api.patch(`${BASE}/${id}/dismiss`, {});
