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
  readonly financialFee: number
  readonly profit: number
}

export interface ProfitTotals {
  readonly quantity: number
  readonly revenue: number
  readonly cost: number
  readonly tax: number
  readonly materials: number
  readonly financialFee: number
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
  financialFee: ['TAXAFINANCEIRA', 'TAXASFINANCEIRAS', 'TAXA', 'TAXAS'],
  profit: ['LUCRO', 'LUCROBRUTO', 'LUCROTOTAL', 'RESULTADO'],
} as const

const REQUIRED_COLUMNS = ['description', 'revenue', 'cost', 'profit'] as const

export type OptionalCost = 'tax' | 'materials' | 'financialFee'

const totalsOf = (items: readonly ProfitItem[]): ProfitTotals => ({
  quantity: sum(items.map((item) => item.quantity)),
  revenue: sum(items.map((item) => item.revenue)),
  cost: sum(items.map((item) => item.cost)),
  tax: sum(items.map((item) => item.tax)),
  materials: sum(items.map((item) => item.materials)),
  financialFee: sum(items.map((item) => item.financialFee)),
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
  readonly hasColumn: Readonly<Record<OptionalCost, boolean>>

  private constructor(name: string, items: ProfitItem[], hasColumn: Record<OptionalCost, boolean>) {
    this.name = name
    this.period = parsePeriodFromText(name)
    this.items = items
    this.totals = totalsOf(items)
    this.hasColumn = hasColumn
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
        return {
          code: normalizeCode(header.text(row, 'code')) || description,
          description,
          quantity: header.number(row, 'quantity'),
          revenue: header.number(row, 'revenue'),
          cost: Math.abs(header.number(row, 'cost')),
          tax: Math.abs(header.number(row, 'tax')),
          materials: Math.abs(header.number(row, 'materials')),
          financialFee: Math.abs(header.number(row, 'financialFee')),
          profit: header.number(row, 'profit'),
        }
      })

    const hasColumn = {
      tax: header.columns.tax !== undefined,
      materials: header.columns.materials !== undefined,
      financialFee: header.columns.financialFee !== undefined,
    }
    return items.length ? new ProfitReport(table.name, mergeByCode(items), hasColumn) : null
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
