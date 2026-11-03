export type Identifier = string

export const createIdentifier = (): Identifier => crypto.randomUUID()

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

export const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()

export function parseNumber(value: string): number {
  let text = value.trim().replace(/R\$|%|\s/g, '').replace(/−/g, '-')
  if (!text) return Number.NaN
  const accountingNegative = /^\(.*\)$/.test(text)
  if (accountingNegative) text = text.slice(1, -1)
  const commas = (text.match(/,/g) ?? []).length
  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')

  const decimalComma = commas === 1 && lastComma > lastDot && !/^-?\d{1,3},\d{3}$/.test(text)
  const thousandDots = commas === 0 && /^-?\d{1,3}(\.\d{3})+$/.test(text)

  const normalized = decimalComma
    ? text.replace(/\./g, '').replace(',', '.')
    : thousandDots
      ? text.replace(/\./g, '')
      : text.replace(/,/g, '')

  if (!/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(normalized)) return Number.NaN
  const number = Number(normalized)
  return accountingNegative ? -number : number
}

export const sum = (values: readonly number[]): number =>
  values.reduce((acc, value) => (Number.isFinite(value) ? acc + value : acc), 0)

export const ratio = (part: number, total: number): number | null =>
  total && Number.isFinite(part) && Number.isFinite(total) ? part / total : null

export const relativeChange = (current: number, previous: number | null | undefined): number | null =>
  previous ? ratio(current - previous, Math.abs(previous)) : null

export interface Period {
  readonly year: number
  readonly month: number
}

export const periodKey = ({ year, month }: Period): string => `${year}-${String(month).padStart(2, '0')}`

export const comparePeriods = (a: Period, b: Period): number => a.year - b.year || a.month - b.month

export function compareByPeriod(a: { period: Period | null }, b: { period: Period | null }): number {
  if (a.period && b.period) return comparePeriods(a.period, b.period)
  if (a.period) return -1
  if (b.period) return 1
  return 0
}

const MONTH_PATTERNS = [
  'JAN(?:EIRO)?',
  'FEV(?:EREIRO)?',
  'MAR(?:CO)?',
  'ABR(?:IL)?',
  'MAI(?:O)?',
  'JUN(?:HO)?',
  'JUL(?:HO)?',
  'AGO(?:STO)?',
  'SET(?:EMBRO)?',
  'OUT(?:UBRO)?',
  'NOV(?:EMBRO)?',
  'DEZ(?:EMBRO)?',
]

const MONTH_NAME_REGEX = new RegExp(
  `(?<![A-Z])(${MONTH_PATTERNS.map((p) => `(${p})`).join('|')})(?![A-Z])[\\s._\\-/]*(?:DE\\s+)?(\\d{4}|\\d{2})(?!\\d)`,
)

const toYear = (digits: string) => (digits.length === 2 ? 2000 + Number(digits) : Number(digits))
const isValidMonth = (month: number) => month >= 1 && month <= 12

export function parsePeriodFromText(text: string): Period | null {
  const normalized = normalizeText(text)

  const byName = normalized.match(MONTH_NAME_REGEX)
  if (byName) {
    const monthIndex = byName.slice(2, 14).findIndex(Boolean)
    return { year: toYear(byName[14]!), month: monthIndex + 1 }
  }

  const monthFirst = normalized.match(/(?<!\d)(\d{1,2})[._\-/](\d{4})(?!\d)/)
  if (monthFirst && isValidMonth(Number(monthFirst[1]))) {
    return { year: Number(monthFirst[2]), month: Number(monthFirst[1]) }
  }

  const yearFirst = normalized.match(/(?<!\d)(\d{4})[._\-/](\d{1,2})(?!\d)/)
  if (yearFirst && isValidMonth(Number(yearFirst[2]))) {
    return { year: Number(yearFirst[1]), month: Number(yearFirst[2]) }
  }

  return null
}
