const { NAV, navOf } = require("../../navigation");
const { titleField, listFilterShow } = require("../../shared/propertyVisibility");

const build = (Solucion) => ({
  resource: Solucion,
  options: {
    navigation: navOf(NAV.OPTICA, "Droplet"),
    properties: {
      sku: titleField(),
      isDeleted: listFilterShow(),
    },
  },
});

module.exports = { build };
