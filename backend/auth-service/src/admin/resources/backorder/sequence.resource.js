const { NAV, navOf } = require("../../navigation");
const { titleField } = require("../../shared/propertyVisibility");
const { readOnlyActions } = require("../../shared/readOnlyResource");

const build = (BackorderSequence) => ({
  resource: BackorderSequence,
  options: {
    navigation: navOf(NAV.BACKORDER, "Hash"),
    ...readOnlyActions,
    properties: { name: titleField() },
  },
});

module.exports = { build };
