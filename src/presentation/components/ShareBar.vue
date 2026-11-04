<script setup lang="ts">
import { computed } from 'vue'
import { formatPercent } from '@/presentation/format'

export interface ShareSegment {
  label: string
  value: number
  color: string
}

const props = defineProps<{ title: string; segments: ShareSegment[]; formatValue: (value: number) => string }>()

const total = computed(() => props.segments.reduce((acc, s) => acc + s.value, 0))
const proportional = computed(() => total.value > 0 && props.segments.every((s) => s.value >= 0))
const share = (value: number) => (total.value ? value / total.value : 0)
</script>

<template>
  <div>
    <div class="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
      <span class="font-medium">{{ title }}</span>
      <span class="text-muted-foreground" :class="total < 0 && 'text-destructive'">{{ formatValue(total) }}</span>
    </div>
    <template v-if="proportional">
      <div class="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" :aria-label="`${title} por classe`">
        <div
          v-for="segment in segments.filter((s) => s.value > 0)"
          :key="segment.label"
          class="transition-[flex-grow] duration-(--duration-slow) ease-out"
          :style="{ flexGrow: segment.value, flexBasis: 0, background: segment.color }"
          :title="`${segment.label}: ${formatValue(segment.value)}`"
        />
      </div>
      <ul class="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-body">
        <li v-for="segment in segments" :key="segment.label" class="flex items-center gap-1.5">
          <span class="size-2 rounded-full" :style="{ background: segment.color }" aria-hidden="true" />
          {{ segment.label }} <span class="font-semibold text-foreground tabular-nums">{{ formatPercent(share(segment.value)) }}</span>
        </li>
      </ul>
    </template>
    <template v-else>
      <ul class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-body">
        <li v-for="segment in segments" :key="segment.label" class="flex items-center gap-1.5">
          <span class="size-2 rounded-full" :style="{ background: segment.color }" aria-hidden="true" />
          {{ segment.label }}
          <span class="font-semibold tabular-nums" :class="segment.value < 0 ? 'text-destructive' : 'text-foreground'">
            {{ formatValue(segment.value) }}
          </span>
        </li>
      </ul>
      <p class="mt-1 text-xs text-muted-foreground">Com valores negativos, a divisão em fatias não se aplica.</p>
    </template>
  </div>
</template>
