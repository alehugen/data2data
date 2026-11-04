import { findTableHeader, type RawTable } from '@/domain/ingestion'
import {
  createIdentifier,
  isTotalLabel,
  normalizeCode,
  parsePeriodFromText,
  sum,
  type Identifier,
  type Period,
} from '@/domain/shared'

export interface ProfitItem {
  readonly code: string
  readonly description: string
  readonly quantity: number
  readonly revenue: number
  readonly cost: number
  readonly tax: number
  readonly materials: number
  readonly profit: number
}

export interface ProfitTotals {
  readonly quantity: number
  readonly revenue: number
  readonly cost: number
  readonly tax: number
  readonly materials: number
  readonly profit: number
}

const COLUMN_ALIASES = {
  code: ['PROCODIGO', 'CODIGO', 'COD', 'CODPRODUTO'],
  description: ['PRODESCRICAO', 'DESCRICAO', 'PRODUTO', 'ITEM'],
  quantity: ['QTDE', 'QUANTIDADE', 'QTD'],
  revenue: ['PEDVALORTOTAL', 'VALORTOTAL', 'VALOR', 'RECEITA', 'FATURAMENTO'],
  cost: ['PEDICUSTOGERENCIAL', 'CUSTOGERENCIAL', 'CUSTOTOTAL', 'CUSTO', 'CMV'],
  tax: ['IMPOSTO', 'IMPOSTOS'],
  materials: ['MATERIAIS', 'MATERIAL', 'CUSTOMATERIAIS'],
  profit: ['LUCRO', 'LUCROBRUTO', 'LUCROTOTAL', 'RESULTADO'],
} as const

const REQUIRED_COLUMNS = ['description', 'revenue', 'cost', 'profit'] as const

const grossProfit = (item: Pick<ProfitItem, 'revenue' | 'cost' | 'tax' | 'materials'>) =>
  item.revenue - item.cost - item.tax - item.materials

const totalsOf = (items: readonly ProfitItem[]): ProfitTotals => ({
  quantity: sum(items.map((item) => item.quantity)),
  revenue: sum(items.map((item) => item.revenue)),
  cost: sum(items.map((item) => item.cost)),
  tax: sum(items.map((item) => item.tax)),
  materials: sum(items.map((item) => item.materials)),
  profit: sum(items.map((item) => item.profit)),
})

export class ProfitReport {
  readonly kind = 'profit' as const
  readonly id: Identifier = createIdentifier()
  readonly importedAt = new Date()
  readonly name: string
  readonly period: Period | null
  readonly items: readonly ProfitItem[]
  readonly totals: ProfitTotals

  private constructor(name: string, items: ProfitItem[], period: Period | null = parsePeriodFromText(name)) {
    this.name = name
    this.period = period
    this.items = items
    this.totals = totalsOf(items)
  }

  static combine(reports: readonly ProfitReport[], name: string): ProfitReport {
    return new ProfitReport(name, mergeByCode(reports.flatMap((report) => [...report.items])), null)
  }

  static fromTable(table: RawTable): ProfitReport | null {
    const header = findTableHeader(table.rows, COLUMN_ALIASES, REQUIRED_COLUMNS)
    if (!header) return null

    const items = table.rows
      .slice(header.rowIndex + 1)
      .filter((row) => header.text(row, 'description') && header.text(row, 'revenue'))
      .filter((row) => !isTotalLabel(header.text(row, 'description')) && !isTotalLabel(header.text(row, 'code')))
      .map((row) => {
        const description = header.text(row, 'description')
        const costs = {
          revenue: header.number(row, 'revenue'),
          cost: Math.abs(header.number(row, 'cost')),
          tax: Math.abs(header.number(row, 'tax')),
          materials: Math.abs(header.number(row, 'materials')),
        }
        return {
          code: normalizeCode(header.text(row, 'code')) || description,
          description,
          quantity: header.number(row, 'quantity'),
          ...costs,
          profit: grossProfit(costs),
        }
      })

    return items.length ? new ProfitReport(table.name, mergeByCode(items)) : null
  }
}

function mergeByCode(items: ProfitItem[]): ProfitItem[] {
  const merged = new Map<string, ProfitItem>()
  for (const item of items) {
    const existing = merged.get(item.code)
    merged.set(item.code, existing ? { ...existing, ...totalsOf([existing, item]) } : item)
  }
  return [...merged.values()]
}
