const { NAV, navOf } = require("../../navigation");
const { hidden, titleField, fullyEditable, listFilterShow, listAndShow } = require("../../shared/propertyVisibility");
const { preventRootDeletionHook } = require("../../shared/softDeleteAction");

const build = (User) => ({
  resource: User,
  options: {
    navigation: navOf(NAV.AUTH, "User"),
    properties: {
      password: {
        isVisible: { list: false, filter: false, show: false, edit: true, new: true },
        type: 'password',
      },
      name:     titleField(),
      username: fullyEditable(),
      role:     fullyEditable(),
      "profile.phone":  { isVisible: { list: true, filter: true, show: true, edit: true } },
      "profile.bio":    { isVisible: { list: false, filter: false, show: true, edit: true } },
      "profile.avatar": { isVisible: { list: false, filter: false, show: true, edit: true } },
      isActive:  fullyEditable(),
      tokens:    hidden(),
      deletedAt: hidden(),
      lastLogin: listAndShow(),
      createdAt: listAndShow(),
    },
    actions: {
      delete: { before: preventRootDeletionHook },
    },
  },
});

module.exports = { build };
