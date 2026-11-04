import type { FileFormat, RawTable } from '@/domain/ingestion'
import { createIdentifier, isTotalLabel, type Identifier } from '@/domain/shared'
import { inferColumnType, type Column } from './Column'

export type Row = Record<string, string>

export class Dataset {
  readonly kind = 'dataset' as const
  readonly id: Identifier = createIdentifier()
  readonly importedAt = new Date()
  readonly name: string
  readonly sourceFormat: FileFormat
  readonly columns: readonly Column[]
  readonly rows: readonly Row[]

  private constructor(name: string, sourceFormat: FileFormat, columns: Column[], rows: Row[]) {
    this.name = name
    this.sourceFormat = sourceFormat
    this.columns = columns
    this.rows = rows
  }

  static fromTable(table: RawTable, sourceFormat: FileFormat): Dataset {
    const filled = table.rows.filter((row) => row.some((cell) => cell.trim() !== ''))
    const [headers = [], ...cells] = filled
    const keys = uniqueKeys(headers)

    const rows: Row[] = cells
      .filter((row) => !isTotalLabel(row.find((cell) => cell.trim() !== '') ?? ''))
      .map((row) => Object.fromEntries(keys.map((key, i) => [key, row[i] ?? ''])))
    const columns: Column[] = keys.map((key) => ({
      key,
      label: key,
      type: inferColumnType(rows.map((row) => row[key] ?? '')),
    }))

    return new Dataset(table.name, sourceFormat, columns, rows)
  }

  get rowCount(): number {
    return this.rows.length
  }

  columnValues(key: string): string[] {
    return this.rows.map((row) => row[key] ?? '')
  }
}

function uniqueKeys(headers: readonly string[]): string[] {
  const seen = new Map<string, number>()
  return headers.map((header, i) => {
    const base = header.trim() || `Coluna ${i + 1}`
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base} (${count})`
  })
}
