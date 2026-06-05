const { NAV, navOf } = require("../../navigation");
const { titleField, listFilterShow } = require("../../shared/propertyVisibility");

const build = (LenteContacto) => ({
  resource: LenteContacto,
  options: {
    navigation: navOf(NAV.OPTICA, "Eye"),
    properties: {
      sku: { ...titleField(), isVisible: { list: true, filter: true, show: true, edit: false } },
      isDeleted: listFilterShow(),
    },
  },
});

module.exports = { build };
