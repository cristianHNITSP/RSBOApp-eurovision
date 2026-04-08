// src/utils/errorSanitizer.js
// Sanitización y normalización de errores para mostrar mensajes seguros al usuario.

const stripHtml = (s) => String(s ?? "").replace(/<[^>]*>/g, "");
const collapseWs = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

const looksLikeStackTrace = (s) => {
  const t = String(s ?? "");
  return (
    /(\bat\s+.+\([^)]+\)\b)/.test(t) ||
    /([A-Za-z]:\\|\/).+\.(js|ts|jsx|tsx|json|yml|yaml):\d+:\d+/.test(t) ||
    /\b(node:internal|webpack|vite|chunk)\b/i.test(t)
  );
};

const containsSensitive = (s) => {
  const t = String(s ?? "");
  if (!t) return false;
  return [
    /\bAuthorization:\s*Bearer\s+[A-Za-z0-9\-_\.]+\b/i,
    /\bBearer\s+[A-Za-z0-9\-_\.]+\b/i,
    /\beyJ[A-Za-z0-9\-_]+?\.[A-Za-z0-9\-_]+?\.[A-Za-z0-9\-_]+\b/,
    /\bmongodb(\+srv)?:\/\/[^\s]+/i,
    /\/\/[^/\s:]+:[^@\s]+@/i,
    /\b(api[_-]?key|token|secret|password|passwd|pwd)\b\s*[:=]\s*["']?[^"'\s]+/i,
    /\bPRIVATE KEY\b|\bBEGIN (RSA|EC|OPENSSH) PRIVATE KEY\b/i,
    /\bAKIA[0-9A-Z]{16}\b/
  ].some((re) => re.test(t));
};

export const sanitizeUserText = (raw, { maxLen = 160 } = {}) => {
  if (raw == null) return "";
  let s = collapseWs(stripHtml(raw));
  if (!s) return "";
  if (containsSensitive(s) || looksLikeStackTrace(s)) return "";
  if (s.length > maxLen) s = s.slice(0, maxLen - 1).trimEnd() + "…";
  return s;
};

const guessCategory = (status, rawMsg) => {
  const msg = String(rawMsg ?? "").toLowerCase();
  if (msg.includes("network error") || msg.includes("failed to fetch") || msg.includes("econnrefused") || msg.includes("timeout") || msg.includes("etimedout"))
    return "network";
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 400 || status === 422) return "validation";
  if (status === 404) return "notfound";
  if (status === 409) return "conflict";
  if (status === 429) return "ratelimit";
  if (msg.includes("e11000") || msg.includes("duplicate key")) return "conflict";
  if (msg.includes("casterror") || msg.includes("validationerror")) return "validation";
  if (typeof status === "number" && status >= 500) return "server";
  return "generic";
};

const categoryToPublicMessage = (category) => ({
  network:    "No se pudo conectar con el servidor. Revisa tu red o intenta de nuevo.",
  auth:       "Tu sesión expiró. Vuelve a iniciar sesión.",
  forbidden:  "No tienes permisos para realizar esta acción.",
  validation: "Hay datos inválidos o fuera de rango. Revisa los valores e intenta de nuevo.",
  notfound:   "No se encontró el recurso solicitado.",
  conflict:   "Conflicto: ese registro o valor ya existe o está en uso.",
  ratelimit:  "Demasiadas solicitudes. Intenta nuevamente en unos segundos.",
  server:     "Error interno del servidor. Intenta más tarde.",
  generic:    "Ocurrió un error al procesar la operación. Intenta de nuevo."
}[category] || "Ocurrió un error al procesar la operación. Intenta de nuevo.");

export const normalizeAck = (ack, { successFallback = "Listo.", errorFallback = "Ocurrió un error." } = {}) => {
  if (!ack) return null;
  if (typeof ack === "string") {
    const safe = sanitizeUserText(ack);
    return { ok: false, status: null, message: safe || errorFallback, _raw: ack };
  }
  if (ack instanceof Error) {
    const status = ack?.response?.status ?? ack?.status ?? null;
    const rawMsg = ack?.response?.data?.message ?? ack?.message ?? String(ack);
    const safeMsg = sanitizeUserText(rawMsg);
    return {
      ok: false,
      status,
      message: safeMsg || categoryToPublicMessage(guessCategory(status, rawMsg)),
      _raw: rawMsg
    };
  }
  const status = ack?.status ?? ack?.statusCode ?? ack?.response?.status ?? ack?.response?.statusCode ?? null;
  const ok = ack?.ok === true ? true : ack?.ok === false ? false : typeof status === "number" ? status < 400 : null;
  const rawMsg = ack?.message ?? ack?.response?.data?.message ?? ack?.response?.data?.error ?? ack?.error ?? "";
  if (ok === true) {
    const safe = sanitizeUserText(rawMsg);
    return { ok: true, status, message: safe || successFallback, _raw: rawMsg };
  }
  const safe = sanitizeUserText(rawMsg);
  return {
    ok: ok === null ? false : ok,
    status,
    message: safe || categoryToPublicMessage(guessCategory(status, rawMsg)) || errorFallback,
    _raw: rawMsg
  };
};
