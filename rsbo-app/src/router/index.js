// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import api from "../api/axios";

const routes = [
  {
    path: "/",
    name: "Landing",
    component: () => import("../views/Landing.vue"),
  },
  {
    path: "/layouts",
    component: () => import("../layouts/DashboardLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "home",
        name: "home",
        component: () => import("../views/dashboard/DashboardHome.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "analiticas",
        name: "Análiticas",
        component: () => import("../views/dashboard/Analiticas.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "inventario",
        name: "Inventario",
        component: () => import("../views/inventario/Inventario.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "laboratorio",
        name: "Laboratorio",
        component: () => import("../views/inventario/Laboratorio.vue"),
        meta: { requiresAuth: true },
      },

      {
        path: "usuarios",
        name: "usuarios",
        component: () => import("../views/gestion/Usuarios.vue"),
        meta: { requiresAuth: true },
      },
      // CONFIG principal con tabs
      {
        path: "config.panel",
        name: "configuración",
        component: () => import("../views/config/Config.vue"),
        meta: { requiresAuth: true },
      },
      // Ruta antigua de "mi.perfil.panel" → redirige a Config con tab=profile
      {
        path: "mi.perfil.panel",
        name: "Mi perfil",
        meta: { requiresAuth: true },
        redirect: (to) => ({
          name: "configuración",
          query: {
            ...to.query,
            tab: "profile", // tab que activaremos en Config.vue
          },
        }),
      },
      {
        path: "ayuda",
        name: "Ayuda",
        component: () => import("../views/Ayuda.vue"),
        meta: { requiresAuth: true },
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
  history: createWebHistory("/app.rsbo.eurovision/"),
  routes,
});

// Mapa de código de error → razón usada en la query
const ERROR_REASON_MAP = {
  NO_TOKEN: "no-token",
  TOKEN_EXPIRED: "token-expired",
  INVALID_TOKEN: "invalid-token",
};

const mapErrorToAuthReason = (code) => ERROR_REASON_MAP[code] || "unknown";

// helper para no repetir
const checkSession = () =>
  api.get("/access/check-session", { withCredentials: true });

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  // Caso especial: si intenta ir a "/" con sesión válida, NO se permite,
  // se manda a /layouts/home
  if (to.name === "Landing") {
    try {
      await checkSession();
      // Sesión válida → redirigir a home
      return next({ name: "home" });
    } catch (err) {
      // Sin sesión → Landing permitido
      return next();
    }
  }

  // Rutas públicas (que no necesitan auth) → pasan directo
  if (!requiresAuth) {
    return next();
  }

  // Rutas protegidas
  try {
    await checkSession();
    return next();
  } catch (err) {
    const status = err?.response?.status;
    const code = err?.response?.data?.error;

    console.warn("Sesión inválida o no autorizada", { status, code });

    const authReason = mapErrorToAuthReason(code);

    return next({
      name: "Landing",
      query: { authReason },
    });
  }
});

export default router;
