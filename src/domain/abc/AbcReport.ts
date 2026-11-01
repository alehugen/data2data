import type { RawTable } from '@/domain/ingestion'
import {
  createIdentifier,
  normalizeText,
  parseNumber,
  parsePeriodFromText,
  type Identifier,
  type Period,
} from '@/domain/shared'

export const AbcClass = { A: 'A', B: 'B', C: 'C' } as const
export type AbcClass = (typeof AbcClass)[keyof typeof AbcClass]
export const ABC_CLASSES: readonly AbcClass[] = [AbcClass.A, AbcClass.B, AbcClass.C]

export interface AbcItem {
  readonly code: string
  readonly description: string
  readonly quantity: number
  readonly value: number
  readonly abcClass: AbcClass
  /** Participação do item (0..1), como informada no relatório */
  readonly share: number
}

/** Nomes de coluna aceitos (comparados sem acento, espaço ou pontuação). */
const COLUMN_ALIASES = {
  code: ['PROCODIGO', 'CODIGO', 'COD', 'CODPRODUTO'],
  description: ['PRODESCRICAO', 'DESCRICAO', 'PRODUTO', 'ITEM'],
  quantity: ['QTDE', 'QUANTIDADE', 'QTD'],
  value: ['VALORTOTAL', 'VALOR', 'TOTAL', 'FATURAMENTO'],
  abcClass: ['CLASSIFICACAO', 'CLASSE', 'CURVA', 'CURVAABC'],
  share: ['PERCENTUAL', 'PERC', 'PARTICIPACAO'],
} as const

type ColumnName = keyof typeof COLUMN_ALIASES
const REQUIRED: ColumnName[] = ['description', 'quantity', 'abcClass']

/** Aggregate root: relatório de Curva ABC de um mês. */
export class AbcReport {
  readonly kind = 'abc' as const
  readonly id: Identifier
  readonly name: string
  /** Mês de referência, extraído do nome do arquivo (null se não identificado) */
  readonly period: Period | null
  readonly items: readonly AbcItem[]
  readonly importedAt: Date

  private constructor(name: string, period: Period | null, items: AbcItem[]) {
    this.id = createIdentifier()
    this.name = name
    this.period = period
    this.items = items
    this.importedAt = new Date()
  }

  static fromTable(table: RawTable): AbcReport | null {
    const [headerRow = [], ...rows] = table.rows
    const columns = mapColumns(headerRow)
    if (!columns) return null

    const cell = (row: string[], name: ColumnName) => {
      const index = columns[name]
      return index === undefined ? '' : (row[index] ?? '').trim()
    }
    const number = (row: string[], name: ColumnName) => {
      const value = parseNumber(cell(row, name))
      return Number.isFinite(value) ? value : 0
    }

    const parsed = rows
      .filter((row) => cell(row, 'description'))
      .map((row) => ({
        code: cell(row, 'code'),
        description: cell(row, 'description'),
        quantity: number(row, 'quantity'),
        value: number(row, 'value'),
        abcClass: cell(row, 'abcClass').toUpperCase() as AbcClass,
        rawShare: columns.share === undefined ? null : number(row, 'share'),
      }))
      .filter((item) => ABC_CLASSES.includes(item.abcClass))

    if (!parsed.length) return null

    const totalQuantity = parsed.reduce((acc, item) => acc + item.quantity, 0)
    const items: AbcItem[] = parsed.map(({ rawShare, ...item }) => ({
      ...item,
      code: item.code || item.description,
      share: rawShare !== null ? rawShare / 100 : totalQuantity ? item.quantity / totalQuantity : 0,
    }))

    return new AbcReport(table.name, parsePeriodFromText(table.name), items)
  }

  /** Critério da classificação, deduzido do percentual informado: quantidade ou faturamento. */
  get basis(): 'quantity' | 'value' | null {
    const matches = (pick: (item: AbcItem) => number, total: number) =>
      total > 0 && this.items.every((item) => Math.abs(item.share - pick(item) / total) < 0.005)
    if (matches((item) => item.quantity, this.totalQuantity)) return 'quantity'
    if (matches((item) => item.value, this.totalValue)) return 'value'
    return null
  }

  get totalQuantity(): number {
    return this.items.reduce((acc, item) => acc + item.quantity, 0)
  }

  get totalValue(): number {
    return this.items.reduce((acc, item) => acc + item.value, 0)
  }
}

function mapColumns(headerRow: string[]): Partial<Record<ColumnName, number>> | null {
  const normalized = headerRow.map((header) => normalizeText(header).replace(/[^A-Z0-9]/g, ''))
  const columns: Partial<Record<ColumnName, number>> = {}

  for (const [name, aliases] of Object.entries(COLUMN_ALIASES) as [ColumnName, readonly string[]][]) {
    const index = normalized.findIndex((header) => aliases.includes(header))
    if (index !== -1) columns[name] = index
  }

  return REQUIRED.every((name) => columns[name] !== undefined) ? columns : null
}
