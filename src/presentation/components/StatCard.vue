<script setup lang="ts">
import { PhArrowDownRight, PhArrowUpRight, PhMinus } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { formatSignedPercent } from '@/presentation/format'
import InfoTip from './InfoTip.vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    hint?: string
    delta?: number | null
    deltaLabel?: string
    lowerIsBetter?: boolean
    info?: string
  }>(),
  { hint: undefined, delta: null, deltaLabel: undefined, lowerIsBetter: false, info: undefined },
)

const tone = computed(() => {
  if (props.delta === null || props.delta === 0) return 'neutral'
  return props.delta > 0 !== props.lowerIsBetter ? 'good' : 'bad'
})
</script>

<template>
  <div class="card card-interactive flex flex-col p-4">
    <div class="flex items-start justify-between gap-2">
      <p class="text-sm text-fg-subtle">{{ label }}</p>
      <InfoTip v-if="info" :text="info" class="-mt-1 -mr-2" />
    </div>
    <p class="mt-1 text-2xl font-semibold text-fg">{{ value }}</p>
    <p v-if="hint" class="text-sm text-fg-muted">{{ hint }}</p>
    <p
      v-if="delta !== null && Number.isFinite(delta)"
      class="mt-2 inline-flex items-center gap-1 text-xs font-medium"
      :class="{ 'text-success': tone === 'good', 'text-danger': tone === 'bad', 'text-fg-subtle': tone === 'neutral' }"
    >
      <PhArrowUpRight v-if="delta > 0" :size="14" weight="bold" aria-hidden="true" />
      <PhArrowDownRight v-else-if="delta < 0" :size="14" weight="bold" aria-hidden="true" />
      <PhMinus v-else :size="14" weight="bold" aria-hidden="true" />
      {{ formatSignedPercent(delta) }}
      <span v-if="deltaLabel" class="font-normal text-fg-subtle">vs {{ deltaLabel }}</span>
    </p>
  </div>
</template>
