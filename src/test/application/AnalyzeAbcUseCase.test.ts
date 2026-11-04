import { describe, expect, it } from 'vitest'
import { AbcMovement, analyzeProfitability, AnalyzeAbcUseCase } from '@/application'
import { AbcReport } from '@/domain/abc'
import { ProfitReport } from '@/domain/profit'
import { ABC_OCTOBER, ABC_SEPTEMBER, PROFIT_OCTOBER, PROFIT_SEPTEMBER, csvRows } from '@/test/fixtures'

const abcSeptember = AbcReport.fromTable({ name: 'Curva ABC set.2026', rows: csvRows(ABC_SEPTEMBER) })!
const abcOctober = AbcReport.fromTable({ name: 'Curva ABC out.2026', rows: csvRows(ABC_OCTOBER) })!
const profitSeptember = ProfitReport.fromTable({ name: 'Lucro set.2026', rows: csvRows(PROFIT_SEPTEMBER) })!
const profitOctober = ProfitReport.fromTable({ name: 'Lucro out.2026', rows: csvRows(PROFIT_OCTOBER) })!

const useCase = new AnalyzeAbcUseCase()

describe('AnalyzeAbcUseCase', () => {
  it('ordena os meses e analisa o mais recente por padrão', () => {
    const analysis = useCase.execute([abcOctober, abcSeptember])!
    expect(analysis.months.map((m) => m.report.id)).toEqual([abcSeptember.id, abcOctober.id])
    expect(analysis.current.report).toBe(abcOctober)
    expect(analysis.previous?.report).toBe(abcSeptember)
  })

  it('não abre num relatório sem mês nem o compara com outro mês', () => {
    const undated = AbcReport.fromTable({ name: 'Curva sem data', rows: csvRows(ABC_SEPTEMBER) })!
    const analysis = useCase.execute([abcOctober, undated, abcSeptember])!
    expect(analysis.current.report).toBe(abcOctober)
    const chosen = useCase.execute([abcOctober, undated, abcSeptember], [], undated.id)!
    expect(chosen.previous).toBeNull()
    expect(chosen.movements).toEqual([])
  })

  it('ordena o ranking pela participação, mesmo com o arquivo fora de ordem', () => {
    const shuffled = AbcReport.fromTable({
      name: 'Curva ABC out.2026',
      rows: [csvRows(ABC_OCTOBER)[0]!, ...csvRows(ABC_OCTOBER).slice(1).reverse()],
    })!
    const { ranking } = useCase.execute([shuffled])!
    expect(ranking.map((item) => item.share)).toEqual([0.4, 0.3, 0.2, 0.1])
  })

  it('analisa o mês escolhido', () => {
    const analysis = useCase.execute([abcSeptember, abcOctober], [], abcSeptember.id)!
    expect(analysis.current.report).toBe(abcSeptember)
    expect(analysis.previous).toBeNull()
    expect(analysis.movements).toEqual([])
  })

  it('resume o mês por classe', () => {
    const analysis = useCase.execute([abcSeptember])!
    expect(analysis.current.byClass.A).toEqual({ items: 2, quantity: 15, value: 6000 })
  })

  it('compara itens entre meses', () => {
    const { movements } = useCase.execute([abcSeptember, abcOctober])!
    const movementOf = (description: string) => movements.find((m) => m.description === description)?.movement
    expect(movementOf('Produto Novo')).toBe(AbcMovement.New)
    expect(movementOf('Aplicação de brinco')).toBe(AbcMovement.Up)
    expect(movementOf('Vacina Beta')).toBe(AbcMovement.Down)
    expect(movementOf('Produto Gama')).toBe(AbcMovement.Gone)
    expect(movementOf('Vacina Alfa')).toBe(AbcMovement.Same)
    expect(movements.map((m) => m.movement)).toEqual(['new', 'up', 'down', 'gone', 'same'])
  })

  it('associa o relatório de lucro do mesmo mês', () => {
    const analysis = useCase.execute([abcSeptember, abcOctober], [profitOctober, profitSeptember])!
    expect(analysis.current.profitReport).toBe(profitOctober)
    expect(analysis.months[0]!.profitReport).toBe(profitSeptember)
    expect(analysis.profitability?.previousTotals?.profit).toBe(1717)
  })

  it('não cruza lucro sem relatório do mês', () => {
    expect(useCase.execute([abcOctober], [profitSeptember])!.profitability).toBeNull()
  })

  it('retorna null sem relatórios', () => {
    expect(useCase.execute([])).toBeNull()
  })
})

