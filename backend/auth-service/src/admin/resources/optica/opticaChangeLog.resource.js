const { NAV, navOf } = require("../../navigation");
const { showOnly } = require("../../shared/propertyVisibility");
const { readOnlyActions } = require("../../shared/readOnlyResource");

const build = (OpticaChangeLog) => ({
  resource: OpticaChangeLog,
  options: {
    navigation: navOf(NAV.LOG, "FileText"),
    ...readOnlyActions,
    properties: { details: showOnly() },
  },
});

module.exports = { build };
