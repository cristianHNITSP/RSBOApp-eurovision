/**
 * Conexión "auth" — usa la conexión default de mongoose ya inicializada
 * en src/index.js. Los modelos User, Role, UserWorkspacePreferences viven aquí.
 */
const mongoose = require("mongoose");

const getAuthConnection = () => mongoose.connection;

module.exports = { getAuthConnection };
