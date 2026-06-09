"use strict";

const { APP_ROUTES } = require("../../../data/search/appRoutes");
const { normalize } = require("../text.util");

/**
 * Provider de PÁGINAS: filtra las rutas estáticas de la app por label + keywords.
 * Síncrono (no toca DB). Devuelve items con `type:'route'`.
 */
const routesProvider = {
  key: "routes",
  async search({ q }) {
    const qNorm = normalize(q);
    return APP_ROUTES
      .filter((r) => normalize([r.label, ...r.keywords].join(" ")).includes(qNorm))
      .map((r) => ({
        type: "route",
        id: r.id,
        label: r.label,
        icon: r.icon,
        routePath: r.routePath,
        routeQuery: r.routeQuery || null,
      }));
  },
};

module.exports = { routesProvider };
