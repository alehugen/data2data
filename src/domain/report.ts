import { AbcReport } from '@/domain/abc'
import { Dataset } from '@/domain/dataset'
import { DreReport } from '@/domain/dre'
import type { FileFormat, RawTable } from '@/domain/ingestion'
import { ProfitReport } from '@/domain/profit'
import { DomainError, type Identifier } from '@/domain/shared'

export type Report = DreReport | AbcReport | ProfitReport | Dataset

export type MonthlyReport = AbcReport | ProfitReport

export const isMonthlyReport = (report: Report): report is MonthlyReport =>
  report.kind === 'abc' || report.kind === 'profit'

export interface ReportRepository {
  save(report: Report): Promise<void>
  findAll(): Promise<Report[]>
  remove(id: Identifier): Promise<void>
}

const hasData = (table: RawTable) => table.rows.some((row) => row.some((cell) => cell.trim() !== ''))

const recognizeEach = <T>(tables: readonly RawTable[], recognize: (table: RawTable) => T | null): T[] =>
  tables.map(recognize).filter((report): report is T => report !== null)

export function recognizeReports(tables: readonly RawTable[], format: FileFormat, asOf: Date = new Date()): Report[] {
  const filled = tables.filter(hasData)
  if (!filled.length) throw new DomainError('O arquivo não contém dados.')

  const dre = DreReport.fromTables(filled, asOf)
  if (dre) return [dre]

  const profit = recognizeEach(filled, ProfitReport.fromTable)
  if (profit.length) return profit

  const abc = recognizeEach(filled, AbcReport.fromTable)
  if (abc.length) return abc

  return filled.map((table) => Dataset.fromTable(table, format))
}
