import { createRouter, createWebHistory, type RouteLocationRaw } from 'vue-router'
import type { Report } from '@/domain/report'

export function routeForReport(report: Report): RouteLocationRaw {
  if (report.kind === 'dre') return { name: 'dre', params: { id: report.id } }
  if (report.kind === 'dataset') return { name: 'dataset', params: { id: report.id } }
  return { name: 'abc' }
}

export const router = createRouter({
  history: createWebHistory(),
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
