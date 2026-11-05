import { describe, expect, it } from 'vitest'
import { ABC_ALL_MONTHS, AbcMovement, abcYearKey, analyzeProfitability, AnalyzeAbcUseCase } from '@/application'
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
    expect(analysis.profitability?.previousTotals?.profit).toBe(1850)
  })

  it('não cruza lucro sem relatório do mês', () => {
    expect(useCase.execute([abcOctober], [profitSeptember])!.profitability).toBeNull()
  })

  it('retorna null sem relatórios', () => {
    expect(useCase.execute([])).toBeNull()
  })
})

describe('meses combinados', () => {
  it('soma todos os meses, recalcula as classes e não compara com mês anterior', () => {
    const analysis = useCase.execute([abcSeptember, abcOctober], [], ABC_ALL_MONTHS)!
    expect(analysis.periods).toEqual([
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
    ])
    expect(analysis.current).toMatchObject({ items: 5, quantity: 40, value: 12200 })
    expect(analysis.current.byClass.A).toMatchObject({ items: 3, quantity: 36 })
    expect(analysis.ranking.map((item) => item.description)[0]).toBe('Vacina Alfa')
    expect(analysis).toMatchObject({ previous: null, movements: [], profitability: null })
    expect(analysis.months).toHaveLength(2)
  })

  it('combina também o lucro quando todos os meses têm relatório de lucro', () => {
    const analysis = useCase.execute([abcSeptember, abcOctober], [profitSeptember, profitOctober], ABC_ALL_MONTHS)!
    expect(analysis.profitability!.totals.profit).toBe(1850 + 1790)
    expect(analysis.profitability!.previousTotals).toBeNull()
    expect(useCase.execute([abcSeptember, abcOctober], [profitOctober], ABC_ALL_MONTHS)!.profitability).toBeNull()
  })

  it('filtra pelo ano no acumulado', () => {
    const lastYear = AbcReport.fromTable({ name: 'Curva ABC dez.2025', rows: csvRows(ABC_SEPTEMBER) })!
    const analysis = useCase.execute([lastYear, abcSeptember, abcOctober], [], abcYearKey(2026))!
    expect(analysis.periods.map((period) => period.year)).toEqual([2026, 2026])
    expect(analysis.current.quantity).toBe(40)
  })

  it('com um mês só, volta para a análise do mês', () => {
    const analysis = useCase.execute([abcSeptember], [], ABC_ALL_MONTHS)!
    expect(analysis.current.report).toBe(abcSeptember)
    expect(analysis.periods).toEqual([{ year: 2026, month: 9 }])
  })
})

describe('analyzeProfitability', () => {
  const result = analyzeProfitability(abcOctober, profitOctober, profitSeptember)
  const descriptions = (items: readonly { description: string }[]) => items.map((item) => item.description)

  it('totaliza o lucro e a margem do mês', () => {
    expect(result.totals.profit).toBe(1790)
    expect(result.totals.margin).toBeCloseTo(1790 / 5550)
    expect(result.previousTotals?.profit).toBe(1850)
  })

  it('cruza cada item com a classe da Curva ABC', () => {
    const item = result.items.find((i) => i.description === 'Aplicação de brinco')!
    expect(item).toMatchObject({ abcClass: 'A', profit: 500, costMissing: false })
    expect(item.margin).toBeCloseTo(500 / 600)
    expect(item.profitPerUnit).toBeCloseTo(500 / 6)
    expect(result.items[0]!.profit).toBeGreaterThanOrEqual(result.items[1]!.profit)
  })

  it('separa o lucro por classe e o que ficou fora da curva', () => {
    expect(result.byClass.A.profit).toBe(1300)
    expect(result.byClass.A.margin).toBeCloseTo(1300 / 4600)
    expect(result.outsideAbc).toEqual({ revenue: 50, profit: -10 })
  })

  it('não calcula fatia do lucro quando alguma parte dá prejuízo', () => {
    expect(result.byClass.A.profitShare).toBeNull()
    const withoutLoss = ProfitReport.fromTable({
      name: 'Lucro out.2026',
      rows: csvRows(PROFIT_OCTOBER).filter((row) => row[1] !== 'Item Fora da Curva'),
    })!
    const shares = analyzeProfitability(abcOctober, withoutLoss).byClass
    expect(shares.A.profitShare).toBeCloseTo(1300 / 1800)
  })

  it('calcula o lucro bruto sem a taxa financeira e ignora o lucro informado no arquivo', () => {
    const rows = [
      ['ProCodigo', 'ProDescricao', 'Qtde', 'PedValorTotal', 'PedICustoGerencial', 'Imposto', 'Materiais', 'TaxaFinanceira', 'Lucro'],
      ['1', 'Vacina Alfa', '8', '4000', '3200', '0', '160', '80', '1'],
    ]
    const result = analyzeProfitability(abcOctober, ProfitReport.fromTable({ name: 'Lucro out.2026', rows })!)
    expect(result.items[0]!.profit).toBe(4000 - 3200 - 160)
    expect(result.totals.profit).toBe(640)
  })

  it('compara margens só com itens que têm custo cadastrado', () => {
    expect(result.referenceMargin).toBeCloseTo((800 + 500 + 400 - 10) / (4000 + 600 + 800 + 50))
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

describe('Curva ABC sem coluna de valor', () => {
  it('não aponta divergência de faturamento em todos os itens', () => {
    const withoutValue = AbcReport.fromTable({
      name: 'Curva ABC out.2026',
      rows: [
        ['Código', 'Descrição', 'Qtde', 'Classe'],
        ['1', 'Vacina Alfa', '8', 'A'],
      ],
    })!
    expect(analyzeProfitability(withoutValue, profitOctober).mismatches.revenueDiffers).toEqual([])
  })
})
