import { defineStore, storeToRefs } from 'pinia'
import { computed, shallowRef } from 'vue'
import type { AbcReport } from '@/domain/abc'
import type { Dataset } from '@/domain/dataset'
import type { DreReport } from '@/domain/dre'
import type { Report } from '@/domain/report'
import type { Identifier } from '@/domain/shared'
import { container } from '@/infrastructure/container'

const useReportStore = defineStore('reports', () => {
  // shallowRef: relatórios são imutáveis, não precisam de reatividade profunda
  const reports = shallowRef<Report[]>([])

  const dreReports = computed(() => reports.value.filter((r): r is DreReport => r.kind === 'dre'))
  const abcReports = computed(() => reports.value.filter((r): r is AbcReport => r.kind === 'abc'))
  const datasets = computed(() => reports.value.filter((r): r is Dataset => r.kind === 'dataset'))

  async function refresh() {
    reports.value = await container.listReports.execute()
  }

  async function remove(id: Identifier) {
    await container.removeReport.execute(id)
    await refresh()
  }

  return { reports, dreReports, abcReports, datasets, refresh, remove }
})

export function useReports() {
  const store = useReportStore()
  const refs = storeToRefs(store)

  return { ...refs, refresh: store.refresh, remove: store.remove }
}
