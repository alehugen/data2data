<script setup lang="ts">
import { PhWarning } from '@phosphor-icons/vue'
import { computed, ref } from 'vue'
import { AbcMovement } from '@/application'
import { ABC_CLASSES, type AbcClass } from '@/domain/abc'
import AbcBadge from '@/presentation/components/AbcBadge.vue'
import ChartCard from '@/presentation/components/ChartCard.vue'
import InsightList from '@/presentation/components/InsightList.vue'
import PageHeader from '@/presentation/components/PageHeader.vue'
import PageSection from '@/presentation/components/PageSection.vue'
import RankingBarChart from '@/presentation/components/RankingBarChart.vue'
import ReportLayout from '@/presentation/components/ReportLayout.vue'
import type { NavSection } from '@/presentation/components/SectionNav.vue'
import SectionHeading from '@/presentation/components/SectionHeading.vue'
import SegmentedControl from '@/presentation/components/SegmentedControl.vue'
import ShareBar from '@/presentation/components/ShareBar.vue'
import StatCard from '@/presentation/components/StatCard.vue'
import TrendChart from '@/presentation/components/TrendChart.vue'
import VolumeMarginChart from '@/presentation/components/VolumeMarginChart.vue'
import WaterfallChart from '@/presentation/components/WaterfallChart.vue'
import { MOVEMENT_LABELS, useAbcAnalysis } from '@/presentation/composables/useAbcAnalysis'
import { useChartTheme } from '@/presentation/composables/useChartTheme'
import {
  formatAbcMonth,
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
} from '@/presentation/format'

const { analysis, selectedId, insights, profitInsights } = useAbcAnalysis()
const theme = useChartTheme()

const RANKING_OPTIONS = [
  { value: 'quantity', label: 'Quantidade' },
  { value: 'value', label: 'Faturamento' },
] as const
const rankingBy = ref<(typeof RANKING_OPTIONS)[number]['value']>('quantity')

const BASIS_LABELS = { quantity: 'quantidade vendida', value: 'faturamento' } as const

const INFO = {
  revenue: 'Soma do valor total de todos os itens da Curva ABC do mês. A variação compara com o mês anterior importado.',
  quantity: 'Soma das quantidades vendidas de todos os itens no mês.',
  items: 'Quantidade de produtos diferentes (pelo código) com venda no mês.',
  averagePrice: 'Faturamento ÷ quantidade vendida: quanto, em média, cada unidade vendida rendeu.',
  distribution:
    'Participação de cada classe no total do mês. A classe A reúne os poucos itens que concentram a maior parte do critério do relatório (geralmente ~80%), a B os intermediários e a C o restante. A classificação vem do sistema de origem.',
  ranking:
    'Itens ordenados por quantidade (ordem do relatório) ou por faturamento. A cor indica a classe; o tooltip mostra a participação acumulada, que é a base da curva de Pareto.',
  evolution:
    'Faturamento de cada mês importado, dividido por classe. Quando há relatório de lucro do mês, a linha mostra o lucro total para comparar com as vendas.',
  movement:
    'Compara cada item com o mês anterior importado, pelo código. Novo: não vendeu antes. Subiu/Caiu: mudou de classe (A é a melhor). Saiu: não vendeu neste mês.',
  items_table: 'Itens na ordem do relatório. Participação é o percentual informado pelo sistema; acumulado é a soma das participações até o item.',
  profit: 'Lucro = valor vendido − custo gerencial − impostos − taxas financeiras, somado em todos os itens do relatório de lucro do mês.',
  margin: 'Lucro ÷ valor vendido. Mostra quanto de cada real vendido vira lucro. A variação é relativa à margem do mês anterior.',
  cost: 'Soma do custo gerencial dos itens vendidos (custo de aquisição do produto). O percentual é custo ÷ valor vendido.',
  taxes: 'Soma de impostos e taxas financeiras (cartão, boleto) dos itens vendidos. O percentual é sobre o valor vendido.',
  profitWaterfall: 'Parte do valor vendido e desconta custo, impostos e taxas até chegar ao lucro do mês, como no relatório de lucro por produto.',
  classProfit:
    'Compara quanto cada classe representa em quantidade, faturamento e lucro. Se a classe A tem fatia de lucro menor que a de quantidade, ela vende muito mas lucra proporcionalmente menos.',
  matrix:
    'Cada ponto é um item: quanto mais à direita, mais vendido; quanto mais alto, maior a margem. As linhas tracejadas são a margem média e o volume médio do mês. Canto inferior direito: vende muito e lucra pouco. Canto superior esquerdo: margem alta, pouco explorada.',
  profitRanking: 'Itens ordenados pelo lucro em reais no mês. A cor indica a classe ABC; o tooltip mostra a margem e o lucro por unidade.',
  profitTable:
    'Valores do relatório de lucro por produto, com a classe da Curva ABC do mesmo mês. O alerta indica custo zerado, o que costuma ser falta de cadastro e infla a margem.',
}

