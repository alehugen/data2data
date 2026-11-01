import { FileFormat, type FileParser, type RawTable, type SourceFile } from '@/domain/ingestion'

/** Adapter XLSX/XLS via SheetJS: cada aba vira uma tabela. */
export class XlsxFileParser implements FileParser {
  readonly format = FileFormat.Xlsx

  async parse(file: SourceFile): Promise<RawTable[]> {
    // Import dinâmico: a SheetJS é pesada e só é baixada quando uma planilha é importada
    const { read, utils } = await import('xlsx')
    const workbook = read(await file.content.arrayBuffer(), { cellDates: true })
    const baseName = file.name.replace(/\.[^.]+$/, '')
    const hasMultipleSheets = workbook.SheetNames.length > 1

    return workbook.SheetNames.flatMap((sheetName) => {
      const sheet = workbook.Sheets[sheetName]
      if (!sheet) return []

      // Valores brutos (não o texto formatado, que depende do locale da planilha).
      // Linhas em branco são mantidas: elas delimitam blocos em relatórios como a DRE.
      const rows = utils
        .sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '', blankrows: true })
        .map((row) => row.map(toCellText))

      if (!rows.some((row) => row.some(Boolean))) return []
      return [
        {
          name: hasMultipleSheets ? `${baseName} · ${sheetName.trim()}` : baseName,
          sheet: sheetName,
          rows,
        },
      ]
    })
  }
}

function toCellText(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value ?? '').trim()
}
