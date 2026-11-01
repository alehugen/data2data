<script setup lang="ts">
import { computed } from 'vue'
import { formatSignedPercent } from '@/presentation/format'

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    /** Linha de apoio (ex.: "Margem 42,9%") */
    hint?: string
    /** Variação como fração (0.12 = +12%) */
    delta?: number | null
    /** Período de comparação (ex.: "set/26") */
    deltaLabel?: string
    /** Para indicadores em que cair é bom (ex.: custos) */
    lowerIsBetter?: boolean
  }>(),
  { hint: undefined, delta: null, deltaLabel: undefined, lowerIsBetter: false },
)

const tone = computed(() => {
  if (props.delta === null || props.delta === 0) return 'neutral'
  return props.delta > 0 !== props.lowerIsBetter ? 'good' : 'bad'
})
</script>

<template>
  <div class="card card-interactive flex flex-col p-4">
    <p class="text-sm text-fg-subtle">{{ label }}</p>
    <p class="mt-1 text-2xl font-semibold text-fg">{{ value }}</p>
    <p v-if="hint" class="text-sm text-fg-muted">{{ hint }}</p>
    <p
      v-if="delta !== null && Number.isFinite(delta)"
      class="mt-2 inline-flex items-center gap-1 text-xs font-medium"
      :class="{ 'text-success': tone === 'good', 'text-danger': tone === 'bad', 'text-fg-subtle': tone === 'neutral' }"
    >
      <span aria-hidden="true">{{ delta > 0 ? '▲' : delta < 0 ? '▼' : '•' }}</span>
      {{ formatSignedPercent(delta) }}
      <span v-if="deltaLabel" class="font-normal text-fg-subtle">vs {{ deltaLabel }}</span>
    </p>
  </div>
</template>
