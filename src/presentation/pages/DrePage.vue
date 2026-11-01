<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { DreMetric } from '@/domain/dre'
import ChartCard from '@/presentation/components/ChartCard.vue'
import DreTable from '@/presentation/components/DreTable.vue'
import InsightList from '@/presentation/components/InsightList.vue'
import RankingBarChart from '@/presentation/components/RankingBarChart.vue'
import StatCard from '@/presentation/components/StatCard.vue'
import TrendChart from '@/presentation/components/TrendChart.vue'
import WaterfallChart from '@/presentation/components/WaterfallChart.vue'
import { useChartTheme } from '@/presentation/composables/useChartTheme'
import { DRE_MARGIN_LABELS, DRE_METRIC_LABELS, useDreAnalysis } from '@/presentation/composables/useDreAnalysis'
import { useReports } from '@/presentation/composables/useReports'
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  formatPeriod,
  prettifyLabel,
} from '@/presentation/format'

const props = defineProps<{ id: string }>()
const { refresh } = useReports()
const { report, selections, selectedKey, analysis, periodLabels, insights } = useDreAnalysis(() => props.id)
const theme = useChartTheme()

onMounted(() => {
  if (!report.value) refresh()
})

const months = computed(() => report.value?.periods.map(formatPeriod) ?? [])
const highlightIndex = computed(() => (analysis.value?.indexes.length === 1 ? analysis.value.indexes[0] : undefined))

const kpiCards = computed(() =>
  (analysis.value?.kpis ?? []).map((kpi) => ({
    key: kpi.metric,
    label: DRE_METRIC_LABELS[kpi.metric],
    value: formatCurrencyCompact(kpi.value),
    hint: kpi.margin !== null ? `${DRE_MARGIN_LABELS[kpi.metric] ?? 'Margem'} ${formatPercent(kpi.margin)}` : undefined,
    // Variação relativa sobre a base absoluta (funciona para valores negativos)
    delta: kpi.previous ? (kpi.value - kpi.previous) / Math.abs(kpi.previous) : null,
  })),
)

const revenueSeries = computed(() => {
  const a = analysis.value
  if (!a) return []
  return [
    { name: 'Receita bruta', type: 'bar' as const, data: a.monthly.revenue },
    ...(a.monthly.ebitda ? [{ name: 'EBITDA', type: 'bar' as const, data: a.monthly.ebitda }] : []),
  ]
})

const marginSeries = computed(() =>
  (analysis.value?.margins ?? []).map((m) => ({
    name: DRE_MARGIN_LABELS[m.metric] ?? m.metric,
    type: 'line' as const,
    data: m.values,
  })),
)

const mixSeries = computed(() =>
  (analysis.value?.revenueMix ?? []).map((s) => ({
    name: prettifyLabel(s.label),
    type: 'bar' as const,
    stack: 'mix',
    data: s.values,
  })),
)

const expenseItems = computed(() =>
  (analysis.value?.expenses ?? []).slice(0, 10).map((e) => ({
    label: prettifyLabel(e.label),
    value: e.value,
    detail: `${formatPercent(e.share)} da receita`,
  })),
)
</script>

<template>
  <div v-if="!report" class="animate-fade-up space-y-2">
    <p class="text-fg-muted">DRE não encontrada. Os dados ficam só na memória: importe a planilha novamente.</p>
    <RouterLink to="/" class="link">Voltar ao início</RouterLink>
  </div>

  <section v-else-if="analysis" class="space-y-8">
    <header class="flex animate-fade-up flex-wrap items-end justify-between gap-4">
      <div>
        <RouterLink to="/" class="group inline-flex items-center gap-1 rounded-md text-sm text-fg-subtle hover:text-accent">
          <span class="transition-transform duration-(--duration-base) ease-soft group-hover:-translate-x-0.5">←</span>
          Voltar
        </RouterLink>
        <h1 class="mt-2 text-2xl font-semibold">Demonstração do resultado</h1>
        <p class="text-sm text-fg-subtle">{{ report.name }}</p>
      </div>

      <label class="flex flex-col gap-1 text-sm">
        <span class="text-fg-subtle">Período</span>
        <select
          v-model="selectedKey"
          class="rounded-lg border border-line bg-surface px-3 py-2 text-fg shadow-card hover:border-line-strong"
        >
          <optgroup label="Mês">
            <option v-for="s in selections.filter((o) => o.type === 'month')" :key="s.key" :value="s.key">{{ s.label }}</option>
          </optgroup>
          <optgroup label="Acumulado no ano">
            <option v-for="s in selections.filter((o) => o.type === 'year')" :key="s.key" :value="s.key">{{ s.label }}</option>
          </optgroup>
        </select>
      </label>
    </header>

    <!-- Indicadores do período -->
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatCard
        v-for="(kpi, i) in kpiCards"
        :key="kpi.key"
        class="animate-fade-up stagger"
        :style="{ '--i': i }"
        :label="kpi.label"
        :value="kpi.value"
        :hint="kpi.hint"
        :delta="kpi.delta"
        :delta-label="periodLabels.previous"
      />
    </div>

    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Pontos de análise</h2>
      <InsightList :insights="insights" />
    </div>

    <ChartCard
      title="Da receita ao resultado"
      :subtitle="`Cascata da DRE: ${periodLabels.currentLong}`"
      class="animate-fade-up"
    >
      <WaterfallChart :steps="analysis.waterfall" />
    </ChartCard>

    <div class="grid gap-3 lg:grid-cols-2">
      <ChartCard title="Receita e EBITDA" subtitle="Evolução mensal" class="animate-fade-up stagger" style="--i: 0">
        <TrendChart :categories="months" :series="revenueSeries" :highlight-index="highlightIndex" />
      </ChartCard>

      <ChartCard title="Margens" subtitle="Percentual da receita bruta, mês a mês" class="animate-fade-up stagger" style="--i: 1">
        <TrendChart :categories="months" :series="marginSeries" format="percent" :highlight-index="highlightIndex" />
      </ChartCard>

      <ChartCard
        title="Para onde vai a receita"
        :subtitle="`Custos e despesas operacionais: ${periodLabels.currentLong}`"
        class="animate-fade-up stagger"
        style="--i: 2"
      >
        <RankingBarChart
          :items="expenseItems"
          value-label="Valor"
          :format-value="formatCurrency"
          :format-axis="formatCurrencyCompact"
        />
      </ChartCard>

      <ChartCard
        v-if="mixSeries.length > 1"
        title="Composição da receita"
        subtitle="Receita bruta por origem"
        class="animate-fade-up stagger"
        style="--i: 3"
      >
        <TrendChart :categories="months" :series="mixSeries" :highlight-index="highlightIndex" />
      </ChartCard>

      <ChartCard
        v-if="analysis.monthly.cash"
        :title="DRE_METRIC_LABELS[DreMetric.EndingCash]"
        subtitle="Saldo final de cada mês"
        class="animate-fade-up stagger lg:col-span-2"
        style="--i: 4"
      >
        <TrendChart
          :categories="months"
          :series="[{ name: 'Saldo final', type: 'line', data: analysis.monthly.cash, color: theme.series[0] }]"
          :highlight-index="highlightIndex"
          :height="240"
        />
      </ChartCard>
    </div>

    <div class="space-y-3">
      <h2 class="text-lg font-semibold">DRE completa</h2>
      <DreTable :report="report" :highlight="analysis.indexes" />
    </div>
  </section>
</template>
