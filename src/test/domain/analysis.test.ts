import { describe, expect, it } from 'vitest'
import { computeBreakdown, computeStatistics } from '@/domain/analysis'

describe('computeStatistics', () => {
  it('calcula soma, média, mínimo e máximo ignorando textos', () => {
    expect(computeStatistics(['10', '1.234,5', 'texto', '', '-4'])).toEqual({
      count: 3,
      sum: 1240.5,
      mean: 413.5,
      min: -4,
      max: 1234.5,
    })
  })

  it('retorna zeros sem valores numéricos', () => {
    expect(computeStatistics(['a', ''])).toEqual({ count: 0, sum: 0, mean: 0, min: 0, max: 0 })
  })

  it('suporta colunas muito grandes', () => {
    const values = Array.from({ length: 300_000 }, (_, i) => String(i))
    expect(computeStatistics(values).max).toBe(299_999)
  })
})

describe('computeBreakdown', () => {
  it('agrupa, soma e ordena do maior para o menor', () => {
    expect(computeBreakdown(['A', 'B', 'A', ''], ['1', '5', '2', '1'])).toEqual([
      { category: 'B', total: 5 },
      { category: 'A', total: 3 },
      { category: '(vazio)', total: 1 },
    ])
  })

  it('soma o excedente em "Outros"', () => {
    const result = computeBreakdown(['A', 'B', 'C', 'D'], ['4', '3', '2', '1'], 3)
    expect(result).toEqual([
      { category: 'A', total: 4 },
      { category: 'B', total: 3 },
      { category: 'Outros', total: 3 },
    ])
  })
})
