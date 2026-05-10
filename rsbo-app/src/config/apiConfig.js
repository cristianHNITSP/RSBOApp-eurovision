/**
 * @fileoverview Configuración centralizada del API para el Frontend.
 * Implementa un patrón Fail-Fast: si faltan las variables de entorno, la app lanza un error.
 */

const getEnv = (key) => {
  const value = import.meta.env[key];
  if (!value) {
    const errorMsg = `[FRONTEND FATAL ERROR] Missing environment variable: ${key}`;
    console.error(`%c${errorMsg}`, "color: white; background: red; font-size: 20px; padding: 10px;");
    throw new Error(errorMsg);
  }
  return value;
};

const API_BASE = getEnv("VITE_API_URL");
const WS_BASE = getEnv("VITE_WS_URL");

export const API_URLS = {
  base: API_BASE,
  websocket: WS_BASE,
  healthApi: `${API_BASE}/health`,
};

console.log("✅ Frontend API Configuration Loaded:", API_URLS);
