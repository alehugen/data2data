import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { Identifier } from '@/domain/shared'
import { container } from '@/infrastructure/container'
import { useReports } from './useReports'

export function useDatasetAnalysis(id: MaybeRefOrGetter<Identifier>) {
  const { datasets } = useReports()

  const dataset = computed(() => datasets.value.find((d) => d.id === toValue(id)) ?? null)
  const analysis = computed(() => (dataset.value ? container.analyzeDataset.execute(dataset.value) : null))

  return { dataset, analysis }
}
