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

router.beforeEach(async (to, from, next) => {
  // Si la ruta necesita autenticación
  if (to.meta.requiresAuth) {
    try {
      // ✅ Verificar sesión con credenciales (cookies incluidas)
      await api.get('/access/check-session', { withCredentials: true })
      next()
    } catch (err) {
      console.warn('⚠️ Sesión inválida o expirada:', err?.response?.status)

      // 🧭 Redirigir a landing con query para mostrar toast
      next({
        name: 'Landing',
        query: { sessionExpired: '1' },
      })
    }
  } else {
    next()
  }
})

export default router
