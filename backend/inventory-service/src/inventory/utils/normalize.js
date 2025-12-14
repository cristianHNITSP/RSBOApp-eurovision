// src/inventory/utils/normalize.js
const { isDef } = require("./numbers");

const actorFromBody = (req) => {
  const a = req?.body?.actor;
  return a && typeof a === "object"
    ? {
        userId: isDef(a.userId)
          ? String(a.userId)
          : isDef(a.id)
          ? String(a.id)
          : isDef(a._id)
          ? String(a._id)
          : null,
        name: isDef(a.name)
          ? String(a.name)
          : isDef(a.email)
          ? String(a.email)
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

module.exports = { actorFromBody, normalizeParty, escapeRegExp };
