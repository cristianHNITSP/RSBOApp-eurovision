const { NAV, navOf } = require("../../navigation");
const { titleField, showOnly } = require("../../shared/propertyVisibility");

const build = (Notification) => ({
  resource: Notification,
  options: {
    navigation: navOf(NAV.NOTIFICATION),
    properties: {
      title:       titleField(),
      message:     { isVisible: { list: true, filter: true, show: true, edit: true } },
      type:        { isVisible: { list: true, filter: true, show: true, edit: true } },
      priority:    { isVisible: { list: true, filter: true, show: true, edit: true } },
      targetRoles: { isVisible: { list: true, filter: true, show: true, edit: true } },
      expiresAt:   { isVisible: { list: true, filter: true, show: true, edit: true } },
      readBy:      showOnly(),
      pinnedBy:    showOnly(),
      dismissedBy: showOnly(),
    },
  },
});

module.exports = { build };
