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

  it('analisa o mês escolhido', () => {
    const analysis = useCase.execute([abcSeptember, abcOctober], [], abcSeptember.id)!
    expect(analysis.current.report).toBe(abcSeptember)
    expect(analysis.previous).toBeNull()
    expect(analysis.movements).toEqual([])
  })

  it('resume o mês por classe e acumula a participação', () => {
    const analysis = useCase.execute([abcSeptember])!
    expect(analysis.current.byClass.A).toEqual({ items: 2, quantity: 15, value: 6000 })
    expect(analysis.ranking.map((item) => item.cumulativeShare)).toEqual([0.5, 0.75, 0.9, 1])
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

  it('separa o lucro por classe', () => {
    expect(result.byClass.A.profit).toBe(1210)
    expect(result.byClass.A.profitShare).toBeCloseTo(1210 / 1679)
    expect(result.byClass.A.margin).toBeCloseTo(1210 / 4600)
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
