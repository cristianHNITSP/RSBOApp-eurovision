const { NAV, navOf } = require("../../navigation");
const { readOnlyActions } = require("../../shared/readOnlyResource");

const build = (InventoryChangeLog) => ({
  resource: InventoryChangeLog,
  options: {
    navigation: navOf(NAV.LOG),
    ...readOnlyActions,
  },
});

module.exports = { build };
