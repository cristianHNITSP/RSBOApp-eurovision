const { NAV, navOf } = require("../../navigation");
const { titleField, showOnly } = require("../../shared/propertyVisibility");
const { readOnlyActions } = require("../../shared/readOnlyResource");

const build = (CashClosure) => ({
  resource: CashClosure,
  options: {
    navigation: navOf(NAV.INVENTORY, "DollarSign"),
    ...readOnlyActions,
    properties: {
      folio: titleField(),
      sales: showOnly(),
      merma: showOnly(),
    },
  },
});

module.exports = { build };
