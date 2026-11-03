<script setup lang="ts">
import { PhArrowDownRight, PhArrowUpRight, PhMinus } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { Badge } from '@/presentation/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card'
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

const TONE_CLASSES = {
  good: 'bg-success-soft text-success',
  bad: 'bg-destructive-soft text-destructive',
  neutral: 'bg-muted text-muted-foreground',
}
</script>

<template>
  <Card class="card-interactive gap-1">
    <CardHeader>
      <CardDescription>{{ label }}</CardDescription>
      <CardAction v-if="info" class="-mt-1 -mr-2">
        <InfoTip :text="info" />
      </CardAction>
      <CardTitle class="text-2xl font-semibold text-foreground">{{ value }}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-2">
      <p v-if="hint" class="text-sm text-body">{{ hint }}</p>
      <p v-if="delta !== null && Number.isFinite(delta)" class="flex flex-wrap items-center gap-1.5 text-xs">
        <Badge :class="TONE_CLASSES[tone]">
          <PhArrowUpRight v-if="delta > 0" weight="bold" aria-hidden="true" />
          <PhArrowDownRight v-else-if="delta < 0" weight="bold" aria-hidden="true" />
          <PhMinus v-else weight="bold" aria-hidden="true" />
          {{ formatSignedPercent(delta) }}
        </Badge>
        <span v-if="deltaLabel" class="text-muted-foreground">vs {{ deltaLabel }}</span>
      </p>
    </CardContent>
  </Card>
</template>
