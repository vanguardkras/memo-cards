import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

const idProp = (route) => ({ id: Number(route.params.id) })

export default createRouter({
  // Hash history works on static hosting without server rewrites.
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/c/:id', name: 'edit', component: () => import('./views/EditView.vue'), props: idProp },
    { path: '/c/:id/run', name: 'run', component: () => import('./views/RunView.vue'), props: idProp },
    { path: '/c/:id/stats', name: 'stats', component: () => import('./views/StatsView.vue'), props: idProp },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
