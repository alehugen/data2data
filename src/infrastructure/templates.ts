import type { Period } from '@/domain/shared'

const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const periodSuffix = ({ year, month }: Period) => `${MONTH_NAMES[month - 1]}.${year}`

export function previousMonth(date: Date, monthsBack = 1): Period {
  const reference = new Date(date.getFullYear(), date.getMonth() - monthsBack, 1)
  return { year: reference.getFullYear(), month: reference.getMonth() + 1 }
}

const seasonality = (seed: number, month: number) => 1 + 0.18 * Math.sin(seed * 1.7 + month * 0.9)
const round2 = (value: number) => Math.round(value * 100) / 100

interface DreLeaf {
  label: string
  monthly: (month: number) => number
}

interface DreTotal {
  label: string
  sumOf: string[]
}

interface DreCarry {
  label: string
  opening: number
  carry: string
}

type DreLine = DreLeaf | DreTotal | DreCarry | null

const revenue = (month: number) => 62000 * seasonality(1, month)
const services = (month: number) => 17500 * seasonality(2, month)

const group = (label: string, accounts: DreLeaf[]): DreLine[] => [
  { label, sumOf: accounts.map((account) => account.label) },
  ...accounts,
  null,
]

const DRE_LINES: DreLine[] = [
  ...group('RECEITA OPERACIONAL BRUTA', [
    { label: 'Venda de produtos', monthly: (m) => round2(revenue(m)) },
    { label: 'Prestação de serviços', monthly: (m) => round2(services(m)) },
  ]),
  ...group('IMPOSTOS SOBRE VENDA', [
    { label: 'Simples Nacional (DAS)', monthly: (m) => round2(-0.06 * (revenue(m) + services(m))) },
    { label: 'ISS', monthly: (m) => round2(-0.02 * services(m)) },
  ]),
  ...group('CUSTOS DAS MERCADORIAS VENDIDAS', [
    { label: 'Compra de mercadorias', monthly: (m) => round2(-0.46 * revenue(m)) },
  ]),
  ...group('CUSTOS DOS SERVIÇOS VENDIDOS', [
    { label: 'Comissões', monthly: (m) => round2(-0.05 * (revenue(m) + services(m))) },
  ]),
  { label: 'LUCRO OPERACIONAL BRUTO', sumOf: ['RECEITA OPERACIONAL BRUTA', 'IMPOSTOS SOBRE VENDA', 'CUSTOS DAS MERCADORIAS VENDIDAS', 'CUSTOS DOS SERVIÇOS VENDIDOS'] },
  null,
  ...group('OUTRAS DESPESAS VARIÁVEIS', [
    { label: 'Taxas de cartão e boletos', monthly: (m) => round2(-0.025 * (revenue(m) + services(m))) },
    { label: 'Fretes', monthly: (m) => round2(-0.015 * revenue(m)) },
  ]),
  { label: 'MARGEM DE CONTRIBUIÇÃO', sumOf: ['LUCRO OPERACIONAL BRUTO', 'OUTRAS DESPESAS VARIÁVEIS'] },
  null,
  { label: 'DESPESAS OPERACIONAIS', sumOf: ['DESPESAS COM PESSOAL', 'DESPESAS ADMINISTRATIVAS', 'DESPESAS COM MARKETING', 'DESPESAS FINANCEIRAS'] },
  ...group('DESPESAS COM PESSOAL', [
    { label: 'Salários', monthly: () => -14500 },
    { label: 'Encargos sociais', monthly: () => -5100 },
    { label: 'Benefícios', monthly: () => -2400 },
  ]),
  ...group('DESPESAS ADMINISTRATIVAS', [
    { label: 'Aluguel', monthly: () => -6200 },
    { label: 'Energia elétrica', monthly: (m) => round2(-950 * seasonality(3, m)) },
    { label: 'Internet e telefone', monthly: () => -380 },
    { label: 'Contabilidade', monthly: () => -1300 },
  ]),
  ...group('DESPESAS COM MARKETING', [
    { label: 'Publicidade', monthly: (m) => round2(-2200 * seasonality(4, m)) },
  ]),
  ...group('DESPESAS FINANCEIRAS', [
    { label: 'Tarifas bancárias', monthly: () => -260 },
    { label: 'Juros', monthly: (m) => round2(-420 * seasonality(5, m)) },
  ]),
  { label: 'OUTRAS RECEITAS OPERACIONAIS', sumOf: ['RECEITAS FINANCEIRAS', 'OUTRAS RECEITAS'] },
  ...group('RECEITAS FINANCEIRAS', [{ label: 'Rendimentos de aplicações', monthly: (m) => round2(310 * seasonality(6, m)) }]),
  ...group('OUTRAS RECEITAS', [{ label: 'Outras receitas', monthly: (m) => (m % 4 === 0 ? 1500 : 0) }]),
  { label: 'RESULTADO LÍQUIDO (EBITDA)', sumOf: ['MARGEM DE CONTRIBUIÇÃO', 'DESPESAS OPERACIONAIS', 'OUTRAS RECEITAS OPERACIONAIS'] },
  null,
  ...group('DESPESAS NÃO DESEMBOLSÁVEIS', [{ label: 'Depreciação', monthly: () => -800 }]),
  { label: 'RESULTADO LÍQUIDO', sumOf: ['RESULTADO LÍQUIDO (EBITDA)', 'DESPESAS NÃO DESEMBOLSÁVEIS'] },
  null,
  { label: 'Variação', sumOf: ['RESULTADO LÍQUIDO'] },
  { label: 'Saldo inicial', opening: 20000, carry: 'Saldo final' },
  { label: 'Saldo final', sumOf: ['Saldo inicial', 'Variação'] },
]

