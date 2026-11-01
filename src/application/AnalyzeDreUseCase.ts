import { DreLineKind, DreMetric, type DreLine, type DreReport } from '@/domain/dre'

/** Um mês específico ou o acumulado de um ano. */
export type DreSelection = { type: 'month'; index: number } | { type: 'year'; year: number }

export interface DreKpi {
  readonly metric: DreMetric
  readonly value: number
  /** Mesmo indicador no período de comparação (mês anterior / mesmo intervalo do ano anterior) */
  readonly previous: number | null
  /** Valor ÷ receita bruta (null para receita e caixa) */
  readonly margin: number | null
}

export interface WaterfallStep {
  readonly label: string
  readonly value: number
  /** true = barra de total (receita, subtotais); false = variação */
  readonly isTotal: boolean
}

export interface NamedSeries {
  readonly label: string
  readonly values: (number | null)[]
}

export interface DreAnalysis {
  /** Índices dos períodos que compõem a seleção */
  readonly indexes: number[]
  readonly previousIndexes: number[] | null
  readonly kpis: DreKpi[]
  /** Receita necessária para cobrir as despesas fixas com a margem de contribuição atual */
  readonly breakEven: { readonly revenue: number; readonly actual: number } | null
  readonly waterfall: WaterfallStep[]
  /** Custos e despesas operacionais do período, em valor absoluto, com participação na receita */
  readonly expenses: { readonly label: string; readonly value: number; readonly share: number }[]
  readonly monthly: {
    readonly revenue: number[]
    readonly ebitda: number[] | null
    readonly netIncome: number[] | null
    readonly cash: number[] | null
  }
  /** Margem de contribuição, EBITDA e líquida mês a mês (fração da receita) */
  readonly margins: (NamedSeries & { readonly metric: DreMetric })[]
  readonly revenueMix: NamedSeries[]
  readonly facts: DreFacts
}

/** Fatos objetivos que a apresentação transforma em pontos de análise. */
export interface DreFacts {
  readonly revenueChange: number | null
  readonly topExpense: { readonly label: string; readonly share: number } | null
  readonly bestRevenue: { readonly index: number; readonly value: number } | null
  /** Janela dos últimos 12 meses */
  readonly recentMonths: number
  readonly positiveEbitdaMonths: number | null
  readonly negativeCashMonths: number | null
  readonly averageContributionMargin: number | null
}

const KPI_METRICS: DreMetric[] = [
  DreMetric.GrossRevenue,
  DreMetric.GrossProfit,
  DreMetric.ContributionMargin,
  DreMetric.Ebitda,
  DreMetric.NetIncome,
  DreMetric.EndingCash,
]

const MARGIN_METRICS: DreMetric[] = [DreMetric.ContributionMargin, DreMetric.Ebitda, DreMetric.NetIncome]

const ratio = (value: number, base: number) => (base ? value / base : null)

export class AnalyzeDreUseCase {
  /** Opções do seletor: cada mês e o acumulado de cada ano. */
  selections(report: DreReport): DreSelection[] {
    const years = [...new Set(report.periods.map((p) => p.year))]
    return [
      ...report.periods.map((_, index) => ({ type: 'month', index }) as const).reverse(),
      ...years.map((year) => ({ type: 'year', year }) as const).reverse(),
    ]
  }

  execute(report: DreReport, selection: DreSelection): DreAnalysis {
    const indexes = this.resolve(report, selection)
    const previousIndexes = this.previousOf(report, selection, indexes)
    const allIndexes = report.periods.map((_, i) => i)
    const recent = allIndexes.slice(-12)

    const value = (metric: DreMetric, idx = indexes) => report.valueOf(report.metric(metric), idx)
    const perMonth = (metric: DreMetric) =>
      report.metric(metric) ? allIndexes.map((i) => value(metric, [i])) : null

    const revenue = value(DreMetric.GrossRevenue)
    const kpis = KPI_METRICS.filter((m) => report.metric(m)).map((metric) => ({
      metric,
      value: value(metric),
      previous: previousIndexes ? value(metric, previousIndexes) : null,
      margin: metric === DreMetric.GrossRevenue || metric === DreMetric.EndingCash ? null : ratio(value(metric), revenue),
    }))

    const expenses = this.expenses(report, indexes, revenue)
    const monthlyRevenue = allIndexes.map((i) => value(DreMetric.GrossRevenue, [i]))
    const monthlyEbitda = perMonth(DreMetric.Ebitda)
    const monthlyCash = perMonth(DreMetric.EndingCash)
    const monthlyMargins = MARGIN_METRICS.filter((m) => report.metric(m)).map((metric) => ({
      metric,
      label: metric,
      values: allIndexes.map((i) => ratio(value(metric, [i]), monthlyRevenue[i] ?? 0)),
    }))

    const contributionMargins = monthlyMargins
      .find((m) => m.metric === DreMetric.ContributionMargin)
      ?.values.filter((v, i): v is number => v !== null && recent.includes(i))
    const bestRevenueIndex = monthlyRevenue.indexOf(Math.max(...monthlyRevenue))

    return {
      indexes,
      previousIndexes,
      kpis,
      breakEven: this.breakEven(report, indexes, revenue),
      waterfall: this.waterfall(report, indexes),
      expenses,
      monthly: {
        revenue: monthlyRevenue,
        ebitda: monthlyEbitda,
        netIncome: perMonth(DreMetric.NetIncome),
        cash: monthlyCash,
      },
      margins: monthlyMargins,
      revenueMix: this.revenueMix(report, allIndexes),
      facts: {
        revenueChange: previousIndexes ? ratio(revenue - value(DreMetric.GrossRevenue, previousIndexes), Math.abs(value(DreMetric.GrossRevenue, previousIndexes))) : null,
        topExpense: expenses[0] ? { label: expenses[0].label, share: expenses[0].share } : null,
        bestRevenue: bestRevenueIndex >= 0 ? { index: bestRevenueIndex, value: monthlyRevenue[bestRevenueIndex] ?? 0 } : null,
        recentMonths: recent.length,
        positiveEbitdaMonths: monthlyEbitda ? recent.filter((i) => (monthlyEbitda[i] ?? 0) > 0).length : null,
        negativeCashMonths: monthlyCash ? recent.filter((i) => (monthlyCash[i] ?? 0) < 0).length : null,
        averageContributionMargin: contributionMargins?.length
          ? contributionMargins.reduce((a, b) => a + b, 0) / contributionMargins.length
          : null,
      },
    }
  }

