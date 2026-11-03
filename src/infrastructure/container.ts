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
import {
  buildAbcTemplate,
  buildDreTemplate,
  buildProfitTemplate,
  buildSampleFiles,
  periodSuffix,
  previousMonth,
  sampleStatement,
} from './templates'
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
  templates: {
    dre: buildDreTemplate,
    abc: buildAbcTemplate,
    profit: buildProfitTemplate,
    samples: buildSampleFiles,
    statement: sampleStatement,
    lastMonth: () => previousMonth(new Date()),
    fileSuffix: periodSuffix,
  },
}
