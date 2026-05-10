const { NAV, navOf } = require("../../navigation");
const { buildBackOrderResource } = require("./_buildBackOrderResource");

const build = (model) => buildBackOrderResource(model, navOf(NAV.BACKORDER, "Eye"));

module.exports = { build };
