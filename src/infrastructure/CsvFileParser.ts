import Papa from 'papaparse'
import { FileFormat, type FileParser, type RawTable, type SourceFile } from '@/domain/ingestion'

export class CsvFileParser implements FileParser {
  readonly format = FileFormat.Csv

  async parse(file: SourceFile): Promise<RawTable[]> {
    const text = decode(await file.content.arrayBuffer())
    const { data } = Papa.parse<string[]>(text, {
      skipEmptyLines: 'greedy',
      transform: (value) => value.trim(),
    })

    return [{ name: file.baseName, rows: data.filter((row) => !row.every(isOnlySeparators)) }]
  }
}

const isOnlySeparators = (cell: string) => /^[\s;,|\t]*$/.test(cell)

function decode(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1252').decode(buffer)
  }
}
