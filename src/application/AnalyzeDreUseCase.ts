import { DreLineKind, DreMetric, type DreReport } from '@/domain/dre'
import { sum } from '@/domain/shared'

export type DreSelection = { type: 'month'; index: number } | { type: 'year'; year: number }

export interface DreKpi {
  readonly metric: DreMetric
  readonly value: number
  readonly previous: number | null
  readonly margin: number | null
}

export interface WaterfallStep {
  readonly label: string
  readonly value: number
  readonly isTotal: boolean
}

export interface DreExpense {
  readonly label: string
  readonly value: number
  readonly share: number
}

export interface DreAnalysis {
  readonly indexes: number[]
  readonly previousIndexes: number[] | null
  readonly kpis: DreKpi[]
  readonly breakEven: { readonly revenue: number; readonly actual: number } | null
  readonly waterfall: WaterfallStep[]
  readonly expenses: DreExpense[]
  readonly monthly: {
    readonly revenue: number[]
    readonly ebitda: number[] | null
    readonly cash: number[] | null
    readonly margins: { readonly metric: DreMetric; readonly values: (number | null)[] }[]
    readonly revenueMix: { readonly label: string; readonly values: number[] }[]
  }
  readonly facts: DreFacts
}

export interface DreFacts {
  readonly revenueChange: number | null
  readonly topExpense: DreExpense | null
  readonly bestRevenue: { readonly index: number; readonly value: number } | null
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

const WITHOUT_MARGIN: DreMetric[] = [DreMetric.GrossRevenue, DreMetric.EndingCash]

const MARGIN_METRICS: DreMetric[] = [DreMetric.ContributionMargin, DreMetric.Ebitda, DreMetric.NetIncome]

const RECENT_WINDOW = 12

const ratio = (value: number, base: number) => (base ? value / base : null)

export class AnalyzeDreUseCase {
  selections(report: DreReport): DreSelection[] {
    const months = report.periods.map((_, index): DreSelection => ({ type: 'month', index }))
    const years = [...new Set(report.periods.map((p) => p.year))].map((year): DreSelection => ({ type: 'year', year }))
    return [...months.reverse(), ...years.reverse()]
  }

  execute(report: DreReport, selection: DreSelection): DreAnalysis {
    const indexes = this.resolve(report, selection)
    const previousIndexes = this.previousOf(report, selection, indexes)
    const allIndexes = report.periods.map((_, i) => i)

    const value = (metric: DreMetric, periodIndexes = indexes) => report.valueOf(report.metric(metric), periodIndexes)
    const monthlyOf = (metric: DreMetric) => (report.metric(metric) ? allIndexes.map((i) => value(metric, [i])) : null)

    const revenue = value(DreMetric.GrossRevenue)
    const kpis = KPI_METRICS.filter((metric) => report.metric(metric)).map((metric) => ({
      metric,
      value: value(metric),
      previous: previousIndexes ? value(metric, previousIndexes) : null,
      margin: WITHOUT_MARGIN.includes(metric) ? null : ratio(value(metric), revenue),
    }))

    const monthlyRevenue = allIndexes.map((i) => value(DreMetric.GrossRevenue, [i]))
    const monthly = {
      revenue: monthlyRevenue,
      ebitda: monthlyOf(DreMetric.Ebitda),
      cash: monthlyOf(DreMetric.EndingCash),
      margins: MARGIN_METRICS.filter((metric) => report.metric(metric)).map((metric) => ({
        metric,
        values: allIndexes.map((i) => ratio(value(metric, [i]), monthlyRevenue[i]!)),
      })),
      revenueMix: this.revenueMix(report),
    }

    const expenses = this.expenses(report, indexes, revenue)
    const previousRevenue = previousIndexes ? value(DreMetric.GrossRevenue, previousIndexes) : null

    return {
      indexes,
      previousIndexes,
      kpis,
      breakEven: this.breakEven(report, indexes, revenue),
      waterfall: this.waterfall(report, indexes),
      expenses,
      monthly,
      facts: {
        revenueChange: previousRevenue ? (revenue - previousRevenue) / Math.abs(previousRevenue) : null,
        topExpense: expenses[0] ?? null,
        ...this.trendFacts(monthly),
      },
    }
  }

