import {
  AnalyzeAbcUseCase,
  AnalyzeDatasetUseCase,
  AnalyzeDreUseCase,
  ImportFileUseCase,
  ListReportsUseCase,
  RemoveReportUseCase,
} from '@/application'
import { CsvFileParser } from './CsvFileParser'
import { InMemoryReportRepository } from './InMemoryReportRepository'
import { XlsxFileParser } from './XlsxFileParser'

const reportRepository = new InMemoryReportRepository()
const parsers = [new CsvFileParser(), new XlsxFileParser()]

export const container = {
  importFile: new ImportFileUseCase(parsers, reportRepository),
  listReports: new ListReportsUseCase(reportRepository),
  removeReport: new RemoveReportUseCase(reportRepository),
  analyzeDataset: new AnalyzeDatasetUseCase(),
  analyzeDre: new AnalyzeDreUseCase(),
  analyzeAbc: new AnalyzeAbcUseCase(),
}
