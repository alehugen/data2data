import { beforeEach, describe, expect, it } from 'vitest'
import { AnalyzeAbcUseCase, AnalyzeDreUseCase, ImportFileUseCase } from '@/application'
import type { AbcReport } from '@/domain/abc'
import { DreMetric, type DreReport } from '@/domain/dre'
import type { ProfitReport } from '@/domain/profit'
import { CsvFileParser } from '@/infrastructure/CsvFileParser'
import { InMemoryReportRepository } from '@/infrastructure/InMemoryReportRepository'
import {
  buildAbcTemplate,
  buildDreTemplate,
  buildProfitTemplate,
  buildSampleFiles,
  previousMonth,
  sampleStatement,
} from '@/infrastructure/templates'
import { XlsxFileParser } from '@/infrastructure/XlsxFileParser'

let importFile: ImportFileUseCase

beforeEach(() => {
  importFile = new ImportFileUseCase(
    [new CsvFileParser(), new XlsxFileParser()],
    new InMemoryReportRepository(),
    () => new Date(2027, 0, 10),
  )
})

describe('previousMonth', () => {
  it('volta meses atravessando o ano', () => {
    expect(previousMonth(new Date(2026, 0, 15))).toEqual({ year: 2025, month: 12 })
    expect(previousMonth(new Date(2026, 10, 3), 2)).toEqual({ year: 2026, month: 9 })
  })
})

describe('modelo de DRE', () => {
  it('importado no meio do ano, deixa de fora os meses em aberto', async () => {
    const midYear = new ImportFileUseCase([new XlsxFileParser()], new InMemoryReportRepository(), () => new Date(2026, 10, 3))
    const [report] = (await midYear.execute(await buildDreTemplate(2026))) as DreReport[]
    expect(report!.periods).toHaveLength(10)
    expect(report!.periods.at(-1)).toEqual({ year: 2026, month: 10 })
    expect(report!.ignoredPeriods).toEqual([
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
    ])
  })

  it('é reconhecido como DRE com os 12 meses e as linhas-chave', async () => {
    const file = await buildDreTemplate(2026)
    expect(file.name).toBe('Modelo_DRE-2026.xlsx')

    const [report] = (await importFile.execute(file)) as DreReport[]
    expect(report!.kind).toBe('dre')
    expect(report!.periods).toHaveLength(12)
    expect(report!.periods[0]).toEqual({ year: 2026, month: 1 })
    for (const metric of Object.values(DreMetric)) expect(report!.metric(metric), metric).toBeDefined()
  })

  it('tem seções, grupos e totais coerentes', async () => {
    const [report] = (await importFile.execute(await buildDreTemplate(2026))) as DreReport[]
    const kindOf = (label: string) => report!.lines.find((line) => line.label === label)?.kind
    expect(kindOf('DESPESAS OPERACIONAIS')).toBe('section')
    expect(kindOf('DESPESAS COM PESSOAL')).toBe('group')
    expect(kindOf('Salários')).toBe('account')
    expect(kindOf('MARGEM DE CONTRIBUIÇÃO')).toBe('result')

    const analysis = new AnalyzeDreUseCase().execute(report!, { type: 'month', index: 5 })
    expect(analysis.breakEven).not.toBeNull()

    const operating = report!.lines.find((line) => line.label === 'DESPESAS OPERACIONAIS')!.values[5]!
    const target = analysis.profitTarget!
    expect(target.fixedCosts).toBeCloseTo(-operating, 2)
    expect(target.excludedLines.map((line) => line.label)).toEqual([
      'OUTRAS RECEITAS OPERACIONAIS',
      'DESPESAS NÃO DESEMBOLSÁVEIS',
    ])
    expect(analysis.breakEven!.revenue).toBeCloseTo(-operating / target.contributionRatio, 2)
  })

  it('traz uma aba de fluxo de caixa cujos lançamentos fecham com cada célula da DRE', async () => {
    const [report] = (await importFile.execute(await buildDreTemplate(2026))) as DreReport[]
    expect(report!.ledger.length).toBeGreaterThan(0)
    const useCase = new AnalyzeDreUseCase()
    for (const line of report!.lines) {
      report!.periods.forEach((_, index) => {
        const breakdown = useCase.breakdown(report!, line.id, index)
        if (breakdown && line.values[index]) expect(Math.abs(breakdown.difference), `${line.label} ${index}`).toBeLessThan(0.05)
      })
    }
  })

  it('carrega o saldo final de um mês como saldo inicial do seguinte', async () => {
    const [report] = (await importFile.execute(await buildDreTemplate(2026))) as DreReport[]
    const line = (label: string) => report!.lines.find((l) => l.label === label)!.values
    expect(line('Saldo inicial')[1]).toBeCloseTo(line('Saldo final')[0]!, 2)
  })
})

