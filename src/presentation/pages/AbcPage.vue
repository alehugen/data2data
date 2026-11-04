<script setup lang="ts">
import { PhWarning } from '@phosphor-icons/vue'
import { computed, ref } from 'vue'
import { AbcMovement } from '@/application'
import { ABC_CLASSES, type AbcClass } from '@/domain/abc'
import { ratio, relativeChange } from '@/domain/shared'
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
import StatGrid from '@/presentation/components/StatGrid.vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/components/ui/table'
import { Badge } from '@/presentation/components/ui/badge'
import { Button } from '@/presentation/components/ui/button'
import { Card } from '@/presentation/components/ui/card'
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
    'Itens ordenados pela quantidade vendida ou pelo faturamento, conforme a opção escolhida. A cor indica a classe ABC do item.',
  evolution:
    'Faturamento de cada mês importado, dividido por classe. Quando há relatório de lucro do mês, a linha mostra o lucro total para comparar com as vendas.',
  movement:
    'Compara cada item com o mês anterior importado, pelo código. Novo: não vendeu antes. Subiu/Caiu: mudou de classe (A é a melhor). Saiu: não vendeu neste mês.',
  items_table: 'Itens ordenados pela participação. Participação é o percentual informado pelo sistema ou, sem essa coluna, a fatia no critério de classificação; acumulado é a soma das participações até o item.',
  profit: 'Lucro informado no relatório de lucro do mês, somado em todos os itens. O app confere se ele bate com valor vendido − custo gerencial − impostos − taxas financeiras e avisa nos pontos de análise quando não bate.',
  margin: 'Lucro ÷ valor vendido. Mostra quanto de cada real vendido vira lucro. A variação é em pontos percentuais (p.p.): de 20% para 22% são +2 p.p.',
  cost: 'Soma do custo gerencial dos itens vendidos (custo de aquisição do produto). O percentual é custo ÷ valor vendido.',
  taxes: 'Soma de impostos e taxas financeiras (cartão, boleto) dos itens vendidos. O percentual é sobre o valor vendido.',
  profitWaterfall: 'Parte do valor vendido e desconta custo, impostos e taxas até o lucro informado no relatório. Quando a conta não fecha, a barra "Diferença não explicada" mostra quanto falta ou sobra.',
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
const shareOfRevenue = (value: number) => ratio(value, profitability.value?.totals.revenue ?? 0) ?? 0
const classLabel = (abcClass: AbcClass | null) => (abcClass ? `Classe ${abcClass}` : 'Sem classe na Curva ABC')
const classColor = (abcClass: AbcClass | null) => (abcClass ? theme.value.abcClass[abcClass] : theme.value.chrome.textMuted)

const kpis = computed(() => {
  const c = current.value
  if (!c) return []
  const p = previous.value
  const average = (s: { value: number; quantity: number }) => (s.quantity ? s.value / s.quantity : 0)
  return [
    { label: 'Faturamento', value: formatCurrencyCompact(c.value), delta: relativeChange(c.value, p?.value), info: INFO.revenue },
    { label: 'Quantidade vendida', value: formatNumber(c.quantity), delta: relativeChange(c.quantity, p?.quantity), info: INFO.quantity },
    { label: 'Itens vendidos', value: formatNumber(c.items), delta: relativeChange(c.items, p?.items), info: INFO.items },
    {
      label: 'Valor médio por unidade',
      value: formatCurrency(average(c)),
      delta: p ? relativeChange(average(c), average(p)) : null,
      info: INFO.averagePrice,
    },
  ]
})

