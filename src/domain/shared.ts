export type Identifier = string

export const createIdentifier = (): Identifier => crypto.randomUUID()

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

// ---------- Texto e números ----------

/** "Receita  Líquida" → "RECEITA LIQUIDA": compara rótulos ignorando acento, caixa e espaços. */
export const normalizeText = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase()

/**
 * Aceita "1234.5", "1.234,56" / "12,2222" (pt-BR, vírgula decimal) e "1,234.56" (en-US).
 * Vazio vira NaN.
 */
export function parseNumber(value: string): number {
  const text = value.trim().replace(/[R$\s%]/g, '')
  if (!text) return Number.NaN
  const hasDecimalComma = /,\d+$/.test(text) && !/\.\d+$/.test(text) && !/,\d{3}$/.test(text)
  const normalized = hasDecimalComma
    ? text.replace(/\./g, '').replace(',', '.')
    : text.replace(/,/g, '')
  return Number(normalized)
}

// ---------- Período mensal ----------

export interface Period {
  readonly year: number
  readonly month: number
}

export const periodKey = ({ year, month }: Period): string => `${year}-${String(month).padStart(2, '0')}`

export const comparePeriods = (a: Period, b: Period): number => a.year - b.year || a.month - b.month

const MONTH_PREFIXES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

/** Extrai o mês de textos como "set.2026", "setembro 2026", "09-2026" ou "2026_09". */
export function parsePeriodFromText(text: string): Period | null {
  const normalized = normalizeText(text)

  const byName = normalized.match(/\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-Z]*[\s._\-/]*(\d{4})\b/)
  if (byName?.[1] && byName[2]) {
    return { year: Number(byName[2]), month: MONTH_PREFIXES.indexOf(byName[1]) + 1 }
  }

  const monthFirst = normalized.match(/\b(\d{1,2})[._\-/](\d{4})\b/)
  if (monthFirst?.[1] && monthFirst[2] && Number(monthFirst[1]) <= 12) {
    return { year: Number(monthFirst[2]), month: Number(monthFirst[1]) }
  }

  const yearFirst = normalized.match(/\b(\d{4})[._\-/](\d{1,2})\b/)
  if (yearFirst?.[1] && yearFirst[2] && Number(yearFirst[2]) <= 12) {
    return { year: Number(yearFirst[1]), month: Number(yearFirst[2]) }
  }

  return null
}
