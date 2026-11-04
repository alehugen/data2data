import { findTableHeader, type RawTable } from '@/domain/ingestion'
import { normalizeText, type Period } from '@/domain/shared'

export interface LedgerEntry {
  readonly date: string
  readonly description: string
  readonly classification: string
  readonly unit: string
  readonly value: number
  readonly period: Period
}

const COLUMN_ALIASES = {
  classification: ['CLASSIFICACAO', 'PLANODECONTAS', 'CONTA'],
  signedValue: ['VALORDEMOVIMENTO', 'VALORMOVIMENTO'],
  value: ['VALOR', 'VALORPAGO', 'VALORTOTAL'],
  movement: ['MOVIMENTACAO', 'TIPO', 'NATUREZA'],
  paidAt: ['DATAPAGTO', 'DATAPAGAMENTO', 'DATADEPAGAMENTO', 'PAGAMENTO'],
  cashMonth: ['MESCX', 'MESCAIXA'],
  cashYear: ['ANOCX', 'ANOCAIXA'],
  description: ['HISTORICO', 'DESCRICAO'],
  unit: ['UNIDADE', 'BANCO'],
} as const

const REQUIRED_COLUMNS = ['classification', 'value'] as const

function parseDate(text: string): { year: number; month: number } | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]) }
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text)
  if (br) return { year: Number(br[3]), month: Number(br[2]) }
  return null
}

const isMonth = (month: number) => Number.isInteger(month) && month >= 1 && month <= 12
const isYear = (year: number) => Number.isInteger(year) && year >= 1900 && year <= 2999

export function readLedger(table: RawTable): LedgerEntry[] | null {
  const header = findTableHeader(table.rows, COLUMN_ALIASES, REQUIRED_COLUMNS)
  const hasCashMonth = header?.columns.cashMonth !== undefined && header.columns.cashYear !== undefined
  if (!header || (!hasCashMonth && header.columns.paidAt === undefined)) return null

  const signed = (row: readonly string[]) => {
    if (header.columns.signedValue !== undefined) return header.number(row, 'signedValue')
    const value = Math.abs(header.number(row, 'value'))
    const movement = normalizeText(header.text(row, 'movement'))
    if (movement.startsWith('SAIDA') || movement.startsWith('DEBITO')) return -value
    if (movement.startsWith('ENTRADA') || movement.startsWith('CREDITO')) return value
    return header.number(row, 'value')
  }

  const periodOf = (row: readonly string[]): Period | null => {
    const paid = parseDate(header.text(row, 'paidAt'))
    if (!paid) return null
    if (hasCashMonth) {
      const month = header.number(row, 'cashMonth')
      const year = header.number(row, 'cashYear')
      if (isMonth(month) && isYear(year)) return { year, month }
    }
    return paid
  }

  const entries = table.rows.slice(header.rowIndex + 1).flatMap((row): LedgerEntry[] => {
    const classification = header.text(row, 'classification')
    const period = periodOf(row)
    const value = signed(row)
    if (!classification || !period || !value) return []
    return [
      {
        date: header.text(row, 'paidAt'),
        description: header.text(row, 'description'),
        classification,
        unit: header.text(row, 'unit'),
        value,
        period,
      },
    ]
  })

  return entries.length ? entries : null
}
