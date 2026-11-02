import { describe, expect, it } from 'vitest'
import { ABC_SEPTEMBER, PROFIT_OCTOBER, csvRows, dreRows } from '@/test/fixtures'
import { isMonthlyReport, recognizeReports } from '@/domain/report'

describe('recognizeReports', () => {
  it('reconhece a DRE e ignora as demais abas da planilha', () => {
    const reports = recognizeReports(
      [
        { name: 'p · Fluxo', sheet: 'Fluxo', rows: [['Data', 'Valor'], ['2026-01-01', '10']] },
        { name: 'p · DRE Geral', sheet: 'DRE Geral', rows: dreRows() },
      ],
      'xlsx',
    )
    expect(reports.map((r) => r.kind)).toEqual(['dre'])
  })

  it('reconhece relatório de lucro e Curva ABC', () => {
    expect(recognizeReports([{ name: 'lucro out.2026', rows: csvRows(PROFIT_OCTOBER) }], 'csv')[0]!.kind).toBe('profit')
    expect(recognizeReports([{ name: 'abc set.2026', rows: csvRows(ABC_SEPTEMBER) }], 'csv')[0]!.kind).toBe('abc')
  })

  it('trata qualquer outra tabela como genérica', () => {
    const [report] = recognizeReports([{ name: 'vendas', rows: [['Item', 'Valor'], ['A', '1']] }], 'csv')
    expect(report!.kind).toBe('dataset')
  })

  it('recusa arquivos sem dados', () => {
    expect(() => recognizeReports([{ name: 'vazio', rows: [['', ' '], []] }], 'csv')).toThrow('O arquivo não contém dados.')
  })

  it('identifica relatórios mensais', () => {
    const [abc] = recognizeReports([{ name: 'abc set.2026', rows: csvRows(ABC_SEPTEMBER) }], 'csv')
    const [dre] = recognizeReports([{ name: 'dre', sheet: 'DRE Geral', rows: dreRows() }], 'xlsx')
    expect(isMonthlyReport(abc!)).toBe(true)
    expect(isMonthlyReport(dre!)).toBe(false)
  })
})
