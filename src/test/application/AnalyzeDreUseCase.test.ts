import { describe, expect, it } from 'vitest'
import { DreMetric, DreReport } from '@/domain/dre'
import { dreRows } from '@/test/fixtures'
import { AnalyzeDreUseCase } from '@/application'

const report = DreReport.fromTable({ name: 'DRE Geral', sheet: 'DRE Geral', rows: dreRows() })!
const useCase = new AnalyzeDreUseCase()
const march = useCase.execute(report, { type: 'month', index: 2 })
const year = useCase.execute(report, { type: 'year', year: 2026 })
const kpi = (analysis: typeof march, metric: DreMetric) => analysis.kpis.find((k) => k.metric === metric)!

describe('AnalyzeDreUseCase.selections', () => {
  it('lista os meses (mais recente primeiro) e depois os anos', () => {
    expect(useCase.selections(report)).toEqual([
      { type: 'month', index: 2 },
      { type: 'month', index: 1 },
      { type: 'month', index: 0 },
      { type: 'year', year: 2026 },
    ])
  })
})

describe('indicadores', () => {
  it('calcula valor, margem e comparação com o mês anterior', () => {
    expect(kpi(march, DreMetric.GrossRevenue)).toEqual({ metric: 'grossRevenue', value: 900, previous: 1200, margin: null })
    expect(kpi(march, DreMetric.Ebitda).value).toBe(-70)
    expect(kpi(march, DreMetric.Ebitda).margin).toBeCloseTo(-70 / 900)
    expect(kpi(march, DreMetric.EndingCash)).toMatchObject({ value: 290, previous: 360, margin: null })
  })

  it('não compara o primeiro mês nem um ano sem o ano anterior', () => {
    expect(useCase.execute(report, { type: 'month', index: 0 }).previousIndexes).toBeNull()
    expect(year.previousIndexes).toBeNull()
  })

  it('soma fluxos e pega o último saldo no acumulado do ano', () => {
    expect(kpi(year, DreMetric.GrossRevenue).value).toBe(3100)
    expect(kpi(year, DreMetric.EndingCash).value).toBe(290)
  })
})

describe('cascata', () => {
  it('segue a DRE da receita ao resultado, sem subtotais repetidos nem grupos zerados', () => {
    expect(march.waterfall).toEqual([
      { label: 'RECEITA OPERACIONAL BRUTA', value: 900, isTotal: true },
      { label: 'IMPOSTOS SOBRE VENDA', value: -90, isTotal: false },
      { label: 'CUSTOS DAS MERCADORIAS VENDIDAS', value: -280, isTotal: false },
      { label: 'MARGEM DE CONTRIBUIÇÃO', value: 530, isTotal: true },
      { label: 'DESPESAS OPERACIONAIS', value: -600, isTotal: false },
      { label: 'RESULTADO LÍQUIDO', value: -70, isTotal: true },
    ])
  })

  it('fecha: cada subtotal é o anterior somado às variações', () => {
    let running = 0
    for (const step of march.waterfall) {
      if (step.isTotal) {
        if (running !== 0) expect(step.value).toBeCloseTo(running)
        running = step.value
      } else {
        running += step.value
      }
    }
  })
})

describe('custos, ponto de equilíbrio e séries', () => {
  it('ordena os grupos de custo antes do EBITDA pelo valor', () => {
    expect(march.expenses.map((e) => [e.label, e.value])).toEqual([
      ['DESPESAS COM PESSOAL', 350],
      ['CUSTOS DAS MERCADORIAS VENDIDAS', 280],
      ['DESPESAS GERAIS', 250],
      ['IMPOSTOS SOBRE VENDA', 90],
    ])
    expect(march.expenses[0]!.share).toBeCloseTo(350 / 900)
  })

  it('calcula o ponto de equilíbrio pela margem de contribuição', () => {
    expect(march.breakEven!.revenue).toBeCloseTo(600 / (530 / 900))
    expect(march.breakEven!.actual).toBe(900)
  })

  it('monta as séries mensais', () => {
    expect(march.monthly.revenue).toEqual([1000, 1200, 900])
    expect(march.monthly.ebitda).toEqual([100, 210, -70])
    expect(march.monthly.cash).toEqual([150, 360, 290])
    expect(march.monthly.revenueMix.map((s) => s.label)).toEqual(['Serviços', 'Produtos'])
    expect(march.monthly.margins.map((m) => m.metric)).toEqual(['contributionMargin', 'ebitda', 'netIncome'])
  })
})

describe('fatos', () => {
  it('resume tendência e destaques', () => {
    expect(march.facts).toMatchObject({
      revenueChange: -0.25,
      bestRevenue: { index: 1, value: 1200 },
      recentMonths: 3,
      positiveEbitdaMonths: 2,
      negativeCashMonths: 0,
    })
    expect(march.facts.topExpense?.label).toBe('DESPESAS COM PESSOAL')
    expect(march.facts.averageContributionMargin).toBeCloseTo((0.6 + 730 / 1200 + 530 / 900) / 3)
  })
})