const current = computed(() => analysis.value?.current)
const previous = computed(() => analysis.value?.previous)
const profitability = computed(() => analysis.value?.profitability ?? null)
const previousLabel = computed(() => (previous.value ? formatAbcMonth(previous.value.report) : undefined))
const currentLabel = computed(() => (current.value ? formatAbcMonth(current.value.report) : ''))
const currentIndex = computed(() => analysis.value?.months.findIndex((m) => m.report.id === current.value?.report.id))
const change = (now: number, before: number | undefined | null) => (before ? (now - before) / Math.abs(before) : null)
const shareOfRevenue = (value: number) => (profitability.value?.totals.revenue ? value / profitability.value.totals.revenue : 0)
const classLabel = (abcClass: AbcClass | null) => (abcClass ? `Classe ${abcClass}` : 'Sem classe na Curva ABC')
const classColor = (abcClass: AbcClass | null) => (abcClass ? theme.value.abcClass[abcClass] : theme.value.chrome.textMuted)

const kpis = computed(() => {
  const c = current.value
  if (!c) return []
  const p = previous.value
  const average = (s: { value: number; quantity: number }) => (s.quantity ? s.value / s.quantity : 0)
  return [
    { label: 'Faturamento', value: formatCurrencyCompact(c.value), delta: change(c.value, p?.value), info: INFO.revenue },
    { label: 'Quantidade vendida', value: formatNumber(c.quantity), delta: change(c.quantity, p?.quantity), info: INFO.quantity },
    { label: 'Itens vendidos', value: formatNumber(c.items), delta: change(c.items, p?.items), info: INFO.items },
    {
      label: 'Valor médio por unidade',
      value: formatCurrency(average(c)),
      delta: p ? change(average(c), average(p)) : null,
      info: INFO.averagePrice,
    },
  ]
})

const profitKpis = computed(() => {
  const data = profitability.value
  if (!data) return []
  const { totals, previousTotals } = data
  return [
    { label: 'Lucro', value: formatCurrencyCompact(totals.profit), delta: change(totals.profit, previousTotals?.profit), info: INFO.profit },
    {
      label: 'Margem de lucro',
      value: formatPercent(totals.margin ?? 0),
      delta: change(totals.margin ?? 0, previousTotals?.margin),
      info: INFO.margin,
    },
    {
      label: 'Custo gerencial',
      value: formatCurrencyCompact(totals.cost),
      hint: `${formatPercent(shareOfRevenue(totals.cost))} do valor vendido`,
      delta: change(totals.cost, previousTotals?.cost),
      lowerIsBetter: true,
      info: INFO.cost,
    },
    {
      label: 'Impostos e taxas',
      value: formatCurrencyCompact(totals.tax + totals.financialFee),
      hint: `${formatPercent(shareOfRevenue(totals.tax + totals.financialFee))} do valor vendido`,
      delta: previousTotals ? change(totals.tax + totals.financialFee, previousTotals.tax + previousTotals.financialFee) : null,
      lowerIsBetter: true,
      info: INFO.taxes,
    },
  ]
})

const classSegments = (pick: (abcClass: AbcClass) => number) =>
  ABC_CLASSES.map((abcClass) => ({ label: `Classe ${abcClass}`, value: pick(abcClass), color: theme.value.abcClass[abcClass] }))

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
  const hasProfit = months.some((m) => m.profitReport)
  return {
    categories: months.map((m) => formatAbcMonth(m.report)),
    series: [
      ...ABC_CLASSES.map((abcClass) => ({
        name: `Classe ${abcClass}`,
        type: 'bar' as const,
        stack: 'class',
        color: theme.value.abcClass[abcClass],
        data: months.map((m) => m.byClass[abcClass].value),
      })),
      ...(hasProfit
        ? [{ name: 'Lucro', type: 'line' as const, color: theme.value.chrome.text, data: months.map((m) => m.profitReport?.totals.profit ?? null) }]
        : []),
    ],
  }
})

