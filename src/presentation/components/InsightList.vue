<script setup lang="ts">
import { PhLightbulb, PhTrendDown, PhTrendUp } from '@phosphor-icons/vue'
import type { Component } from 'vue'
import type { Insight, InsightTone } from '@/domain/analysis'
import { Card } from '@/presentation/components/ui/card'
import InfoTip from './InfoTip.vue'

defineProps<{ insights: readonly Insight[] }>()

const TONES: Record<InsightTone, { icon: Component; label: string; classes: string }> = {
  positive: { icon: PhTrendUp, label: 'Ponto positivo', classes: 'bg-success-soft text-success' },
  negative: { icon: PhTrendDown, label: 'Ponto de atenção', classes: 'bg-destructive-soft text-destructive' },
  neutral: { icon: PhLightbulb, label: 'Observação', classes: 'bg-muted text-muted-foreground' },
}
</script>

<template>
  <ul class="grid gap-3 sm:grid-cols-2">
    <li v-for="(insight, i) in insights" :key="insight.title" class="animate-fade-up stagger" :style="{ '--i': i }">
      <Card class="card-interactive h-full flex-row gap-3 p-4">
        <span
          class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full"
          :class="TONES[insight.tone].classes"
          :title="TONES[insight.tone].label"
        >
          <component :is="TONES[insight.tone].icon" :size="16" weight="bold" aria-hidden="true" />
          <span class="sr-only">{{ TONES[insight.tone].label }}</span>
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-medium">{{ insight.title }}</p>
          <p class="mt-0.5 text-sm text-body">{{ insight.description }}</p>
        </div>
        <InfoTip :text="insight.explanation" class="-mt-1 -mr-2 shrink-0" />
      </Card>
    </li>
  </ul>
</template>
