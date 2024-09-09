import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: 'home'
    },
    {
        path: '/home',
        name: 'Home',
        component: () => import('@/views/dashboard/home.vue')
    },
    // {
    //     path: '/home',
    //     name: 'Home',
    //     component: () => import('@/views/dashboard/index.vue')
    // },
    {
        path: '/screenControls',
        name: 'ScreenControls',
        component: () => import('@/views/screenControls/index.vue')
    },
    {
        path: '/overlay',
        name: 'overlay',
        component: () => import('@/views/overlay.vue')
    }
]
console.log(routes)
const router = createRouter({
    history: createWebHashHistory(),
    routes,
})

export default router