const profitKpis = computed(() => {
  const data = profitability.value
  if (!data) return []
  const { totals, previousTotals } = data
  return [
    { label: 'Lucro', value: formatCurrencyCompact(totals.profit), delta: relativeChange(totals.profit, previousTotals?.profit), info: INFO.profit },
    {
      label: 'Margem de lucro',
      value: totals.margin !== null ? formatPercent(totals.margin) : '–',
      delta: totals.margin !== null && previousTotals?.margin != null ? totals.margin - previousTotals.margin : null,
      deltaUnit: 'points' as const,
      info: INFO.margin,
    },
    {
      label: 'Custo gerencial',
      value: formatCurrencyCompact(totals.cost),
      hint: `${formatPercent(shareOfRevenue(totals.cost))} do valor vendido`,
      delta: relativeChange(totals.cost, previousTotals?.cost),
      lowerIsBetter: true,
      info: INFO.cost,
    },
    {
      label: 'Impostos e taxas',
      value: formatCurrencyCompact(totals.tax + totals.financialFee),
      hint: `${formatPercent(shareOfRevenue(totals.tax + totals.financialFee))} do valor vendido`,
      delta: previousTotals ? relativeChange(totals.tax + totals.financialFee, previousTotals.tax + previousTotals.financialFee) : null,
      lowerIsBetter: true,
      info: INFO.taxes,
    },
  ]
})

const classSegments = (pick: (abcClass: AbcClass) => number) =>
  ABC_CLASSES.map((abcClass) => ({ label: `Classe ${abcClass}`, value: pick(abcClass), color: theme.value.abcClass[abcClass] }))

const profitSegments = computed(() => {
  const data = profitability.value
  if (!data) return []
  const segments = classSegments((c) => data.byClass[c].profit)
  return data.outsideAbc.profit
    ? [...segments, { label: 'Fora da curva', value: data.outsideAbc.profit, color: theme.value.chrome.textMuted }]
    : segments
})

