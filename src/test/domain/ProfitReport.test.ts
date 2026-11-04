import { describe, expect, it } from 'vitest'
import { PROFIT_OCTOBER, csvRows } from '@/test/fixtures'
import { ProfitReport } from '@/domain/profit'

const parse = (rows: string[][], name = 'Relatório_Lucro_por_Produto-out.2026') => ProfitReport.fromTable({ name, rows })

describe('ProfitReport.fromTable', () => {
  it('lê os itens com custo, impostos, taxas e lucro', () => {
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
      financialFee: 80,
      profit: 720,
    })
  })

  it('totaliza o mês', () => {
    expect(parse(csvRows(PROFIT_OCTOBER))!.totals).toEqual({
      quantity: 21,
      revenue: 5550,
      cost: 3760,
      tax: 0,
      materials: 0,
      financialFee: 111,
      profit: 1679,
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

  it('trata custos, impostos e taxas como saídas mesmo quando vêm negativos', () => {
    const report = parse([
      ['Código', 'Descrição', 'Valor total', 'Custo', 'Imposto', 'Taxa financeira', 'Lucro'],
      ['1', 'X', '100', '-60', '-5', '-2', '33'],
    ])!
    expect(report.items[0]).toMatchObject({ cost: 60, tax: 5, financialFee: 2, profit: 33 })
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
    expect(report.hasColumn).toEqual({ tax: true, materials: true, financialFee: true })
    expect(report.items[0]).toMatchObject({ cost: 184.24, materials: 9.212, profit: 131.448 })
    expect(report.totals.materials).toBeCloseTo(9.212 + 21.5325)
    expect(report.totals.profit).toBeCloseTo(131.448 + 332.9775)
  })

  it('aceita relatórios antigos, sem coluna de materiais', () => {
    const report = parse(csvRows(PROFIT_OCTOBER))!
    expect(report.hasColumn.materials).toBe(false)
    expect(report.totals.materials).toBe(0)
  })

  it('não confunde Curva ABC com relatório de lucro', () => {
    expect(parse([['ProCodigo', 'ProDescricao', 'Qtde', 'ValorTotal', 'Classificacao'], ['1', 'X', '1', '10', 'A']])).toBeNull()
  })
})
