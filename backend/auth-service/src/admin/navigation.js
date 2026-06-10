/**
 * Grupos de navegación y sus iconos por defecto.
 * Centraliza el sidebar para evitar typos y mantener orden visual consistente.
 */
const NAV = {
  AUTH:          { name: "Auth",          defaultIcon: "User" },
  INVENTORY:     { name: "Inventario",    defaultIcon: "Package" },
  CATALOG:       { name: "Catálogo",      defaultIcon: "Book" },
  LABORATORY:    { name: "Laboratorio",   defaultIcon: "Activity" },
  MATRIX:        { name: "Matrices",      defaultIcon: "Grid" },
  CL_MATRIX:     { name: "CL Matrices",   defaultIcon: "Circle" },
  NOTIFICATION:  { name: "Notificaciones", defaultIcon: "Bell" },
  LOG:           { name: "Logs",          defaultIcon: "FileText" },
  OPTICA:        { name: "Óptica",        defaultIcon: "Glasses" },
};

const navOf = (group, icon) => ({
  name: group.name,
  icon: icon || group.defaultIcon,
});

module.exports = { NAV, navOf };
