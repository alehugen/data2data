<script setup lang="ts">
export interface InsightItem {
  title: string
  description: string
  tone?: 'positive' | 'negative' | 'neutral'
}

defineProps<{ insights: InsightItem[] }>()

const ICONS = { positive: '▲', negative: '▼', neutral: '•' }
const LABELS = { positive: 'Ponto positivo', negative: 'Ponto de atenção', neutral: 'Observação' }
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
        class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs"
        :class="{
          'bg-success-soft text-success': insight.tone === 'positive',
          'bg-danger-soft text-danger': insight.tone === 'negative',
          'bg-surface-muted text-fg-subtle': !insight.tone || insight.tone === 'neutral',
        }"
        :title="LABELS[insight.tone ?? 'neutral']"
      >
        <span aria-hidden="true">{{ ICONS[insight.tone ?? 'neutral'] }}</span>
        <span class="sr-only">{{ LABELS[insight.tone ?? 'neutral'] }}</span>
      </span>
      <div>
        <p class="font-medium">{{ insight.title }}</p>
        <p class="mt-0.5 text-sm text-fg-muted">{{ insight.description }}</p>
      </div>
    </li>
  </ul>
</template>
