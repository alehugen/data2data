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

  it('não confunde Curva ABC com relatório de lucro', () => {
    expect(parse([['ProCodigo', 'ProDescricao', 'Qtde', 'ValorTotal', 'Classificacao'], ['1', 'X', '1', '10', 'A']])).toBeNull()
  })
})
