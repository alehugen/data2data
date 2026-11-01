<script setup lang="ts">
import { computed, ref } from 'vue'
import { AbcMovement } from '@/application'
import { ABC_CLASSES } from '@/domain/abc'
import AbcBadge from '@/presentation/components/AbcBadge.vue'
import ChartCard from '@/presentation/components/ChartCard.vue'
import InsightList from '@/presentation/components/InsightList.vue'
import RankingBarChart from '@/presentation/components/RankingBarChart.vue'
import ShareBar from '@/presentation/components/ShareBar.vue'
import StatCard from '@/presentation/components/StatCard.vue'
import TrendChart from '@/presentation/components/TrendChart.vue'
import { MOVEMENT_LABELS, monthLabel, useAbcAnalysis } from '@/presentation/composables/useAbcAnalysis'
import { useChartTheme } from '@/presentation/composables/useChartTheme'
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
} from '@/presentation/format'

const { analysis, selectedId, insights } = useAbcAnalysis()
const theme = useChartTheme()

const RANKINGS = [
  { key: 'quantity', label: 'Quantidade' },
  { key: 'value', label: 'Faturamento' },
] as const
const rankingBy = ref<(typeof RANKINGS)[number]['key']>('quantity')

const current = computed(() => analysis.value?.current)
const previous = computed(() => analysis.value?.previous)
const previousLabel = computed(() => (previous.value ? monthLabel(previous.value.report) : undefined))
const change = (now: number, before: number | undefined) => (before ? now / before - 1 : null)

const kpis = computed(() => {
  const c = current.value
  if (!c) return []
  const p = previous.value
  const average = (s: { value: number; quantity: number }) => (s.quantity ? s.value / s.quantity : 0)
  return [
    { label: 'Faturamento', value: formatCurrencyCompact(c.value), delta: change(c.value, p?.value) },
    { label: 'Quantidade vendida', value: formatNumber(c.quantity), delta: change(c.quantity, p?.quantity) },
    { label: 'Itens vendidos', value: formatNumber(c.items), delta: change(c.items, p?.items) },
    { label: 'Valor médio por unidade', value: formatCurrency(average(c)), delta: p ? change(average(c), average(p)) : null },
  ]
})

const classSegments = (pick: (totals: { items: number; quantity: number; value: number }) => number) =>
  ABC_CLASSES.map((abcClass) => ({
    label: `Classe ${abcClass}`,
    value: current.value ? pick(current.value.byClass[abcClass]) : 0,
    color: theme.value.abcClass[abcClass],
  }))

const rankingItems = computed(() => {
  const items = [...(analysis.value?.ranking ?? [])]
  if (rankingBy.value === 'value') items.sort((a, b) => b.value - a.value)
  return items.map((item) => ({
    label: item.description,
    value: rankingBy.value === 'quantity' ? item.quantity : item.value,
    color: theme.value.abcClass[item.abcClass],
    detail:
      rankingBy.value === 'quantity'
        ? `Classe ${item.abcClass} · ${formatCurrency(item.value)} · acumulado ${formatPercent(item.cumulativeShare)}`
        : `Classe ${item.abcClass} · ${formatNumber(item.quantity)} un.`,
  }))
})

const evolution = computed(() => {
  const months = analysis.value?.months ?? []
  return {
    categories: months.map((m) => monthLabel(m.report)),
    series: ABC_CLASSES.map((abcClass) => ({
      name: `Classe ${abcClass}`,
      type: 'bar' as const,
      stack: 'class',
      color: theme.value.abcClass[abcClass],
      data: months.map((m) => m.byClass[abcClass].value),
    })),
  }
})

const movementTone: Record<AbcMovement, string> = {
  new: 'bg-accent-soft text-accent',
  up: 'bg-success-soft text-success',
  down: 'bg-danger-soft text-danger',
  gone: 'bg-surface-muted text-fg-subtle',
  same: 'text-fg-subtle',
}
</script>

