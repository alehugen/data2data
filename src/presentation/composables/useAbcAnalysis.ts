import { computed, ref, watch } from 'vue'
import { AbcMovement, type AbcAnalysis, type AbcProfitability, type ProfitabilityItem } from '@/application'
import type { Insight } from '@/domain/analysis'
import { container } from '@/infrastructure/container'
import {
  formatAbcMonth,
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
} from '@/presentation/format'
import { useReports } from './useReports'

export const MOVEMENT_LABELS: Record<AbcMovement, string> = {
  new: 'Novo',
  up: 'Subiu',
  down: 'Caiu',
  same: 'Manteve',
  gone: 'Saiu',
}

export function useAbcAnalysis() {
  const { abcReports, profitReports } = useReports()
  const selectedId = ref<string | null>(null)

  const analysis = computed(() =>
    container.analyzeAbc.execute(abcReports.value, profitReports.value, selectedId.value ?? undefined),
  )

  watch(abcReports, (reports) => {
    if (selectedId.value && !reports.some((r) => r.id === selectedId.value)) selectedId.value = null
  })

  const insights = computed(() => (analysis.value ? buildAbcInsights(analysis.value) : []))
  const profitInsights = computed(() =>
    analysis.value?.profitability ? buildProfitInsights(analysis.value.profitability, analysis.value) : [],
  )

  return { analysis, selectedId, insights, profitInsights }
}

const listNames = (items: readonly { description: string }[], limit = 3) =>
  `${items.slice(0, limit).map((item) => item.description).join(', ')}${items.length > limit ? '…' : ''}`

const describeMargins = (items: readonly ProfitabilityItem[]) =>
  items
    .slice(0, 3)
    .map((item) => `${item.description} (${formatPercent(item.margin ?? 0)})`)
    .join(', ')

