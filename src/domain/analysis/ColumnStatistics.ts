import { detectNumberConvention, parseNumber, sum } from '@/domain/shared'

export interface ColumnStatistics {
  readonly count: number
  readonly sum: number
  readonly mean: number
  readonly min: number
  readonly max: number
}

export function computeStatistics(values: readonly string[]): ColumnStatistics {
  const convention = detectNumberConvention(values)
  const numbers = values.map((value) => parseNumber(value, convention)).filter(Number.isFinite)
  if (!numbers.length) return { count: 0, sum: 0, mean: 0, min: 0, max: 0 }

  const total = sum(numbers)
  return {
    count: numbers.length,
    sum: total,
    mean: total / numbers.length,
    min: numbers.reduce((a, b) => Math.min(a, b)),
    max: numbers.reduce((a, b) => Math.max(a, b)),
  }
}
