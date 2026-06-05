const { NAV, navOf } = require("../../navigation");
const { titleField, listFilterShow } = require("../../shared/propertyVisibility");

const build = (Equipo) => ({
  resource: Equipo,
  options: {
    navigation: navOf(NAV.OPTICA, "Cpu"),
    properties: {
      sku: { ...titleField(), isVisible: { list: true, filter: true, show: true, edit: false } },
      isDeleted: listFilterShow(),
    },
  },
});

module.exports = { build };
