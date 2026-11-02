import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { DreAnalysis, DreSelection } from '@/application'
import { DreMetric, type DreReport } from '@/domain/dre'
import type { Identifier } from '@/domain/shared'
import type { Insight } from '@/domain/analysis'
import { container } from '@/infrastructure/container'
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

const COMPARISON = 'A variação compara com o mês anterior ou, no acumulado do ano, com os mesmos meses do ano anterior.'

export const DRE_METRIC_INFO: Record<DreMetric, string> = {
  grossRevenue: `Soma das receitas operacionais do período (linha "Receita operacional bruta" da DRE). ${COMPARISON}`,
  salesTaxes: `Impostos sobre as vendas do período. ${COMPARISON}`,
  grossProfit: `Receita bruta − impostos sobre venda − custos das mercadorias e dos serviços vendidos. Margem bruta = lucro bruto ÷ receita bruta. ${COMPARISON}`,
  contributionMargin: `Lucro bruto − despesas variáveis: o que sobra das vendas para pagar as despesas fixas. Percentual = margem ÷ receita bruta. ${COMPARISON}`,
  operatingExpenses: `Soma das despesas fixas da operação (pessoal, aluguel, serviços...). ${COMPARISON}`,
  ebitda: `Margem de contribuição − despesas operacionais + outras receitas operacionais. Mostra o resultado da operação antes de itens não desembolsáveis e movimentações não operacionais. ${COMPARISON}`,
  netIncome: `EBITDA − despesas não desembolsáveis ± entradas e saídas não operacionais (aplicações, transferências). Margem líquida = resultado ÷ receita bruta. ${COMPARISON}`,
  endingCash: 'Saldo final de caixa do último mês do período (saldo inicial + variação do mês). Não é somado entre meses. A variação compara com o saldo do período anterior.',
}

const selectionKey =(s: DreSelection) => (s.type === 'month' ? `m:${s.index}` : `y:${s.year}`)

export function useDreAnalysis(id: MaybeRefOrGetter<Identifier>) {
  const { dreReports } = useReports()
  const report = computed(() => dreReports.value.find((r) => r.id === toValue(id)) ?? null)

  const selections = computed(() => (report.value ? container.analyzeDre.selections(report.value) : []))
  const selectedKey = ref('')
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
    s.type === 'year' ? `Acumulado ${s.year}` : report.value ? formatPeriod(report.value.periods[s.index]!) : ''

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
    report.value && analysis.value ? buildDreInsights(report.value, analysis.value, periodLabels.value) : [],
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

export function buildDreInsights(
  report: DreReport,
  analysis: DreAnalysis,
  labels: { current: string; previous: string },
): Insight[] {
  const { facts, kpis, breakEven } = analysis
  const items: Insight[] = []
  const kpi = (metric: DreMetric) => kpis.find((k) => k.metric === metric)
  const window = `últimos ${facts.recentMonths} meses do relatório`

  if (facts.revenueChange !== null && labels.previous) {
    const up = facts.revenueChange >= 0
    items.push({
      title: up ? 'Receita em alta' : 'Receita em queda',
      description: `A receita bruta ${up ? 'cresceu' : 'caiu'} ${formatPercent(Math.abs(facts.revenueChange))} em relação a ${labels.previous}.`,
      tone: up ? 'positive' : 'negative',
      explanation: `(Receita bruta de ${labels.current} − receita bruta de ${labels.previous}) ÷ receita bruta de ${labels.previous}. No acumulado do ano, compara com os mesmos meses do ano anterior.`,
    })
  }

  const ebitda = kpi(DreMetric.Ebitda)
  if (ebitda) {
    const positive = ebitda.value >= 0
    items.push({
      title: positive ? 'Operação lucrativa' : 'Operação no prejuízo',
      description: `EBITDA de ${formatCurrencyCompact(ebitda.value)} em ${labels.current}${ebitda.margin !== null ? `, margem de ${formatPercent(ebitda.margin)}` : ''}.`,
      tone: positive ? 'positive' : 'negative',
      explanation: 'EBITDA é o resultado da operação antes de itens não desembolsáveis e movimentações não operacionais. Margem EBITDA = EBITDA ÷ receita bruta. Positivo indica operação lucrativa no período.',
    })
  }

  if (breakEven) {
    const gap = breakEven.actual / breakEven.revenue - 1
    items.push({
      title: 'Ponto de equilíbrio',
      description: `São necessários ${formatCurrencyCompact(breakEven.revenue)} de receita para cobrir as despesas fixas; a receita ficou ${formatPercent(Math.abs(gap))} ${gap >= 0 ? 'acima' : 'abaixo'}.`,
      tone: gap >= 0 ? 'positive' : 'negative',
      explanation: 'Despesas operacionais (fixas) ÷ margem de contribuição %. É a receita mínima para não ter prejuízo operacional, mantida a margem atual. A diferença compara a receita real com esse valor.',
    })
  }

  if (facts.topExpense) {
    items.push({
      title: 'Maior peso nos custos',
      description: `${prettifyLabel(facts.topExpense.label)} consome ${formatPercent(facts.topExpense.share)} da receita.`,
      tone: 'neutral',
      explanation: 'Entre os grupos de custos e despesas anteriores ao EBITDA, o de maior valor no período, dividido pela receita bruta.',
    })
  }

  if (facts.positiveEbitdaMonths !== null) {
    const ratio = facts.positiveEbitdaMonths / facts.recentMonths
    items.push({
      title: 'Consistência do resultado',
      description: `EBITDA positivo em ${facts.positiveEbitdaMonths} dos últimos ${facts.recentMonths} meses.`,
      tone: ratio >= 0.5 ? 'positive' : 'negative',
      explanation: `Quantidade de meses com EBITDA acima de zero nos ${window}, independente do período selecionado. Fica positivo a partir de metade dos meses.`,
    })
  }

  if (facts.negativeCashMonths !== null) {
    const explanation = `Quantidade de meses com saldo final de caixa abaixo de zero nos ${window}.`
    items.push(
      facts.negativeCashMonths
        ? {
            title: 'Pressão no caixa',
            description: `O saldo de caixa terminou negativo em ${facts.negativeCashMonths} dos últimos ${facts.recentMonths} meses.`,
            tone: 'negative',
            explanation,
          }
        : {
            title: 'Caixa saudável',
            description: `O saldo de caixa ficou positivo em todos os últimos ${facts.recentMonths} meses.`,
            tone: 'positive',
            explanation,
          },
    )
  }

  if (facts.bestRevenue) {
    items.push({
      title: 'Melhor mês de receita',
      description: `${formatPeriodLong(report.periods[facts.bestRevenue.index]!)} com ${formatCurrencyCompact(facts.bestRevenue.value)}.`,
      tone: 'neutral',
      explanation: 'Mês com a maior receita bruta em todo o período do relatório.',
    })
  }

  if (facts.averageContributionMargin !== null) {
    items.push({
      title: 'Margem de contribuição média',
      description: `${formatPercent(facts.averageContributionMargin)} nos últimos ${facts.recentMonths} meses: de cada R$ 100 vendidos, sobram R$ ${Math.round(facts.averageContributionMargin * 100)} para pagar as despesas fixas.`,
      tone: 'neutral',
      explanation: `Média simples da margem de contribuição % (margem de contribuição ÷ receita bruta) dos meses com receita nos ${window}.`,
    })
  }

  return items
}
