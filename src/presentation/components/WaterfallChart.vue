<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { useChartTheme } from '@/presentation/composables/useChartTheme'
import { formatCurrency, formatCurrencyCompact, prettifyLabel } from '@/presentation/format'

use([BarChart, GridComponent, TooltipComponent, SVGRenderer])

export interface WaterfallStep {
  label: string
  value: number
  isTotal: boolean
}

const props = defineProps<{ steps: WaterfallStep[] }>()
const theme = useChartTheme()

const ROW_HEIGHT = 34
const height = computed(() => `${props.steps.length * ROW_HEIGHT + 32}px`)

/**
 * Cascata horizontal, lida de cima para baixo como a DRE.
 * Cada barra flutua de `start` a `end`; com empilhamento por sinal do ECharts,
 * três séries (base invisível + parte positiva + parte negativa) cobrem até barras que cruzam o zero.
 */
const bars = computed(() => {
  let running = 0
  return props.steps.map((step) => {
    const start = step.isTotal ? 0 : running
    const end = step.isTotal ? step.value : running + step.value
    running = end
    const lo = Math.min(start, end)
    const hi = Math.max(start, end)
    const [base, positive, negative] =
      lo >= 0 ? [lo, hi - lo, 0] : hi <= 0 ? [hi, 0, lo - hi] : [0, hi, lo]
    return { step, base, positive, negative }
  })
})

const option = computed<EChartsOption>(() => {
  const { chrome, polarity, tooltip, fontFamily } = theme.value
  const colorOf = (step: WaterfallStep) =>
    step.isTotal ? polarity.total : step.value >= 0 ? polarity.positive : polarity.negative

  const visible = (key: 'positive' | 'negative') =>
    bars.value.map(({ step, ...parts }) => ({
      value: parts[key],
      itemStyle: { color: colorOf(step), borderRadius: key === 'positive' ? [0, 4, 4, 0] : [4, 0, 0, 4] },
    }))

  return {
    textStyle: { fontFamily },
    animationDuration: 500,
    grid: { left: 8, right: 64, top: 8, bottom: 24, containLabel: true },
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: `${chrome.grid}99` } },
      formatter: (params) => {
        const index = (Array.isArray(params) ? params[0] : params)?.dataIndex ?? 0
        const step = props.steps[index]
        if (!step) return ''
        const kind = step.isTotal ? 'Resultado' : step.value >= 0 ? 'Aumenta' : 'Reduz'
        return `${prettifyLabel(step.label)}<br/><span style="color:${chrome.textMuted}">${kind}</span> <b>${formatCurrency(step.value)}</b>`
      },
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: chrome.textMuted, formatter: (v: number) => formatCurrencyCompact(v) },
      splitLine: { lineStyle: { color: chrome.grid } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: props.steps.map((s) => prettifyLabel(s.label)),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: chrome.axis } },
      axisLabel: {
        width: 190,
        overflow: 'truncate',
        color: chrome.textMuted,
        // Totais em destaque, como as linhas de resultado da DRE
        formatter: (value: string, index: number) => (props.steps[index]?.isTotal ? `{total|${value}}` : value),
        rich: { total: { color: chrome.text, fontWeight: 600 } },
      },
    },
    series: [
      {
        type: 'bar',
        stack: 'waterfall',
        silent: true,
        itemStyle: { color: 'transparent' },
        data: bars.value.map((b) => b.base),
      },
      {
        type: 'bar',
        stack: 'waterfall',
        barMaxWidth: 20,
        data: visible('positive'),
        // Rótulo só nos totais (seleção, não um número em cada barra)
        label: {
          show: true,
          position: 'right',
          color: chrome.text,
          formatter: ({ dataIndex }) => {
            const step = props.steps[dataIndex]
            return step?.isTotal && step.value >= 0 ? formatCurrencyCompact(step.value) : ''
          },
        },
      },
      {
        type: 'bar',
        stack: 'waterfall',
        barMaxWidth: 20,
        data: visible('negative'),
        label: {
          show: true,
          position: 'left',
          color: chrome.text,
          formatter: ({ dataIndex }) => {
            const step = props.steps[dataIndex]
            return step?.isTotal && step.value < 0 ? formatCurrencyCompact(step.value) : ''
          },
        },
      },
    ],
  }
})
</script>

<template>
  <div>
    <ul class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle" aria-label="Legenda">
      <li class="flex items-center gap-1.5">
        <span class="size-2.5 rounded-sm" :style="{ background: theme.polarity.total }" />Resultado
      </li>
      <li class="flex items-center gap-1.5">
        <span class="size-2.5 rounded-sm" :style="{ background: theme.polarity.positive }" />Aumenta
      </li>
      <li class="flex items-center gap-1.5">
        <span class="size-2.5 rounded-sm" :style="{ background: theme.polarity.negative }" />Reduz
      </li>
    </ul>
    <VChart :option="option" :style="{ height }" autoresize />
  </div>
</template>
