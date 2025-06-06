import { createRouter, createWebHistory } from 'vue-router';

const routes = [
    {
        path: '/',
        name: 'Landing',
        component: () => import('../views/Landing.vue'),
    },
    
    {
        path: '/health',
        name: 'Health',
        component: () => import('../views/HealthView.vue'),
    },

    {
        path: '/layouts',
        component: () => import('../layouts/DashboardLayout.vue'), // opcional

        children: [
            {
                path: 'home',
                name: 'home',
                component: () => import('../views/dashboard/DashboardHome.vue'),
            }
            ,
            {
                path: 'inventario',
                name: 'Inventario',
                component: () => import('../views/inventario/Inventario.vue'),
            }
            ,

        ]
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('../views/NotFound.vue'),
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
