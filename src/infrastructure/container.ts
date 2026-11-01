import {
  AnalyzeAbcUseCase,
  AnalyzeDatasetUseCase,
  AnalyzeDreUseCase,
  GetReportUseCase,
  ImportFileUseCase,
  ListReportsUseCase,
  RemoveReportUseCase,
} from '@/application'
import { CsvFileParser } from './CsvFileParser'
import { InMemoryReportRepository } from './InMemoryReportRepository'
import { XlsxFileParser } from './XlsxFileParser'

/** Composition root: único lugar que conhece as implementações concretas. */
const reportRepository = new InMemoryReportRepository()
const parsers = [new CsvFileParser(), new XlsxFileParser()]

export const container = {
  importFile: new ImportFileUseCase(parsers, reportRepository),
  listReports: new ListReportsUseCase(reportRepository),
  getReport: new GetReportUseCase(reportRepository),
  removeReport: new RemoveReportUseCase(reportRepository),
  analyzeDataset: new AnalyzeDatasetUseCase(),
  analyzeDre: new AnalyzeDreUseCase(),
  analyzeAbc: new AnalyzeAbcUseCase(),
}
