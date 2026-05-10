/**
 * Registry central de conexiones MongoDB usadas por AdminJS.
 * Cada conexión es independiente y opcional: si falta la URI, el grupo de
 * recursos correspondiente se omite (con warning). Esto evita que la falta
 * de una BD secundaria tumbe el panel completo.
 */
const { getAuthConnection }            = require("./auth.connection");
const { createInventoryConnection }    = require("./inventory.connection");
const { createNotificationConnection } = require("./notification.connection");
const { createBackorderConnection }    = require("./backorder.connection");
const { createOpticaConnection }       = require("./optica.connection");

const createConnections = () => ({
  auth:         getAuthConnection(),
  inventory:    createInventoryConnection(),
  notification: createNotificationConnection(),
  backorder:    createBackorderConnection(),
  optica:       createOpticaConnection(),
});

module.exports = { createConnections };
