import { parseNumber } from '@/domain/shared'

export interface CategoryTotal {
  readonly category: string
  readonly total: number
}

/** Soma de uma coluna numérica agrupada por uma coluna categórica. */
export interface CategoryBreakdown {
  readonly categoryKey: string
  readonly valueKey: string
  readonly items: CategoryTotal[]
}

export const OTHER_CATEGORY = 'Outros'

/**
 * Agrupa e ordena do maior para o menor. Acima de `limit` categorias,
 * o excedente é somado em "Outros" para manter o gráfico legível.
 */
export function computeBreakdown(
  categories: string[],
  values: string[],
  limit = 10,
): CategoryTotal[] {
  const totals = new Map<string, number>()

  categories.forEach((rawCategory, i) => {
    const value = parseNumber(values[i] ?? '')
    if (!Number.isFinite(value)) return
    const category = rawCategory.trim() || '(vazio)'
    totals.set(category, (totals.get(category) ?? 0) + value)
  })

  const sorted = [...totals]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  if (sorted.length <= limit) return sorted

  const rest = sorted.slice(limit - 1).reduce((acc, item) => acc + item.total, 0)
  return [...sorted.slice(0, limit - 1), { category: OTHER_CATEGORY, total: rest }]
}
