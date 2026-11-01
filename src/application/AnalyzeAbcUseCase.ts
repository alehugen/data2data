import { ABC_CLASSES, type AbcClass, type AbcItem, type AbcReport } from '@/domain/abc'
import { comparePeriods, type Identifier } from '@/domain/shared'

export interface AbcTotals {
  readonly items: number
  readonly quantity: number
  readonly value: number
}

export interface AbcMonthSummary extends AbcTotals {
  readonly report: AbcReport
  readonly byClass: Record<AbcClass, AbcTotals>
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
  /** Todos os meses importados, em ordem cronológica */
  readonly months: AbcMonthSummary[]
  readonly current: AbcMonthSummary
  readonly previous: AbcMonthSummary | null
  /** Itens do mês na ordem do relatório, com participação acumulada (Pareto) */
  readonly ranking: (AbcItem & { readonly cumulativeShare: number })[]
  /** Comparação item a item com o mês anterior (vazio se não houver) */
  readonly movements: AbcItemMovement[]
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
  quantity: items.reduce((acc, item) => acc + item.quantity, 0),
  value: items.reduce((acc, item) => acc + item.value, 0),
})

function summarize(report: AbcReport): AbcMonthSummary {
  const byClass = Object.fromEntries(
    ABC_CLASSES.map((abcClass) => [abcClass, totalsOf(report.items.filter((i) => i.abcClass === abcClass))]),
  ) as Record<AbcClass, AbcTotals>
  return { report, ...totalsOf(report.items), byClass }
}

/** Ordem cronológica; relatórios sem mês identificado vão para o fim, por data de importação. */
function chronological(a: AbcReport, b: AbcReport): number {
  if (a.period && b.period) return comparePeriods(a.period, b.period)
  if (a.period) return -1
  if (b.period) return 1
  return a.importedAt.getTime() - b.importedAt.getTime()
}

export class AnalyzeAbcUseCase {
  /** Sem `reportId`, analisa o mês mais recente. */
  execute(reports: readonly AbcReport[], reportId?: Identifier): AbcAnalysis | null {
    const months = [...reports].sort(chronological).map(summarize)
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
        const movement = !old
          ? AbcMovement.New
          : !now
            ? AbcMovement.Gone
            : CLASS_RANK[now.abcClass] < CLASS_RANK[old.abcClass]
              ? AbcMovement.Up
              : CLASS_RANK[now.abcClass] > CLASS_RANK[old.abcClass]
                ? AbcMovement.Down
                : AbcMovement.Same

        return {
          code,
          description: (now ?? old)!.description,
          from: old?.abcClass ?? null,
          to: now?.abcClass ?? null,
          movement,
          quantity: now?.quantity ?? 0,
          previousQuantity: old?.quantity ?? 0,
          value: now?.value ?? 0,
          previousValue: old?.value ?? 0,
        }
      })
      .sort(
        (a, b) =>
          MOVEMENT_ORDER.indexOf(a.movement) - MOVEMENT_ORDER.indexOf(b.movement) ||
          b.value - a.value,
      )
  }
}
