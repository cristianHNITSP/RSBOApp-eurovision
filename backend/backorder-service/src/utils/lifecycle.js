/**
 * Máquina de estados para ciclo de vida de back orders
 * Estados: SOLICITADO → PEDIDO_PROVEEDOR → RECIBIDO → LISTO_ENTREGA → ENTREGADO
 * Desde cualquier estado (excepto terminal) → CANCELADO
 */

const TRANSITIONS = {
  SOLICITADO:        ["PEDIDO_PROVEEDOR", "CANCELADO"],
  PEDIDO_PROVEEDOR:  ["RECIBIDO", "CANCELADO"],
  RECIBIDO:          ["LISTO_ENTREGA", "CANCELADO"],
  LISTO_ENTREGA:     ["ENTREGADO", "CANCELADO"],
  ENTREGADO:         [], // terminal
  CANCELADO:         [], // terminal
};

const STATUS_VALUES = Object.keys(TRANSITIONS);

/**
 * Verifica si una transición es válida
 * @param {string} from - Estado actual
 * @param {string} to - Estado destino
 * @returns {boolean}
 */
function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) || false;
}

/**
 * Obtiene los siguientes estados válidos desde un estado dado
 * @param {string} from - Estado actual
 * @returns {string[]}
 */
function nextStates(from) {
  return TRANSITIONS[from] || [];
}

/**
 * Error de transición inválida
 */
class StateError extends Error {
  constructor(from, to) {
    super(`Transición inválida: ${from} → ${to}`);
    this.code = "INVALID_TRANSITION";
    this.status = 409;
  }
}

module.exports = { TRANSITIONS, STATUS_VALUES, canTransition, nextStates, StateError };
