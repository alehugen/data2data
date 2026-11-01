import { AbcReport } from '@/domain/abc'
import { Dataset } from '@/domain/dataset'
import { DreReport } from '@/domain/dre'
import type { FileFormat, RawTable } from '@/domain/ingestion'
import type { Identifier } from '@/domain/shared'

/** Tudo que pode ser importado: relatórios reconhecidos ou uma tabela genérica. */
export type Report = DreReport | AbcReport | Dataset
export type ReportKind = Report['kind']

export interface ReportRepository {
  save(report: Report): Promise<void>
  findById(id: Identifier): Promise<Report | null>
  findAll(): Promise<Report[]>
  remove(id: Identifier): Promise<void>
}

/**
 * Identifica o tipo de relatório pelo conteúdo:
 * 1. planilha com DRE mensal → uma DreReport (demais abas ignoradas)
 * 2. tabela com colunas de Curva ABC → AbcReport
 * 3. qualquer outra coisa → Dataset genérico por tabela
 */
export function recognizeReports(tables: readonly RawTable[], format: FileFormat): Report[] {
  const dre = DreReport.fromTables(tables)
  if (dre) return [dre]

  const abc = tables.map((table) => AbcReport.fromTable(table)).filter((r): r is AbcReport => r !== null)
  if (abc.length) return abc

  return tables.map((table) => Dataset.fromTable(table, format))
}
