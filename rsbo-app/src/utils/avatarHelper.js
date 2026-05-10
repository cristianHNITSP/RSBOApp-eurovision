/**
 * @fileoverview Utilidad para gestionar avatares por defecto.
 * Proporciona una imagen consistente para todo el sistema.
 */

// Avatar por defecto (SVG en Base64 con gradiente profesional)
const SHARED_FALLBACK = "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#7957d5"/><stop offset="1" stop-color="#9a6dff"/></linearGradient></defs>
    <rect width="96" height="96" rx="48" fill="url(#g)"/>
    <circle cx="48" cy="40" r="16" fill="rgba(255,255,255,.9)"/>
    <path d="M18 86c7-17 20-24 30-24s23 7 30 24" fill="rgba(255,255,255,.9)"/>
  </svg>`);

export const AVATAR_DEFAULTS = {
  DASHBOARD: SHARED_FALLBACK,
  SIDEBAR:   SHARED_FALLBACK,
  PROFILE:   SHARED_FALLBACK,
  FALLBACK:  SHARED_FALLBACK
};

/**
 * Obtiene el avatar a mostrar.
 * @param {string} userAvatar - El avatar del usuario.
 * @param {string} type - El tipo de vista (opcional).
 * @returns {string} La URL del avatar final.
 */
export const getAvatar = (userAvatar, type = 'PROFILE') => {
  if (userAvatar && typeof userAvatar === 'string' && userAvatar.trim()) {
    return userAvatar.trim();
  }
  return AVATAR_DEFAULTS[type] || AVATAR_DEFAULTS.FALLBACK;
};
