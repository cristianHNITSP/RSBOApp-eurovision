const DEFAULT_API_URL = `http://${window.location.hostname}:3000/api`;
const DEFAULT_WS_URL = `ws://${window.location.hostname}:3000/ws`;

export const API_URLS = {
  websocket: import.meta.env.VITE_WS_URL || DEFAULT_WS_URL,
  healthApi: `${import.meta.env.VITE_API_URL || DEFAULT_API_URL}/health`,
};
