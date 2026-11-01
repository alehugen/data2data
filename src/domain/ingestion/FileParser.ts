import type { FileFormat } from './FileFormat'
import type { SourceFile } from './SourceFile'

/** Grade de células extraída de um arquivo (CSV inteiro ou uma aba da planilha), linha de cabeçalho inclusa. */
export interface RawTable {
  /** Nome legível: arquivo, ou "arquivo · aba" em planilhas com várias abas */
  readonly name: string
  readonly sheet?: string
  readonly rows: string[][]
}

/** Porta: cada formato (CSV, XLSX...) tem um adapter na infraestrutura. */
export interface FileParser {
  readonly format: FileFormat
  parse(file: SourceFile): Promise<RawTable[]>
}
