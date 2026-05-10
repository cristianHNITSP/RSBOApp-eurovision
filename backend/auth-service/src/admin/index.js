/**
 * Punto de entrada del panel AdminJS.
 *
 * Orquesta:
 *   1. Conexiones MongoDB (auth/inventory/notification/backorder/optica)
 *   2. Registro de modelos en cada conexión
 *   3. Construcción del array de resources
 *   4. Instancia AdminJS + branding
 *   5. SSO routes (deben ir ANTES del router autenticado)
 *   6. Router autenticado con sesión propia
 *
 * AdminJS 7 es ESM-only — el módulo se carga por dynamic import.
 */
const { createConnections }   = require("./connections");
const { registerAllModels }   = require("./models");
const { buildAllResources }   = require("./resources");
const { branding }            = require("./branding");
const { authenticate }        = require("./auth/authenticate");
const { buildSessionOpts, SESSION_KEY, resolveSessionSecret } = require("./auth/session");
const { mountSsoRoutes }      = require("./auth/routes");

const mountAdmin = async (app) => {
  const { default: AdminJS }        = await import("adminjs");
  const { default: AdminJSExpress } = await import("@adminjs/express");
  const { Database, Resource }      = await import("@adminjs/mongoose");

  AdminJS.registerAdapter({ Database, Resource });

  const conns     = createConnections();
  const models    = registerAllModels(conns);
  const resources = buildAllResources(models);

  const admin = new AdminJS({
    resources,
    rootPath: "/admin",
    branding,
  });

  mountSsoRoutes(app);

  const sessionOpts = buildSessionOpts();
  const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate,
      cookieName:     SESSION_KEY,
      cookiePassword: resolveSessionSecret(),
    },
    null,
    sessionOpts
  );
  app.use("/admin", adminRouter);

  console.log(`🔐 AdminJS panel montado en /admin (${resources.length} recursos)`);
};

module.exports = { mountAdmin };
