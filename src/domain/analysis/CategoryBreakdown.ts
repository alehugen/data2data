import { detectNumberConvention, parseNumber } from '@/domain/shared'

export interface CategoryTotal {
  readonly category: string
  readonly total: number
}

export interface CategoryBreakdown {
  readonly categoryKey: string
  readonly valueKey: string
  readonly items: CategoryTotal[]
}

const OTHER_CATEGORY = 'Outros'
const EMPTY_CATEGORY = '(vazio)'

export function computeBreakdown(
  categories: readonly string[],
  values: readonly string[],
  limit = 10,
): CategoryTotal[] {
  const totals = new Map<string, number>()
  const convention = detectNumberConvention(values)

  categories.forEach((rawCategory, i) => {
    const value = parseNumber(values[i] ?? '', convention)
    if (!Number.isFinite(value)) return
    const category = rawCategory.trim() || EMPTY_CATEGORY
    totals.set(category, (totals.get(category) ?? 0) + value)
  })

  const sorted = [...totals]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  if (sorted.length <= limit) return sorted

  const rest = sorted.slice(limit - 1).reduce((acc, item) => acc + item.total, 0)
  return [...sorted.slice(0, limit - 1), { category: OTHER_CATEGORY, total: rest }]
}
