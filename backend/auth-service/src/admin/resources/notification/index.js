const { build: buildNotification } = require("./notification.resource");

const buildNotificationResources = (models) => {
  if (!models) return [];
  return [buildNotification(models.Notification)];
};

module.exports = { buildNotificationResources };