  private resolve(report: DreReport, selection: DreSelection): number[] {
    if (selection.type === 'month') return [selection.index]
    return report.periods.flatMap((p, i) => (p.year === selection.year ? [i] : []))
  }

  /** Mês anterior, ou os mesmos meses do ano anterior (se todos existirem). */
  private previousOf(report: DreReport, selection: DreSelection, indexes: number[]): number[] | null {
    if (selection.type === 'month') return selection.index > 0 ? [selection.index - 1] : null

    const previous = indexes.map((i) => {
      const { month } = report.periods[i]!
      return report.periods.findIndex((p) => p.year === selection.year - 1 && p.month === month)
    })
    return previous.length && previous.every((i) => i >= 0) ? previous : null
  }

  /**
   * Cascata na ordem da própria DRE: receita → grupos (variações) → subtotais,
   * até o resultado líquido. Saldos de caixa ficam de fora.
   */
  private waterfall(report: DreReport, indexes: number[]): WaterfallStep[] {
    const last = report.metric(DreMetric.NetIncome) ?? report.metric(DreMetric.Ebitda)
    const steps: WaterfallStep[] = []

    for (const line of report.lines) {
      if (line.parentId !== null || line.kind === DreLineKind.Balance) continue
      const value = report.valueOf(line, indexes)
      const isTotal = steps.length === 0 || line.kind === DreLineKind.Result
      const previous = steps.at(-1)
      // Subtotal igual ao anterior sem variação no meio (ex.: sem despesas variáveis): fica só o último
      if (isTotal && previous?.isTotal && steps.length > 1 && Math.abs(previous.value - value) < 0.005) steps.pop()
      if (isTotal || value !== 0) steps.push({ label: line.label, value, isTotal })
      if (line === last) break
    }
    return steps
  }

  /** Grupos de custo/despesa anteriores ao EBITDA (operacionais), maiores primeiro. */
  private expenses(report: DreReport, indexes: number[], revenue: number) {
    const limit = report.metric(DreMetric.Ebitda) ?? report.metric(DreMetric.NetIncome)
    const limitPosition = limit ? report.lines.indexOf(limit) : report.lines.length

    return report.lines
      .filter((line, position) => line.kind === DreLineKind.Group && position < limitPosition)
      .map((line) => ({ label: line.label, value: report.valueOf(line, indexes) }))
      .filter((item) => item.value < 0)
      .map((item) => ({ label: item.label, value: -item.value, share: revenue ? -item.value / revenue : 0 }))
      .sort((a, b) => b.value - a.value)
  }

  /** Contas que compõem a receita bruta, mês a mês. */
  private revenueMix(report: DreReport, allIndexes: number[]): NamedSeries[] {
    const revenue = report.metric(DreMetric.GrossRevenue)
    if (!revenue) return []
    return report
      .children(revenue.id)
      .filter((line: DreLine) => line.values.some((v) => v !== 0))
      .map((line) => ({ label: line.label, values: allIndexes.map((i) => line.values[i] ?? 0) }))
  }

  private breakEven(report: DreReport, indexes: number[], revenue: number) {
    const margin = report.valueOf(report.metric(DreMetric.ContributionMargin), indexes)
    const fixed = -report.valueOf(report.metric(DreMetric.OperatingExpenses), indexes)
    const marginRatio = ratio(margin, revenue)
    if (!report.metric(DreMetric.OperatingExpenses) || !marginRatio || marginRatio <= 0 || fixed <= 0) return null
    return { revenue: fixed / marginRatio, actual: revenue }
  }
}
