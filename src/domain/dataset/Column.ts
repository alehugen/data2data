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

const NUMBER_PATTERN = /^-?[\d.,]+$/
const BOOLEAN_VALUES = new Set(['true', 'false', 'sim', 'não', 'nao', 'yes', 'no'])

/** Infere o tipo de uma coluna a partir de uma amostra de valores. */
export function inferColumnType(values: string[]): ColumnType {
  const sample = values.map((v) => v.trim()).filter(Boolean).slice(0, 100)
  if (sample.length === 0) return ColumnType.Text

  if (sample.every((v) => NUMBER_PATTERN.test(v))) return ColumnType.Number
  if (sample.every((v) => BOOLEAN_VALUES.has(v.toLowerCase()))) return ColumnType.Boolean
  if (sample.every((v) => !Number.isNaN(Date.parse(v)))) return ColumnType.Date
  return ColumnType.Text
}
