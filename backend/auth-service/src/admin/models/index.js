/**
 * Registro de modelos Mongoose en sus respectivas conexiones.
 */
const { registerAuthModels }         = require("./auth.models");
const { registerInventoryModels }    = require("./inventory.models");
const { registerNotificationModels } = require("./notification.models");
const { registerOpticaModels }       = require("./optica.models");

const registerAllModels = (conns) => ({
  auth:         registerAuthModels(conns.auth),
  inventory:    registerInventoryModels(conns.inventory),
  notification: registerNotificationModels(conns.notification),
  optica:       registerOpticaModels(conns.optica),
});

module.exports = { registerAllModels };
