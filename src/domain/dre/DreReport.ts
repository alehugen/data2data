import type { RawTable } from '@/domain/ingestion'
import {
  createIdentifier,
  normalizeText,
  parseNumber,
  periodKey,
  type Identifier,
  type Period,
} from '@/domain/shared'

export const DreLineKind = {
  /** Agrupa outros grupos (ex.: DESPESAS OPERACIONAIS) */
  Section: 'section',
  /** Soma de contas (ex.: IMPOSTOS SOBRE VENDA) */
  Group: 'group',
  Account: 'account',
  /** Subtotal da DRE (ex.: LUCRO BRUTO, EBITDA) */
  Result: 'result',
  /** Linhas de caixa fora da cascata (Variação, Saldo inicial/final) */
  Balance: 'balance',
} as const

export type DreLineKind = (typeof DreLineKind)[keyof typeof DreLineKind]

export interface DreLine {
  readonly id: string
  readonly label: string
  readonly kind: DreLineKind
  readonly parentId: string | null
  /** Um valor por período, alinhado a DreReport.periods */
  readonly values: readonly number[]
}

/** Linhas-chave da DRE gerencial, reconhecidas pelo nome. */
export const DreMetric = {
  GrossRevenue: 'grossRevenue',
  SalesTaxes: 'salesTaxes',
  GrossProfit: 'grossProfit',
  ContributionMargin: 'contributionMargin',
  OperatingExpenses: 'operatingExpenses',
  Ebitda: 'ebitda',
  NetIncome: 'netIncome',
  EndingCash: 'endingCash',
} as const

export type DreMetric = (typeof DreMetric)[keyof typeof DreMetric]

const METRIC_LABELS: Record<DreMetric, string[]> = {
  grossRevenue: ['RECEITA OPERACIONAL BRUTA', 'RECEITA BRUTA'],
  salesTaxes: ['IMPOSTOS SOBRE VENDA', 'IMPOSTOS SOBRE VENDAS', 'DEDUCOES DA RECEITA BRUTA'],
  grossProfit: ['LUCRO OPERACIONAL BRUTO', 'LUCRO BRUTO'],
  contributionMargin: ['MARGEM DE CONTRIBUICAO'],
  operatingExpenses: ['DESPESAS OPERACIONAIS'],
  ebitda: ['RESULTADO LIQUIDO (EBITDA)', 'EBITDA'],
  netIncome: ['RESULTADO LIQUIDO', 'LUCRO LIQUIDO', 'RESULTADO LIQUIDO DO EXERCICIO'],
  endingCash: ['SALDO FINAL'],
}

/** Aba preferida quando a planilha tem várias DREs (ex.: "DRE Unidades" e "DFC DRE Geral"). */
const PREFERRED_SHEET = 'DRE GERAL'

/**
 * Aggregate root: Demonstração do Resultado do Exercício mensal.
 * Valores seguem o sinal da planilha: receitas positivas, custos e despesas negativos.
 */
export class DreReport {
  readonly kind = 'dre' as const
  readonly id: Identifier
  readonly name: string
  readonly periods: readonly Period[]
  readonly lines: readonly DreLine[]
  readonly importedAt: Date
  private readonly metrics: ReadonlyMap<DreMetric, DreLine>

  private constructor(name: string, periods: Period[], lines: DreLine[]) {
    this.id = createIdentifier()
    this.name = name
    this.periods = periods
    this.lines = lines
    this.importedAt = new Date()
    this.metrics = matchMetrics(lines)
  }

  /** Escolhe a aba de DRE de uma planilha (prioriza "DRE Geral") e a interpreta. */
  static fromTables(tables: readonly RawTable[]): DreReport | null {
    const preferred = tables.filter((t) => normalizeText(t.sheet ?? '').includes(PREFERRED_SHEET))
    const others = tables.filter((t) => !preferred.includes(t))
    for (const table of [...preferred, ...others]) {
      const report = DreReport.fromTable(table)
      if (report) return report
    }
    return null
  }

  static fromTable(table: RawTable): DreReport | null {
    const header = findPeriodHeader(table.rows)
    if (!header) return null

    const entries = table.rows.slice(header.rowIndex + 2).map((row) => ({
      label: (row[0] ?? '').trim(),
      values: header.columns.map((col) => {
        const value = parseNumber(row[col] ?? '')
        return Number.isFinite(value) ? value : 0
      }),
    }))

    const lines = classifyLines(entries)
    const range = activeRange(lines, header.periods.length)
    if (!range || !lines.length) return null

    const [start, end] = range
    const trimmed = lines.map((line) => ({ ...line, values: line.values.slice(start, end + 1) }))
    const report = new DreReport(table.name, header.periods.slice(start, end + 1), trimmed)

    // Sem receita bruta não é uma DRE reconhecível
    return report.metric(DreMetric.GrossRevenue) ? report : null
  }

  metric(metric: DreMetric): DreLine | undefined {
    return this.metrics.get(metric)
  }

  children(lineId: string): DreLine[] {
    return this.lines.filter((line) => line.parentId === lineId)
  }

