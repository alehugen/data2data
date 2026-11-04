import { flushPromises, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { container } from '@/infrastructure/container'
import PeriodSelect, { type PeriodGroup } from '@/presentation/components/PeriodSelect.vue'
import ProfitTarget from '@/presentation/components/ProfitTarget.vue'
import { useReports } from '@/presentation/composables/useReports'
import AbcPage from '@/presentation/pages/AbcPage.vue'
import DatasetPage from '@/presentation/pages/DatasetPage.vue'
import DrePage from '@/presentation/pages/DrePage.vue'
import { ABC_OCTOBER, ABC_SEPTEMBER, PROFIT_OCTOBER, PROFIT_SEPTEMBER, dreRows, latin1File, xlsxFile } from '@/test/fixtures'
import { mountWithProviders } from './mountWithProviders'

const stubs = {
  RouterLink: RouterLinkStub,
  TrendChart: true,
  RankingBarChart: true,
}

beforeEach(async () => {
  setActivePinia(createPinia())
  for (const report of await container.listReports.execute()) await container.removeReport.execute(report.id)
})

async function importAll(files: File[]) {
  for (const file of files) await container.importFile.execute(file)
  await useReports().refresh()
}

describe('DrePage', () => {
  async function mountDre() {
    await importAll([xlsxFile('DRE.xlsx', { 'DRE Geral': dreRows() })])
    const page = mountWithProviders(DrePage, {
      props: { id: useReports().dreReports.value[0]!.id },
      global: { stubs },
    })
    await flushPromises()
    return page
  }

  it('deixa o período na navegação, que acompanha a rolagem, e começa no último mês', async () => {
    const page = await mountDre()
    const select = page.getComponent(PeriodSelect)
    expect(page.get('nav[aria-label="Seções da página"]').element.contains(select.element)).toBe(true)
    expect(page.get('header').text()).not.toContain('Período')
    expect(select.props('modelValue')).toBe('m:2')
    expect(select.props('groups').map((group: PeriodGroup) => group.options.map((o) => o.label))).toEqual([
      ['mar/26', 'fev/26', 'jan/26'],
      ['Acumulado 2026'],
    ])
  })

  it('recalcula a página ao trocar para o acumulado do ano', async () => {
    const page = await mountDre()
    page.getComponent(PeriodSelect).vm.$emit('update:modelValue', 'y:2026')
    await flushPromises()
    expect(page.text()).toContain('Resultado acumulado de 2026')
    expect(page.getComponent(ProfitTarget).props('reference')).toBe('na média mensal de 2026')
  })

  it('oferece as receitas da DRE na meta de lucro e usa a escolhida como receita bruta', async () => {
    const page = await mountDre()
    const target = page.getComponent(ProfitTarget)
    expect(target.props('revenueOptions').map((o: { label: string }) => o.label)).toEqual(['Receita bruta', 'Serviços', 'Produtos'])
    expect(target.props('base').revenue).toBe(900)

    const products = target.props('revenueOptions').find((o: { label: string }) => o.label === 'Produtos')!
    target.vm.$emit('update:revenue', products.value)
    await flushPromises()
    expect(page.getComponent(ProfitTarget).props('base')).toMatchObject({ revenue: 600, revenueLabel: 'Produtos', excludedRevenue: 300 })
  })

  it('não mostra mais a cascata nem os gráficos de receita, EBITDA e margens', async () => {
    const page = await mountDre()
    for (const title of ['Da receita ao resultado', 'Receita e EBITDA', 'Margens']) expect(page.text()).not.toContain(title)
    expect(page.findAll('nav[aria-label="Seções da página"] a').map((a) => a.text())).not.toContain('Receita e margens')
  })

  it('mostra que a DRE não foi encontrada', () => {
    const page = mountWithProviders(DrePage, { props: { id: 'nao-existe' }, global: { stubs } })
    expect(page.text()).toContain('DRE não encontrada.')
  })
})

describe('AbcPage', () => {
  async function mountAbc() {
    await importAll([
      latin1File('Curva ABC set.2026.csv', ABC_SEPTEMBER),
      latin1File('Curva ABC out.2026.csv', ABC_OCTOBER),
      new File([PROFIT_SEPTEMBER], 'Lucro set.2026.csv'),
      new File([PROFIT_OCTOBER], 'Lucro out.2026.csv'),
    ])
    const page = mountWithProviders(AbcPage, { global: { stubs } })
    await flushPromises()
    return page
  }

  it('troca o mês pelo seletor da navegação', async () => {
    const page = await mountAbc()
    const select = page.getComponent(PeriodSelect)
    expect(select.props('groups')[0].options.map((o: { label: string }) => o.label)).toEqual(['out/26', 'set/26'])
    expect(page.text()).toContain('Indicadores de vendas')

    select.vm.$emit('update:modelValue', select.props('groups')[0].options[1].key)
    await flushPromises()
    expect(page.text()).toContain('Lucratividade por item: set/26')
  })

  it('combina todos os meses pelo seletor e explica a classificação recalculada', async () => {
    const page = await mountAbc()
    const select = page.getComponent(PeriodSelect)
    const combined = select.props('groups')[1].options as { key: string; label: string }[]
    expect(combined.map((o) => o.label)).toEqual(['Todos os meses (2)'])

    select.vm.$emit('update:modelValue', combined[0]!.key)
    await flushPromises()
    expect(page.getComponent(PeriodSelect).props('modelValue')).toBe(combined[0]!.key)
    expect(page.text()).toContain('Resultado de set/26 a out/26')
    expect(page.text()).toContain('Classificação recalculada por quantidade vendida sobre set/26 a out/26')
    expect(page.text()).toContain('Lucratividade por item: set/26 a out/26')
    expect(page.text()).not.toContain('do mês')
    expect(page.text()).not.toContain('Movimentação')
  })

  it('mostra a variação da margem em pontos percentuais e a tabela de lucro com materiais', async () => {
    const page = await mountAbc()
    expect(page.text()).toMatch(/Margem de lucro\s*32,3%.*p\.p\./s)
    expect(page.text()).toContain('Materiais')
  })

  it('não mostra a cascata, o lucro por classe, o volume × margem nem a lista de itens', async () => {
    const page = await mountAbc()
    for (const title of ['Da venda ao lucro', 'Lucro por classe', 'Volume × margem', 'Itens de out/26']) {
      expect(page.text()).not.toContain(title)
    }
  })
})

describe('DatasetPage', () => {
  it('ignora a linha de total e mostra as estatísticas', async () => {
    await importAll([new File(['Produto;Valor\nA;10\nB;30\nTotal;40'], 'vendas.csv')])
    const page = mountWithProviders(DatasetPage, {
      props: { id: useReports().datasets.value[0]!.id },
      global: { stubs },
    })
    await flushPromises()
    expect(page.text()).toContain('2 linhas e 2 colunas')
    expect(page.text()).toMatch(/Soma\s*40/)
  })
})
