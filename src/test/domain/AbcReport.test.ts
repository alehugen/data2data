import { describe, expect, it } from 'vitest'
import { ABC_OCTOBER, ABC_SEPTEMBER, csvRows } from '@/test/fixtures'
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

  it('sem percentual, deduz pelas classes que a curva é por faturamento', () => {
    const report = AbcReport.fromTable({
      name: 'abc set.2026',
      rows: [['Descrição', 'Qtde', 'Valor total', 'Classe'], ['Caro', '1', '1000', 'A'], ['Barato', '100', '100', 'C']],
    })!
    expect(report.basis).toBe('value')
    expect(report.items.map((item) => item.share)).toEqual([1000 / 1100, 100 / 1100])
  })

  it('não inventa critério quando as classes não seguem quantidade nem faturamento', () => {
    const report = AbcReport.fromTable({
      name: 'abc set.2026',
      rows: [['Descrição', 'Qtde', 'Valor total', 'Classe'], ['X', '1', '100', 'A'], ['Y', '5', '500', 'B']],
    })!
    expect(report.basis).toBeNull()
  })
})

describe('AbcReport.combine', () => {
  const september = parse(csvRows(ABC_SEPTEMBER))!
  const october = parse(csvRows(ABC_OCTOBER), 'Relatório_Curva_ABC- out.2026')!
  const combined = AbcReport.combine([september, october], 'Meses combinados')

  it('soma cada produto nos meses e não tem mês próprio', () => {
    expect(combined.period).toBeNull()
    expect(combined.totalQuantity).toBe(40)
    expect(combined.totalValue).toBe(12200)
    expect(combined.items.find((item) => item.description === 'Vacina Alfa')).toMatchObject({ quantity: 18, value: 9000 })
  })

  it('recalcula participação e classe sobre o total, pelo critério dos relatórios', () => {
    expect(combined.basis).toBe('quantity')
    expect(combined.items.map((item) => [item.description, item.share, item.abcClass])).toEqual([
      ['Vacina Alfa', 0.45, 'A'],
      ['Vacina Beta', 0.225, 'A'],
      ['Aplicação de brinco', 0.225, 'A'],
      ['Produto Gama', 0.05, 'B'],
      ['Produto Novo', 0.05, 'C'],
    ])
  })

  it('usa o faturamento quando os relatórios têm critérios diferentes', () => {
    const byValue = parse([
      ['Descrição', 'Qtde', 'Valor total', 'Classe'],
      ['Caro', '1', '1000', 'A'],
      ['Barato', '100', '100', 'C'],
    ])!
    expect(AbcReport.combine([september, byValue], 'Meses').basis).toBe('value')
  })
})

describe('formato dos números', () => {
  it('lê quantidades como 1,000 pelo formato brasileiro das outras colunas', () => {
    const report = parse([
      ['Descrição', 'Qtde', 'Valor total', 'Classe'],
      ['Vacina', '2,000', '1.234,56', 'A'],
      ['Seringa', '1,000', '99,90', 'B'],
    ])!
    expect(report.items.map((item) => [item.quantity, item.value])).toEqual([
      [2, 1234.56],
      [1, 99.9],
    ])
  })
})

describe('Curva ABC sem coluna de valor', () => {
  const withoutValue = parse([
    ['Descrição', 'Qtde', 'Classe'],
    ['Vacina Alfa', '30', 'A'],
    ['Vacina Beta', '1', 'C'],
  ])!

  it('combina pela quantidade, já que um dos meses não tem faturamento', () => {
    const byValue = parse([
      ['Descrição', 'Qtde', 'Valor total', 'Classe'],
      ['Vacina Beta', '1', '1000', 'A'],
      ['Vacina Alfa', '2', '10', 'C'],
    ])!
    const combined = AbcReport.combine([withoutValue, byValue], 'Meses')
    expect(combined.basis).toBe('quantity')
    expect(combined.items[0]).toMatchObject({ description: 'Vacina Alfa', abcClass: 'A' })
  })

  it('classifica tudo como C quando não há nada para dividir', () => {
    const empty = parse([
      ['Descrição', 'Qtde', 'Classe'],
      ['Item', '0', 'A'],
    ])!
    expect(AbcReport.combine([empty], 'Meses').items[0]!.abcClass).toBe('C')
  })
})
