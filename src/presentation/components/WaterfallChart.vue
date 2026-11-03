<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { WaterfallStep } from '@/application'
import ChartEmpty from './ChartEmpty.vue'
import { useChartTheme } from '@/presentation/composables/useChartTheme'
import { escapeHtml, formatCurrency, formatCurrencyCompact, prettifyLabel } from '@/presentation/format'

use([BarChart, GridComponent, TooltipComponent, SVGRenderer])

const props = defineProps<{ steps: WaterfallStep[] }>()
const theme = useChartTheme()

const ROW_HEIGHT = 34
const height = computed(() => `${props.steps.length * ROW_HEIGHT + 32}px`)

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
  const { chrome, polarity, axisTooltip, fontFamily } = theme.value
  const colorOf = (step: WaterfallStep) =>
    step.isTotal ? polarity.total : step.value >= 0 ? polarity.positive : polarity.negative

  const visibleSeries = (sign: 'positive' | 'negative') => ({
    type: 'bar' as const,
    stack: 'waterfall',
    barMaxWidth: 20,
    data: bars.value.map(({ step, ...parts }) => ({
      value: parts[sign],
      itemStyle: { color: colorOf(step), borderRadius: sign === 'positive' ? [0, 4, 4, 0] : [4, 0, 0, 4] },
    })),
    label: {
      show: true,
      position: sign === 'positive' ? ('right' as const) : ('left' as const),
      color: chrome.text,
      formatter: ({ dataIndex }: { dataIndex: number }) => {
        const step = props.steps[dataIndex]
        const labelled = step?.isTotal && (step.value >= 0) === (sign === 'positive')
        return labelled ? formatCurrencyCompact(step.value) : ''
      },
    },
  })

  return {
    textStyle: { fontFamily },
    animationDuration: 500,
    grid: { left: 8, right: 64, top: 8, bottom: 24, containLabel: true },
    tooltip: {
      ...axisTooltip,
      formatter: (params) => {
        const index = (Array.isArray(params) ? params[0] : params)?.dataIndex ?? 0
        const step = props.steps[index]
        if (!step) return ''
        const kind = step.isTotal ? 'Resultado' : step.value >= 0 ? 'Aumenta' : 'Reduz'
        return `${escapeHtml(prettifyLabel(step.label))}<br/><span style="color:${chrome.textMuted}">${kind}</span> <b>${formatCurrency(step.value)}</b>`
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
        formatter: (value: string, index: number) =>
          props.steps[index]?.isTotal ? `{total|${value.replace(/[{}|]/g, '')}}` : value,
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
      visibleSeries('positive'),
      visibleSeries('negative'),
    ],
  }
})
</script>

<template>
  <div>
    <ul class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda">
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
    <ChartEmpty v-if="!steps.length" />
    <VChart v-else :option="option" :style="{ height }" autoresize />
  </div>
</template>
