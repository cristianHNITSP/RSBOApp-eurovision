/**
 * @fileoverview Validadores de preferencias de workspace.
 * @module validators/preferences.validators
 */
const { body, query, runValidation } = require("./_helpers");

// Slug acotado en vez de enum estricto: cierra inyección/abuso sin romper
// contextos nuevos legítimos del frontend.
const CONTEXT_RX = /^[a-z0-9_-]{1,40}$/i;
const VIEW_STATE_MAX_BYTES = 64 * 1024; // 64 KB
const ARRAY_MAX = 200;

const contextBody = (loc = body) =>
  loc("context").optional({ nullable: true }).isString().matches(CONTEXT_RX).withMessage("context inválido");

const boundedArray = (field) =>
  body(field).optional({ nullable: true }).isArray({ max: ARRAY_MAX })
    .withMessage(`${field} debe ser un arreglo (máx ${ARRAY_MAX})`);

const viewStateSize = body("view_state").custom((v) => {
  if (v == null) return true;
  if (typeof v !== "object") throw new Error("view_state debe ser un objeto");
  if (Buffer.byteLength(JSON.stringify(v), "utf8") > VIEW_STATE_MAX_BYTES) {
    throw new Error(`view_state excede el máximo (${VIEW_STATE_MAX_BYTES} bytes)`);
  }
  return true;
});

module.exports = {
  getPrefs: [contextBody(query), runValidation],
  putPinned: [contextBody(), boundedArray("pinned_templates"), runValidation],
  patchRecent: [contextBody(), body("template.id").exists().withMessage("template.id requerido"), runValidation],
  patchActiveTab: [contextBody(), body("tabId").exists().withMessage("tabId requerido").bail().isString().isLength({ max: 200 }), runValidation],
  patchViewState: [contextBody(), viewStateSize, runValidation],
  patchCatalogSection: [contextBody(), runValidation],
  postOpenTabs: [contextBody(), body("tab.id").exists().withMessage("tab.id requerido"), runValidation],
};
