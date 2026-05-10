const { NAV, navOf } = require("../../navigation");
const { titleField, fullyEditable, showOnly } = require("../../shared/propertyVisibility");

const build = (LaboratoryOrder) => ({
  resource: LaboratoryOrder,
  options: {
    navigation: navOf(NAV.LABORATORY, "Activity"),
    properties: {
      folio:  titleField(),
      status: fullyEditable(),
      lines:  showOnly(),
      closeSnapshot: showOnly(),
    },
  },
});

module.exports = { build };