const profitWaterfall = computed(() => {
  const totals = profitability.value?.totals
  if (!totals) return []
  return [
    { label: 'Valor vendido', value: totals.revenue, isTotal: true },
    { label: 'Custo gerencial', value: -totals.cost, isTotal: false },
    { label: 'Impostos', value: -totals.tax, isTotal: false },
    { label: 'Taxas financeiras', value: -totals.financialFee, isTotal: false },
    { label: 'Lucro', value: totals.profit, isTotal: true },
  ].filter((step) => step.isTotal || step.value !== 0)
})

const matrixPoints = computed(() =>
  (profitability.value?.items ?? [])
    .filter((item) => item.margin !== null && !item.costMissing)
    .map((item) => ({
      label: item.description,
      quantity: item.quantity,
      margin: item.margin!,
      profit: item.profit,
      color: classColor(item.abcClass),
      group: classLabel(item.abcClass),
    })),
)

const averageQuantity = computed(() => {
  const points = matrixPoints.value
  return points.length ? points.reduce((acc, p) => acc + p.quantity, 0) / points.length : 0
})

const profitRanking = computed(() =>
  (profitability.value?.items ?? []).map((item) => ({
    label: item.description,
    value: item.profit,
    color: classColor(item.abcClass),
    detail: `${classLabel(item.abcClass)} · margem ${formatPercent(item.margin ?? 0)}${item.profitPerUnit !== null ? ` · ${formatCurrency(item.profitPerUnit)}/un.` : ''}`,
  })),
)