  private resolve(report: DreReport, selection: DreSelection): number[] {
    if (selection.type === 'month') return [selection.index]
    return report.periods.flatMap((p, i) => (p.year === selection.year ? [i] : []))
  }

  private previousOf(report: DreReport, selection: DreSelection, indexes: number[]): number[] | null {
    if (selection.type === 'month') return selection.index > 0 ? [selection.index - 1] : null

    const previous = indexes.map((i) =>
      report.periods.findIndex((p) => p.year === selection.year - 1 && p.month === report.periods[i]!.month),
    )
    return previous.length && previous.every((i) => i >= 0) ? previous : null
  }

  private trendFacts(monthly: DreAnalysis['monthly']) {
    const recent = monthly.revenue.map((_, i) => i).slice(-RECENT_WINDOW)
    const countRecent = (series: number[] | null, test: (value: number) => boolean) =>
      series ? recent.filter((i) => test(series[i]!)).length : null

    const bestValue = Math.max(...monthly.revenue)
    const contributionMargins = (monthly.margins.find((m) => m.metric === DreMetric.ContributionMargin)?.values ?? [])
      .filter((v, i): v is number => v !== null && recent.includes(i))

    return {
      bestRevenue: bestValue > 0 ? { index: monthly.revenue.indexOf(bestValue), value: bestValue } : null,
      recentMonths: recent.length,
      positiveEbitdaMonths: countRecent(monthly.ebitda, (v) => v > 0),
      negativeCashMonths: countRecent(monthly.cash, (v) => v < 0),
      averageContributionMargin: contributionMargins.length ? sum(contributionMargins) / contributionMargins.length : null,
    }
  }

  private waterfall(report: DreReport, indexes: number[]): WaterfallStep[] {
    const last = report.metric(DreMetric.NetIncome) ?? report.metric(DreMetric.Ebitda)
    const steps: WaterfallStep[] = []

    for (const line of report.lines) {
      if (line.parentId !== null || line.kind === DreLineKind.Balance) continue

      const value = report.valueOf(line, indexes)
      const isTotal = steps.length === 0 || line.kind === DreLineKind.Result
      const previous = steps.at(-1)

      const repeatsPreviousTotal = isTotal && previous?.isTotal && steps.length > 1 && Math.abs(previous.value - value) < 0.005
      if (repeatsPreviousTotal) steps.pop()
      if (isTotal || value !== 0) steps.push({ label: line.label, value, isTotal })

      if (line === last) break
    }
    return steps
  }

  private expenses(report: DreReport, indexes: number[], revenue: number): DreExpense[] {
    const limit = report.metric(DreMetric.Ebitda) ?? report.metric(DreMetric.NetIncome)
    const limitPosition = limit ? report.lines.indexOf(limit) : report.lines.length

    return report.lines
      .filter((line, position) => line.kind === DreLineKind.Group && position < limitPosition)
      .map((line) => ({ label: line.label, value: -report.valueOf(line, indexes) }))
      .filter((expense) => expense.value > 0)
      .map((expense) => ({ ...expense, share: revenue ? expense.value / revenue : 0 }))
      .sort((a, b) => b.value - a.value)
  }

  private revenueMix(report: DreReport) {
    const revenue = report.metric(DreMetric.GrossRevenue)
    if (!revenue) return []
    return report
      .children(revenue.id)
      .filter((line) => line.values.some((v) => v !== 0))
      .map((line) => ({ label: line.label, values: [...line.values] }))
  }

  private breakEven(report: DreReport, indexes: number[], revenue: number) {
    if (!report.metric(DreMetric.OperatingExpenses)) return null

    const fixedExpenses = -report.valueOf(report.metric(DreMetric.OperatingExpenses), indexes)
    const marginRatio = ratio(report.valueOf(report.metric(DreMetric.ContributionMargin), indexes), revenue)
    if (!marginRatio || marginRatio <= 0 || fixedExpenses <= 0) return null

    return { revenue: fixedExpenses / marginRatio, actual: revenue }
  }
}
