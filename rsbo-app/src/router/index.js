// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { sendRequest } from "../api/axios";
import { initLabSocket } from "../composables/shared/useLabSocket.js";

const routes = [
  {
    path: "/",
    name: "Landing",
    component: () => import("../views/Landing.vue"),
  },
  {
    path: "/l",
    component: () => import("../layouts/DashboardLayout.vue"),
    redirect: "/l/home",
    meta: { requiresAuth: true },
    children: [
      {
        path: "home",
        name: "home",
        component: () => import("../views/dashboard/DashboardHome.vue"),
        meta: { requiresAuth: true, breadcrumb: "Dashboard" },
      },
      {
        path: "analiticas",
        name: "Análiticas",
        component: () => import("../views/dashboard/Analiticas.vue"),
        meta: { requiresAuth: true, breadcrumb: "Analíticas" },
      },
      {
        path: "inventario/bases-micas",
        name: "inventario-bases-micas",
        component: () => import("../views/inventario/BasesMicas.vue"),
        meta: { requiresAuth: true, breadcrumb: "Inventario / Bases y Micas" },
      },
      {
        path: "inventario/optica",
        name: "inventario-optica",
        component: () => import("../views/inventario/Optica.vue"),
        meta: { requiresAuth: true, breadcrumb: "Inventario / Óptica" },
      },
      {
        path: "inventario/lentes-contacto",
        name: "inventario-lentes-contacto",
        component: () => import("../views/inventario/LentesContacto.vue"),
        meta: { requiresAuth: true, breadcrumb: "Inventario / Lentes de Contacto" },
      },
      {
        path: "ventas/laboratorio",
        name: "ventas-laboratorio",
        component: () => import("../views/ventas/Laboratorio.vue"),
        meta: { requiresAuth: true, breadcrumb: "Ventas / Laboratorio" },
      },
      {
        path: "ventas/:category(bases-micas|optica|lentes-contacto|historial)?",
        name: "ventas-dashboard",
        component: () => import("../views/ventas/VentasDashboard.vue"),
        props: true,
        meta: { requiresAuth: true, breadcrumb: "Ventas" },
      },

      {
        path: "usuarios",
        name: "usuarios",
        component: () => import("../views/gestion/Usuarios.vue"),
        meta: { requiresAuth: true, breadcrumb: "Gestión de Usuarios" },
      },
      // CONFIG principal con tabs
      {
        path: "config.panel",
        name: "configuración",
        component: () => import("../views/config/Config.vue"),
        meta: { requiresAuth: true, breadcrumb: "Configuración" },
      },
      // Ruta antigua de "mi.perfil.panel" → redirige a Config con tab=profile
      {
        path: "mi.perfil.panel",
        name: "Mi perfil",
        meta: { requiresAuth: true, breadcrumb: "Mi Perfil" },
        redirect: (to) => ({
          name: "configuración",
          query: {
            ...to.query,
            tab: "profile", // tab que activaremos en Config.vue
          },
        }),
      },
      {
        path: "devoluciones",
        name: "devoluciones",
        component: () => import("../views/devoluciones/Devoluciones.vue"),
        meta: { requiresAuth: true, breadcrumb: "Devoluciones" },
      },
      {
        path: "mermas",
        name: "mermas",
        component: () => import("../views/mermas/Mermas.vue"),
        meta: { requiresAuth: true, breadcrumb: "Ventas / Mermas" },
      },
      {
        path: "ayuda",
        name: "Ayuda",
        component: () => import("../views/Ayuda.vue"),
        meta: { requiresAuth: true, breadcrumb: "Ayuda" },
      },
      {
        path: "notificaciones",
        name: "Notificaciones",
        component: () => import("../views/NotificationsView.vue"),
        meta: { requiresAuth: true, breadcrumb: "Notificaciones" },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("../views/NotFound.vue"),
  },
];

const router = createRouter({
  history: createWebHistory("/"),
  routes,
});

// Mapa de código de error → razón usada en la query
const ERROR_REASON_MAP = {
  NO_TOKEN: "no-token",
  TOKEN_EXPIRED: "token-expired",
  INVALID_TOKEN: "invalid-token",
  TOKEN_REVOKED: "token-revoked",
  USER_NOT_FOUND: "no-token",
  USER_DELETED: "no-token",
  USER_INACTIVE: "no-token",
};

const mapErrorToAuthReason = (code) => ERROR_REASON_MAP[code] || "unknown";

// Caché de sesión: evita llamar a /check-session en cada navegación
let _sessionCache = null; // { user, expiresAt: number }
const SESSION_TTL_MS = 30_000; // 30 segundos

window.addEventListener("auth:session-expired", () => {
  _sessionCache = null;
});

// helper con deduplicación: si ya hay una sesión en vuelo no lanza otra
async function checkSession(force = false) {
  if (!force && _sessionCache && Date.now() < _sessionCache.expiresAt) {
    return { data: { user: _sessionCache.user } };
  }
  const result = await sendRequest({ method: "get", url: "/access/check-session", withCredentials: true });
  _sessionCache = {
    user: result?.data?.user,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  return result;
}

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  // Caso especial: si intenta ir a "/" con sesión válida, NO se permite,
  // se manda a /l/home — excepto root, que va al panel admin
  if (to.name === "Landing") {
    try {
      const { data } = await checkSession();
      if (data?.user?.roleName === "root") {
        window.location.href = "/admin/sso";
        return;
      }
      initLabSocket();
      return next({ name: "home" });
    } catch {
      return next();
    }
  }

  // Rutas públicas → pasan directo
  if (!requiresAuth) {
    return next();
  }

  // Rutas protegidas
  try {
    const { data } = await checkSession();

    // root no puede acceder a la app principal — solo al panel admin
    if (data?.user?.roleName === "root") {
      window.location.href = "/admin/sso";
      return;
    }

    initLabSocket();
    return next();
  } catch (err) {
    const status = err?.response?.status;
    const code = err?.response?.data?.error;

    // Rate limit o error de servidor: la sesión puede seguir siendo válida.
    // No cerrar sesión — dejar pasar con el caché o reintento implícito.
    if (status === 429 || status >= 500 || !status) {
      console.warn("[Router] check-session falló con", status ?? "sin respuesta", "— permitiendo navegación");
      return next(); // continuar sin redirigir
    }

    console.warn("Sesión inválida o no autorizada", { status, code });

    return next({
      name: "Landing",
      query: { authReason: mapErrorToAuthReason(code) },
    });
  }
});

export default router;
