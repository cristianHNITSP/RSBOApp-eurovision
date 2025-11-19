// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import api from '../api/axios'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: () => import('../views/Landing.vue'),
  },
  {
    path: '/layouts',
    component: () => import('../layouts/DashboardLayout.vue'),
    children: [
      {
        path: 'home',
        name: 'home',
        component: () => import('../views/dashboard/DashboardHome.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'inventario',
        name: 'Inventario',
        component: () => import('../views/inventario/Inventario.vue'),
        meta: { requiresAuth: true },
      },
      // CONFIG principal con tabs
      {
        path: 'config.panel',
        name: 'configuración',
        component: () => import('../views/config/Config.vue'),
        meta: { requiresAuth: true },
      },
      // Ruta antigua de "mi.perfil.panel" → redirige a Config con tab=profile
      {
        path: 'mi.perfil.panel',
        name: 'Mi perfil',
        meta: { requiresAuth: true },
        redirect: (to) => ({
          name: 'configuración',
          query: {
            ...to.query,
            tab: 'profile', // tab que activaremos en Config.vue
          },
        }),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
  },
]

const router = createRouter({
  history: createWebHistory('/app.rsbo.eurovision/'),
  routes,
})

// Mapa de código de error → razón usada en la query
const ERROR_REASON_MAP = {
  NO_TOKEN: 'no-token',
  TOKEN_EXPIRED: 'token-expired',
  INVALID_TOKEN: 'invalid-token',
}

const mapErrorToAuthReason = (code) => ERROR_REASON_MAP[code] || 'unknown'

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (!requiresAuth) {
    return next()
  }

  try {
    await api.get('/access/check-session', { withCredentials: true })
    return next()
  } catch (err) {
    const status = err?.response?.status
    const code = err?.response?.data?.error

    console.warn('Sesión inválida o no autorizada', { status, code })

    const authReason = mapErrorToAuthReason(code)

    return next({
      name: 'Landing',
      query: { authReason },
    })
  }
})

export default router
