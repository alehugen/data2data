import { ABC_CLASSES, type AbcClass, type AbcReport } from '@/domain/abc'
import type { ProfitReport, ProfitTotals } from '@/domain/profit'
import { ratio, sum } from '@/domain/shared'

export interface ProfitabilityItem {
  readonly code: string
  readonly description: string
  readonly abcClass: AbcClass | null
  readonly quantity: number
  readonly revenue: number
  readonly cost: number
  readonly tax: number
  readonly financialFee: number
  readonly profit: number
  readonly margin: number | null
  readonly profitPerUnit: number | null
  readonly costMissing: boolean
}

export interface ProfitSummary extends ProfitTotals {
  readonly margin: number | null
}

export interface ClassProfitability {
  readonly revenue: number
  readonly profit: number
  readonly margin: number | null
  readonly profitShare: number
}

export interface RevenueMismatch {
  readonly description: string
  readonly abcValue: number
  readonly profitRevenue: number
}

export interface AbcProfitability {
  readonly totals: ProfitSummary
  readonly previousTotals: ProfitSummary | null
  readonly byClass: Record<AbcClass, ClassProfitability>
  readonly items: ProfitabilityItem[]
  readonly lowMarginVolume: ProfitabilityItem[]
  readonly hiddenGems: ProfitabilityItem[]
  readonly losses: ProfitabilityItem[]
  readonly missingCost: ProfitabilityItem[]
  readonly mismatches: {
    readonly onlyInAbc: string[]
    readonly onlyInProfit: string[]
    readonly revenueDiffers: RevenueMismatch[]
  }
}

const REVENUE_TOLERANCE = 0.01

const summarize = (totals: ProfitTotals): ProfitSummary => ({ ...totals, margin: ratio(totals.profit, totals.revenue) })

export function analyzeProfitability(
  abc: AbcReport,
  profit: ProfitReport,
  previousProfit: ProfitReport | null = null,
): AbcProfitability {
  const classByCode = new Map(abc.items.map((item) => [item.code, item.abcClass]))
  const profitCodes = new Set(profit.items.map((item) => item.code))
  const totals = summarize(profit.totals)

  const items: ProfitabilityItem[] = profit.items
    .map((item) => ({
      ...item,
      abcClass: classByCode.get(item.code) ?? null,
      margin: ratio(item.profit, item.revenue),
      profitPerUnit: ratio(item.profit, item.quantity),
      costMissing: item.cost === 0 && item.revenue > 0,
    }))
    .sort((a, b) => b.profit - a.profit)

  const reliable = items.filter((item) => !item.costMissing && item.margin !== null)
  const averageMargin = totals.margin ?? 0

  return {
    totals,
    previousTotals: previousProfit ? summarize(previousProfit.totals) : null,
    byClass: byClass(items, totals.profit),
    items,
    lowMarginVolume: reliable
      .filter((item) => item.abcClass === 'A' && item.margin! < averageMargin)
      .sort((a, b) => a.margin! - b.margin!),
    hiddenGems: reliable
      .filter((item) => item.abcClass !== 'A' && item.profit > 0 && item.margin! > averageMargin)
      .sort((a, b) => b.margin! - a.margin!),
    losses: items.filter((item) => item.profit < 0).sort((a, b) => a.profit - b.profit),
    missingCost: items.filter((item) => item.costMissing),
    mismatches: {
      onlyInAbc: abc.items.filter((item) => !profitCodes.has(item.code)).map((item) => item.description),
      onlyInProfit: items.filter((item) => item.abcClass === null).map((item) => item.description),
      revenueDiffers: abc.items.flatMap((abcItem) => {
        const match = profit.items.find((item) => item.code === abcItem.code)
        if (!match || Math.abs(match.revenue - abcItem.value) <= REVENUE_TOLERANCE) return []
        return [{ description: abcItem.description, abcValue: abcItem.value, profitRevenue: match.revenue }]
      }),
    },
  }
}

function byClass(items: readonly ProfitabilityItem[], totalProfit: number): Record<AbcClass, ClassProfitability> {
  return Object.fromEntries(
    ABC_CLASSES.map((abcClass) => {
      const inClass = items.filter((item) => item.abcClass === abcClass)
      const revenue = sum(inClass.map((item) => item.revenue))
      const profit = sum(inClass.map((item) => item.profit))
      return [abcClass, { revenue, profit, margin: ratio(profit, revenue), profitShare: ratio(profit, totalProfit) ?? 0 }]
    }),
  ) as Record<AbcClass, ClassProfitability>
}
