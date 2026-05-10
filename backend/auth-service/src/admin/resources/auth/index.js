const { build: buildUser } = require("./user.resource");
const { build: buildRole } = require("./role.resource");
const { build: buildUWP }  = require("./userWorkspacePreferences.resource");

const buildAuthResources = (models) => {
  if (!models) return [];
  return [
    buildUser(models.User),
    buildRole(models.Role),
    buildUWP(models.UserWorkspacePreferences),
  ];
};

module.exports = { buildAuthResources };
