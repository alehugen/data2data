import { describe, expect, it } from 'vitest'
import { AbcReport } from '@/domain/abc'
import { ABC_SEPTEMBER, csvRows } from '@/test/fixtures'
import {
  describeReport,
  escapeHtml,
  formatAbcMonth,
  formatCurrency,
  formatPercent,
  formatPeriod,
  formatPeriodLong,
  formatSignedPercent,
  prettifyLabel,
} from '@/presentation/format'

const nbsp = (text: string) => text.replace(/\s/g, ' ')

describe('formatadores', () => {
  it('formata valores em pt-BR', () => {
    expect(nbsp(formatCurrency(1234.5))).toBe('R$ 1.234,50')
    expect(formatPercent(0.256)).toBe('25,6%')
    expect(formatSignedPercent(0.1)).toBe('+10%')
    expect(formatSignedPercent(-0.1)).toBe('-10%')
  })

  it('formata períodos', () => {
    expect(formatPeriod({ year: 2026, month: 10 })).toBe('out/26')
    expect(formatPeriodLong({ year: 2026, month: 10 })).toBe('outubro de 2026')
  })

  it('descreve relatórios mensais pelo mês ou, sem mês, pelo nome', () => {
    const withMonth = AbcReport.fromTable({ name: 'abc set.2026', rows: csvRows(ABC_SEPTEMBER) })!
    const withoutMonth = AbcReport.fromTable({ name: 'curva', rows: csvRows(ABC_SEPTEMBER) })!
    expect(formatAbcMonth(withMonth)).toBe('set/26')
    expect(formatAbcMonth(withoutMonth)).toBe('curva')
    expect(describeReport(withMonth)).toBe('Curva ABC · set/26')
  })
})

describe('prettifyLabel', () => {
  it.each([
    ['CUSTOS DAS MERCADORIAS VENDIDAS', 'Custos das mercadorias vendidas'],
    ['RESULTADO LÍQUIDO (EBITDA)', 'Resultado líquido (EBITDA)'],
    ['Simples Nacional (DAS)', 'Simples Nacional (DAS)'],
  ])('%s → %s', (input, expected) => {
    expect(prettifyLabel(input)).toBe(expected)
  })
})

describe('escapeHtml', () => {
  it('neutraliza HTML vindo dos arquivos', () => {
    expect(escapeHtml(`<img src=x onerror="alert('1')">&`)).toBe('&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;')
  })
})
