const { NAV, navOf } = require("../../navigation");
const { titleField, showOnly } = require("../../shared/propertyVisibility");

const build = (Devolution) => ({
  resource: Devolution,
  options: {
    navigation: navOf(NAV.INVENTORY, "RotateCcw"),
    properties: {
      folio: titleField(),
      items: showOnly(),
    },
  },
});

module.exports = { build };
