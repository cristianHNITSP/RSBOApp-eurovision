"use strict";

const { routesProvider } = require("./providers/routes.provider");
const { sheetsProvider } = require("./providers/sheets.provider");
const { opticaProvider } = require("./providers/optica.provider");

/**
 * Registro de PROVIDERS del buscador global (open/closed).
 * Añadir un módulo nuevo al buscador = crear su provider y registrarlo aquí.
 * Cada provider: { key, async search({ q, limit }) → item[] }.
 */
const PROVIDERS = [routesProvider, sheetsProvider, opticaProvider];

module.exports = { PROVIDERS };
