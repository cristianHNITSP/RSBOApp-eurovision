const hostname = window.location.hostname;

export const API_URLS = {
  websocket: import.meta.env.MODE === 'production'
    ? 'wss://tu-dominio-produccion.com/ws'
    : `ws://${hostname}:3000/ws`,

  healthApi: import.meta.env.MODE === 'production'
    ? 'https://tu-dominio-produccion.com/api/health'
    : `http://${hostname}:3000/api/health`,
};
