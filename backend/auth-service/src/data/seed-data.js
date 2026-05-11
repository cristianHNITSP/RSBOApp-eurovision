/**
 * @fileoverview Datos iniciales para el seeding del sistema.
 * Contiene la configuración de usuarios base que se crearán si no existen.
 */

const { ROLES } = require('./roles');

const INITIAL_USERS = [
  {
    username: 'root',
    name: 'Root — Administrador del Sistema',
    password: process.env.INITIAL_ROOT_PASSWORD,
    role: ROLES.ROOT,
    profile: {
      avatar: 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_6.png',
      bio: 'Acceso total al sistema Eurovisión',
    },
    isActive: true,
  },
  {
    username: 'eurovision',
    name: 'Eurovisión — Admin Principal',
    password: 'euro1234',
    role: ROLES.ROOT,
    profile: {
      avatar: 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png',
      bio: 'Administrador de la red Eurovisión',
    },
    isActive: true,
  }
];

module.exports = {
  INITIAL_USERS
};