const navSections = computed<NavSection[]>(() => {
  const data = analysis.value
  if (!data) return []
  return [
    { id: 'indicadores', label: 'Indicadores' },
    { id: 'analise', label: 'Pontos de análise' },
    { id: 'classes', label: 'Classes e ranking' },
    ...(data.months.length > 1 ? [{ id: 'evolucao', label: 'Evolução mensal' }] : []),
    ...(data.profitability
      ? [
          { id: 'lucratividade', label: 'Lucratividade' },
          { id: 'volume-margem', label: 'Volume × margem', nested: true },
          { id: 'lucro-por-item', label: 'Lucro por item', nested: true },
          { id: 'tabela-lucro', label: 'Tabela de lucro', nested: true },
        ]
      : []),
    ...(data.previous && data.movements.length ? [{ id: 'movimentacao', label: 'Movimentação' }] : []),
    { id: 'itens', label: 'Itens do mês' },
  ]
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
    <RouterLink :to="{ name: 'import' }" class="link">Importar relatórios</RouterLink>
  </div>

  <div v-else-if="current" class="space-y-6">
    <PageHeader
      title="Curva ABC"
      :subtitle="
        current.report.basis
          ? `Classificação por ${BASIS_LABELS[current.report.basis]}, como no relatório de origem`
          : 'Classificação conforme o relatório de origem'
      "
    />

    <div role="group" aria-label="Mês" class="flex animate-fade-up flex-wrap gap-2">
      <button
        v-for="month in analysis.months"
        :key="month.report.id"
        type="button"
        :aria-pressed="month.report.id === current.report.id"
        class="btn btn-sm"
        :class="month.report.id === current.report.id ? 'btn-primary' : 'btn-secondary'"
        @click="selectedId = month.report.id"
      >
        {{ formatAbcMonth(month.report) }}
      </button>
    </div>

    <ReportLayout :sections="navSections">
      <PageSection id="indicadores" class="space-y-3">
        <SectionHeading title="Indicadores de vendas" :subtitle="`Resultado de ${currentLabel}`" />
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
            :info="kpi.info"
          />
        </div>
      </PageSection>

      <PageSection id="analise" class="space-y-3">
        <SectionHeading title="Pontos de análise" subtitle="Vendas e classificação ABC" />
        <InsightList :insights="insights" />
      </PageSection>

      <PageSection id="classes" class="grid gap-3 lg:grid-cols-5">
        <ChartCard
          title="Distribuição por classe"
          :subtitle="`Quanto cada classe representa em ${currentLabel}`"
          :info="INFO.distribution"
          class="animate-fade-up lg:col-span-2"
        >
          <div class="space-y-5">
            <ShareBar title="Itens" :segments="classSegments((c) => current!.byClass[c].items)" :format-value="(v) => `${formatNumber(v)} itens`" />
            <ShareBar title="Quantidade" :segments="classSegments((c) => current!.byClass[c].quantity)" :format-value="(v) => `${formatNumber(v)} un.`" />
            <ShareBar title="Faturamento" :segments="classSegments((c) => current!.byClass[c].value)" :format-value="formatCurrency" />
            <ShareBar
              v-if="profitability"
              title="Lucro"
              :segments="classSegments((c) => Math.max(0, profitability!.byClass[c].profit))"
              :format-value="formatCurrency"
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Ranking de itens"
          subtitle="Cor indica a classe ABC"
          :info="INFO.ranking"
          class="animate-fade-up stagger lg:col-span-3"
          style="--i: 1"
        >
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <ul class="flex gap-4 text-xs text-fg-subtle" aria-label="Legenda">
              <li v-for="abcClass in ABC_CLASSES" :key="abcClass" class="flex items-center gap-1.5">
                <span class="size-2.5 rounded-sm" :style="{ background: theme.abcClass[abcClass] }" />Classe {{ abcClass }}
              </li>
            </ul>
            <SegmentedControl v-model="rankingBy" :options="RANKING_OPTIONS" label="Ordenar por" size="sm" />
          </div>
          <RankingBarChart
            :items="rankingItems"
            :value-label="rankingBy === 'quantity' ? 'Quantidade' : 'Faturamento'"
            :format-value="rankingBy === 'quantity' ? formatNumber : formatCurrency"
            :format-axis="rankingBy === 'quantity' ? formatNumber : formatCurrencyCompact"
          />
        </ChartCard>
      </PageSection>

      <PageSection v-if="analysis.months.length > 1" id="evolucao">
        <ChartCard
          title="Evolução mensal"
          subtitle="Faturamento por classe em cada mês importado"
          :info="INFO.evolution"
          class="animate-fade-up"
        >
          <TrendChart :categories="evolution.categories" :series="evolution.series" :highlight-index="currentIndex" />
        </ChartCard>
      </PageSection>

      <PageSection v-if="profitability" id="lucratividade" class="space-y-6 border-t border-line pt-8">
        <SectionHeading
          title="Lucratividade"
          :subtitle="`Cruzamento da Curva ABC com o relatório de lucro por produto de ${currentLabel}`"
        />

        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            v-for="(kpi, i) in profitKpis"
            :key="kpi.label"
            class="animate-fade-up stagger"
            :style="{ '--i': i }"
            :label="kpi.label"
            :value="kpi.value"
            :hint="kpi.hint"
            :delta="kpi.delta"
            :delta-label="previousLabel"
            :lower-is-better="kpi.lowerIsBetter"
            :info="kpi.info"
          />
        </div>

        <InsightList :insights="profitInsights" />

        <div class="grid gap-3 lg:grid-cols-2">
          <ChartCard title="Da venda ao lucro" :subtitle="`Composição do resultado de ${currentLabel}`" :info="INFO.profitWaterfall">
            <WaterfallChart :steps="profitWaterfall" />
          </ChartCard>

          <ChartCard title="Lucro por classe" subtitle="Fatia de cada classe em quantidade, faturamento e lucro" :info="INFO.classProfit">
            <div class="space-y-5">
              <ShareBar title="Quantidade" :segments="classSegments((c) => current!.byClass[c].quantity)" :format-value="(v) => `${formatNumber(v)} un.`" />
              <ShareBar title="Faturamento" :segments="classSegments((c) => current!.byClass[c].value)" :format-value="formatCurrency" />
              <ShareBar title="Lucro" :segments="classSegments((c) => Math.max(0, profitability!.byClass[c].profit))" :format-value="formatCurrency" />
              <dl class="grid grid-cols-3 gap-2 text-center text-xs">
                <div v-for="abcClass in ABC_CLASSES" :key="abcClass" class="rounded-lg bg-surface-muted p-2">
                  <dt class="text-fg-subtle">Margem classe {{ abcClass }}</dt>
                  <dd class="text-base font-semibold text-fg">{{ formatPercent(profitability.byClass[abcClass].margin ?? 0) }}</dd>
                </div>
              </dl>
            </div>
          </ChartCard>
        </div>

        <PageSection id="volume-margem">
          <ChartCard title="Volume × margem" subtitle="Onde está o lucro de verdade" :info="INFO.matrix">
            <ul class="mb-2 flex flex-wrap gap-4 text-xs text-fg-subtle" aria-label="Legenda">
              <li v-for="abcClass in ABC_CLASSES" :key="abcClass" class="flex items-center gap-1.5">
                <span class="size-2.5 rounded-full" :style="{ background: theme.abcClass[abcClass] }" />Classe {{ abcClass }}
              </li>
            </ul>
            <VolumeMarginChart
              :points="matrixPoints"
              :average-margin="profitability.totals.margin ?? 0"
              :average-quantity="averageQuantity"
            />
          </ChartCard>
        </PageSection>

        <PageSection id="lucro-por-item">
          <ChartCard title="Lucro por item" subtitle="Do mais ao menos lucrativo" :info="INFO.profitRanking">
            <RankingBarChart
              :items="profitRanking"
              value-label="Lucro"
              :format-value="formatCurrency"
              :format-axis="formatCurrencyCompact"
            />
          </ChartCard>
        </PageSection>

        <PageSection id="tabela-lucro" class="space-y-3">
          <SectionHeading :title="`Lucratividade por item: ${currentLabel}`" :info="INFO.profitTable" />
          <div class="card overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-surface-muted text-left">
                <tr>
                  <th class="px-3 py-2 font-medium">Item</th>
                  <th class="px-3 py-2 font-medium">Classe</th>
                  <th class="px-3 py-2 text-right font-medium">Qtde</th>
                  <th class="px-3 py-2 text-right font-medium">Valor vendido</th>
                  <th class="px-3 py-2 text-right font-medium">Custo</th>
                  <th class="px-3 py-2 text-right font-medium">Impostos e taxas</th>
                  <th class="px-3 py-2 text-right font-medium">Lucro</th>
                  <th class="px-3 py-2 text-right font-medium">Margem</th>
                  <th class="px-3 py-2 text-right font-medium">Lucro/un.</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line tabular-nums">
                <tr
                  v-for="item in profitability.items"
                  :key="item.code"
                  class="transition-colors duration-(--duration-fast) hover:bg-accent-soft/30"
                >
                  <td class="px-3 py-2">
                    <span class="inline-flex items-center gap-1.5">
                      {{ item.description }}
                      <span v-if="item.costMissing" class="inline-flex text-danger" title="Custo não cadastrado">
                        <PhWarning :size="16" weight="fill" aria-hidden="true" />
                        <span class="sr-only">Custo não cadastrado</span>
                      </span>
                    </span>
                  </td>
                  <td class="px-3 py-2"><AbcBadge :abc-class="item.abcClass" /></td>
                  <td class="px-3 py-2 text-right">{{ formatNumber(item.quantity) }}</td>
                  <td class="px-3 py-2 text-right">{{ formatCurrency(item.revenue) }}</td>
                  <td class="px-3 py-2 text-right">{{ formatCurrency(item.cost) }}</td>
                  <td class="px-3 py-2 text-right">{{ formatCurrency(item.tax + item.financialFee) }}</td>
                  <td class="px-3 py-2 text-right font-medium" :class="item.profit < 0 && 'text-danger'">{{ formatCurrency(item.profit) }}</td>
                  <td class="px-3 py-2 text-right">{{ item.margin !== null ? formatPercent(item.margin) : '–' }}</td>
                  <td class="px-3 py-2 text-right text-fg-subtle">{{ item.profitPerUnit !== null ? formatCurrency(item.profitPerUnit) : '–' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </PageSection>
      </PageSection>

      <div v-else class="card flex animate-fade-up items-start gap-3 border-dashed p-4 text-sm text-fg-muted">
        <PhWarning :size="20" class="shrink-0 text-fg-subtle" aria-hidden="true" />
        <p>
          Importe o relatório de <strong class="font-medium text-fg">lucro por produto</strong> de {{ currentLabel }} para ver a
          lucratividade cruzada com a Curva ABC.
        </p>
      </div>

      <PageSection v-if="previous && analysis.movements.length" id="movimentacao" class="space-y-3">
        <SectionHeading :title="`Movimentação: ${previousLabel} → ${currentLabel}`" :info="INFO.movement" />
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
      </PageSection>

      <PageSection id="itens" class="space-y-3">
        <SectionHeading :title="`Itens de ${currentLabel}`" :info="INFO.items_table" />
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
      </PageSection>
    </ReportLayout>
  </div>
</template>