const INSTRUCTIONS = [
  ['Modelo de DRE mensal · data2data'],
  [''],
  ['1. Na aba "DRE Geral", substitua os valores de exemplo pelos da sua empresa, um mês por coluna.'],
  ['2. Receitas são positivas; impostos, custos e despesas são negativos.'],
  ['3. As linhas em MAIÚSCULAS somam as contas logo abaixo delas (fórmulas já prontas). Mantenha uma linha em branco entre os grupos.'],
  ['4. Pode renomear, incluir ou remover contas dentro de um grupo; ajuste a fórmula do grupo para somar as novas linhas.'],
  ['5. Meses sem movimento podem ficar zerados: eles são ignorados na análise.'],
  ['6. Salve e arraste o arquivo para o data2data.'],
]

const byLabel = new Map(DRE_LINES.filter((line): line is Exclude<DreLine, null> => line !== null).map((l) => [l.label, l]))

const cache = new Map<string, number>()
function valueOf(label: string, month: number): number {
  const key = `${label}|${month}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached
  const line = byLabel.get(label)!
  const value =
    'monthly' in line
      ? line.monthly(month)
      : 'sumOf' in line
        ? round2(line.sumOf.reduce((acc, ref) => acc + valueOf(ref, month), 0))
        : month === 0
          ? line.opening
          : valueOf(line.carry, month - 1)
  cache.set(key, value)
  return value
}

export interface StatementLine {
  label: string
  value: number
  kind: 'start' | 'step' | 'total'
}

export function sampleStatement(month: number): StatementLine[] {
  const value = (...labels: string[]) => round2(labels.reduce((acc, label) => acc + valueOf(label, month), 0))
  return [
    { label: 'Receita bruta', value: value('RECEITA OPERACIONAL BRUTA'), kind: 'start' },
    { label: 'Impostos sobre venda', value: value('IMPOSTOS SOBRE VENDA'), kind: 'step' },
    { label: 'Custos das vendas', value: value('CUSTOS DAS MERCADORIAS VENDIDAS', 'CUSTOS DOS SERVIÇOS VENDIDOS'), kind: 'step' },
    { label: 'Despesas variáveis', value: value('OUTRAS DESPESAS VARIÁVEIS'), kind: 'step' },
    { label: 'Margem de contribuição', value: value('MARGEM DE CONTRIBUIÇÃO'), kind: 'total' },
    { label: 'Despesas operacionais', value: value('DESPESAS OPERACIONAIS', 'OUTRAS RECEITAS OPERACIONAIS'), kind: 'step' },
    { label: 'EBITDA', value: value('RESULTADO LÍQUIDO (EBITDA)'), kind: 'total' },
    { label: 'Depreciação', value: value('DESPESAS NÃO DESEMBOLSÁVEIS'), kind: 'step' },
    { label: 'Resultado líquido', value: value('RESULTADO LÍQUIDO'), kind: 'total' },
  ]
}

export async function buildDreTemplate(year: number): Promise<File> {
  const { utils, write } = await import('xlsx')
  const firstDataRow = 4
  const rowOf = new Map<string, number>()
  DRE_LINES.forEach((line, i) => line && rowOf.set(line.label, firstDataRow + i))

  const sheet: Record<string, unknown> = {}
  const put = (row: number, col: number, cell: object) => (sheet[utils.encode_cell({ r: row, c: col })] = cell)
  const text = (value: string) => ({ t: 's', v: value })

  put(0, 0, text('DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO'))
  put(3, 0, text('DESCRIÇÃO CONTAS'))
  MONTH_NAMES.forEach((name, i) => {
    put(1, i + 1, text(`${name}/${String(year).slice(2)}`))
    put(2, i + 1, { t: 'n', v: i + 1 })
    put(3, i + 1, { t: 'n', v: year })
  })

  DRE_LINES.forEach((line, i) => {
    if (!line) return
    const row = firstDataRow + i
    put(row, 0, text(line.label))
    for (let month = 0; month < 12; month++) {
      const column = utils.encode_col(month + 1)
      const formula =
        'sumOf' in line
          ? line.sumOf.map((ref) => `${column}${rowOf.get(ref)! + 1}`).join('+')
          : 'carry' in line && month > 0
            ? `${utils.encode_col(month)}${rowOf.get(line.carry)! + 1}`
            : undefined
      put(row, month + 1, { t: 'n', v: valueOf(line.label, month), z: '#,##0.00', ...(formula ? { f: formula } : {}) })
    }
  })

  sheet['!ref'] = utils.encode_range({ s: { r: 0, c: 0 }, e: { r: firstDataRow + DRE_LINES.length, c: 12 } })
  sheet['!cols'] = [{ wch: 38 }, ...MONTH_NAMES.map(() => ({ wch: 12 }))]

  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, sheet, 'DRE Geral')
  const instructions = utils.aoa_to_sheet(INSTRUCTIONS)
  instructions['!cols'] = [{ wch: 110 }]
  utils.book_append_sheet(workbook, instructions, 'Instruções')

  return new File([write(workbook, { type: 'array', bookType: 'xlsx' })], `Modelo_DRE-${year}.xlsx`)
}

interface Product {
  code: string
  description: string
  baseQuantity: number
  price: number
  unitCost: number
}

const PRODUCTS: Product[] = [
  { code: '101', description: 'Café especial 500g', baseQuantity: 120, price: 42, unitCost: 33 },
  { code: '102', description: 'Filtro de papel', baseQuantity: 150, price: 9, unitCost: 3 },
  { code: '103', description: 'Biscoito artesanal', baseQuantity: 90, price: 15, unitCost: 6 },
  { code: '104', description: 'Açúcar demerara 1kg', baseQuantity: 70, price: 12, unitCost: 7 },
  { code: '105', description: 'Chá verde 100g', baseQuantity: 60, price: 18, unitCost: 7 },
  { code: '106', description: 'Caneca de cerâmica', baseQuantity: 35, price: 55, unitCost: 30 },
  { code: '107', description: 'Assinatura mensal de café', baseQuantity: 30, price: 79, unitCost: 63 },
  { code: '108', description: 'Garrafa térmica', baseQuantity: 25, price: 98, unitCost: 52 },
  { code: '109', description: 'Kit presente', baseQuantity: 22, price: 129, unitCost: 104 },
  { code: '110', description: 'Xícara de porcelana', baseQuantity: 18, price: 35, unitCost: 14 },
  { code: '111', description: 'Moedor manual', baseQuantity: 6, price: 189, unitCost: 120 },
  { code: '112', description: 'Cafeteira italiana', baseQuantity: 5, price: 210, unitCost: 150 },
]

const TAX_RATE = 0.04
const FEE_RATE = 0.025

interface Sale {
  product: Product
  quantity: number
  value: number
}

function salesOf({ month }: Period): Sale[] {
  return PRODUCTS.filter((_, i) => (month % 2 === 0 ? i !== 11 : i !== 10)).map((product, i) => {
    const quantity = Math.max(1, Math.round(product.baseQuantity * seasonality(i + 1, month)))
    return { product, quantity, value: round2(quantity * product.price) }
  })
}

const csvNumber = (value: number) => round2(value).toFixed(2).replace('.', ',')
const csvShare = (value: number) => (Math.round(value * 10000) / 100).toFixed(2).replace('.', ',')

function toCsv(header: string[], rows: (string | number)[][]): string {
  return '﻿' + [header, ...rows].map((row) => row.join(';')).join('\r\n')
}

export function buildAbcTemplate(period: Period): File {
  const sales = salesOf(period).sort((a, b) => b.quantity - a.quantity)
  const total = sales.reduce((acc, sale) => acc + sale.quantity, 0)
  let cumulativeBefore = 0

  const rows = sales.map((sale) => {
    const share = sale.quantity / total
    const abcClass = cumulativeBefore < 0.8 ? 'A' : cumulativeBefore < 0.95 ? 'B' : 'C'
    cumulativeBefore += share
    return [sale.product.code, sale.product.description, sale.quantity, csvNumber(sale.value), abcClass, csvShare(share)]
  })

  const csv = toCsv(['ProCodigo', 'ProDescricao', 'Qtde', 'ValorTotal', 'Classificacao', 'Percentual'], rows)
  return new File([csv], `Modelo_Curva_ABC-${periodSuffix(period)}.csv`, { type: 'text/csv' })
}

export function buildProfitTemplate(period: Period): File {
  const rows = salesOf(period).map(({ product, quantity, value }) => {
    const cost = round2(quantity * product.unitCost)
    const tax = round2(value * TAX_RATE)
    const fee = round2(value * FEE_RATE)
    return [product.code, product.description, quantity, csvNumber(value), csvNumber(cost), csvNumber(tax), csvNumber(fee), csvNumber(value - cost - tax - fee)]
  })

  const csv = toCsv(
    ['ProCodigo', 'ProDescricao', 'Qtde', 'PedValorTotal', 'PedICustoGerencial', 'Imposto', 'TaxaFinanceira', 'Lucro'],
    rows,
  )
  return new File([csv], `Modelo_Lucro_por_Produto-${periodSuffix(period)}.csv`, { type: 'text/csv' })
}

export async function buildSampleFiles(today = new Date()): Promise<File[]> {
  const months = [previousMonth(today, 2), previousMonth(today, 1)]
  return [
    await buildDreTemplate(months[1]!.year),
    ...months.flatMap((period) => [buildAbcTemplate(period), buildProfitTemplate(period)]),
  ]
}
