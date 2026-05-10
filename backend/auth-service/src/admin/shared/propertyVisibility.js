/**
 * Helpers para construir configs de visibilidad de propiedades AdminJS.
 * Mantiene consistente la forma { list, filter, show, edit } a lo largo de los recursos.
 */

const hidden = () => ({ isVisible: false });

const titleField = () => ({ isTitle: true });

const listAndShow = () => ({
  isVisible: { list: true, filter: false, show: true, edit: false },
});

const showOnly = () => ({
  isVisible: { list: false, filter: false, show: true, edit: false },
});

const fullyEditable = () => ({
  isVisible: { list: true, filter: true, show: true, edit: true },
});

const listFilterShow = () => ({
  isVisible: { list: true, filter: true, show: true, edit: false },
});

module.exports = {
  hidden,
  titleField,
  listAndShow,
  showOnly,
  fullyEditable,
  listFilterShow,
};
