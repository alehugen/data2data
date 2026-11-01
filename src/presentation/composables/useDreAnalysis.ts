import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { DreAnalysis, DreSelection } from '@/application'
import { DreMetric, type DreReport } from '@/domain/dre'
import type { Identifier } from '@/domain/shared'
import { container } from '@/infrastructure/container'
import type { InsightItem } from '@/presentation/components/InsightList.vue'
import {
  formatCurrencyCompact,
  formatPercent,
  formatPeriod,
  formatPeriodLong,
  prettifyLabel,
} from '@/presentation/format'
import { useReports } from './useReports'

export const DRE_METRIC_LABELS: Record<DreMetric, string> = {
  grossRevenue: 'Receita bruta',
  salesTaxes: 'Impostos sobre venda',
  grossProfit: 'Lucro bruto',
  contributionMargin: 'Margem de contribuição',
  operatingExpenses: 'Despesas operacionais',
  ebitda: 'EBITDA',
  netIncome: 'Resultado líquido',
  endingCash: 'Saldo de caixa',
}

export const DRE_MARGIN_LABELS: Partial<Record<DreMetric, string>> = {
  grossProfit: 'Margem bruta',
  contributionMargin: 'Margem de contribuição',
  ebitda: 'Margem EBITDA',
  netIncome: 'Margem líquida',
}

const selectionKey = (s: DreSelection) => (s.type === 'month' ? `m:${s.index}` : `y:${s.year}`)

export function useDreAnalysis(id: MaybeRefOrGetter<Identifier>) {
  const { dreReports } = useReports()
  const report = computed(() => dreReports.value.find((r) => r.id === toValue(id)) ?? null)

  const selections = computed(() => (report.value ? container.analyzeDre.selections(report.value) : []))
  const selectedKey = ref('')
  // Padrão: mês mais recente
  watch(
    selections,
    (options) => {
      if (!options.some((o) => selectionKey(o) === selectedKey.value)) {
        selectedKey.value = options[0] ? selectionKey(options[0]) : ''
      }
    },
    { immediate: true },
  )

  const selection = computed(() => selections.value.find((o) => selectionKey(o) === selectedKey.value) ?? null)

  const analysis = computed(() =>
    report.value && selection.value ? container.analyzeDre.execute(report.value, selection.value) : null,
  )

  const labelOf = (s: DreSelection) =>
    report.value && s.type === 'month' ? formatPeriod(report.value.periods[s.index]!) : `Acumulado ${'year' in s ? s.year : ''}`

  /** Nome do período selecionado e do período de comparação, para títulos e deltas. */
  const periodLabels = computed(() => {
    const r = report.value
    const a = analysis.value
    const s = selection.value
    if (!r || !a || !s) return { current: '', currentLong: '', previous: '' }
    const previous = a.previousIndexes
      ? s.type === 'month'
        ? formatPeriod(r.periods[a.previousIndexes[0]!]!)
        : `${s.year - 1}`
      : ''
    return {
      current: labelOf(s),
      currentLong: s.type === 'month' ? formatPeriodLong(r.periods[s.index]!) : `acumulado de ${s.year}`,
      previous,
    }
  })

  const insights = computed(() =>
    report.value && analysis.value ? buildInsights(report.value, analysis.value, periodLabels.value) : [],
  )

  return {
    report,
    selections: computed(() => selections.value.map((s) => ({ key: selectionKey(s), label: labelOf(s), type: s.type }))),
    selectedKey,
    analysis,
    periodLabels,
    insights,
  }
}

/** Traduz os fatos da análise em frases curtas, no estilo de um relatório gerencial. */
function buildInsights(
  report: DreReport,
  analysis: DreAnalysis,
  labels: { current: string; previous: string },
): InsightItem[] {
  const { facts, kpis, breakEven } = analysis
  const items: InsightItem[] = []
  const kpi = (metric: DreMetric) => kpis.find((k) => k.metric === metric)

  if (facts.revenueChange !== null && labels.previous) {
    const up = facts.revenueChange >= 0
    items.push({
      title: up ? 'Receita em alta' : 'Receita em queda',
      description: `A receita bruta ${up ? 'cresceu' : 'caiu'} ${formatPercent(Math.abs(facts.revenueChange))} em relação a ${labels.previous}.`,
      tone: up ? 'positive' : 'negative',
    })
  }

  const ebitda = kpi(DreMetric.Ebitda)
  if (ebitda) {
    const positive = ebitda.value >= 0
    items.push({
      title: positive ? 'Operação lucrativa' : 'Operação no prejuízo',
      description: `EBITDA de ${formatCurrencyCompact(ebitda.value)} em ${labels.current}${ebitda.margin !== null ? `, margem de ${formatPercent(ebitda.margin)}` : ''}.`,
      tone: positive ? 'positive' : 'negative',
    })
  }

  if (breakEven) {
    const gap = breakEven.actual / breakEven.revenue - 1
    items.push({
      title: 'Ponto de equilíbrio',
      description: `São necessários ${formatCurrencyCompact(breakEven.revenue)} de receita para cobrir as despesas fixas; a receita ficou ${formatPercent(Math.abs(gap))} ${gap >= 0 ? 'acima' : 'abaixo'}.`,
      tone: gap >= 0 ? 'positive' : 'negative',
    })
  }

  if (facts.topExpense) {
    items.push({
      title: 'Maior peso nos custos',
      description: `${prettifyLabel(facts.topExpense.label)} consome ${formatPercent(facts.topExpense.share)} da receita.`,
      tone: 'neutral',
    })
  }

  if (facts.positiveEbitdaMonths !== null) {
    const ratio = facts.positiveEbitdaMonths / facts.recentMonths
    items.push({
      title: 'Consistência do resultado',
      description: `EBITDA positivo em ${facts.positiveEbitdaMonths} dos últimos ${facts.recentMonths} meses.`,
      tone: ratio >= 0.5 ? 'positive' : 'negative',
    })
  }

  if (facts.negativeCashMonths !== null) {
    items.push(
      facts.negativeCashMonths
        ? {
            title: 'Pressão no caixa',
            description: `O saldo de caixa terminou negativo em ${facts.negativeCashMonths} dos últimos ${facts.recentMonths} meses.`,
            tone: 'negative',
          }
        : {
            title: 'Caixa saudável',
            description: `O saldo de caixa ficou positivo em todos os últimos ${facts.recentMonths} meses.`,
            tone: 'positive',
          },
    )
  }

  if (facts.bestRevenue) {
    items.push({
      title: 'Melhor mês de receita',
      description: `${formatPeriodLong(report.periods[facts.bestRevenue.index]!)} com ${formatCurrencyCompact(facts.bestRevenue.value)}.`,
      tone: 'neutral',
    })
  }

  if (facts.averageContributionMargin !== null) {
    items.push({
      title: 'Margem de contribuição média',
      description: `${formatPercent(facts.averageContributionMargin)} nos últimos ${facts.recentMonths} meses: de cada R$ 100 vendidos, sobram R$ ${Math.round(facts.averageContributionMargin * 100)} para pagar as despesas fixas.`,
      tone: 'neutral',
    })
  }

  return items
}
