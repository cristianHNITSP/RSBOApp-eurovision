// src/inventory/utils/normalize.js
const { isDef } = require("./numbers");

const sanitizeString = (s) => {
  if (typeof s !== "string") return s;
  return s
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "") // Eliminar bloques <script>...</script>
    .replace(/<[^>]*>?/gm, "") // Eliminar el resto de etiquetas HTML
    .replace(/[\x00-\x1F\x7F]/g, "") // Eliminar caracteres de control
    .trim();
};


const actorFromBody = (req) => {
  const a = req?.body?.actor;
  if (a && typeof a === "object") {
    return {
      userId: isDef(a.userId) ? sanitizeString(String(a.userId)) : isDef(a.id) ? sanitizeString(String(a.id)) : isDef(a._id) ? sanitizeString(String(a._id)) : null,
      name: isDef(a.name) ? sanitizeString(String(a.name)) : isDef(a.email) ? sanitizeString(String(a.email)) : null,
    };
  }

  // Fallback: extraer del usuario autenticado (req.user inyectado por protect())
  const u = req?.user;
  if (u && typeof u === "object") {
    return {
      userId: isDef(u.userId) ? sanitizeString(String(u.userId)) : isDef(u.id) ? sanitizeString(String(u.id)) : isDef(u._id) ? sanitizeString(String(u._id)) : null,
      name: isDef(u.name) ? sanitizeString(String(u.name)) : isDef(u.email) ? sanitizeString(String(u.email)) : null,
    };
  }

  return null;
};

// ✅ Normalizador proveedor/marca
const normalizeParty = (raw) => {
  if (!raw) return { id: null, name: "" };

  if (typeof raw === "string") {
    const name = raw.trim();
    return { id: null, name };
  }

  if (typeof raw === "object") {
    const id =
      isDef(raw.id) && String(raw.id).trim() ? String(raw.id).trim() : null;
    const name = isDef(raw.name) ? String(raw.name).trim() : "";
    return { id, name };
  }

  return { id: null, name: "" };
};

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { actorFromBody, normalizeParty, escapeRegExp, sanitizeString };
