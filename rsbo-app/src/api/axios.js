// src/api/api.js
import axios from "axios";

// En dev con Vite proxy: VITE_API_URL="/api"
// En prod: puedes setear https://tu-dominio.com/api (si aplica)
const API_URL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: API_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 15000),
  withCredentials: true, // ✅ cookies
});

// -------------------------
// Normalización de errores
// -------------------------
// src/api/api.js
export function normalizeApiError(err) {
  // Caso 1: respuesta HTTP del servidor
  if (err?.response) {
    const status = err.response.status;
    const data = err.response.data;

    // Backend manda { error: "..."}
    if (data && typeof data === "object" && data.error) {
      return { status, error: data.error };
    }

    // Backend manda texto
    if (typeof data === "string" && data.trim()) {
      return { status, error: data };
    }

    // Backend no manda body → MENSAJE HUMANO
    return {
      status,
      error: defaultMessageByStatus(status),
    };
  }

  // Caso 2: no hubo respuesta (timeout / red)
  if (err?.request) {
    return {
      status: 0,
      error: "No se pudo conectar con el servidor",
    };
  }

  // Caso 3: error interno JS
  return {
    status: 0,
    error: err?.message || "Ocurrió un error inesperado",
  };
}

function defaultMessageByStatus(status) {
  switch (status) {
    case 400:
      return "La solicitud no es válida";
    case 401:
      return "Tu sesión expiró, inicia sesión nuevamente";
    case 403:
      return "No tienes permisos para realizar esta acción";
    case 404:
      return "El recurso solicitado no existe";
    case 409:
      return "No se pudo completar la acción por un conflicto";
    case 422:
      return "Los datos enviados no son válidos";
    case 429:
      return "Demasiadas solicitudes. Espera un momento e intenta de nuevo";
    case 500:
      return "Ocurrió un error en el servidor";
    case 502:
    case 503:
      return "El servicio no está disponible temporalmente";
    default:
      return "No se pudo completar la operación";
  }
}


// -------------------------
// Request-Id (diagnóstico) + CSRF token
// -------------------------
function genReqId() {
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** Lee el valor de una cookie por nombre */
function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers["X-Request-Id"] = config.headers["X-Request-Id"] || genReqId();

  // Adjuntar CSRF token en requests mutantes (POST/PUT/PATCH/DELETE)
  const method = (config.method || "get").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = getCookie("csrf_token");
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }

  return config;
});

// Log en dev + manejo global de 401
let _redirecting401 = false;

api.interceptors.response.use(
  (res) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(
        `[HTTP] <- ${res.config.method?.toUpperCase()} ${res.config.url} | ${res.status} | reqId=${res.config.headers?.["X-Request-Id"]}`
      );
    }
    return res;
  },
  async (err) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        `[HTTP] !! ${err.config?.method?.toUpperCase()} ${err.config?.url} | status=${err.response?.status ?? "NO_RESP"} | reqId=${err.config?.headers?.["X-Request-Id"]}`
      );
    }

    const status = err?.response?.status;
    const url    = err?.config?.url || "";

    // Redirigir al landing si la sesión expiró, excepto en rutas de auth
    if (
      status === 401 &&
      !_redirecting401 &&
      !/^\/(access|auth)/.test(url) &&
      window.location.pathname !== "/"
    ) {
      _redirecting401 = true;
      // Notificar al router para invalidar el caché
      window.dispatchEvent(new CustomEvent("auth:session-expired"));

      try { await api.post("/access/logout", {}); } catch { /* best-effort */ }
      window.location.href = "/";
    }

    return Promise.reject(err);
  }
);

// -------------------------
// Dedupe de requests iguales
// -------------------------
const pendingRequests = new Map();

function stableStringify(obj) {
  if (!obj) return "";
  try {
    return JSON.stringify(obj, Object.keys(obj).sort());
  } catch {
    return String(obj);
  }
}

function makeKey(config) {
  const method = (config.method || "get").toLowerCase();
  const url = config.url || "";
  const params = stableStringify(config.params);
  const data = stableStringify(config.data);
  return `${method}::${url}::p=${params}::d=${data}`;
}

/**
 * Envía la solicitud solo si no hay una idéntica en curso
 * @param {object} config - Configuración Axios
 */
export async function sendRequest(config) {
  const key = makeKey(config);

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const request = api(config).finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, request);
  return request;
}

export default api;
