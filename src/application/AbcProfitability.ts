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
  readonly materials: number
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
  readonly profitShare: number | null
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
  readonly outsideAbc: { readonly revenue: number; readonly profit: number }
  readonly referenceMargin: number | null
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
  const referenceMargin = marginOf(reliable)
  const outside = items.filter((item) => item.abcClass === null)
  const outsideAbc = { revenue: sum(outside.map((item) => item.revenue)), profit: sum(outside.map((item) => item.profit)) }
  const classes = byClass(items, reliable)
  const parts = [...ABC_CLASSES.map((abcClass) => classes[abcClass].profit), outsideAbc.profit]
  const sharesMakeSense = totals.profit > 0 && parts.every((part) => part >= 0)
  const comparable = referenceMargin ?? 0

  return {
    totals,
    previousTotals: previousProfit ? summarize(previousProfit.totals) : null,
    byClass: Object.fromEntries(
      ABC_CLASSES.map((abcClass) => [
        abcClass,
        { ...classes[abcClass], profitShare: sharesMakeSense ? ratio(classes[abcClass].profit, totals.profit) : null },
      ]),
    ) as Record<AbcClass, ClassProfitability>,
    outsideAbc,
    referenceMargin,
    items,
    lowMarginVolume: referenceMargin === null ? [] : reliable
      .filter((item) => item.abcClass === 'A' && item.margin! < comparable)
      .sort((a, b) => a.margin! - b.margin!),
    hiddenGems: referenceMargin === null ? [] : reliable
      .filter((item) => (item.abcClass === 'B' || item.abcClass === 'C') && item.profit > 0 && item.margin! > comparable)
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

const marginOf = (items: readonly ProfitabilityItem[]) =>
  ratio(sum(items.map((item) => item.profit)), sum(items.map((item) => item.revenue)))

function byClass(
  items: readonly ProfitabilityItem[],
  reliable: readonly ProfitabilityItem[],
): Record<AbcClass, Omit<ClassProfitability, 'profitShare'>> {
  return Object.fromEntries(
    ABC_CLASSES.map((abcClass) => {
      const inClass = items.filter((item) => item.abcClass === abcClass)
      return [
        abcClass,
        {
          revenue: sum(inClass.map((item) => item.revenue)),
          profit: sum(inClass.map((item) => item.profit)),
          margin: marginOf(reliable.filter((item) => item.abcClass === abcClass)),
        },
      ]
    }),
  ) as Record<AbcClass, Omit<ClassProfitability, 'profitShare'>>
}
