const { NAV, navOf } = require("../../navigation");
const { titleField, listFilterShow } = require("../../shared/propertyVisibility");

const build = (LenteContacto) => ({
  resource: LenteContacto,
  options: {
    navigation: navOf(NAV.OPTICA, "Eye"),
    properties: {
      sku: titleField(),
      isDeleted: listFilterShow(),
    },
  },
});

module.exports = { build };
