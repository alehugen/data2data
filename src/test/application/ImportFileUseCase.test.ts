import { beforeEach, describe, expect, it } from 'vitest'
import { CsvFileParser } from '@/infrastructure/CsvFileParser'
import { InMemoryReportRepository } from '@/infrastructure/InMemoryReportRepository'
import { XlsxFileParser } from '@/infrastructure/XlsxFileParser'
import { ABC_OCTOBER, ABC_SEPTEMBER, PROFIT_OCTOBER, dreRows, latin1File, xlsxFile } from '@/test/fixtures'
import { ImportFileUseCase } from '@/application'

let repository: InMemoryReportRepository
let importFile: ImportFileUseCase

beforeEach(() => {
  repository = new InMemoryReportRepository()
  importFile = new ImportFileUseCase([new CsvFileParser(), new XlsxFileParser()], repository)
})

const errorOf = async (file: File) => {
  try {
    await importFile.execute(file)
    return null
  } catch (error) {
    return (error as Error).message
  }
}

describe('ImportFileUseCase', () => {
  it('importa CSV em Windows-1252 sem quebrar acentos', async () => {
    const [report] = await importFile.execute(latin1File('Relatório_Curva_ABC- set.2026.csv', ABC_SEPTEMBER))
    expect(report!.kind).toBe('abc')
    expect(report!.kind === 'abc' && report!.items[2]!.description).toBe('Aplicação de brinco')
  })

  it('importa CSV em UTF-8', async () => {
    const [report] = await importFile.execute(new File([PROFIT_OCTOBER], 'Lucro_por_Produto-out.2026.csv'))
    expect(report!.kind).toBe('profit')
  })

  it('importa a DRE de uma planilha com várias abas', async () => {
    const file = xlsxFile('DRE.xlsx', { Fluxo: [['Data', 'Valor'], ['x', '1']], 'DFC  DRE Geral': dreRows() })
    const reports = await importFile.execute(file)
    expect(reports.map((r) => r.kind)).toEqual(['dre'])
    expect(reports[0]!.kind === 'dre' && reports[0]!.periods).toHaveLength(3)
  })

  it('importa planilhas genéricas aba por aba', async () => {
    const file = xlsxFile('vendas.xlsx', { Jan: [['Item', 'Valor'], ['A', '1']], Fev: [['Item', 'Valor'], ['B', '2']] })
    const reports = await importFile.execute(file)
    expect(reports.map((r) => [r.kind, r.name])).toEqual([
      ['dataset', 'vendas · Jan'],
      ['dataset', 'vendas · Fev'],
    ])
  })

  it('reimportar um mês substitui só o relatório do mesmo tipo e mês', async () => {
    await importFile.execute(latin1File('abc set.2026.csv', ABC_SEPTEMBER))
    await importFile.execute(latin1File('abc out.2026.csv', ABC_OCTOBER))
    await importFile.execute(latin1File('lucro out.2026.csv', PROFIT_OCTOBER))
    await importFile.execute(latin1File('abc out.2026 (2).csv', ABC_OCTOBER))

    const kinds = (await repository.findAll()).map((r) => r.kind).sort()
    expect(kinds).toEqual(['abc', 'abc', 'profit'])
  })

  it('explica falhas com mensagens legíveis', async () => {
    expect(await errorOf(new File([], 'vazio.csv'))).toBe('O arquivo está vazio: vazio.csv')
    expect(await errorOf(new File(['\n\n ;; \n'], 'branco.csv'))).toBe('O arquivo não contém dados.')
    expect(await errorOf(new File(['x'], 'foto.png'))).toBe('Formato não suportado: foto.png')
    const brokenZip = new File([new Uint8Array([0x50, 0x4b, 3, 4, ...Array<number>(200).fill(7)])], 'quebrado.xlsx')
    expect(await errorOf(brokenZip)).toMatch(/^Não foi possível ler quebrado\.xlsx/)
  })
})