export function buildProfitInsights(profitability: AbcProfitability, { previous }: AbcAnalysis): Insight[] {
  const { totals, previousTotals, byClass, lowMarginVolume, hiddenGems, losses, missingCost, mismatches, items } =
    profitability
  const insights: Insight[] = []
  const previousMonth = previous ? formatAbcMonth(previous.report) : ''
  const averageMargin = formatPercent(totals.margin ?? 0)

  if (previousTotals) {
    const change = previousTotals.profit ? (totals.profit - previousTotals.profit) / Math.abs(previousTotals.profit) : 0
    insights.push({
      title: change >= 0 ? 'Lucro em alta' : 'Lucro em queda',
      description: `Lucro de ${formatCurrencyCompact(totals.profit)} (margem de ${averageMargin}), ${change >= 0 ? 'alta' : 'queda'} de ${formatPercent(Math.abs(change))} frente a ${previousMonth}.`,
      tone: change >= 0 ? 'positive' : 'negative',
      explanation: `Lucro = valor vendido − custo gerencial − impostos − taxas financeiras, somado em todos os itens do relatório de lucro. Variação comparada com o relatório de lucro de ${previousMonth}.`,
    })
  }

  const classA = byClass.A
  if (classA.revenue) {
    insights.push({
      title: 'Lucro da classe A',
      description: `A classe A gera ${formatPercent(classA.profitShare)} do lucro do mês, com margem de ${formatPercent(classA.margin ?? 0)} (média geral: ${averageMargin}).`,
      tone: (classA.margin ?? 0) >= (totals.margin ?? 0) ? 'positive' : 'negative',
      explanation: `Lucro dos itens classe A ÷ lucro total do mês. Margem da classe = lucro ÷ valor vendido desses itens. Se a classe que mais vende tem margem abaixo da média, o volume não está se convertendo em lucro.`,
    })
  }

  if (lowMarginVolume.length) {
    insights.push({
      title: 'Vende muito, lucra pouco',
      description: `${lowMarginVolume.length} ${lowMarginVolume.length === 1 ? 'item da classe A tem' : 'itens da classe A têm'} margem abaixo da média: ${describeMargins(lowMarginVolume)}.`,
      tone: 'negative',
      explanation: `Itens classe A (maior volume) com margem de lucro menor que a média do mês (${averageMargin}). São candidatos a revisão de preço ou de custo de compra. Itens sem custo cadastrado ficam de fora.`,
    })
  }

  if (hiddenGems.length) {
    insights.push({
      title: 'Alta margem pouco explorada',
      description: `${hiddenGems.length} ${hiddenGems.length === 1 ? 'item das classes B/C tem' : 'itens das classes B/C têm'} margem acima da média: ${describeMargins(hiddenGems)}.`,
      tone: 'positive',
      explanation: `Itens fora da classe A, com lucro positivo e margem acima da média do mês (${averageMargin}). Vender mais deles aumenta o lucro com eficiência. Itens sem custo cadastrado ficam de fora.`,
    })
  }

  const bestPerUnit = items
    .filter((item) => !item.costMissing && item.profitPerUnit !== null)
    .sort((a, b) => b.profitPerUnit! - a.profitPerUnit!)[0]
  if (bestPerUnit) {
    insights.push({
      title: 'Maior lucro por unidade',
      description: `${bestPerUnit.description}: ${formatCurrency(bestPerUnit.profitPerUnit!)} de lucro a cada unidade vendida.`,
      tone: 'neutral',
      explanation: 'Lucro do item ÷ quantidade vendida no mês. Itens sem custo cadastrado ficam de fora.',
    })
  }

  if (losses.length) {
    insights.push({
      title: 'Itens com prejuízo',
      description: `${losses.length} ${losses.length === 1 ? 'item teve' : 'itens tiveram'} lucro negativo: ${listNames(losses)}.`,
      tone: 'negative',
      explanation: 'Itens em que custo gerencial + impostos + taxas superaram o valor vendido no mês.',
    })
  }

  if (missingCost.length) {
    insights.push({
      title: 'Custo não cadastrado',
      description: `${missingCost.length} ${missingCost.length === 1 ? 'item está' : 'itens estão'} com custo zero, o que infla a margem: ${listNames(missingCost)}.`,
      tone: 'negative',
      explanation: 'Itens vendidos com custo gerencial igual a zero no relatório de lucro. Provavelmente falta o custo no cadastro do sistema; o lucro desses itens aparece igual ao valor vendido.',
    })
  }

  const divergences = mismatches.onlyInAbc.length + mismatches.onlyInProfit.length + mismatches.revenueDiffers.length
  if (divergences) {
    const parts = [
      mismatches.onlyInAbc.length ? `só na Curva ABC: ${listNames(mismatches.onlyInAbc.map((description) => ({ description })))}` : '',
      mismatches.onlyInProfit.length ? `só no relatório de lucro: ${listNames(mismatches.onlyInProfit.map((description) => ({ description })))}` : '',
      mismatches.revenueDiffers.length ? `${mismatches.revenueDiffers.length} com valor de venda diferente` : '',
    ].filter(Boolean)
    insights.push({
      title: 'Divergência entre relatórios',
      description: `${parts.join('; ')}.`,
      tone: 'negative',
      explanation: 'Compara os dois relatórios do mesmo mês pelo código do produto. Itens que aparecem em só um deles, ou com valor de venda diferente, indicam exportações de períodos ou filtros diferentes.',
    })
  }

  return insights
}

const shareOf = (part: number, total: number) => (total ? part / total : 0)

