import { normalizeText, parseNumber } from '@/domain/shared'

export const ColumnType = {
  Number: 'number',
  Date: 'date',
  Boolean: 'boolean',
  Text: 'text',
} as const

export type ColumnType = (typeof ColumnType)[keyof typeof ColumnType]

export interface Column {
  readonly key: string
  readonly label: string
  readonly type: ColumnType
}

const SAMPLE_SIZE = 100
const BOOLEAN_VALUES = new Set(['TRUE', 'FALSE', 'SIM', 'NAO', 'YES', 'NO'])
const DATE_PATTERN = /^(\d{4}-\d{2}-\d{2}|\d{2}[/.]\d{2}[/.]\d{4})$/

export function inferColumnType(values: readonly string[]): ColumnType {
  const sample = values.map((v) => v.trim()).filter(Boolean).slice(0, SAMPLE_SIZE)
  if (!sample.length) return ColumnType.Text

  if (sample.every((v) => DATE_PATTERN.test(v))) return ColumnType.Date
  if (sample.every((v) => Number.isFinite(parseNumber(v)))) return ColumnType.Number
  if (sample.every((v) => BOOLEAN_VALUES.has(normalizeText(v)))) return ColumnType.Boolean
  return ColumnType.Text
}
