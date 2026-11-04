import { ABC_CLASSES, AbcReport, type AbcClass, type AbcItem } from '@/domain/abc'
import { ProfitReport } from '@/domain/profit'
import { compareByPeriod, periodKey, sum, type Period } from '@/domain/shared'
import { analyzeProfitability, type AbcProfitability } from './AbcProfitability'

export interface AbcTotals {
  readonly items: number
  readonly quantity: number
  readonly value: number
}

export interface AbcMonthSummary extends AbcTotals {
  readonly report: AbcReport
  readonly byClass: Record<AbcClass, AbcTotals>
  readonly profitReport: ProfitReport | null
}

export const AbcMovement = {
  New: 'new',
  Up: 'up',
  Down: 'down',
  Same: 'same',
  Gone: 'gone',
} as const

export type AbcMovement = (typeof AbcMovement)[keyof typeof AbcMovement]

export interface AbcItemMovement {
  readonly code: string
  readonly description: string
  readonly from: AbcClass | null
  readonly to: AbcClass | null
  readonly movement: AbcMovement
  readonly quantity: number
  readonly previousQuantity: number
  readonly value: number
  readonly previousValue: number
}

export const ABC_ALL_MONTHS = 'all'
export const abcYearKey = (year: number) => `year:${year}`
export const isCombinedKey = (key: string) => key === ABC_ALL_MONTHS || key.startsWith('year:')

export interface AbcAnalysis {
  readonly months: AbcMonthSummary[]
  readonly periods: Period[]
  readonly current: AbcMonthSummary
  readonly previous: AbcMonthSummary | null
  readonly ranking: AbcItem[]
  readonly movements: AbcItemMovement[]
  readonly profitability: AbcProfitability | null
}

const CLASS_RANK: Record<AbcClass, number> = { A: 0, B: 1, C: 2 }

const MOVEMENT_ORDER: AbcMovement[] = [
  AbcMovement.New,
  AbcMovement.Up,
  AbcMovement.Down,
  AbcMovement.Gone,
  AbcMovement.Same,
]

const totalsOf = (items: readonly AbcItem[]): AbcTotals => ({
  items: items.length,
  quantity: sum(items.map((item) => item.quantity)),
  value: sum(items.map((item) => item.value)),
})

const chronological = (a: AbcReport, b: AbcReport) =>
  compareByPeriod(a, b) || a.importedAt.getTime() - b.importedAt.getTime()

export class AnalyzeAbcUseCase {
  execute(
    reports: readonly AbcReport[],
    profitReports: readonly ProfitReport[] = [],
    selection?: string,
  ): AbcAnalysis | null {
    const profitByMonth = new Map(
      profitReports.flatMap((report) => (report.period ? [[periodKey(report.period), report] as const] : [])),
    )
    const months = [...reports].sort(chronological).map((report) => this.summarize(report, profitByMonth))

    const combined = this.combinedMonths(months, selection)
    if (combined) return this.combine(months, combined)
    const reportId = selection && !isCombinedKey(selection) ? selection : undefined

    const latestDated = months.map((m) => m.report.period !== null).lastIndexOf(true)
    const currentIndex = reportId
      ? months.findIndex((m) => m.report.id === reportId)
      : latestDated !== -1
        ? latestDated
        : months.length - 1
    const current = months[currentIndex]
    if (!current) return null
    const previous = current.report.period ? (months[currentIndex - 1] ?? null) : null

    const ranking = [...current.report.items].sort((a, b) => b.share - a.share)

    return {
      months,
      periods: current.report.period ? [current.report.period] : [],
      current,
      previous,
      ranking,
      movements: previous ? this.compare(previous.report, current.report) : [],
      profitability: current.profitReport
        ? analyzeProfitability(current.report, current.profitReport, previous?.profitReport ?? null)
        : null,
    }
  }

  private combinedMonths(months: AbcMonthSummary[], selection?: string): AbcMonthSummary[] | null {
    const dated = months.filter((month) => month.report.period)
    const chosen =
      selection === ABC_ALL_MONTHS
        ? dated
        : selection?.startsWith('year:')
          ? dated.filter((month) => abcYearKey(month.report.period!.year) === selection)
          : []
    return chosen.length > 1 ? chosen : null
  }

  private combine(months: AbcMonthSummary[], chosen: AbcMonthSummary[]): AbcAnalysis {
    const name = 'Meses combinados'
    const report = AbcReport.combine(
      chosen.map((month) => month.report),
      name,
    )
    const profits = chosen.map((month) => month.profitReport)
    const profitReport = profits.every((profit) => profit !== null)
      ? ProfitReport.combine(profits as ProfitReport[], name)
      : null
    const current = { ...this.summarize(report, new Map()), profitReport }

    return {
      months,
      periods: chosen.map((month) => month.report.period!),
      current,
      previous: null,
      ranking: [...report.items],
      movements: [],
      profitability: profitReport ? analyzeProfitability(report, profitReport, null) : null,
    }
  }

  private summarize(report: AbcReport, profitByMonth: ReadonlyMap<string, ProfitReport>): AbcMonthSummary {
    const byClass = Object.fromEntries(
      ABC_CLASSES.map((abcClass) => [abcClass, totalsOf(report.items.filter((i) => i.abcClass === abcClass))]),
    ) as Record<AbcClass, AbcTotals>

    return {
      report,
      ...totalsOf(report.items),
      byClass,
      profitReport: report.period ? (profitByMonth.get(periodKey(report.period)) ?? null) : null,
    }
  }

  private compare(previous: AbcReport, current: AbcReport): AbcItemMovement[] {
    const before = new Map(previous.items.map((item) => [item.code, item]))
    const after = new Map(current.items.map((item) => [item.code, item]))
    const codes = [...new Set([...after.keys(), ...before.keys()])]

    return codes
      .map((code) => {
        const old = before.get(code)
        const now = after.get(code)
        return {
          code,
          description: (now ?? old)!.description,
          from: old?.abcClass ?? null,
          to: now?.abcClass ?? null,
          movement: movementOf(old?.abcClass, now?.abcClass),
          quantity: now?.quantity ?? 0,
          previousQuantity: old?.quantity ?? 0,
          value: now?.value ?? 0,
          previousValue: old?.value ?? 0,
        }
      })
      .sort((a, b) => MOVEMENT_ORDER.indexOf(a.movement) - MOVEMENT_ORDER.indexOf(b.movement) || b.value - a.value)
  }
}

function movementOf(before: AbcClass | undefined, after: AbcClass | undefined): AbcMovement {
  if (!before) return AbcMovement.New
  if (!after) return AbcMovement.Gone
  if (CLASS_RANK[after] < CLASS_RANK[before]) return AbcMovement.Up
  if (CLASS_RANK[after] > CLASS_RANK[before]) return AbcMovement.Down
  return AbcMovement.Same
}
