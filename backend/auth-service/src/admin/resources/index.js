/**
 * Concatena los resources de todos los servicios en un único array
 * apto para `new AdminJS({ resources: [...] })`.
 *
 * Si una conexión falla (URI faltante), su grupo de modelos es null y
 * el builder devuelve [] — no rompe el panel.
 */
const { buildAuthResources }         = require("./auth");
const { buildInventoryResources }    = require("./inventory");
const { buildNotificationResources } = require("./notification");
const { buildBackorderResources }    = require("./backorder");
const { buildOpticaResources }       = require("./optica");

const buildAllResources = (models) => [
  ...buildAuthResources(models.auth),
  ...buildInventoryResources(models.inventory),
  ...buildNotificationResources(models.notification),
  ...buildBackorderResources(models.backorder),
  ...buildOpticaResources(models.optica),
];

module.exports = { buildAllResources };
