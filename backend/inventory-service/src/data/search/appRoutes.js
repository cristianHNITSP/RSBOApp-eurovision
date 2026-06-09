"use strict";

/**
 * Rutas navegables de la app, expuestas por el buscador global.
 * Mantener sincronizado con el router del frontend (src/router).
 * Data ESTÁTICA pura (sin lógica) — la consume routes.provider.
 */
const APP_ROUTES = [
  { id: "r-home",       label: "Inicio / Dashboard",            icon: "home",            routePath: "/l/home",                       keywords: ["inicio", "home", "dashboard", "panel"] },

  // Inventario
  { id: "r-inv-bm",     label: "Inventario - Bases y Micas",    icon: "glasses",         routePath: "/l/inventario/bases-micas",     keywords: ["inventario", "bases", "micas", "bases micas", "oftalmicas", "lentes", "stock", "planillas"] },
  { id: "r-inv-optica", label: "Inventario - Óptica",           icon: "eye",             routePath: "/l/inventario/optica",          keywords: ["inventario", "optica", "stock", "gafas", "anteojos", "armazones"] },
  { id: "r-inv-lc",     label: "Inventario - Lentes Contacto",  icon: "circle",          routePath: "/l/inventario/lentes-contacto", keywords: ["inventario", "lentes", "contacto", "lentes de contacto", "stock"] },

  // Ventas
  { id: "r-ven-lab",    label: "Ventas - Laboratorio",          icon: "flask",           routePath: "/l/ventas/laboratorio",         keywords: ["ventas", "laboratorio", "lab", "ordenes", "pedidos"] },
  { id: "r-ven-bm",     label: "Ventas - Bases y Micas",        icon: "glasses",         routePath: "/l/ventas/bases-micas",         keywords: ["ventas", "bases", "micas", "bases micas", "ordenes"] },
  { id: "r-ven-optica", label: "Ventas - Óptica",               icon: "eye",             routePath: "/l/ventas/optica",              keywords: ["ventas", "optica", "gafas", "ordenes", "anteojos"] },
  { id: "r-ven-lc",     label: "Ventas - Lentes Contacto",      icon: "circle",          routePath: "/l/ventas/lentes-contacto",     keywords: ["ventas", "lentes", "contacto", "lentes de contacto", "ordenes"] },

  { id: "r-usuarios",   label: "Gestión de Usuarios",           icon: "users",           routePath: "/l/usuarios",                   keywords: ["usuarios", "users", "gestion", "roles", "permisos"] },
  { id: "r-devol",      label: "Devoluciones",                  icon: "undo-alt",        routePath: "/l/devoluciones",               keywords: ["devoluciones", "devolucion", "retorno", "reembolso", "return"] },
  { id: "r-config",     label: "Configuración",                 icon: "cog",             routePath: "/l/config.panel",               keywords: ["config", "configuracion", "ajustes", "settings"] },
  { id: "r-perfil",     label: "Mi Perfil",                     icon: "user-circle",     routePath: "/l/config.panel",               routeQuery: { tab: "profile" }, keywords: ["perfil", "profile", "cuenta", "contrasena"] },
  { id: "r-analiticas", label: "Analíticas",                    icon: "chart-bar",       routePath: "/l/analiticas",                 keywords: ["analiticas", "analytics", "estadisticas", "reportes", "graficas"] },
  { id: "r-ayuda",      label: "Ayuda",                         icon: "question-circle", routePath: "/l/ayuda",                      keywords: ["ayuda", "help", "soporte", "faq"] },
];

module.exports = { APP_ROUTES };
