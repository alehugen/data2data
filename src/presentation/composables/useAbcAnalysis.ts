import { computed, ref, watch } from 'vue'
import { AbcMovement, type AbcAnalysis } from '@/application'
import { container } from '@/infrastructure/container'
import type { InsightItem } from '@/presentation/components/InsightList.vue'
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
  formatPeriod,
} from '@/presentation/format'
import type { AbcReport } from '@/domain/abc'
import { useReports } from './useReports'

export const monthLabel = (report: AbcReport) => (report.period ? formatPeriod(report.period) : report.name)

export const MOVEMENT_LABELS: Record<AbcMovement, string> = {
  new: 'Novo',
  up: 'Subiu',
  down: 'Caiu',
  same: 'Manteve',
  gone: 'Saiu',
}

export function useAbcAnalysis() {
  const { abcReports } = useReports()
  const selectedId = ref<string | null>(null)

  const analysis = computed(() => container.analyzeAbc.execute(abcReports.value, selectedId.value ?? undefined))

  // Se o mês selecionado for removido, volta para o mais recente
  watch(abcReports, (reports) => {
    if (selectedId.value && !reports.some((r) => r.id === selectedId.value)) selectedId.value = null
  })

  const insights = computed(() => (analysis.value ? buildInsights(analysis.value) : []))

  return { analysis, selectedId, insights }
}

function buildInsights({ current, previous, ranking, movements }: AbcAnalysis): InsightItem[] {
  const items: InsightItem[] = []
  const classA = current.byClass.A
  const basis = current.report.basis === 'value' ? 'faturamento' : 'quantidade'

  if (classA.items) {
    items.push({
      title: 'Concentração na classe A',
      description: `${classA.items} de ${current.items} itens (${formatPercent(classA.items / current.items)}) respondem por ${formatPercent(classA.quantity / current.quantity)} da quantidade e ${formatPercent(classA.value / current.value)} do faturamento.`,
      tone: 'neutral',
    })
  }

  const leader = ranking[0]
  if (leader) {
    items.push({
      title: 'Item líder',
      description: `${leader.description}: ${formatNumber(leader.quantity)} unidades e ${formatCurrency(leader.value)} (${formatPercent(leader.share)} da ${basis}).`,
      tone: 'neutral',
    })
  }

  const topValue = [...current.report.items].sort((a, b) => b.value - a.value)[0]
  if (topValue && topValue.code !== leader?.code) {
    items.push({
      title: 'Maior faturamento',
      description: `${topValue.description} gerou ${formatCurrency(topValue.value)}, ${formatPercent(topValue.value / current.value)} do total do mês.`,
      tone: 'neutral',
    })
  }

  if (previous) {
    const change = previous.value ? current.value / previous.value - 1 : 0
    items.push({
      title: change >= 0 ? 'Faturamento em alta' : 'Faturamento em queda',
      description: `${formatCurrencyCompact(current.value)} no mês, ${change >= 0 ? 'alta' : 'queda'} de ${formatPercent(Math.abs(change))} frente a ${monthLabel(previous.report)}.`,
      tone: change >= 0 ? 'positive' : 'negative',
    })

    const count = (movement: AbcMovement) => movements.filter((m) => m.movement === movement)
    const up = count(AbcMovement.Up)
    const down = count(AbcMovement.Down)
    if (up.length || down.length) {
      items.push({
        title: 'Mudanças de classe',
        description: `${up.length} ${up.length === 1 ? 'item subiu' : 'itens subiram'} e ${down.length} ${down.length === 1 ? 'caiu' : 'caíram'} de classe.${up[0] ? ` Destaque: ${up[0].description} (${up[0].from} → ${up[0].to}).` : ''}`,
        tone: up.length >= down.length ? 'positive' : 'negative',
      })
    }

    const added = count(AbcMovement.New)
    const gone = count(AbcMovement.Gone)
    if (added.length || gone.length) {
      items.push({
        title: 'Entradas e saídas do mix',
        description: [
          added.length ? `${added.length} novo(s): ${added.map((m) => m.description).slice(0, 3).join(', ')}${added.length > 3 ? '…' : ''}.` : '',
          gone.length ? `Sem vendas no mês: ${gone.map((m) => m.description).slice(0, 3).join(', ')}${gone.length > 3 ? '…' : ''}.` : '',
        ].filter(Boolean).join(' '),
        tone: 'neutral',
      })
    }

    const deltas = movements
      .filter((m) => m.movement !== AbcMovement.New && m.movement !== AbcMovement.Gone)
      .map((m) => ({ ...m, delta: m.value - m.previousValue }))
      .sort((a, b) => b.delta - a.delta)
    const best = deltas[0]
    const worst = deltas.at(-1)
    if (best && best.delta > 0) {
      items.push({
        title: 'Maior alta de faturamento',
        description: `${best.description}: +${formatCurrency(best.delta)} em relação ao mês anterior.`,
        tone: 'positive',
      })
    }
    if (worst && worst.delta < 0) {
      items.push({
        title: 'Maior queda de faturamento',
        description: `${worst.description}: ${formatCurrency(worst.delta)} em relação ao mês anterior.`,
        tone: 'negative',
      })
    }
  }

  return items
}
