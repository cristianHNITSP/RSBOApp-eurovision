const { NAV, navOf } = require("../../navigation");
const { titleField, fullyEditable } = require("../../shared/propertyVisibility");

const build = (ContactLensesSheet) => ({
  resource: ContactLensesSheet,
  options: {
    navigation: navOf(NAV.INVENTORY, "Eye"),
    properties: {
      nombre:    titleField(),
      isDeleted: fullyEditable(),
    },
  },
});

module.exports = { build };
