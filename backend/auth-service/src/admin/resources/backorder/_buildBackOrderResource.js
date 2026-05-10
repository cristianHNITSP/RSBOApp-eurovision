/**
 * Factory para los tres recursos de back order.
 * Comparten estructura: folio como título, status editable, objetos anidados show-only.
 */
const { titleField, fullyEditable, showOnly } = require("../../shared/propertyVisibility");

const buildBackOrderResource = (model, navigation) => ({
  resource: model,
  options: {
    navigation,
    properties: {
      folio:          { ...titleField(), isVisible: { list: true, filter: true, show: true, edit: false } },
      status:         fullyEditable(),
      "cliente.nombre":   { isVisible: { list: true, filter: true, show: true, edit: true } },
      "cliente.telefono": { isVisible: { list: false, filter: false, show: true, edit: true } },
      "proveedor.nombre": { isVisible: { list: true, filter: true, show: true, edit: true } },
      precioEstimado: { isVisible: { list: true, filter: true, show: true, edit: true } },
      precioFinal:    { isVisible: { list: true, filter: true, show: true, edit: true } },
      totalPagado:    { isVisible: { list: true, filter: true, show: true, edit: false } },
      saldoPendiente: { isVisible: { list: true, filter: true, show: true, edit: false } },
      pagos:          showOnly(),
      eventos:        showOnly(),
      createdAt:      { isVisible: { list: true, filter: true, show: true, edit: false } },
    },
  },
});

module.exports = { buildBackOrderResource };
