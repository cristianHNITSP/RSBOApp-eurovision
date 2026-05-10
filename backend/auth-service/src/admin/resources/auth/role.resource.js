const { NAV, navOf } = require("../../navigation");

const build = (Role) => ({
  resource: Role,
  options: {
    navigation: navOf(NAV.AUTH, "Award"),
    properties: {
      name: { isTitle: true },
    },
    actions: { delete: { isAccessible: false } },
  },
});

module.exports = { build };
