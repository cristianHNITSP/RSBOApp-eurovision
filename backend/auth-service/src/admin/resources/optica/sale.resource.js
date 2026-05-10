const { NAV, navOf } = require("../../navigation");
const { titleField, showOnly } = require("../../shared/propertyVisibility");
const { autoGenerateHook } = require("../../shared/skuGenerator");

const build = (Sale) => ({
  resource: Sale,
  options: {
    navigation: navOf(NAV.OPTICA, "ShoppingCart"),
    properties: {
      folio: { ...titleField(), isVisible: { list: true, filter: true, show: true, edit: false } },
      cliente: { isVisible: { list: true, filter: true, show: true, edit: true } },
      clientePhone: { isVisible: { list: false, filter: false, show: true, edit: true } },
      total: { isVisible: { list: true, filter: true, show: true, edit: false } },
      pago: { isVisible: { list: true, filter: true, show: true, edit: true } },
      items: { isVisible: { list: false, filter: false, show: true, edit: false } },
      actor: { isVisible: { list: true, filter: true, show: true, edit: false } },
      createdAt: { isVisible: { list: true, filter: true, show: true, edit: false } },
    },
    actions: {
      new: { before: autoGenerateHook("VEN", "folio") },
    },
  },
});

module.exports = { build };
