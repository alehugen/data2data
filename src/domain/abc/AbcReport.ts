import { findTableHeader, type RawTable } from '@/domain/ingestion'
import { createIdentifier, normalizeCode, parsePeriodFromText, sum, type Identifier, type Period } from '@/domain/shared'

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

  private constructor(
    name: string,
    items: AbcItem[],
    basis: AbcBasis | null,
    period: Period | null = parsePeriodFromText(name),
  ) {
    this.name = name
    this.period = period
    this.items = items
    this.totalQuantity = sum(items.map((item) => item.quantity))
    this.totalValue = sum(items.map((item) => item.value))
    this.basis = basis
  }

  static combine(reports: readonly AbcReport[], name: string): AbcReport {
    const first = reports[0]?.basis
    const sameBasis = first && reports.every((report) => report.basis === first) ? first : 'value'
    const merged = new Map<string, { code: string; description: string; quantity: number; value: number }>()
    for (const item of reports.flatMap((report) => report.items)) {
      const existing = merged.get(item.code)
      merged.set(item.code, {
        code: item.code,
        description: item.description,
        quantity: (existing?.quantity ?? 0) + item.quantity,
        value: (existing?.value ?? 0) + item.value,
      })
    }
    const totals = [...merged.values()]
    const basis = sameBasis === 'value' && sum(totals.map(pickValue)) <= 0 ? 'quantity' : sameBasis
    const pick = basis === 'quantity' ? pickQuantity : pickValue
    const total = sum(totals.map(pick))
    let before = 0
    const items = [...totals]
      .sort((a, b) => pick(b) - pick(a))
      .map((item): AbcItem => {
        const share = total ? pick(item) / total : 0
        const abcClass = before < A_CUTOFF ? AbcClass.A : before < B_CUTOFF ? AbcClass.B : AbcClass.C
        before += share
        return { ...item, share, abcClass }
      })
    return new AbcReport(name, items, basis, null)
  }

  static fromTable(table: RawTable): AbcReport | null {
    const header = findTableHeader(table.rows, COLUMN_ALIASES, REQUIRED_COLUMNS)
    if (!header) return null

    const rows = table.rows
      .slice(header.rowIndex + 1)
      .map((row) => ({
        code: normalizeCode(header.text(row, 'code')),
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
    const declared = declaredShareTotal > 0

    const classified = rows.map(({ rawShare, ...row }) => ({
      ...row,
      code: row.code || row.description,
      abcClass: row.abcClass as AbcClass,
      share: declared && rawShare !== null ? rawShare / shareScale : 0,
    }))
    const items = mergeByCode(classified)

    if (declared) return new AbcReport(table.name, items, detectBasis(items))

    const basis = inferBasis(items)
    const pick = basis === 'quantity' || sum(items.map((item) => item.value)) <= 0 ? pickQuantity : pickValue
    const total = sum(items.map(pick))
    const withShares = items.map((item) => ({ ...item, share: total ? pick(item) / total : 0 }))
    return new AbcReport(table.name, withShares, basis)
  }
}

const pickQuantity = (item: { quantity: number }) => item.quantity
const pickValue = (item: { value: number }) => item.value
const A_CUTOFF = 0.8
const B_CUTOFF = 0.95
function classesFollow(items: readonly AbcItem[], pick: (item: AbcItem) => number): boolean {
  const classes = ABC_CLASSES.map((abcClass) => items.filter((item) => item.abcClass === abcClass).map(pick)).filter(
    (values) => values.length,
  )
  return classes.every((values, i) => {
    const next = classes[i + 1]
    return !next || Math.min(...values) >= Math.max(...next)
  })
}

function inferBasis(items: readonly AbcItem[]): AbcBasis | null {
  const byValue = sum(items.map(pickValue)) > 0 && classesFollow(items, pickValue)
  const byQuantity = classesFollow(items, pickQuantity)
  if (byValue) return 'value'
  if (byQuantity) return 'quantity'
  return null
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

function detectBasis(items: readonly AbcItem[]): AbcBasis | null {
  const matches = (pick: (item: AbcItem) => number) => {
    const total = sum(items.map(pick))
    return total > 0 && items.every((item) => Math.abs(item.share - pick(item) / total) < 0.005)
  }
  if (matches(pickQuantity)) return 'quantity'
  if (matches(pickValue)) return 'value'
  return null
}
