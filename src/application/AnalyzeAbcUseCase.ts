import { ABC_CLASSES, type AbcClass, type AbcItem, type AbcReport } from '@/domain/abc'
import type { ProfitReport } from '@/domain/profit'
import { comparePeriods, periodKey, sum, type Identifier, type Period } from '@/domain/shared'
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

export interface AbcAnalysis {
  readonly months: AbcMonthSummary[]
  readonly current: AbcMonthSummary
  readonly previous: AbcMonthSummary | null
  readonly ranking: (AbcItem & { readonly cumulativeShare: number })[]
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

function chronological(a: { period: Period | null; importedAt: Date }, b: { period: Period | null; importedAt: Date }) {
  if (a.period && b.period) return comparePeriods(a.period, b.period)
  if (a.period) return -1
  if (b.period) return 1
  return a.importedAt.getTime() - b.importedAt.getTime()
}

export class AnalyzeAbcUseCase {
  execute(
    reports: readonly AbcReport[],
    profitReports: readonly ProfitReport[] = [],
    reportId?: Identifier,
  ): AbcAnalysis | null {
    const profitByMonth = new Map(
      profitReports.flatMap((report) => (report.period ? [[periodKey(report.period), report] as const] : [])),
    )
    const months = [...reports].sort(chronological).map((report) => this.summarize(report, profitByMonth))

    const currentIndex = reportId ? months.findIndex((m) => m.report.id === reportId) : months.length - 1
    const current = months[currentIndex]
    if (!current) return null
    const previous = months[currentIndex - 1] ?? null

    let cumulative = 0
    const ranking = current.report.items.map((item) => {
      cumulative += item.share
      return { ...item, cumulativeShare: Math.min(cumulative, 1) }
    })

    return {
      months,
      current,
      previous,
      ranking,
      movements: previous ? this.compare(previous.report, current.report) : [],
      profitability: current.profitReport
        ? analyzeProfitability(current.report, current.profitReport, previous?.profitReport ?? null)
        : null,
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
