import { describe, expect, it } from 'vitest'
import { Dataset } from '@/domain/dataset'
import { AnalyzeDatasetUseCase } from '@/application'

describe('AnalyzeDatasetUseCase', () => {
  const dataset = Dataset.fromTable(
    { name: 'vendas', rows: [['Vendedor', 'Valor'], ['Ana', '10'], ['Bia', '30'], ['Ana', '20']] },
    'csv',
  )
  const analysis = new AnalyzeDatasetUseCase().execute(dataset)

  it('calcula estatísticas das colunas numéricas', () => {
    expect(analysis.numericColumns.map((c) => [c.column.key, c.statistics.sum])).toEqual([['Valor', 60]])
  })

  it('agrupa pela primeira coluna de texto', () => {
    expect(analysis.breakdowns[0]!.items).toEqual([
      { category: 'Ana', total: 30 },
      { category: 'Bia', total: 30 },
    ])
  })

  it('gera pontos de análise com explicação', () => {
    expect(analysis.insights.map((i) => i.title)).toEqual(['Visão geral', 'Maior Valor'])
    expect(analysis.insights.every((i) => i.explanation.length > 0)).toBe(true)
  })
})