describe('analyzeProfitability', () => {
  const result = analyzeProfitability(abcOctober, profitOctober, profitSeptember)
  const descriptions = (items: readonly { description: string }[]) => items.map((item) => item.description)

  it('totaliza o lucro e a margem do mês', () => {
    expect(result.totals.profit).toBe(1679)
    expect(result.totals.margin).toBeCloseTo(1679 / 5550)
    expect(result.previousTotals?.profit).toBe(1717)
  })

  it('cruza cada item com a classe da Curva ABC', () => {
    const item = result.items.find((i) => i.description === 'Aplicação de brinco')!
    expect(item).toMatchObject({ abcClass: 'A', profit: 490, costMissing: false })
    expect(item.margin).toBeCloseTo(490 / 600)
    expect(item.profitPerUnit).toBeCloseTo(490 / 6)
    expect(result.items[0]!.profit).toBeGreaterThanOrEqual(result.items[1]!.profit)
  })

  it('separa o lucro por classe e o que ficou fora da curva', () => {
    expect(result.byClass.A.profit).toBe(1210)
    expect(result.byClass.A.margin).toBeCloseTo(1210 / 4600)
    expect(result.outsideAbc).toEqual({ revenue: 50, profit: -11 })
  })

  it('não calcula fatia do lucro quando alguma parte dá prejuízo', () => {
    expect(result.byClass.A.profitShare).toBeNull()
    const withoutLoss = ProfitReport.fromTable({
      name: 'Lucro out.2026',
      rows: csvRows(PROFIT_OCTOBER).filter((row) => row[1] !== 'Item Fora da Curva'),
    })!
    const shares = analyzeProfitability(abcOctober, withoutLoss).byClass
    expect(shares.A.profitShare).toBeCloseTo(1210 / 1690)
  })

  it('confere o lucro informado com venda − custo − impostos − taxas', () => {
    expect(result.profitCheck).toMatchObject({ divergent: [], missingColumns: ['materials'] })
    expect(result.profitCheck.difference).toBeCloseTo(0)

    const rows = csvRows(PROFIT_OCTOBER).map((row) => (row[1] === 'Vacina Alfa' ? [...row.slice(0, 7), '800'] : row))
    const inflated = analyzeProfitability(abcOctober, ProfitReport.fromTable({ name: 'Lucro out.2026', rows })!)
    expect(inflated.profitCheck.divergent.map((item) => [item.description, item.unexplained])).toEqual([['Vacina Alfa', 80]])
    expect(inflated.profitCheck.calculated).toBeCloseTo(1679)
    expect(inflated.profitCheck.difference).toBeCloseTo(80)
  })

  it('desconta os materiais na conferência do lucro', () => {
    const rows = [
      ['ProCodigo', 'ProDescricao', 'Qtde', 'PedValorTotal', 'PedICustoGerencial', 'Imposto', 'Materiais', 'TaxaFinanceira', 'Lucro'],
      ['1', 'Vacina Alfa', '8', '4000', '3200', '0', '160', '80', '560'],
      ['3', 'Aplicação de brinco', '6', '600', '100', '0', '5', '10', '485'],
    ]
    const check = analyzeProfitability(abcOctober, ProfitReport.fromTable({ name: 'Lucro out.2026', rows })!).profitCheck
    expect(check).toMatchObject({ divergent: [], missingColumns: [] })
    expect(check.calculated).toBeCloseTo(560 + 485)
  })

  it('aponta as colunas que faltam para fechar o lucro e tolera arredondamento', () => {
    const rows = [
      ['ProCodigo', 'ProDescricao', 'Qtde', 'PedValorTotal', 'PedICustoGerencial', 'Lucro'],
      ['1', 'Vacina Alfa', '8', '4000', '3200', '720'],
      ['3', 'Aplicação de brinco', '6', '600', '100', '500.03'],
    ]
    const check = analyzeProfitability(abcOctober, ProfitReport.fromTable({ name: 'Lucro out.2026', rows })!).profitCheck
    expect(check.missingColumns).toEqual(['tax', 'materials', 'financialFee'])
    expect(check.divergent.map((item) => item.description)).toEqual(['Vacina Alfa'])
  })

  it('compara margens só com itens que têm custo cadastrado', () => {
    expect(result.referenceMargin).toBeCloseTo((720 + 490 + 380 - 11) / (4000 + 600 + 800 + 50))
  })

  it('não trata item fora da Curva ABC como classe B ou C', () => {
    const outside = ProfitReport.fromTable({
      name: 'Lucro out.2026',
      rows: [...csvRows(PROFIT_OCTOBER), ['99', 'Sem ABC', '1', '100', '10', '0', '0', '90']],
    })!
    expect(analyzeProfitability(abcOctober, outside).hiddenGems.map((item) => item.description)).not.toContain('Sem ABC')
  })

  it('aponta classe A com margem abaixo da média e itens de alta margem fora da classe A', () => {
    expect(descriptions(result.lowMarginVolume)).toEqual(['Vacina Alfa'])
    expect(descriptions(result.hiddenGems)).toEqual(['Vacina Beta'])
  })

  it('aponta prejuízo, custo não cadastrado e divergências entre relatórios', () => {
    expect(descriptions(result.losses)).toEqual(['Item Fora da Curva'])
    expect(descriptions(result.missingCost)).toEqual(['Produto Novo'])
    expect(result.mismatches.onlyInProfit).toEqual(['Item Fora da Curva'])
    expect(result.mismatches.onlyInAbc).toEqual([])
    expect(result.mismatches.revenueDiffers).toEqual([])
  })

  it('detecta valor de venda diferente entre os relatórios', () => {
    const changed = ProfitReport.fromTable({
      name: 'Lucro out.2026',
      rows: csvRows(PROFIT_OCTOBER.replace('1;Vacina Alfa;8;4000', '1;Vacina Alfa;8;4100')),
    })!
    expect(analyzeProfitability(abcOctober, changed).mismatches.revenueDiffers).toEqual([
      { description: 'Vacina Alfa', abcValue: 4000, profitRevenue: 4100 },
    ])
  })
})
