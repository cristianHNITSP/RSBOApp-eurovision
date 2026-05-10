const { NAV, navOf } = require("../../navigation");
const { titleField, showOnly } = require("../../shared/propertyVisibility");
const { readOnlyActions } = require("../../shared/readOnlyResource");

const build = (MermaLog) => ({
  resource: MermaLog,
  options: {
    navigation: navOf(NAV.LOG, "AlertTriangle"),
    ...readOnlyActions,
    properties: {
      folio:  titleField(),
      params: showOnly(),
    },
  },
});

module.exports = { build };
