const { NAV, navOf } = require("../../navigation");
const { titleField, listFilterShow } = require("../../shared/propertyVisibility");

const build = (Estuche) => ({
  resource: Estuche,
  options: {
    navigation: navOf(NAV.OPTICA, "Briefcase"),
    properties: {
      sku: titleField(),
      isDeleted: listFilterShow(),
    },
  },
});

module.exports = { build };
