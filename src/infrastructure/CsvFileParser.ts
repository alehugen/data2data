import Papa from 'papaparse'
import { FileFormat, type FileParser, type RawTable, type SourceFile } from '@/domain/ingestion'
import { DomainError } from '@/domain/shared'

/** Adapter CSV via Papa Parse: detecta delimitador, aspas e quebras de linha. */
export class CsvFileParser implements FileParser {
  readonly format = FileFormat.Csv

  async parse(file: SourceFile): Promise<RawTable[]> {
    const text = decode(await file.content.arrayBuffer())
    const result = Papa.parse<string[]>(text, {
      skipEmptyLines: 'greedy',
      transform: (value) => value.trim(),
    })

    if (result.errors.length && !result.data.length) {
      throw new DomainError(`Não foi possível ler o CSV: ${result.errors[0]?.message}`)
    }

    return [{ name: file.name.replace(/\.[^.]+$/, ''), rows: result.data }]
  }
}

/** Sistemas brasileiros costumam exportar em Windows-1252 (Latin-1); tenta UTF-8 primeiro. */
function decode(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1252').decode(buffer)
  }
}
