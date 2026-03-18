// src/services/security.js
import api from '@/api/axios';

/** Lista las sesiones activas del usuario actual */
export const fetchSessions = () =>
  api.get('/users/me/sessions');

/** Revoca una sesión específica por su ID */
export const revokeSession = (sessionId) =>
  api.delete(`/users/me/sessions/${sessionId}`);

/** Revoca todas las sesiones excepto la actual */
export const revokeOtherSessions = () =>
  api.delete('/users/me/sessions/others');

/**
 * Cambia la contraseña propia.
 * El backend invalida TODAS las sesiones tras el cambio.
 * @param {{ currentPassword: string, newPassword: string }} payload
 */
export const changePassword = (payload) =>
  api.patch('/users/me/password', payload);
