import { describe, expect, it } from 'vitest'
import { ColumnType, Dataset, inferColumnType } from '@/domain/dataset'

describe('inferColumnType', () => {
  it.each([
    [['01.02.2026', '15.03.2026'], ColumnType.Date],
    [['2026-01-02', '2026-02-03'], ColumnType.Date],
    [['30/09/2026'], ColumnType.Date],
    [['1.234,56', '10', ''], ColumnType.Number],
    [['Sim', 'Não', 'sim'], ColumnType.Boolean],
    [['Vacina', '10'], ColumnType.Text],
    [['', '  '], ColumnType.Text],
  ])('%j → %s', (values, expected) => {
    expect(inferColumnType(values)).toBe(expected)
  })
})

describe('Dataset.fromTable', () => {
  it('usa a primeira linha preenchida como cabeçalho e descarta linhas vazias', () => {
    const dataset = Dataset.fromTable({ name: 't', rows: [['', ''], ['Nome', 'Valor'], ['', ''], ['A', '10']] }, 'csv')
    expect(dataset.columns.map((c) => c.key)).toEqual(['Nome', 'Valor'])
    expect(dataset.rows).toEqual([{ Nome: 'A', Valor: '10' }])
    expect(dataset.rowCount).toBe(1)
  })

  it('dá nome único a cabeçalhos vazios ou repetidos sem perder dados', () => {
    const dataset = Dataset.fromTable({ name: 't', rows: [['Valor', 'Valor', ''], ['1', '2', '3']] }, 'csv')
    expect(dataset.columns.map((c) => c.key)).toEqual(['Valor', 'Valor (2)', 'Coluna 3'])
    expect(dataset.rows[0]).toEqual({ Valor: '1', 'Valor (2)': '2', 'Coluna 3': '3' })
  })

  it('infere o tipo de cada coluna', () => {
    const dataset = Dataset.fromTable({ name: 't', rows: [['Item', 'Qtde'], ['A', '1'], ['B', '2']] }, 'csv')
    expect(dataset.columns.map((c) => c.type)).toEqual([ColumnType.Text, ColumnType.Number])
    expect(dataset.columnValues('Qtde')).toEqual(['1', '2'])
  })
})
