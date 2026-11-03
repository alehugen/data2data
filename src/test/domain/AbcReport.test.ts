import { describe, expect, it } from 'vitest'
import { ABC_SEPTEMBER, csvRows } from '@/test/fixtures'
import { AbcReport } from '@/domain/abc'

const parse = (rows: string[][], name = 'Relatório_Curva_ABC- set.2026') => AbcReport.fromTable({ name, rows })

describe('AbcReport.fromTable', () => {
  it('lê itens, totais e mês de referência', () => {
    const report = parse(csvRows(ABC_SEPTEMBER))!
    expect(report.period).toEqual({ year: 2026, month: 9 })
    expect(report.items).toHaveLength(4)
    expect(report.items[0]).toEqual({ code: '1', description: 'Vacina Alfa', quantity: 10, value: 5000, abcClass: 'A', share: 0.5 })
    expect(report.totalQuantity).toBe(20)
    expect(report.totalValue).toBe(6700)
  })

  it('detecta o critério da classificação', () => {
    expect(parse(csvRows(ABC_SEPTEMBER))!.basis).toBe('quantity')
    const byValue = [['Descrição', 'Qtde', 'Valor', 'Classe', 'Percentual'], ['X', '1', '75', 'A', '75'], ['Y', '3', '25', 'B', '25']]
    expect(parse(byValue)!.basis).toBe('value')
  })

  it('aceita cabeçalho depois de linhas de título, apelidos de coluna e classe minúscula', () => {
    const report = parse([
      ['Relatório de vendas'],
      [''],
      ['Código', 'Descrição', 'Quantidade', 'Valor', 'Classe', 'Percentual'],
      ['1', 'Item X', '2', '100', 'a', '0,5'],
      ['2', 'Item Y', '2', '50', 'B', '0,5'],
    ])!
    expect(report.items.map((item) => item.abcClass)).toEqual(['A', 'B'])
    expect(report.items.map((item) => item.share)).toEqual([0.5, 0.5])
  })

  it('soma linhas com o mesmo código e ignora linhas de total', () => {
    const report = parse([
      ['Código', 'Descrição', 'Qtde', 'Valor', 'Classe'],
      ['1', 'Item X', '2', '100', 'A'],
      ['1', 'Item X', '1', '50', 'A'],
      ['', 'TOTAL', '3', '150', ''],
    ])!
    expect(report.items).toEqual([expect.objectContaining({ code: '1', quantity: 3, value: 150 })])
  })

  it('usa a descrição como código quando não há coluna de código', () => {
    const report = parse([['Descrição', 'Qtde', 'Classe'], ['Item X', '2', 'A']])!
    expect(report.items[0]!.code).toBe('Item X')
    expect(report.items[0]!.share).toBe(1)
  })

  it('não reconhece tabelas sem as colunas obrigatórias', () => {
    expect(parse([['Descrição', 'Qtde'], ['X', '1']])).toBeNull()
    expect(parse([['Descrição', 'Qtde', 'Classe'], ['X', '1', 'Z']])).toBeNull()
  })
})

describe('AbcReport: coluna de percentual', () => {
  it('calcula a participação pela quantidade quando o percentual está vazio', () => {
    const report = AbcReport.fromTable({
      name: 'abc set.2026',
      rows: [['Descrição', 'Qtde', 'Classe', 'Percentual'], ['X', '3', 'A', ''], ['Y', '1', 'B', '']],
    })!
    expect(report.items.map((item) => item.share)).toEqual([0.75, 0.25])
    expect(report.basis).toBe('quantity')
  })
})
