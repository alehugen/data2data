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
  const insights = buildDreInsights(report, analysis, { current: 'mar/26', previous: 'fev/26', window: 'até mar/26', when: 'em mar/26' })

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

  it('diz em quais meses se baseia', () => {
    const description = (title: string) => insights.find((i) => i.title === title)?.description
    expect(description('Consistência do resultado')).toBe('EBITDA positivo em 2 dos 3 meses até mar/26.')
    expect(description('Melhor mês de receita')).toContain('entre os 3 meses até mar/26')
  })

  it('omite tendências quando o período tem um mês só', () => {
    const january = new AnalyzeDreUseCase().execute(report, { type: 'month', index: 0 })
    const titlesOfJanuary = titles(buildDreInsights(report, january, { current: 'jan/26', previous: '', window: 'até jan/26', when: 'em jan/26' }))
    expect(titlesOfJanuary).not.toContain('Consistência do resultado')
    expect(titlesOfJanuary).not.toContain('Melhor mês de receita')
    expect(titlesOfJanuary).not.toContain('Margem de contribuição média')
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
      'Lucro conferido',
      'Divergência entre relatórios',
    ])
    expect(insights.find((i) => i.title === 'Vende muito, lucra pouco')?.description).toContain('Vacina Alfa')
    expect(insights.find((i) => i.title === 'Custo não cadastrado')?.description).toContain('Produto Novo')
    expect(insights.every((i) => i.explanation.length > 20)).toBe(true)
  })

  it('não fala em fatia do lucro quando há prejuízo e compara com a média dos itens com custo', () => {
    const description = buildProfitInsights(analysis.profitability!, analysis).find((i) => i.title === 'Lucro da classe A')!
      .description
    expect(description).toMatch(/^A classe A teve lucro de R\$\s?1,2\smil/)
    expect(description).toContain('média dos itens com custo cadastrado: 29%')
  })

  it('avisa primeiro quando o lucro informado não confere', () => {
    const rows = csvRows(PROFIT_OCTOBER).map((row) => (row[1] === 'Vacina Alfa' ? [...row.slice(0, 7), '800'] : row))
    const inflated = new AnalyzeAbcUseCase().execute(abc, [
      profit[0]!,
      ProfitReport.fromTable({ name: 'lucro out.2026', rows })!,
    ])!
    const [first] = buildProfitInsights(inflated.profitability!, inflated)
    expect(first!.title).toBe('Lucro não confere')
    expect(first!.description).toMatch(/Vacina Alfa \(\+R\$\s?80,00\)/)
    expect(first!.description).toMatch(/informa R\$\s?1\.759,00 e a conta dá R\$\s?1\.679,00/)
  })

  it('nomeia o mês comparado nas maiores altas e quedas', () => {
    const insights = buildAbcInsights(analysis)
    expect(insights.find((i) => i.title === 'Maior queda de faturamento')?.description).toContain('frente a set/26')
  })

  it('não anuncia alta de 0% quando o mês anterior não tem base', () => {
    const empty = ProfitReport.fromTable({
      name: 'lucro set.2026',
      rows: [csvRows(PROFIT_SEPTEMBER)[0]!, ['1', 'Vacina Alfa', '1', '0', '0', '0', '0', '0']],
    })!
    const zeroBase = new AnalyzeAbcUseCase().execute(abc, [empty, profit[1]!])!
    expect(titles(buildProfitInsights(zeroBase.profitability!, zeroBase))).not.toContain('Lucro em alta')
  })
})
