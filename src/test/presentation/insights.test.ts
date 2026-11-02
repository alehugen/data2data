import { describe, expect, it } from 'vitest'
import { AnalyzeAbcUseCase, AnalyzeDreUseCase } from '@/application'
import { AbcReport } from '@/domain/abc'
import { DreReport } from '@/domain/dre'
import { ProfitReport } from '@/domain/profit'
import { ABC_OCTOBER, ABC_SEPTEMBER, PROFIT_OCTOBER, PROFIT_SEPTEMBER, csvRows, dreRows } from '@/test/fixtures'
import { buildAbcInsights, buildProfitInsights } from '@/presentation/composables/useAbcAnalysis'
import { buildDreInsights } from '@/presentation/composables/useDreAnalysis'

const titles = (insights: readonly { title: string }[]) => insights.map((i) => i.title)

describe('buildDreInsights', () => {
  const report = DreReport.fromTable({ name: 'DRE', sheet: 'DRE Geral', rows: dreRows() })!
  const analysis = new AnalyzeDreUseCase().execute(report, { type: 'month', index: 2 })
  const insights = buildDreInsights(report, analysis, { current: 'mar/26', previous: 'fev/26' })

  it('gera os pontos de análise esperados com tom e explicação', () => {
    expect(titles(insights)).toEqual([
      'Receita em queda',
      'Operação no prejuízo',
      'Ponto de equilíbrio',
      'Maior peso nos custos',
      'Consistência do resultado',
      'Caixa saudável',
      'Melhor mês de receita',
      'Margem de contribuição média',
    ])
    expect(insights.find((i) => i.title === 'Receita em queda')?.description).toContain('caiu 25%')
    expect(insights.find((i) => i.title === 'Operação no prejuízo')?.tone).toBe('negative')
    expect(insights.every((i) => i.explanation.length > 20)).toBe(true)
  })
})

describe('buildAbcInsights e buildProfitInsights', () => {
  const abc = [ABC_SEPTEMBER, ABC_OCTOBER].map((csv, i) =>
    AbcReport.fromTable({ name: `abc ${i ? 'out' : 'set'}.2026`, rows: csvRows(csv) })!,
  )
  const profit = [PROFIT_SEPTEMBER, PROFIT_OCTOBER].map((csv, i) =>
    ProfitReport.fromTable({ name: `lucro ${i ? 'out' : 'set'}.2026`, rows: csvRows(csv) })!,
  )
  const analysis = new AnalyzeAbcUseCase().execute(abc, profit)!

  it('resume vendas, classes e movimentação', () => {
    expect(titles(buildAbcInsights(analysis))).toEqual([
      'Concentração na classe A',
      'Item líder',
      'Faturamento em queda',
      'Mudanças de classe',
      'Entradas e saídas do mix',
      'Maior alta de faturamento',
      'Maior queda de faturamento',
    ])
  })

  it('cruza lucro e classificação para mostrar onde está o lucro', () => {
    const insights = buildProfitInsights(analysis.profitability!, analysis)
    expect(titles(insights)).toEqual([
      'Lucro em queda',
      'Lucro da classe A',
      'Vende muito, lucra pouco',
      'Alta margem pouco explorada',
      'Maior lucro por unidade',
      'Itens com prejuízo',
      'Custo não cadastrado',
      'Divergência entre relatórios',
    ])
    expect(insights.find((i) => i.title === 'Vende muito, lucra pouco')?.description).toContain('Vacina Alfa')
    expect(insights.find((i) => i.title === 'Custo não cadastrado')?.description).toContain('Produto Novo')
    expect(insights.every((i) => i.explanation.length > 20)).toBe(true)
  })
})
