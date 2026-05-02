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
  return a && typeof a === "object"
    ? {
        userId: isDef(a.userId)
          ? sanitizeString(String(a.userId))
          : isDef(a.id)
          ? sanitizeString(String(a.id))
          : isDef(a._id)
          ? sanitizeString(String(a._id))
          : null,
        name: isDef(a.name)
          ? sanitizeString(String(a.name))
          : isDef(a.email)
          ? sanitizeString(String(a.email))
          : null,
      }
    : null;
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
