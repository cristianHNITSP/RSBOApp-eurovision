/**
 * Acciones desactivadas para recursos read-only (logs, auditorías, secuencias, matrices).
 * Aplicar con spread: `{ ...readOnlyActions, properties: {...} }`.
 */
const readOnlyActions = {
  actions: {
    new:    { isAccessible: false },
    edit:   { isAccessible: false },
    delete: { isAccessible: false },
  },
};

module.exports = { readOnlyActions };
