const { NAV, navOf } = require("../../navigation");
const { titleField, listFilterShow } = require("../../shared/propertyVisibility");

const build = (Estuche) => ({
  resource: Estuche,
  options: {
    navigation: navOf(NAV.OPTICA, "Briefcase"),
    properties: {
      sku: { ...titleField(), isVisible: { list: true, filter: true, show: true, edit: false } },
      isDeleted: listFilterShow(),
    },
  },
});

module.exports = { build };