export function buildAbcInsights({ current, previous, ranking, movements }: AbcAnalysis): Insight[] {
  const items: Insight[] = []
  const classA = current.byClass.A
  const basis = current.report.basis === 'value' ? 'faturamento' : 'quantidade'
  const previousMonth = previous ? formatAbcMonth(previous.report) : ''

  if (classA.items) {
    items.push({
      title: 'Concentração na classe A',
      description: `${classA.items} de ${current.items} itens (${formatPercent(shareOf(classA.items, current.items))}) respondem por ${formatPercent(shareOf(classA.quantity, current.quantity))} da quantidade e ${formatPercent(shareOf(classA.value, current.value))} do faturamento.`,
      tone: 'neutral',
      explanation: 'Itens, quantidade e faturamento da classe A divididos pelos totais do mês. Na curva ABC, poucos itens (classe A) costumam concentrar a maior parte do resultado.',
    })
  }

  const leader = ranking[0]
  if (leader) {
    items.push({
      title: 'Item líder',
      description: `${leader.description}: ${formatNumber(leader.quantity)} unidades e ${formatCurrency(leader.value)} (${formatPercent(leader.share)} da ${basis}).`,
      tone: 'neutral',
      explanation: `Primeiro item do relatório, ou seja, o de maior participação no critério de classificação (${basis}). O percentual é o informado pelo sistema de origem.`,
    })
  }

  const topValue = [...current.report.items].sort((a, b) => b.value - a.value)[0]
  if (topValue && topValue.value > 0 && topValue.code !== leader?.code) {
    items.push({
      title: 'Maior faturamento',
      description: `${topValue.description} gerou ${formatCurrency(topValue.value)}, ${formatPercent(shareOf(topValue.value, current.value))} do total do mês.`,
      tone: 'neutral',
      explanation: 'Item com o maior valor total no mês, exibido quando é diferente do item líder. Percentual = valor do item ÷ faturamento total do mês.',
    })
  }

  if (previous) {
    const change = shareOf(current.value - previous.value, previous.value)
    items.push({
      title: change >= 0 ? 'Faturamento em alta' : 'Faturamento em queda',
      description: `${formatCurrencyCompact(current.value)} no mês, ${change >= 0 ? 'alta' : 'queda'} de ${formatPercent(Math.abs(change))} frente a ${previousMonth}.`,
      tone: change >= 0 ? 'positive' : 'negative',
      explanation: `(Faturamento do mês − faturamento de ${previousMonth}) ÷ faturamento de ${previousMonth}. O faturamento é a soma do valor total de todos os itens.`,
    })

    const withMovement = (movement: AbcMovement) => movements.filter((m) => m.movement === movement)
    const up = withMovement(AbcMovement.Up)
    const down = withMovement(AbcMovement.Down)
    if (up.length || down.length) {
      items.push({
        title: 'Mudanças de classe',
        description: `${up.length} ${up.length === 1 ? 'item subiu' : 'itens subiram'} e ${down.length} ${down.length === 1 ? 'caiu' : 'caíram'} de classe.${up[0] ? ` Destaque: ${up[0].description} (${up[0].from} → ${up[0].to}).` : ''}`,
        tone: up.length >= down.length ? 'positive' : 'negative',
        explanation: `Itens vendidos em ${previousMonth} e neste mês cuja classe mudou. Subir é ir em direção à classe A (ex.: B → A); cair é o contrário. Fica positivo quando mais itens sobem do que caem.`,
      })
    }

    const added = withMovement(AbcMovement.New)
    const gone = withMovement(AbcMovement.Gone)
    if (added.length || gone.length) {
      const preview = (list: typeof added) => `${list.map((m) => m.description).slice(0, 3).join(', ')}${list.length > 3 ? '…' : ''}`
      items.push({
        title: 'Entradas e saídas do mix',
        description: [
          added.length ? `${added.length} novo(s): ${preview(added)}.` : '',
          gone.length ? `Sem vendas no mês: ${preview(gone)}.` : '',
        ]
          .filter(Boolean)
          .join(' '),
        tone: 'neutral',
        explanation: `Novos: itens vendidos neste mês que não apareceram em ${previousMonth}. Sem vendas: itens de ${previousMonth} que não apareceram neste mês. A comparação é pelo código do produto.`,
      })
    }

    const deltas = movements
      .filter((m) => m.movement !== AbcMovement.New && m.movement !== AbcMovement.Gone)
      .map((m) => ({ ...m, delta: m.value - m.previousValue }))
      .sort((a, b) => b.delta - a.delta)
    const deltaExplanation = `Diferença de faturamento (R$) de cada item entre ${previousMonth} e este mês, considerando só os itens vendidos nos dois meses.`
    const best = deltas[0]
    const worst = deltas.at(-1)
    if (best && best.delta > 0) {
      items.push({
        title: 'Maior alta de faturamento',
        description: `${best.description}: +${formatCurrency(best.delta)} em relação ao mês anterior.`,
        tone: 'positive',
        explanation: deltaExplanation,
      })
    }
    if (worst && worst.delta < 0) {
      items.push({
        title: 'Maior queda de faturamento',
        description: `${worst.description}: ${formatCurrency(worst.delta)} em relação ao mês anterior.`,
        tone: 'negative',
        explanation: deltaExplanation,
      })
    }
  }

  return items
}
