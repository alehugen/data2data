import { SourceFile, type FileParser } from '@/domain/ingestion'
import { recognizeReports, type Report, type ReportRepository } from '@/domain/report'
import { DomainError, periodKey } from '@/domain/shared'

/** Lê o arquivo, reconhece o tipo de relatório e o persiste. */
export class ImportFileUseCase {
  private readonly parsers: readonly FileParser[]
  private readonly repository: ReportRepository

  constructor(parsers: readonly FileParser[], repository: ReportRepository) {
    this.parsers = parsers
    this.repository = repository
  }

  async execute(file: File): Promise<Report[]> {
    const source = SourceFile.fromFile(file)
    const parser = this.parsers.find((p) => p.format === source.format)
    if (!parser) throw new DomainError(`Nenhum parser registrado para o formato "${source.format}"`)

    const reports = recognizeReports(await parser.parse(source), source.format)
    await this.replaceSamePeriodAbc(reports)
    await Promise.all(reports.map((report) => this.repository.save(report)))
    return reports
  }

  /** Reimportar a Curva ABC de um mês substitui a versão anterior daquele mês. */
  private async replaceSamePeriodAbc(incoming: Report[]) {
    const keys = new Set(
      incoming.flatMap((r) => (r.kind === 'abc' && r.period ? [periodKey(r.period)] : [])),
    )
    if (!keys.size) return

    const existing = await this.repository.findAll()
    const outdated = existing.filter((r) => r.kind === 'abc' && r.period && keys.has(periodKey(r.period)))
    await Promise.all(outdated.map((r) => this.repository.remove(r.id)))
  }
}
