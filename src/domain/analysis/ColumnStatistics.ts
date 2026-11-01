import { parseNumber } from '@/domain/shared'

export interface ColumnStatistics {
  readonly count: number
  readonly sum: number
  readonly mean: number
  readonly min: number
  readonly max: number
}

export function computeStatistics(values: string[]): ColumnStatistics {
  const numbers = values.map(parseNumber).filter((n) => Number.isFinite(n))
  const count = numbers.length
  const sum = numbers.reduce((acc, n) => acc + n, 0)

  return {
    count,
    sum,
    mean: count ? sum / count : 0,
    min: count ? Math.min(...numbers) : 0,
    max: count ? Math.max(...numbers) : 0,
  }
}