describe('resumo da DRE de exemplo', () => {
  it('usa os mesmos números da planilha do modelo e fecha a cascata', async () => {
    const [report] = (await importFile.execute(await buildDreTemplate(2026))) as DreReport[]
    const month = 9
    const lines = sampleStatement(month)
    const valueOf = (metric: DreMetric) => report!.metric(metric)!.values[month]!

    expect(lines[0]).toMatchObject({ label: 'Receita bruta', kind: 'start' })
    expect(lines[0]!.value).toBeCloseTo(valueOf(DreMetric.GrossRevenue), 2)
    expect(lines.find((l) => l.label === 'EBITDA')!.value).toBeCloseTo(valueOf(DreMetric.Ebitda), 2)
    expect(lines.at(-1)!.value).toBeCloseTo(valueOf(DreMetric.NetIncome), 2)

    let running = 0
    for (const line of lines) {
      if (line.kind === 'step') running += line.value
      else {
        if (line.kind === 'total') expect(line.value).toBeCloseTo(running, 2)
        running = line.value
      }
    }
  })
})

describe('modelos de Curva ABC e lucro', () => {
  const period = { year: 2026, month: 9 }

  it('trazem o mês no nome do arquivo e são reconhecidos', async () => {
    const abcFile = buildAbcTemplate(period)
    const profitFile = buildProfitTemplate(period)
    expect(abcFile.name).toBe('Modelo_Curva_ABC-set.2026.csv')
    expect(profitFile.name).toBe('Modelo_Lucro_por_Produto-set.2026.csv')

    const [abc] = (await importFile.execute(abcFile)) as AbcReport[]
    const [profit] = (await importFile.execute(profitFile)) as ProfitReport[]
    expect(abc!.kind).toBe('abc')
    expect(abc!.period).toEqual(period)
    expect(abc!.basis).toBe('quantity')
    expect(abc!.items.map((item) => item.abcClass)).toContain('C')
    expect(profit!.kind).toBe('profit')
    expect(profit!.items.find((item) => item.description === 'Café especial 500g')?.description).toBe('Café especial 500g')
  })

  it('o lucro de cada item fecha com venda − custo − impostos − materiais − taxas', async () => {
    const [profit] = (await importFile.execute(buildProfitTemplate(period))) as ProfitReport[]
    expect(profit!.hasColumn.materials).toBe(true)
    for (const item of profit!.items) {
      expect(item.materials).toBeGreaterThan(0)
      expect(item.profit).toBeCloseTo(item.revenue - item.cost - item.tax - item.materials - item.financialFee, 1)
    }
  })
})

describe('arquivos de exemplo', () => {
  it('geram DRE e dois meses cruzados de Curva ABC e lucro', async () => {
    const files = await buildSampleFiles(new Date(2026, 10, 3))
    expect(files.map((file) => file.name)).toEqual([
      'Modelo_DRE-2026.xlsx',
      'Modelo_Curva_ABC-set.2026.csv',
      'Modelo_Lucro_por_Produto-set.2026.csv',
      'Modelo_Curva_ABC-out.2026.csv',
      'Modelo_Lucro_por_Produto-out.2026.csv',
    ])

    const reports = []
    for (const file of files) reports.push(...(await importFile.execute(file)))
    const abc = reports.filter((r): r is AbcReport => r.kind === 'abc')
    const profit = reports.filter((r): r is ProfitReport => r.kind === 'profit')
    const analysis = new AnalyzeAbcUseCase().execute(abc, profit)!

    expect(analysis.previous).not.toBeNull()
    expect(analysis.movements.some((m) => m.movement === 'new')).toBe(true)
    expect(analysis.movements.some((m) => m.movement === 'gone')).toBe(true)
    expect(analysis.profitability?.mismatches).toEqual({ onlyInAbc: [], onlyInProfit: [], revenueDiffers: [] })
    expect(analysis.profitability?.lowMarginVolume.length).toBeGreaterThan(0)
  })
})
