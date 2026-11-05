import { describe, expect, it } from 'vitest'
import { PROFIT_OCTOBER, csvRows } from '@/test/fixtures'
import { ProfitReport } from '@/domain/profit'

const parse = (rows: string[][], name = 'Relatório_Lucro_por_Produto-out.2026') => ProfitReport.fromTable({ name, rows })

describe('ProfitReport.fromTable', () => {
  it('lê os itens e calcula o lucro bruto sem a taxa financeira', () => {
    const report = parse(csvRows(PROFIT_OCTOBER))!
    expect(report.period).toEqual({ year: 2026, month: 10 })
    expect(report.items[0]).toEqual({
      code: '1',
      description: 'Vacina Alfa',
      quantity: 8,
      revenue: 4000,
      cost: 3200,
      tax: 0,
      materials: 0,
      profit: 800,
    })
  })

  it('totaliza o mês', () => {
    expect(parse(csvRows(PROFIT_OCTOBER))!.totals).toEqual({
      quantity: 21,
      revenue: 5550,
      cost: 3760,
      tax: 0,
      materials: 0,
      profit: 1790,
    })
  })

  it('soma linhas repetidas do mesmo produto', () => {
    const report = parse([
      ['Código', 'Descrição', 'Qtde', 'Valor total', 'Custo', 'Lucro'],
      ['1', 'X', '1', '100', '60', '40'],
      ['1', 'X', '2', '200', '120', '80'],
    ])!
    expect(report.items).toEqual([expect.objectContaining({ quantity: 3, revenue: 300, cost: 180, profit: 120 })])
  })

  it('ignora linhas de total no fim do arquivo', () => {
    const report = parse([
      ['Código', 'Descrição', 'Qtde', 'Valor total', 'Custo', 'Lucro'],
      ['1', 'X', '1', '100', '60', '40'],
      ['', 'TOTAL', '1', '100', '60', '40'],
      ['Total geral', 'Total geral', '1', '100', '60', '40'],
    ])!
    expect(report.items).toHaveLength(1)
    expect(report.totals.profit).toBe(40)
  })

  it('trata custos, impostos e materiais como saídas mesmo quando vêm negativos', () => {
    const report = parse([
      ['Código', 'Descrição', 'Valor total', 'Custo', 'Imposto', 'Materiais', 'Lucro'],
      ['1', 'X', '100', '-60', '-5', '-2', '33'],
    ])!
    expect(report.items[0]).toMatchObject({ cost: 60, tax: 5, materials: 2, profit: 33 })
  })

  it('prefere a coluna de custo total à de custo unitário, em qualquer ordem', () => {
    const report = parse([
      ['Código', 'Descrição', 'Qtde', 'Valor total', 'Custo', 'Custo total', 'Lucro'],
      ['1', 'X', '10', '100', '6', '60', '40'],
    ])!
    expect(report.items[0]!.cost).toBe(60)
  })

  it('ignora zeros à esquerda no código do produto', () => {
    const report = parse([
      ['Código', 'Descrição', 'Valor total', 'Custo', 'Lucro'],
      ['0101', 'X', '100', '60', '40'],
    ])!
    expect(report.items[0]!.code).toBe('101')
  })

  it('lê a coluna de materiais com decimais de várias casas', () => {
    const report = parse([
      ['ProCodigo', 'ProDescricao', 'Qtde', 'PedValorTotal', 'PedICustoGerencial', 'Imposto', 'Materiais', 'TaxaFinanceira', 'Lucro'],
      ['1', 'Item A', '2', '360', '184,24', '28,8', '9,212', '6,3', '131,448'],
      ['2', 'Item B', '3', '870', '430,65', '69,6', '21,5325', '15,24', '332,9775'],
    ])!
    expect(report.items[0]).toMatchObject({ cost: 184.24, materials: 9.212 })
    expect(report.items[0]!.profit).toBeCloseTo(360 - 184.24 - 28.8 - 9.212)
    expect(report.totals.materials).toBeCloseTo(9.212 + 21.5325)
    expect(report.totals.profit).toBeCloseTo(360 - 184.24 - 28.8 - 9.212 + (870 - 430.65 - 69.6 - 21.5325))
  })

  it('aceita relatórios antigos, sem coluna de materiais', () => {
    const report = parse(csvRows(PROFIT_OCTOBER))!
    expect(report.totals.materials).toBe(0)
  })

  it('não confunde Curva ABC com relatório de lucro', () => {
    expect(parse([['ProCodigo', 'ProDescricao', 'Qtde', 'ValorTotal', 'Classificacao'], ['1', 'X', '1', '10', 'A']])).toBeNull()
  })
})

describe('ProfitReport.combine', () => {
  it('soma os itens pelo código', () => {
    const october = parse(csvRows(PROFIT_OCTOBER))!
    const withMaterials = parse([
      ['ProCodigo', 'ProDescricao', 'PedValorTotal', 'PedICustoGerencial', 'Materiais', 'Lucro'],
      ['1', 'Vacina Alfa', '1000', '800', '10', '190'],
    ])!
    const combined = ProfitReport.combine([october, withMaterials], 'Meses combinados')
    expect(combined.period).toBeNull()
    expect(combined.items.find((item) => item.code === '1')).toMatchObject({ revenue: 5000, cost: 4000, materials: 10, profit: 990 })
    expect(combined.totals.profit).toBe(1790 + 190)
  })
})

describe('linhas sem valor vendido', () => {
  it('mantém o custo de itens sem venda no mês, para não esconder o prejuízo', () => {
    const report = parse([
      ['Código', 'Descrição', 'Valor total', 'Custo', 'Lucro'],
      ['1', 'Vendido', '100', '60', '40'],
      ['2', 'Só custo', '', '30', '-30'],
      ['', 'Grupo: Vacinas', '', '', ''],
    ])!
    expect(report.items.map((item) => [item.description, item.profit])).toEqual([
      ['Vendido', 40],
      ['Só custo', -30],
    ])
  })
})
