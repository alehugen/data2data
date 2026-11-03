import { createRouter, createWebHistory, type RouteLocationRaw, type RouteRecordRaw } from 'vue-router'
import type { Report } from '@/domain/report'

export function routeForReport(report: Report): RouteLocationRaw {
  if (report.kind === 'dre') return { name: 'dre', params: { id: report.id } }
  if (report.kind === 'dataset') return { name: 'dataset', params: { id: report.id } }
  return { name: 'abc' }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/presentation/pages/LandingPage.vue'),
  },
  {
    path: '/importar',
    name: 'import',
    component: () => import('@/presentation/pages/ImportPage.vue'),
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
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/presentation/pages/NotFoundPage.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to) =>
    to.hash
      ? new Promise((resolve) => setTimeout(() => resolve({ el: to.hash, top: 88, behavior: 'smooth' }), 350))
      : { top: 0 },
  routes,
})
