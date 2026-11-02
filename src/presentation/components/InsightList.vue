<script setup lang="ts">
import { PhLightbulb, PhTrendDown, PhTrendUp } from '@phosphor-icons/vue'
import type { Component } from 'vue'
import type { Insight, InsightTone } from '@/domain/analysis'
import InfoTip from './InfoTip.vue'

defineProps<{ insights: readonly Insight[] }>()

const TONES: Record<InsightTone, { icon: Component; label: string; classes: string }> = {
  positive: { icon: PhTrendUp, label: 'Ponto positivo', classes: 'bg-success-soft text-success' },
  negative: { icon: PhTrendDown, label: 'Ponto de atenção', classes: 'bg-danger-soft text-danger' },
  neutral: { icon: PhLightbulb, label: 'Observação', classes: 'bg-surface-muted text-fg-subtle' },
}
</script>

<template>
  <ul class="grid gap-3 sm:grid-cols-2">
    <li
      v-for="(insight, i) in insights"
      :key="insight.title"
      class="card card-interactive flex animate-fade-up stagger gap-3 p-4"
      :style="{ '--i': i }"
    >
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
        <p class="mt-0.5 text-sm text-fg-muted">{{ insight.description }}</p>
      </div>
      <InfoTip :text="insight.explanation" class="-mt-1 -mr-2 shrink-0" />
    </li>
  </ul>
</template>
