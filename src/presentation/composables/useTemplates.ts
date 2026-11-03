import { ref } from 'vue'
import type { Report } from '@/domain/report'
import { container } from '@/infrastructure/container'
import { useFileImport } from './useFileImport'

export type TemplateKind = 'dre' | 'abc' | 'profit'

export interface TemplateInfo {
  kind: TemplateKind
  title: string
  format: 'XLSX' | 'CSV'
  description: string
  naming: string
  columns: string[]
}

const { lastMonth, fileSuffix } = container.templates

export const TEMPLATES: TemplateInfo[] = [
  {
    kind: 'dre',
    title: 'DRE mensal',
    format: 'XLSX',
    description:
      'Planilha com as contas da DRE nas linhas e um mês por coluna. Os totais já têm fórmulas: basta trocar os valores das contas.',
    naming: 'Qualquer nome. A aba usada é a "DRE Geral".',
    columns: ['Receita bruta', 'Impostos', 'Custos', 'Despesas', 'EBITDA', 'Resultado', 'Saldo de caixa'],
  },
  {
    kind: 'abc',
    title: 'Curva ABC',
    format: 'CSV',
    description: 'Um arquivo por mês com os produtos vendidos, a quantidade, o valor e a classe (A, B ou C).',
    naming: `O nome precisa ter o mês, como "Curva_ABC-${fileSuffix(lastMonth())}.csv".`,
    columns: ['ProCodigo', 'ProDescricao', 'Qtde', 'ValorTotal', 'Classificacao', 'Percentual'],
  },
  {
    kind: 'profit',
    title: 'Lucro por produto',
    format: 'CSV',
    description:
      'Um arquivo por mês com valor vendido, custo, impostos, taxas e lucro de cada produto. É cruzado com a Curva ABC do mesmo mês.',
    naming: `O nome precisa ter o mês, como "Lucro_por_Produto-${fileSuffix(lastMonth())}.csv".`,
    columns: ['ProCodigo', 'ProDescricao', 'Qtde', 'PedValorTotal', 'PedICustoGerencial', 'Imposto', 'TaxaFinanceira', 'Lucro'],
  },
]

function saveFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function useTemplates() {
  const { importFiles } = useFileImport()
  const downloading = ref<TemplateKind | null>(null)
  const loadingSample = ref(false)

  async function download(kind: TemplateKind) {
    downloading.value = kind
    try {
      const period = lastMonth()
      const { templates } = container
      saveFile(kind === 'dre' ? await templates.dre(period.year) : kind === 'abc' ? templates.abc(period) : templates.profit(period))
    } finally {
      downloading.value = null
    }
  }

  async function loadSample(): Promise<Report[]> {
    loadingSample.value = true
    try {
      return await importFiles(await container.templates.samples())
    } finally {
      loadingSample.value = false
    }
  }

  return { templates: TEMPLATES, downloading, loadingSample, download, loadSample }
}
