import { DomainError } from '@/domain/shared'
import { detectFileFormat, type FileFormat } from './FileFormat'

/** Arquivo bruto enviado pelo usuário, ainda não interpretado. */
export class SourceFile {
  readonly name: string
  readonly format: FileFormat
  readonly content: Blob

  private constructor(name: string, format: FileFormat, content: Blob) {
    this.name = name
    this.format = format
    this.content = content
  }

  static fromFile(file: File): SourceFile {
    const format = detectFileFormat(file.name)
    if (!format) throw new DomainError(`Formato de arquivo não suportado: ${file.name}`)
    return new SourceFile(file.name, format, file)
  }
}
