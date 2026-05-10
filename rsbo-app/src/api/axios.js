// src/api/api.js
import axios from "axios";

// En dev con Vite proxy: VITE_API_URL="/api"
// En prod: puedes setear https://tu-dominio.com/api (si aplica)
import { API_URLS } from "../config/apiConfig";

export const api = axios.create({
  baseURL: API_URLS.base,
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

// Umbral en segundos: si la sesión va a expirar en < 10 min y el usuario hace
// una mutación, lanzamos una renovación silenciosa antes de continuar.
const PROACTIVE_RENEW_THRESHOLD_SECONDS = 10 * 60;

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers["X-Request-Id"] = config.headers["X-Request-Id"] || genReqId();

  const method = (config.method || "get").toUpperCase();
  const url    = config.url || "";

  // Adjuntar CSRF token en requests mutantes (POST/PUT/PATCH/DELETE)
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = getCookie("csrf_token");
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }

    // Renovación proactiva: cualquier mutación dispara refresh si la sesión
    // está cerca de expirar. No bloqueamos la request (fire-and-forget).
    if (!/^\/access\//.test(url)) {
      try {
        // import dinámico para evitar ciclo (axios ↔ useSessionWatcher)
        import("@/composables/auth/useSessionWatcher").then(({ useSessionWatcher }) => {
          const w = useSessionWatcher();
          const remaining = w.secondsRemaining.value;
          if (Number.isFinite(remaining) && remaining > 0 && remaining < PROACTIVE_RENEW_THRESHOLD_SECONDS) {
            w.refresh();
          }
        }).catch(() => { /* noop */ });
      } catch { /* noop */ }
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
// Dedupe de requests iguales + Cache TTL
// -------------------------
const pendingRequests = new Map();
const responseCache   = new Map(); // { key: { data, expiresAt } }
const CACHE_TTL_MS    = 4000;      // 4 segundos de gracia para evitar spam

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
 * Envía la solicitud con deduplicación y caché temporal
 * @param {object} config - Configuración Axios
 */
export async function sendRequest(config) {
  const method = (config.method || "get").toLowerCase();
  const key = makeKey(config);

  // 1. Si es GET y está en caché vigente, devolverlo
  if (method === "get") {
    const cached = responseCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log(`[HTTP][Cache] ${config.url} (hit)`);
      }
      return cached.promise;
    }
  }

  // 2. Si ya hay una idéntica en vuelo, devolver la promesa existente
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // 3. Lanzar la petición
  const requestPromise = api(config);
  
  // Guardar en pendientes
  pendingRequests.set(key, requestPromise);

  const finalPromise = requestPromise
    .then((res) => {
      // Si fue exitosa y es GET, guardamos en caché por unos segundos
      if (method === "get") {
        responseCache.set(key, {
          promise: Promise.resolve(res),
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }
      return res;
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  return finalPromise;
}

export { api as apiClient };
export default api;
