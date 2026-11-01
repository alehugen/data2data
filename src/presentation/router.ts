import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  // Cada página começa do topo
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/presentation/pages/HomePage.vue'),
    },
    {
      path: '/dre/:id',
      name: 'dre',
      component: () => import('@/presentation/pages/DrePage.vue'),
      props: true,
    },
    {
      path: '/curva-abc',
      name: 'abc',
      component: () => import('@/presentation/pages/AbcPage.vue'),
    },
    {
      path: '/datasets/:id',
      name: 'dataset',
      component: () => import('@/presentation/pages/DatasetPage.vue'),
      props: true,
    },
  ],
})
