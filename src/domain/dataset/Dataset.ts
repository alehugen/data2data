import type { FileFormat, RawTable } from '@/domain/ingestion'
import { createIdentifier, type Identifier } from '@/domain/shared'
import { inferColumnType, type Column } from './Column'

export type Row = Record<string, string>

interface DatasetProps {
  id: Identifier
  name: string
  sourceFormat: FileFormat
  columns: Column[]
  rows: Row[]
  importedAt: Date
}

/** Aggregate root: um conjunto de dados tabular normalizado. */
export class Dataset {
  readonly kind = 'dataset' as const
  readonly id: Identifier
  readonly name: string
  readonly sourceFormat: FileFormat
  readonly columns: readonly Column[]
  readonly rows: readonly Row[]
  readonly importedAt: Date

  private constructor(props: DatasetProps) {
    this.id = props.id
    this.name = props.name
    this.sourceFormat = props.sourceFormat
    this.columns = props.columns
    this.rows = props.rows
    this.importedAt = props.importedAt
  }

  /** Primeira linha preenchida vira cabeçalho; linhas vazias são descartadas. */
  static fromTable(table: RawTable, sourceFormat: FileFormat): Dataset {
    const filled = table.rows.filter((row) => row.some((cell) => cell.trim() !== ''))
    const [headers = [], ...cells] = filled
    const keys = headers.map((header, i) => header.trim() || `coluna_${i + 1}`)

    const rows: Row[] = cells.map((row) =>
      Object.fromEntries(keys.map((key, i) => [key, row[i] ?? ''])),
    )

    const columns: Column[] = keys.map((key) => ({
      key,
      label: key,
      type: inferColumnType(rows.map((row) => row[key] ?? '')),
    }))

    return new Dataset({
      id: createIdentifier(),
      name: table.name,
      sourceFormat,
      columns,
      rows,
      importedAt: new Date(),
    })
  }

  get rowCount(): number {
    return this.rows.length
  }

  columnValues(key: string): string[] {
    return this.rows.map((row) => row[key] ?? '')
  }
}
