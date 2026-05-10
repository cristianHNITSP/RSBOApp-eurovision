const { NAV, navOf } = require("../../navigation");
const { titleField } = require("../../shared/propertyVisibility");

const build = (CatalogTreatment) => ({
  resource: CatalogTreatment,
  options: {
    navigation: navOf(NAV.CATALOG, "Tag"),
    properties: { key: titleField() },
  },
});

module.exports = { build };