  /**
   * Valor de uma linha em um conjunto de períodos: soma os meses, exceto saldos
   * (saldo inicial pega o primeiro mês, saldo final o último).
   */
  valueOf(line: DreLine | undefined, periodIndexes: readonly number[]): number {
    if (!line || !periodIndexes.length) return 0
    const label = normalizeText(line.label)
    if (label.startsWith('SALDO')) {
      const index = label.includes('FINAL') ? periodIndexes.at(-1) : periodIndexes[0]
      return line.values[index ?? 0] ?? 0
    }
    return periodIndexes.reduce((acc, i) => acc + (line.values[i] ?? 0), 0)
  }
}

// ---------- Interpretação da planilha ----------

interface PeriodHeader {
  rowIndex: number
  columns: number[]
  periods: Period[]
}

const isMonthCell = (value: string | undefined) => /^\d{1,2}$/.test(value?.trim() ?? '') && Number(value) >= 1 && Number(value) <= 12
const isYearCell = (value: string | undefined) => /^(19|20)\d{2}$/.test(value?.trim() ?? '')

/**
 * Procura a linha com os meses (1..12) que tenha, logo abaixo, os anos.
 * Meses repetidos são ignorados (fica a primeira ocorrência).
 */
function findPeriodHeader(rows: string[][]): PeriodHeader | null {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length - 1, 30); rowIndex++) {
    const monthRow = rows[rowIndex] ?? []
    const yearRow = rows[rowIndex + 1] ?? []
    const columns: number[] = []
    const periods: Period[] = []
    const seen = new Set<string>()

    monthRow.forEach((cell, col) => {
      if (!isMonthCell(cell) || !isYearCell(yearRow[col])) return
      const period = { year: Number(yearRow[col]), month: Number(cell) }
      if (seen.has(periodKey(period))) return
      seen.add(periodKey(period))
      columns.push(col)
      periods.push(period)
    })

    if (periods.length >= 3) return { rowIndex, columns, periods }
  }
  return null
}

const isUpperLabel = (label: string) => /\p{L}/u.test(label) && label === label.toUpperCase()

/** Grupo é a soma das linhas abaixo dele (tolerância de centavos). */
const isSumOf = (parent: number[], children: number[][]) =>
  parent.every((value, i) => {
    const sum = children.reduce((acc, child) => acc + (child[i] ?? 0), 0)
    return Math.abs(value - sum) <= 0.5 + Math.abs(value) * 1e-6
  })

/**
 * A DRE vem em blocos separados por linhas em branco:
 * - bloco de uma linha → resultado (Lucro Bruto, EBITDA...)
 * - cabeçalho = soma das demais → grupo com suas contas
 * - cabeçalho seguido de outro título em maiúsculas → seção (agrupa os grupos seguintes)
 * - caso contrário → linhas avulsas de saldo
 */
function classifyLines(entries: { label: string; values: number[] }[]): DreLine[] {
  const blocks: { label: string; values: number[] }[][] = [[]]
  for (const entry of entries) {
    if (entry.label) blocks.at(-1)!.push(entry)
    else if (blocks.at(-1)!.length) blocks.push([])
  }

  const lines: DreLine[] = []
  let section: string | null = null
  const add = (entry: { label: string; values: number[] }, kind: DreLineKind, parentId: string | null) => {
    const id = `l${lines.length}`
    lines.push({ id, label: entry.label, kind, parentId, values: entry.values })
    return id
  }

  const processBlock = (block: { label: string; values: number[] }[]) => {
    const [head, ...rest] = block
    if (!head) return

    if (!rest.length) {
      section = null
      add(head, isUpperLabel(head.label) ? DreLineKind.Result : DreLineKind.Balance, null)
      return
    }

    if (isSumOf(head.values, rest.map((r) => r.values))) {
      const groupId = add(head, DreLineKind.Group, section)
      rest.forEach((entry) => add(entry, DreLineKind.Account, groupId))
      return
    }

    if (isUpperLabel(rest[0]!.label)) {
      section = add(head, DreLineKind.Section, null)
      processBlock(rest)
      return
    }

    section = null
    block.forEach((entry) => add(entry, DreLineKind.Balance, null))
  }

  blocks.forEach(processBlock)
  return lines
}

/** Primeiro e último período com algum valor diferente de zero. */
function activeRange(lines: DreLine[], periodCount: number): [number, number] | null {
  const active = Array.from({ length: periodCount }, (_, i) => lines.some((line) => line.values[i] !== 0))
  const start = active.indexOf(true)
  const end = active.lastIndexOf(true)
  return start === -1 ? null : [start, end]
}

function matchMetrics(lines: DreLine[]): Map<DreMetric, DreLine> {
  const metrics = new Map<DreMetric, DreLine>()
  for (const [metric, labels] of Object.entries(METRIC_LABELS) as [DreMetric, string[]][]) {
    const line = lines.find((l) => labels.includes(normalizeText(l.label)))
    if (line) metrics.set(metric, line)
  }
  return metrics
}
