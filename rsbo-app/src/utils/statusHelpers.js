// src/utils/statusHelpers.js
// Helpers de estado de pedidos/órdenes compartidos entre composables.

const STATUS_HUMAN = {
  pendiente: "Pendiente",
  parcial:   "En proceso",
  cerrado:   "Surtido completo",
  cancelado: "Cancelado"
};

const STATUS_CLASS = {
  pendiente: "is-warning",
  parcial:   "is-info",
  cerrado:   "is-success",
  cancelado: "is-danger"
};

export const labStatusHuman   = (s) => STATUS_HUMAN[s] || s || "—";
export const labStatusClass   = (s) => STATUS_CLASS[s] || "is-light";

// Alias usados en useLaboratorioApi (etiquetas ligeramente distintas)
export const statusHuman    = (s) => ({ pendiente: "Pendiente", parcial: "Parcial", cerrado: "Cerrado", cancelado: "Cancelado" }[s] || s);
export const statusTagClass = labStatusClass;