<template>
  <div v-if="!analysis" class="animate-fade-up space-y-2">
    <h1 class="text-2xl font-semibold">Curva ABC</h1>
    <p class="text-fg-muted">Nenhum relatório de Curva ABC importado ainda.</p>
    <RouterLink to="/" class="link">Importar relatórios</RouterLink>
  </div>

  <section v-else-if="current" class="space-y-8">
    <header class="animate-fade-up space-y-4">
      <div>
        <RouterLink to="/" class="group inline-flex items-center gap-1 rounded-md text-sm text-fg-subtle hover:text-accent">
          <span class="transition-transform duration-(--duration-base) ease-soft group-hover:-translate-x-0.5">←</span>
          Voltar
        </RouterLink>
        <h1 class="mt-2 text-2xl font-semibold">Curva ABC</h1>
        <p class="text-sm text-fg-subtle">
          Classificação por {{ current.report.basis === 'value' ? 'faturamento' : 'quantidade vendida' }}, como no relatório de origem
        </p>
      </div>

      <!-- Seletor de mês -->
      <div role="tablist" aria-label="Mês" class="flex flex-wrap gap-2">
        <button
          v-for="month in analysis.months"
          :key="month.report.id"
          type="button"
          role="tab"
          :aria-selected="month.report.id === current.report.id"
          class="btn btn-sm"
          :class="month.report.id === current.report.id ? 'btn-primary' : 'btn-secondary'"
          @click="selectedId = month.report.id"
        >
          {{ monthLabel(month.report) }}
        </button>
      </div>
    </header>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        v-for="(kpi, i) in kpis"
        :key="kpi.label"
        class="animate-fade-up stagger"
        :style="{ '--i': i }"
        :label="kpi.label"
        :value="kpi.value"
        :delta="kpi.delta"
        :delta-label="previousLabel"
      />
    </div>

    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Pontos de análise</h2>
      <InsightList :insights="insights" />
    </div>

    <div class="grid gap-3 lg:grid-cols-5">
      <ChartCard
        title="Distribuição por classe"
        :subtitle="`Quanto cada classe representa em ${monthLabel(current.report)}`"
        class="animate-fade-up space-y-5 lg:col-span-2"
      >
        <div class="space-y-5">
          <ShareBar title="Itens" :segments="classSegments((t) => t.items)" :format-value="(v) => `${formatNumber(v)} itens`" />
          <ShareBar title="Quantidade" :segments="classSegments((t) => t.quantity)" :format-value="(v) => `${formatNumber(v)} un.`" />
          <ShareBar title="Faturamento" :segments="classSegments((t) => t.value)" :format-value="formatCurrency" />
        </div>
      </ChartCard>

      <ChartCard
        title="Ranking de itens"
        subtitle="Cor indica a classe ABC"
        class="animate-fade-up stagger lg:col-span-3"
        style="--i: 1"
      >
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <ul class="flex gap-4 text-xs text-fg-subtle" aria-label="Legenda">
            <li v-for="abcClass in ABC_CLASSES" :key="abcClass" class="flex items-center gap-1.5">
              <span class="size-2.5 rounded-sm" :style="{ background: theme.abcClass[abcClass] }" />Classe {{ abcClass }}
            </li>
          </ul>
          <div role="radiogroup" aria-label="Ordenar por" class="flex rounded-lg border border-line bg-surface-muted p-0.5 text-xs">
            <button
              v-for="option in RANKINGS"
              :key="option.key"
              type="button"
              role="radio"
              :aria-checked="rankingBy === option.key"
              class="rounded-md px-2 py-1"
              :class="rankingBy === option.key ? 'bg-surface text-fg shadow-card' : 'text-fg-subtle hover:text-fg'"
              @click="rankingBy = option.key"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <RankingBarChart
          :items="rankingItems"
          :value-label="rankingBy === 'quantity' ? 'Quantidade' : 'Faturamento'"
          :format-value="rankingBy === 'quantity' ? formatNumber : formatCurrency"
          :format-axis="rankingBy === 'quantity' ? formatNumber : formatCurrencyCompact"
        />
      </ChartCard>
    </div>

    <ChartCard
      v-if="analysis.months.length > 1"
      title="Evolução mensal"
      subtitle="Faturamento por classe em cada mês importado"
      class="animate-fade-up"
    >
      <TrendChart
        :categories="evolution.categories"
        :series="evolution.series"
        :highlight-index="analysis.months.findIndex((m) => m.report.id === current?.report.id)"
      />
    </ChartCard>

    <div v-if="previous && analysis.movements.length" class="space-y-3">
      <h2 class="text-lg font-semibold">Movimentação: {{ previousLabel }} → {{ monthLabel(current.report) }}</h2>
      <div class="card overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-surface-muted text-left">
            <tr>
              <th class="px-3 py-2 font-medium">Item</th>
              <th class="px-3 py-2 font-medium">Classe</th>
              <th class="px-3 py-2 font-medium">Situação</th>
              <th class="px-3 py-2 text-right font-medium">Quantidade</th>
              <th class="px-3 py-2 text-right font-medium">Faturamento</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line tabular-nums">
            <tr v-for="m in analysis.movements" :key="m.code" class="transition-colors duration-(--duration-fast) hover:bg-accent-soft/30">
              <td class="px-3 py-2">{{ m.description }}</td>
              <td class="px-3 py-2 whitespace-nowrap">
                <span class="inline-flex items-center gap-1.5">
                  <AbcBadge :abc-class="m.from" />
                  <span aria-hidden="true" class="text-fg-subtle">→</span>
                  <AbcBadge :abc-class="m.to" />
                </span>
              </td>
              <td class="px-3 py-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="movementTone[m.movement]">
                  {{ MOVEMENT_LABELS[m.movement] }}
                </span>
              </td>
              <td class="px-3 py-2 text-right whitespace-nowrap">
                {{ formatNumber(m.quantity) }}
                <span class="ml-1 text-xs" :class="m.quantity - m.previousQuantity >= 0 ? 'text-success' : 'text-danger'">
                  ({{ m.quantity - m.previousQuantity >= 0 ? '+' : '' }}{{ formatNumber(m.quantity - m.previousQuantity) }})
                </span>
              </td>
              <td class="px-3 py-2 text-right whitespace-nowrap">
                {{ formatCurrency(m.value) }}
                <span class="ml-1 text-xs" :class="m.value - m.previousValue >= 0 ? 'text-success' : 'text-danger'">
                  ({{ m.value - m.previousValue >= 0 ? '+' : '' }}{{ formatCurrencyCompact(m.value - m.previousValue) }})
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Itens de {{ monthLabel(current.report) }}</h2>
      <div class="card overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-surface-muted text-left">
            <tr>
              <th class="px-3 py-2 font-medium">#</th>
              <th class="px-3 py-2 font-medium">Item</th>
              <th class="px-3 py-2 font-medium">Classe</th>
              <th class="px-3 py-2 text-right font-medium">Quantidade</th>
              <th class="px-3 py-2 text-right font-medium">Participação</th>
              <th class="px-3 py-2 text-right font-medium">Acumulado</th>
              <th class="px-3 py-2 text-right font-medium">Faturamento</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line tabular-nums">
            <tr
              v-for="(item, i) in analysis.ranking"
              :key="item.code"
              class="transition-colors duration-(--duration-fast) hover:bg-accent-soft/30"
            >
              <td class="px-3 py-2 text-fg-subtle">{{ i + 1 }}</td>
              <td class="px-3 py-2">{{ item.description }}</td>
              <td class="px-3 py-2"><AbcBadge :abc-class="item.abcClass" /></td>
              <td class="px-3 py-2 text-right">{{ formatNumber(item.quantity) }}</td>
              <td class="px-3 py-2 text-right">{{ formatPercent(item.share) }}</td>
              <td class="px-3 py-2 text-right text-fg-subtle">{{ formatPercent(item.cumulativeShare) }}</td>
              <td class="px-3 py-2 text-right">{{ formatCurrency(item.value) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
