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

/** Gera estatísticas, agrupamentos e pontos de análise iniciais para um Dataset. */
export class AnalyzeDatasetUseCase {
  execute(dataset: Dataset): DatasetAnalysis {
    const numericColumns = dataset.columns
      .filter((column) => column.type === ColumnType.Number)
      .map((column) => ({
        column,
        statistics: computeStatistics(dataset.columnValues(column.key)),
      }))

    // Primeira coluna de texto vira a dimensão de agrupamento padrão
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
          },
        ]
      }),
    ]

    return { numericColumns, breakdowns, insights }
  }
}
