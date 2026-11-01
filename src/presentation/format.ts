import {
  formatCep,
  formatCnpj,
  formatCpf,
  formatPhone,
  isValidCnpj,
  isValidCpf,
} from '@brazilian-utils/brazilian-utils'
import type { Period } from '@/domain/shared'

const LOCALE = 'pt-BR'

const numberFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 })
const compactFormatter = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })
const currencyFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'BRL' })
const currencyCompactFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const percentFormatter = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 1 })
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'short' })
const monthLongFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' })

// ---------- Valores ----------

export const formatNumber = (value: number) => numberFormatter.format(value)
export const formatCompact = (value: number) => compactFormatter.format(value)
export const formatCurrency = (value: number) => currencyFormatter.format(value)
/** R$ 47,8 mil */
export const formatCurrencyCompact = (value: number) => currencyCompactFormatter.format(value)
/** Recebe uma fração: 0.25 → "25%" */
export const formatPercent = (value: number) => percentFormatter.format(value)
/** 0.12 → "+12%" */
export const formatSignedPercent = (value: number) => `${value > 0 ? '+' : ''}${percentFormatter.format(value)}`
export const formatDate = (value: Date) => dateFormatter.format(value)

// ---------- Períodos ----------

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** out/26 */
export const formatPeriod = ({ year, month }: Period) => `${MONTHS[month - 1]}/${String(year).slice(2)}`
/** outubro de 2026 */
export const formatPeriodLong = ({ year, month }: Period) => monthLongFormatter.format(new Date(year, month - 1))

// ---------- Rótulos ----------

const KEEP_UPPER = new Set(['EBITDA', 'ISS', 'IPI', 'ICMS', 'PIS', 'COFINS', 'IRPJ', 'CSLL', 'INSS', 'FGTS', 'DRE', 'ABC', 'HPV'])

/** "CUSTOS DAS MERCADORIAS VENDIDAS" → "Custos das mercadorias vendidas" (siglas preservadas). */
export function prettifyLabel(label: string): string {
  const text = label.trim()
  if (text !== text.toUpperCase()) return text
  return text
    .toLowerCase()
    .replace(/\p{L}+/gu, (word) => (KEEP_UPPER.has(word.toUpperCase()) ? word.toUpperCase() : word))
    .replace(/^\p{L}/u, (char) => char.toUpperCase())
}

// ---------- Documentos (via @brazilian-utils) ----------

export { formatCep, formatCnpj, formatCpf, formatPhone, isValidCnpj, isValidCpf }

const onlyDigits = (value: string) => value.replace(/\D/g, '')

/** Formata CPF ou CNPJ automaticamente pelo número de dígitos. */
export function formatDocument(value: string): string {
  const digits = onlyDigits(value)
  if (digits.length === 11) return formatCpf(digits)
  if (digits.length === 14) return formatCnpj(digits)
  return value
}

export function isValidDocument(value: string): boolean {
  const digits = onlyDigits(value)
  return digits.length === 11 ? isValidCpf(digits) : isValidCnpj(digits)
}
