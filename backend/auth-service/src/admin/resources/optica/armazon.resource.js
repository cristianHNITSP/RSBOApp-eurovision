const { NAV, navOf } = require("../../navigation");
const { titleField, listFilterShow } = require("../../shared/propertyVisibility");

// El SKU se auto-genera de forma inmutable en el modelo (hook pre-validate),
// por eso es de solo lectura y no hay hook de generación aquí.
const build = (Armazon) => ({
  resource: Armazon,
  options: {
    navigation: navOf(NAV.OPTICA, "Glasses"),
    properties: {
      sku: { ...titleField(), isVisible: { list: true, filter: true, show: true, edit: false } },
      marca: { isVisible: { list: true, filter: true, show: true, edit: true } },
      modelo: { isVisible: { list: true, filter: true, show: true, edit: true } },
      material: { isVisible: { list: true, filter: true, show: true, edit: true } },
      genero: { isVisible: { list: true, filter: true, show: true, edit: true } },
      precio: { isVisible: { list: true, filter: true, show: true, edit: true } },
      stock: { isVisible: { list: true, filter: true, show: true, edit: true } },
      isDeleted: { ...listFilterShow(), isVisible: { list: true, filter: true, show: true, edit: false } },
    },
  },
});

module.exports = { build };