const rankingItems = computed(() => {
  const pick = (item: { quantity: number; value: number }) => (rankingBy.value === 'quantity' ? item.quantity : item.value)
  return [...(analysis.value?.ranking ?? [])]
    .sort((a, b) => pick(b) - pick(a))
    .map((item) => ({
      label: item.description,
      value: pick(item),
      color: theme.value.abcClass[item.abcClass],
      detail:
        rankingBy.value === 'quantity'
          ? `Classe ${item.abcClass}, ${formatCurrency(item.value)}`
          : `Classe ${item.abcClass}, ${formatNumber(item.quantity)} un.`,
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
  const data = profitability.value
  if (!data) return []
  const { totals, profitCheck } = data
  return [
    { label: 'Valor vendido', value: totals.revenue, isTotal: true },
    { label: 'Custo gerencial', value: -totals.cost, isTotal: false },
    { label: 'Impostos', value: -totals.tax, isTotal: false },
    { label: 'Taxas financeiras', value: -totals.financialFee, isTotal: false },
    { label: 'Diferença não explicada', value: profitCheck.divergent.length ? profitCheck.difference : 0, isTotal: false },
    { label: 'Lucro informado', value: totals.profit, isTotal: true },
  ].filter((step) => step.isTotal || Math.abs(step.value) >= 0.005)
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
    detail: `${classLabel(item.abcClass)}, margem de ${formatPercent(item.margin ?? 0)}${item.profitPerUnit !== null ? `, ${formatCurrency(item.profitPerUnit)}/un.` : ''}`,
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
  new: 'bg-accent text-accent-foreground',
  up: 'bg-success-soft text-success',
  down: 'bg-destructive-soft text-destructive',
  gone: 'bg-muted text-muted-foreground',
  same: 'bg-transparent text-muted-foreground',
}
</script>

<template>
  <div v-if="!analysis" class="max-w-xl space-y-3 py-8">
    <h1 class="text-4xl font-bold tracking-tight">Curva ABC</h1>
    <p class="text-body">Nenhum relatório de Curva ABC importado ainda.</p>
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

    <div role="group" aria-label="Mês" class="flex flex-wrap gap-2">
      <Button
        v-for="month in analysis.months"
        :key="month.report.id"
        size="sm"
        :variant="month.report.id === current.report.id ? 'default' : 'outline'"
        :aria-pressed="month.report.id === current.report.id"
        class="min-w-16"
        @click="selectedId = month.report.id"
      >
        {{ formatAbcMonth(month.report) }}
      </Button>
    </div>

    <ReportLayout :sections="navSections">
      <PageSection id="indicadores" class="space-y-3">
        <SectionHeading title="Indicadores de vendas" :subtitle="`Resultado de ${currentLabel}`" />
        <StatGrid columns="grid-cols-2 lg:grid-cols-4">
          <StatCard
            v-for="kpi in kpis"
            :key="kpi.label"
            :label="kpi.label"
            :value="kpi.value"
            :delta="kpi.delta"
            :delta-label="previousLabel"
            :info="kpi.info"
          />
        </StatGrid>
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
          class="lg:col-span-2"
        >
          <div class="space-y-5">
            <ShareBar title="Itens" :segments="classSegments((c) => current!.byClass[c].items)" :format-value="(v) => `${formatNumber(v)} itens`" />
            <ShareBar title="Quantidade" :segments="classSegments((c) => current!.byClass[c].quantity)" :format-value="(v) => `${formatNumber(v)} un.`" />
            <ShareBar title="Faturamento" :segments="classSegments((c) => current!.byClass[c].value)" :format-value="formatCurrency" />
            <ShareBar
              v-if="profitability"
              title="Lucro"
              :segments="profitSegments"
              :format-value="formatCurrency"
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Ranking de itens"
          subtitle="Cor indica a classe ABC"
          :info="INFO.ranking"
          class="lg:col-span-3"
        >
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <ul class="flex gap-4 text-xs text-muted-foreground" aria-label="Legenda">
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
        >
          <TrendChart :categories="evolution.categories" :series="evolution.series" :highlight-index="currentIndex" />
        </ChartCard>
      </PageSection>

      <PageSection v-if="profitability" id="lucratividade" class="space-y-6 border-t border-border pt-8">
        <SectionHeading
          title="Lucratividade"
          :subtitle="`Cruzamento da Curva ABC com o relatório de lucro por produto de ${currentLabel}`"
        />

        <StatGrid columns="grid-cols-2 lg:grid-cols-4">
          <StatCard
            v-for="kpi in profitKpis"
            :key="kpi.label"
            :label="kpi.label"
            :value="kpi.value"
            :hint="kpi.hint"
            :delta="kpi.delta"
            :delta-label="previousLabel"
            :delta-unit="kpi.deltaUnit"
            :lower-is-better="kpi.lowerIsBetter"
            :info="kpi.info"
          />
        </StatGrid>

        <InsightList :insights="profitInsights" />

        <div class="grid gap-3 lg:grid-cols-2">
          <ChartCard title="Da venda ao lucro" :subtitle="`Composição do resultado de ${currentLabel}`" :info="INFO.profitWaterfall">
            <WaterfallChart :steps="profitWaterfall" />
          </ChartCard>

          <ChartCard title="Lucro por classe" subtitle="Fatia de cada classe em quantidade, faturamento e lucro" :info="INFO.classProfit">
            <div class="space-y-5">
              <ShareBar title="Quantidade" :segments="classSegments((c) => current!.byClass[c].quantity)" :format-value="(v) => `${formatNumber(v)} un.`" />
              <ShareBar title="Faturamento" :segments="classSegments((c) => current!.byClass[c].value)" :format-value="formatCurrency" />
              <ShareBar title="Lucro" :segments="profitSegments" :format-value="formatCurrency" />
              <dl class="grid grid-cols-3 gap-2 text-center text-xs">
                <div v-for="abcClass in ABC_CLASSES" :key="abcClass" class="rounded-lg bg-muted p-2">
                  <dt class="text-muted-foreground">Margem classe {{ abcClass }}</dt>
                  <dd class="text-base font-semibold text-foreground">{{ profitability.byClass[abcClass].margin !== null ? formatPercent(profitability.byClass[abcClass].margin!) : '–' }}</dd>
                </div>
              </dl>
            </div>
          </ChartCard>
        </div>

        <PageSection id="volume-margem">
          <ChartCard title="Volume × margem" subtitle="Onde está o lucro de verdade" :info="INFO.matrix">
            <ul class="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Legenda">
              <li v-for="abcClass in ABC_CLASSES" :key="abcClass" class="flex items-center gap-1.5">
                <span class="size-2.5 rounded-full" :style="{ background: theme.abcClass[abcClass] }" />Classe {{ abcClass }}
              </li>
            </ul>
            <VolumeMarginChart
              :points="matrixPoints"
              :average-margin="profitability.referenceMargin ?? 0"
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
          <Card class="gap-0 py-0">
            <Table>
              <TableHeader class="bg-muted/60">
                <TableRow>
                  <TableHead class="px-3 py-2 font-medium">Item</TableHead>
                  <TableHead class="px-3 py-2 font-medium">Classe</TableHead>
                  <TableHead class="px-3 py-2 text-right font-medium">Qtde</TableHead>
                  <TableHead class="px-3 py-2 text-right font-medium">Valor vendido</TableHead>
                  <TableHead class="px-3 py-2 text-right font-medium">Custo</TableHead>
                  <TableHead class="px-3 py-2 text-right font-medium">Impostos e taxas</TableHead>
                  <TableHead class="px-3 py-2 text-right font-medium">Lucro</TableHead>
                  <TableHead class="px-3 py-2 text-right font-medium">Margem</TableHead>
                  <TableHead class="px-3 py-2 text-right font-medium">Lucro/un.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody class="tabular-nums">
                <TableRow v-for="item in profitability.items" :key="item.code">
                  <TableCell class="px-3 py-2">
                    <span class="inline-flex items-center gap-1.5">
                      {{ item.description }}
                      <span v-if="item.costMissing" class="inline-flex text-destructive" title="Custo não cadastrado">
                        <PhWarning :size="16" weight="fill" aria-hidden="true" />
                        <span class="sr-only">Custo não cadastrado</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell class="px-3 py-2"><AbcBadge :abc-class="item.abcClass" /></TableCell>
                  <TableCell class="px-3 py-2 text-right">{{ formatNumber(item.quantity) }}</TableCell>
                  <TableCell class="px-3 py-2 text-right">{{ formatCurrency(item.revenue) }}</TableCell>
                  <TableCell class="px-3 py-2 text-right">{{ formatCurrency(item.cost) }}</TableCell>
                  <TableCell class="px-3 py-2 text-right">{{ formatCurrency(item.tax + item.financialFee) }}</TableCell>
                  <TableCell class="px-3 py-2 text-right font-medium" :class="item.profit < 0 && 'text-destructive'">{{ formatCurrency(item.profit) }}</TableCell>
                  <TableCell class="px-3 py-2 text-right">{{ item.margin !== null ? formatPercent(item.margin) : '–' }}</TableCell>
                  <TableCell class="px-3 py-2 text-right text-muted-foreground">{{ item.profitPerUnit !== null ? formatCurrency(item.profitPerUnit) : '–' }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </PageSection>
      </PageSection>

      <Card v-else class="flex-row items-start gap-3 border border-dashed bg-muted/40 p-4 text-sm text-body shadow-none ring-0">
        <PhWarning :size="20" class="shrink-0 text-muted-foreground" aria-hidden="true" />
        <p>
          Importe o relatório de <strong class="font-medium text-foreground">lucro por produto</strong> de {{ currentLabel }} para ver a
          lucratividade cruzada com a Curva ABC.
        </p>
      </Card>

      <PageSection v-if="previous && analysis.movements.length" id="movimentacao" class="space-y-3">
        <SectionHeading :title="`Movimentação: ${previousLabel} → ${currentLabel}`" :info="INFO.movement" />
        <Card class="gap-0 py-0">
          <Table>
            <TableHeader class="bg-muted/60">
              <TableRow>
                <TableHead class="px-3 py-2 font-medium">Item</TableHead>
                <TableHead class="px-3 py-2 font-medium">Classe</TableHead>
                <TableHead class="px-3 py-2 font-medium">Situação</TableHead>
                <TableHead class="px-3 py-2 text-right font-medium">Quantidade</TableHead>
                <TableHead class="px-3 py-2 text-right font-medium">Faturamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody class="tabular-nums">
              <TableRow v-for="m in analysis.movements" :key="m.code">
                <TableCell class="px-3 py-2">{{ m.description }}</TableCell>
                <TableCell class="px-3 py-2 whitespace-nowrap">
                  <span class="inline-flex items-center gap-1.5">
                    <AbcBadge :abc-class="m.from" />
                    <span aria-hidden="true" class="text-muted-foreground">→</span>
                    <AbcBadge :abc-class="m.to" />
                  </span>
                </TableCell>
                <TableCell class="px-3 py-2">
                  <Badge :class="movementTone[m.movement]">{{ MOVEMENT_LABELS[m.movement] }}</Badge>
                </TableCell>
                <TableCell class="px-3 py-2 text-right whitespace-nowrap">
                  {{ formatNumber(m.quantity) }}
                  <span class="ml-1 text-xs" :class="m.quantity - m.previousQuantity >= 0 ? 'text-success' : 'text-destructive'">
                    ({{ m.quantity - m.previousQuantity >= 0 ? '+' : '' }}{{ formatNumber(m.quantity - m.previousQuantity) }})
                  </span>
                </TableCell>
                <TableCell class="px-3 py-2 text-right whitespace-nowrap">
                  {{ formatCurrency(m.value) }}
                  <span class="ml-1 text-xs" :class="m.value - m.previousValue >= 0 ? 'text-success' : 'text-destructive'">
                    ({{ m.value - m.previousValue >= 0 ? '+' : '' }}{{ formatCurrencyCompact(m.value - m.previousValue) }})
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </PageSection>

      <PageSection id="itens" class="space-y-3">
        <SectionHeading :title="`Itens de ${currentLabel}`" :info="INFO.items_table" />
        <Card class="gap-0 py-0">
          <Table>
            <TableHeader class="bg-muted/60">
              <TableRow>
                <TableHead class="px-3 py-2 font-medium">#</TableHead>
                <TableHead class="px-3 py-2 font-medium">Item</TableHead>
                <TableHead class="px-3 py-2 font-medium">Classe</TableHead>
                <TableHead class="px-3 py-2 text-right font-medium">Quantidade</TableHead>
                <TableHead class="px-3 py-2 text-right font-medium">Participação</TableHead>
                <TableHead class="px-3 py-2 text-right font-medium">Acumulado</TableHead>
                <TableHead class="px-3 py-2 text-right font-medium">Faturamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody class="tabular-nums">
              <TableRow v-for="(item, i) in analysis.ranking" :key="item.code">
                <TableCell class="px-3 py-2 text-muted-foreground">{{ i + 1 }}</TableCell>
                <TableCell class="px-3 py-2">{{ item.description }}</TableCell>
                <TableCell class="px-3 py-2"><AbcBadge :abc-class="item.abcClass" /></TableCell>
                <TableCell class="px-3 py-2 text-right">{{ formatNumber(item.quantity) }}</TableCell>
                <TableCell class="px-3 py-2 text-right">{{ formatPercent(item.share) }}</TableCell>
                <TableCell class="px-3 py-2 text-right text-muted-foreground">{{ formatPercent(item.cumulativeShare) }}</TableCell>
                <TableCell class="px-3 py-2 text-right">{{ formatCurrency(item.value) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </PageSection>
    </ReportLayout>
  </div>
</template>
