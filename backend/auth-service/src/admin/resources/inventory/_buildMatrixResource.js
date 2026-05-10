/**
 * Factory para recursos de matriz.
 * Todas las matrices comparten configuración: readOnly + cells visible solo en show.
 * El sidebar group y el icon se inyectan.
 */
const { showOnly } = require("../../shared/propertyVisibility");
const { readOnlyActions } = require("../../shared/readOnlyResource");

const buildMatrixResource = (model, navigation) => ({
  resource: model,
  options: {
    navigation,
    ...readOnlyActions,
    properties: { cells: showOnly() },
  },
});

module.exports = { buildMatrixResource };
