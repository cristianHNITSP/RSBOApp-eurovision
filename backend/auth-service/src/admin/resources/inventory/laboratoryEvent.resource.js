const { NAV, navOf } = require("../../navigation");
const { readOnlyActions } = require("../../shared/readOnlyResource");

const build = (LaboratoryEvent) => ({
  resource: LaboratoryEvent,
  options: {
    navigation: navOf(NAV.LABORATORY, "List"),
    ...readOnlyActions,
  },
});

module.exports = { build };
