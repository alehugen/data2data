import {
  computeBreakdown,
  computeStatistics,
  type CategoryBreakdown,
  type ColumnStatistics,
  type Insight,
} from '@/domain/analysis'
import { ColumnType, type Column, type Dataset } from '@/domain/dataset'

export interface ColumnAnalysis {
  readonly column: Column
  readonly statistics: ColumnStatistics
}

export interface DatasetAnalysis {
  readonly numericColumns: ColumnAnalysis[]
  readonly breakdowns: CategoryBreakdown[]
  readonly insights: Insight[]
}

export class AnalyzeDatasetUseCase {
  execute(dataset: Dataset): DatasetAnalysis {
    const numericColumns = dataset.columns
      .filter((column) => column.type === ColumnType.Number)
      .map((column) => ({
        column,
        statistics: computeStatistics(dataset.columnValues(column.key)),
      }))

    const categoryColumn = dataset.columns.find((column) => column.type === ColumnType.Text)
    const breakdowns: CategoryBreakdown[] = categoryColumn
      ? numericColumns.map(({ column }) => ({
          categoryKey: categoryColumn.key,
          valueKey: column.key,
          items: computeBreakdown(
            dataset.columnValues(categoryColumn.key),
            dataset.columnValues(column.key),
          ),
        }))
      : []

    const insights: Insight[] = [
      {
        title: 'Visão geral',
        description: `${dataset.rowCount} linhas e ${dataset.columns.length} colunas, sendo ${numericColumns.length} numéricas.`,
        tone: 'neutral',
        explanation: 'Contagem de linhas preenchidas e colunas da tabela. Uma coluna é numérica quando todos os seus valores podem ser lidos como número.',
      },
      ...breakdowns.flatMap(({ categoryKey, valueKey, items }) => {
        const [top] = items
        const total = items.reduce((acc, item) => acc + item.total, 0)
        if (!top || total === 0) return []
        const share = Math.round((top.total / total) * 100)
        return [
          {
            title: `Maior ${valueKey}`,
            description: `"${top.category}" concentra ${share}% do total de ${valueKey} por ${categoryKey}.`,
            tone: 'neutral' as const,
            explanation: `Soma de ${valueKey} agrupada por ${categoryKey} (a primeira coluna de texto da tabela). Percentual = maior grupo ÷ soma de todos os grupos.`,
          },
        ]
      }),
    ]

    return { numericColumns, breakdowns, insights }
  }
}
