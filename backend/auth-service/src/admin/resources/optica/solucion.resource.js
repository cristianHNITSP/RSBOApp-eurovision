const { NAV, navOf } = require("../../navigation");
const { titleField, listFilterShow } = require("../../shared/propertyVisibility");

const build = (Solucion) => ({
  resource: Solucion,
  options: {
    navigation: navOf(NAV.OPTICA, "Droplet"),
    properties: {
      sku: { ...titleField(), isVisible: { list: true, filter: true, show: true, edit: false } },
      isDeleted: listFilterShow(),
    },
  },
});

module.exports = { build };
