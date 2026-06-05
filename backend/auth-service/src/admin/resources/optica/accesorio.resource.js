const { NAV, navOf } = require("../../navigation");
const { titleField, listFilterShow } = require("../../shared/propertyVisibility");

const build = (Accesorio) => ({
  resource: Accesorio,
  options: {
    navigation: navOf(NAV.OPTICA, "Tool"),
    properties: {
      sku: { ...titleField(), isVisible: { list: true, filter: true, show: true, edit: false } },
      isDeleted: listFilterShow(),
    },
  },
});

module.exports = { build };
