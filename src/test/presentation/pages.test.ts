import { flushPromises, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { container } from '@/infrastructure/container'
import RankingBarChart from '@/presentation/components/RankingBarChart.vue'
import TrendChart from '@/presentation/components/TrendChart.vue'
import VolumeMarginChart from '@/presentation/components/VolumeMarginChart.vue'
import WaterfallChart from '@/presentation/components/WaterfallChart.vue'
import { useFileImport } from '@/presentation/composables/useFileImport'
import { useReports } from '@/presentation/composables/useReports'
import ImportPage from '@/presentation/pages/ImportPage.vue'
import NotFoundPage from '@/presentation/pages/NotFoundPage.vue'
import { routeForReport, routes } from '@/presentation/router'
import { ABC_SEPTEMBER, latin1File } from '@/test/fixtures'
import { mountWithProviders } from './mountWithProviders'

const stubs = { RouterLink: RouterLinkStub }

beforeEach(async () => {
  setActivePinia(createPinia())
  for (const report of await container.listReports.execute()) await container.removeReport.execute(report.id)
})

describe('rotas', () => {
  const router = createRouter({ history: createMemoryHistory(), routes })

  it.each([
    ['/', 'home'],
    ['/importar', 'import'],
    ['/curva-abc', 'abc'],
    ['/dre/123', 'dre'],
    ['/qualquer/coisa', 'not-found'],
  ])('%s → %s', (path, name) => {
    expect(router.resolve(path).name).toBe(name)
  })

  it('leva cada tipo de relatório para a sua página', async () => {
    const [abc] = await container.importFile.execute(latin1File('abc set.2026.csv', ABC_SEPTEMBER))
    const [dataset] = await container.importFile.execute(new File(['a;b\n1;2'], 'tabela.csv'))
    expect(routeForReport(abc!)).toEqual({ name: 'abc' })
    expect(routeForReport(dataset!)).toEqual({ name: 'dataset', params: { id: dataset!.id } })
  })
})

describe('NotFoundPage', () => {
  it('oferece caminhos de volta', () => {
    const links = mountWithProviders(NotFoundPage, { global: { stubs } }).findAllComponents(RouterLinkStub)
    expect(links.map((link) => link.props('to'))).toEqual([{ name: 'home' }, { name: 'import' }])
  })
})

describe('ImportPage', () => {
  it('resume a importação e esconde do resumo relatórios removidos', async () => {
    const page = mountWithProviders(ImportPage, { global: { stubs } })
    await useFileImport().importFiles([latin1File('abc set.2026.csv', ABC_SEPTEMBER), new File([], 'vazio.csv')])
    await flushPromises()

    expect(page.get('[role="status"]').text()).toContain('Curva ABC · set/26')
    expect(page.get('[role="alert"]').text()).toBe('O arquivo está vazio: vazio.csv')

    const { abcReports, remove } = useReports()
    await remove(abcReports.value[0]!.id)
    await flushPromises()
    expect(page.find('[role="status"]').exists()).toBe(false)
  })

  it('avisa quando o mês não foi identificado no nome do arquivo', async () => {
    const page = mountWithProviders(ImportPage, { global: { stubs } })
    await useFileImport().importFiles([latin1File('curva abc.csv', ABC_SEPTEMBER)])
    await flushPromises()
    expect(page.text()).toContain('Mês não identificado no nome de: curva abc')
  })
})

describe('gráficos sem dados', () => {
  it.each([
    ['ranking', RankingBarChart, { items: [], valueLabel: 'Valor' }],
    ['evolução', TrendChart, { categories: ['jan/26'], series: [{ name: 'Receita', type: 'bar', data: [0] }] }],
    ['cascata', WaterfallChart, { steps: [] }],
    ['volume × margem', VolumeMarginChart, { points: [], averageMargin: 0, averageQuantity: 0 }],
  ])('%s mostra um aviso em vez de um gráfico vazio', (_, component, props) => {
    const wrapper = mountWithProviders(component, { props: props as never })
    expect(wrapper.text()).toMatch(/Sem dados para exibir|Nenhum item com custo/)
  })
})
