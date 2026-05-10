const { NAV, navOf } = require("../../navigation");
const { buildBackOrderResource } = require("./_buildBackOrderResource");

const build = (model) => buildBackOrderResource(model, navOf(NAV.BACKORDER, "Glasses"));

module.exports = { build };
