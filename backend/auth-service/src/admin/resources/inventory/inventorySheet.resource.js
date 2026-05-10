const { NAV, navOf } = require("../../navigation");
const { titleField, fullyEditable, showOnly } = require("../../shared/propertyVisibility");
const { autoGenerateHook } = require("../../shared/skuGenerator");

const build = (InventorySheet) => ({
  resource: InventorySheet,
  options: {
    navigation: navOf(NAV.INVENTORY, "Package"),
    properties: {
      nombre:    titleField(),
      sku:       { isVisible: { list: true, filter: true, show: true, edit: false } },
      "proveedor.name": { isVisible: { list: true, filter: true, show: true, edit: true } },
      "marca.name":     { isVisible: { list: true, filter: true, show: true, edit: true } },
      tipo_matriz:      { isVisible: { list: true, filter: true, show: true, edit: true } },
      material:         { isVisible: { list: true, filter: true, show: true, edit: true } },
      precioVenta:      { isVisible: { list: true, filter: true, show: true, edit: true } },
      precioCompra:     { isVisible: { list: true, filter: true, show: true, edit: true } },
      numFactura:       { isVisible: { list: false, filter: true, show: true, edit: true } },
      fechaCompra:      { isVisible: { list: false, filter: true, show: true, edit: true } },
      fechaCaducidad:   { isVisible: { list: true, filter: true, show: true, edit: true } },
      isDeleted:        { isVisible: { list: true, filter: true, show: true, edit: false } },
      deletedAt:        showOnly(),
    },
    actions: {
      new: { before: autoGenerateHook("INV", "sku") },
      edit: { before: autoGenerateHook("INV", "sku") },
    },
  },
});

module.exports = { build };
