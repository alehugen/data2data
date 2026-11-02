import { normalizeText, parseNumber } from '@/domain/shared'

export type ColumnAliases<Name extends string> = Record<Name, readonly string[]>

const HEADER_SEARCH_ROWS = 10

const normalizeHeader = (header: string) => normalizeText(header).replace(/[^A-Z0-9]/g, '')

export interface TableHeader<Name extends string> {
  readonly rowIndex: number
  readonly columns: Partial<Record<Name, number>>
  text(row: readonly string[], name: Name): string
  number(row: readonly string[], name: Name): number
}

export function findTableHeader<Name extends string>(
  rows: readonly string[][],
  aliases: ColumnAliases<Name>,
  required: readonly NoInfer<Name>[],
): TableHeader<Name> | null {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, HEADER_SEARCH_ROWS); rowIndex++) {
    const headers = rows[rowIndex]!.map(normalizeHeader)
    const columns: Partial<Record<Name, number>> = {}

    for (const [name, names] of Object.entries(aliases) as [Name, readonly string[]][]) {
      const index = headers.findIndex((header) => names.includes(header))
      if (index !== -1) columns[name] = index
    }

    if (!required.every((name) => columns[name] !== undefined)) continue

    const text = (row: readonly string[], name: Name) => {
      const index = columns[name]
      return index === undefined ? '' : (row[index] ?? '').trim()
    }
    const number = (row: readonly string[], name: Name) => {
      const value = parseNumber(text(row, name))
      return Number.isFinite(value) ? value : 0
    }

    return { rowIndex, columns, text, number }
  }
  return null
}
