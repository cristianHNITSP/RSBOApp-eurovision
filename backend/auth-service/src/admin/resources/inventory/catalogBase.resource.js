const { NAV, navOf } = require("../../navigation");
const { titleField } = require("../../shared/propertyVisibility");

const build = (CatalogBase) => ({
  resource: CatalogBase,
  options: {
    navigation: navOf(NAV.CATALOG, "Book"),
    properties: { key: titleField() },
  },
});

module.exports = { build };
