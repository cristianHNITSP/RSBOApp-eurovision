const { NAV, navOf } = require("../../navigation");
const { showOnly } = require("../../shared/propertyVisibility");
const { readOnlyActions } = require("../../shared/readOnlyResource");

const build = (UWP) => ({
  resource: UWP,
  options: {
    navigation: navOf(NAV.AUTH, "Settings"),
    ...readOnlyActions,
    properties: {
      pinned_templates: showOnly(),
      open_tabs:        showOnly(),
      recent_templates: showOnly(),
    },
  },
});

module.exports = { build };
