const { NAV, navOf } = require("../../navigation");
const { titleField } = require("../../shared/propertyVisibility");
const { readOnlyActions } = require("../../shared/readOnlyResource");

const build = (Sequence) => ({
  resource: Sequence,
  options: {
    navigation: navOf(NAV.LOG, "Hash"),
    ...readOnlyActions,
    properties: { name: titleField() },
  },
});

module.exports = { build };
