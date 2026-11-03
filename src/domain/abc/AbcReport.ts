import { findTableHeader, type RawTable } from '@/domain/ingestion'
import { createIdentifier, parsePeriodFromText, sum, type Identifier, type Period } from '@/domain/shared'

export const AbcClass = { A: 'A', B: 'B', C: 'C' } as const
export type AbcClass = (typeof AbcClass)[keyof typeof AbcClass]
export const ABC_CLASSES: readonly AbcClass[] = [AbcClass.A, AbcClass.B, AbcClass.C]

export interface AbcItem {
  readonly code: string
  readonly description: string
  readonly quantity: number
  readonly value: number
  readonly abcClass: AbcClass
  readonly share: number
}

export type AbcBasis = 'quantity' | 'value'

const COLUMN_ALIASES = {
  code: ['PROCODIGO', 'CODIGO', 'COD', 'CODPRODUTO'],
  description: ['PRODESCRICAO', 'DESCRICAO', 'PRODUTO', 'ITEM'],
  quantity: ['QTDE', 'QUANTIDADE', 'QTD'],
  value: ['VALORTOTAL', 'VALOR', 'TOTAL', 'FATURAMENTO'],
  abcClass: ['CLASSIFICACAO', 'CLASSE', 'CURVA', 'CURVAABC'],
  share: ['PERCENTUAL', 'PERC', 'PARTICIPACAO'],
} as const

const REQUIRED_COLUMNS = ['description', 'quantity', 'abcClass'] as const

const isAbcClass = (value: string): value is AbcClass => (ABC_CLASSES as readonly string[]).includes(value)

export class AbcReport {
  readonly kind = 'abc' as const
  readonly id: Identifier = createIdentifier()
  readonly importedAt = new Date()
  readonly name: string
  readonly period: Period | null
  readonly items: readonly AbcItem[]
  readonly totalQuantity: number
  readonly totalValue: number
  readonly basis: AbcBasis | null

  private constructor(name: string, items: AbcItem[]) {
    this.name = name
    this.period = parsePeriodFromText(name)
    this.items = items
    this.totalQuantity = sum(items.map((item) => item.quantity))
    this.totalValue = sum(items.map((item) => item.value))
    this.basis = detectBasis(items, this.totalQuantity, this.totalValue)
  }

  static fromTable(table: RawTable): AbcReport | null {
    const header = findTableHeader(table.rows, COLUMN_ALIASES, REQUIRED_COLUMNS)
    if (!header) return null

    const rows = table.rows
      .slice(header.rowIndex + 1)
      .map((row) => ({
        code: header.text(row, 'code'),
        description: header.text(row, 'description'),
        quantity: header.number(row, 'quantity'),
        value: header.number(row, 'value'),
        abcClass: header.text(row, 'abcClass').toUpperCase(),
        rawShare: header.columns.share === undefined ? null : header.number(row, 'share'),
      }))
      .filter((row) => row.description && isAbcClass(row.abcClass))

    if (!rows.length) return null

    const declaredShareTotal = sum(rows.map((row) => row.rawShare ?? 0))
    const shareScale = declaredShareTotal > 1.5 ? 100 : 1
    const totalQuantity = sum(rows.map((row) => row.quantity))
    const quantityShare = (quantity: number) => (totalQuantity ? quantity / totalQuantity : 0)

    const items = rows.map(({ rawShare, ...row }) => ({
      ...row,
      code: row.code || row.description,
      abcClass: row.abcClass as AbcClass,
      share: declaredShareTotal > 0 && rawShare !== null ? rawShare / shareScale : quantityShare(row.quantity),
    }))

    return new AbcReport(table.name, mergeByCode(items))
  }
}

function mergeByCode(items: AbcItem[]): AbcItem[] {
  const merged = new Map<string, AbcItem>()
  for (const item of items) {
    const existing = merged.get(item.code)
    merged.set(
      item.code,
      existing
        ? {
            ...existing,
            quantity: existing.quantity + item.quantity,
            value: existing.value + item.value,
            share: existing.share + item.share,
          }
        : item,
    )
  }
  return [...merged.values()]
}

function detectBasis(items: readonly AbcItem[], totalQuantity: number, totalValue: number): AbcBasis | null {
  const matches = (pick: (item: AbcItem) => number, total: number) =>
    total > 0 && items.every((item) => Math.abs(item.share - pick(item) / total) < 0.005)
  if (matches((item) => item.quantity, totalQuantity)) return 'quantity'
  if (matches((item) => item.value, totalValue)) return 'value'
  return null
}
