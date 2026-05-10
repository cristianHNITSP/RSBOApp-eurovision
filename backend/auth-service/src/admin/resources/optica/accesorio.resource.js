const { NAV, navOf } = require("../../navigation");
const { titleField, listFilterShow } = require("../../shared/propertyVisibility");

const build = (Accesorio) => ({
  resource: Accesorio,
  options: {
    navigation: navOf(NAV.OPTICA, "Tool"),
    properties: {
      sku: titleField(),
      isDeleted: listFilterShow(),
    },
  },
});

module.exports = { build };
