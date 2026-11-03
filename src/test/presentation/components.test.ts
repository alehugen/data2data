import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DreReport } from '@/domain/dre'
import AppFooter from '@/presentation/components/AppFooter.vue'
import DreTable from '@/presentation/components/DreTable.vue'
import InfoTip from '@/presentation/components/InfoTip.vue'
import ShareBar from '@/presentation/components/ShareBar.vue'
import InsightList from '@/presentation/components/InsightList.vue'
import ReportCard from '@/presentation/components/ReportCard.vue'
import SampleStatement from '@/presentation/components/SampleStatement.vue'
import SectionNav from '@/presentation/components/SectionNav.vue'
import SegmentedControl from '@/presentation/components/SegmentedControl.vue'
import StatCard from '@/presentation/components/StatCard.vue'
import ThemeToggle from '@/presentation/components/ThemeToggle.vue'
import { useTheme } from '@/presentation/composables/useTheme'
import { dreRows } from '@/test/fixtures'
import { mountWithProviders } from './mountWithProviders'

describe('InfoTip', () => {
  it('mostra a explicação ao receber foco', async () => {
    const wrapper = mountWithProviders(InfoTip, { props: { text: 'Receita ÷ custo' }, attachTo: document.body })
    const button = wrapper.get('button')
    expect(button.attributes('aria-label')).toBe('Como esta informação é calculada')

    await button.trigger('focus')
    await flushPromises()
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toContain('Receita ÷ custo')
  })
})

describe('StatCard', () => {
  it('mostra valor, dica, variação e explicação', () => {
    const wrapper = mountWithProviders(StatCard, {
      props: { label: 'Lucro', value: 'R$ 10', hint: 'Margem 20%', delta: 0.1, deltaLabel: 'set/26', info: 'Como calcula' },
    })
    expect(wrapper.text()).toContain('R$ 10')
    expect(wrapper.text()).toContain('+10%')
    expect(wrapper.text()).toContain('vs set/26')
    expect(wrapper.find('.text-success').exists()).toBe(true)
    expect(wrapper.getComponent(InfoTip).props('text')).toBe('Como calcula')
  })

  it('pinta como ruim a alta de um indicador em que cair é bom', () => {
    const wrapper = mount(StatCard, { props: { label: 'Custo', value: '1', delta: 0.2, lowerIsBetter: true } })
    expect(wrapper.find('.text-destructive').exists()).toBe(true)
  })

  it('omite a variação sem base de comparação', () => {
    const wrapper = mount(StatCard, { props: { label: 'Lucro', value: '1', delta: null } })
    expect(wrapper.text()).not.toContain('%')
  })
})

describe('SampleStatement', () => {
  const lines = [
    { label: 'Receita bruta', value: 1000, kind: 'start' },
    { label: 'Custos', value: -400, kind: 'step' },
    { label: 'Resultado', value: 600, kind: 'total' },
  ] as const

  it('é uma tabela legível com a legenda e os valores em reais', () => {
    const wrapper = mount(SampleStatement, { props: { lines, caption: 'DRE de exemplo' } })
    expect(wrapper.get('caption').text()).toBe('DRE de exemplo')
    expect(wrapper.findAll('tbody th').map((th) => th.text())).toEqual(['Receita bruta', 'Custos', 'Resultado'])
    expect(wrapper.findAll('tbody tr')[1]!.text()).toMatch(/-R\$\s?400/)
  })

  it('desenha cada passo a partir do total acumulado', () => {
    const bars = mount(SampleStatement, { props: { lines, caption: 'DRE' } }).findAll('td[aria-hidden] span')
    expect(bars.map((bar) => bar.attributes('style'))).toEqual([
      expect.stringContaining('left: 0%'),
      expect.stringContaining('left: 60%'),
      expect.stringContaining('left: 0%'),
    ])
    expect(bars[1]!.classes()).toContain('bg-destructive')
  })
})

describe('SegmentedControl', () => {
  const options = [
    { value: 'a', label: 'Opção A' },
    { value: 'b', label: 'Opção B' },
  ] as const

  it('marca a opção ativa e emite a escolha', async () => {
    const wrapper = mount(SegmentedControl, { props: { options, label: 'Teste', modelValue: 'a' } })
    const buttons = wrapper.findAll('button')
    expect(buttons.map((b) => b.attributes('aria-pressed'))).toEqual(['true', 'false'])
    await buttons[1]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['b']])
  })
})

describe('InsightList', () => {
  it('mostra cada ponto com o tom em texto e a explicação', () => {
    const wrapper = mountWithProviders(InsightList, {
      props: {
        insights: [{ title: 'Lucro em alta', description: 'Subiu 10%', tone: 'positive', explanation: 'Lucro ÷ lucro anterior' }],
      },
    })
    expect(wrapper.text()).toContain('Lucro em alta')
    expect(wrapper.text()).toContain('Ponto positivo')
    expect(wrapper.getComponent(InfoTip).props('text')).toBe('Lucro ÷ lucro anterior')
  })
})

describe('ReportCard', () => {
  const mountCard = (removable = false) =>
    mountWithProviders(ReportCard, {
      props: { title: 'DRE 2026', subtitle: '12 meses', to: '/dre/1', removable },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

  it('tem um link "Visualizar" que cobre o card inteiro', () => {
    const link = mountCard().getComponent(RouterLinkStub)
    expect(link.props('to')).toBe('/dre/1')
    expect(link.text()).toContain('Visualizar')
    expect(link.classes()).toContain('after:absolute')
  })

  it('emite a remoção sem navegar', async () => {
    const wrapper = mountCard(true)
    await wrapper.get('button[aria-label="Remover DRE 2026"]').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})

describe('ShareBar', () => {
  it('mostra a participação de cada segmento em texto', () => {
    const wrapper = mount(ShareBar, {
      props: {
        title: 'Lucro',
        formatValue: String,
        segments: [
          { label: 'Classe A', value: 75, color: '#000' },
          { label: 'Classe B', value: 25, color: '#111' },
          { label: 'Classe C', value: 0, color: '#222' },
        ],
      },
    })
    expect(wrapper.text()).toContain('Classe A 75%')
    expect(wrapper.text()).toContain('Classe C 0%')
    expect(wrapper.findAll('[role="img"] > div')).toHaveLength(2)
  })
})

describe('DreTable', () => {
  const report = DreReport.fromTable({ name: 'DRE', sheet: 'DRE Geral', rows: dreRows() })!
  const mountTable = () => mountWithProviders(DreTable, { props: { report, highlight: [2] } })
  const rowLabels = (wrapper: ReturnType<typeof mountTable>) => wrapper.findAll('tbody th').map((th) => th.text())

  it('começa com seções abertas, grupos fechados e sem contas zeradas', () => {
    const labels = rowLabels(mountTable())
    expect(labels).toContain('Despesas com pessoal')
    expect(labels).not.toContain('Salários')
    expect(labels).not.toContain('Outras despesas variáveis')
  })

  it('abre um grupo ao clicar', async () => {
    const wrapper = mountTable()
    const group = wrapper.findAll('tbody button').find((b) => b.text() === 'Despesas com pessoal')!
    await group.trigger('click')
    expect(group.attributes('aria-expanded')).toBe('true')
    expect(rowLabels(wrapper)).toContain('Salários')
  })

  it('mostra contas zeradas sob demanda', async () => {
    const wrapper = mountTable()
    await wrapper.get('[role="checkbox"]').trigger('click')
    expect(rowLabels(wrapper)).toContain('Outras despesas variáveis')
  })

  it('alterna entre valores e análise vertical', async () => {
    const wrapper = mountTable()
    const revenueRow = () => wrapper.findAll('tbody tr')[0]!.findAll('td').map((td) => td.text())
    expect(revenueRow()).toEqual(['1.000', '1.200', '900'])
    await wrapper.findAll('button[aria-pressed]')[1]!.trigger('click')
    expect(revenueRow()).toEqual(['100%', '100%', '100%'])
  })

  it('destaca a coluna do período selecionado', () => {
    expect(mountTable().get('[data-highlight]').text()).toBe('mar/26')
  })
})

describe('SectionNav', () => {
  const sections = [
    { id: 'indicadores', label: 'Indicadores' },
    { id: 'lucro', label: 'Lucro', nested: true },
  ]

  it('lista as seções como links para as âncoras', () => {
    const wrapper = mount(SectionNav, { props: { sections } })
    const links = wrapper.findAll('a')
    expect(links.map((link) => [link.text(), link.attributes('href')])).toEqual([
      ['Indicadores', '#indicadores'],
      ['Lucro', '#lucro'],
    ])
  })

  it('rola suavemente até a seção clicada e a marca como atual', async () => {
    const target = document.createElement('section')
    target.id = 'lucro'
    target.scrollIntoView = vi.fn()
    document.body.appendChild(target)

    const wrapper = mount(SectionNav, { props: { sections }, attachTo: document.body })
    await wrapper.findAll('a')[1]!.trigger('click')

    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(wrapper.findAll('a')[1]!.attributes('aria-current')).toBe('location')

    wrapper.unmount()
    target.remove()
  })
})

describe('AppFooter', () => {
  it('assina o projeto com link para o LinkedIn em nova aba', () => {
    const link = mount(AppFooter).get('a')
    expect(link.text()).toContain('Alessandro Hugen')
    expect(link.attributes('href')).toBe('https://www.linkedin.com/in/alehugen')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
  })
})

describe('ThemeToggle', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('troca o tema pelos ícones, com rótulo acessível em cada um', async () => {
    const wrapper = mountWithProviders(ThemeToggle)
    const items = wrapper.findAll('button')
    expect(items.map((item) => item.attributes('aria-label'))).toEqual(['Tema claro', 'Tema escuro', 'Seguir o sistema'])

    await items[0]!.trigger('click')
    expect(useTheme().preference.value).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
