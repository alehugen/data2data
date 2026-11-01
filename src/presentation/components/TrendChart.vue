<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { useChartTheme } from '@/presentation/composables/useChartTheme'
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
} from '@/presentation/format'

use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, SVGRenderer])

export interface TrendSeries {
  name: string
  type: 'bar' | 'line'
  data: (number | null)[]
  /** Cor fixa (ex.: classe ABC); sem ela, segue a ordem da paleta categórica */
  color?: string
  stack?: string
}

const props = withDefaults(
  defineProps<{
    categories: string[]
    series: TrendSeries[]
    format?: 'currency' | 'percent' | 'number'
    height?: number
    /** Destaca a categoria do período selecionado */
    highlightIndex?: number
  }>(),
  { format: 'currency', height: 280, highlightIndex: undefined },
)

const theme = useChartTheme()

const formatters = {
  currency: { full: formatCurrency, axis: formatCurrencyCompact },
  percent: { full: formatPercent, axis: formatPercent },
  number: { full: formatNumber, axis: formatNumber },
}

const option = computed<EChartsOption>(() => {
  const { chrome, series: palette, tooltip, fontFamily } = theme.value
  const { full, axis } = formatters[props.format]
  const hasLegend = props.series.length > 1
  const stackTops = new Map(props.series.filter((s) => s.stack).map((s) => [s.stack, s.name]))

  return {
    textStyle: { fontFamily },
    animationDuration: 500,
    grid: { left: 8, right: 16, top: hasLegend ? 40 : 12, bottom: 8, containLabel: true },
    legend: hasLegend
      ? { top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: chrome.textMuted } }
      : undefined,
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: `${chrome.grid}99` } },
      valueFormatter: (value) => (value == null ? '—' : full(Number(value))),
    },
    xAxis: {
      type: 'category',
      data: props.categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: chrome.axis } },
      axisLabel: {
        color: chrome.textMuted,
        formatter: (value: string, index: number) => (index === props.highlightIndex ? `{active|${value}}` : value),
        rich: { active: { color: chrome.text, fontWeight: 700 } },
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: chrome.textMuted, formatter: (v: number) => axis(v) },
      splitLine: { lineStyle: { color: chrome.grid } },
    },
    series: props.series.map((s, i) => {
      const color = s.color ?? palette[i % palette.length]
      if (s.type === 'line') {
        return {
          type: 'line',
          name: s.name,
          data: s.data,
          color,
          lineStyle: { width: 2 },
          symbol: 'circle',
          symbolSize: 8,
          showSymbol: props.categories.length <= 12,
          connectNulls: false,
        }
      }
      // Ponta arredondada só na extremidade do dado (topo da pilha / fim da barra)
      const roundsEnd = !s.stack || stackTops.get(s.stack) === s.name
      return {
        type: 'bar',
        name: s.name,
        stack: s.stack,
        color,
        barMaxWidth: 28,
        data: s.data.map((value) => ({
          value,
          itemStyle: {
            borderRadius: roundsEnd ? ((value ?? 0) >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]) : 0,
            borderColor: chrome.surface,
            borderWidth: s.stack ? 1 : 0,
          },
        })),
      }
    }),
  }
})
</script>

<template>
  <VChart :option="option" :style="{ height: `${height}px` }" autoresize />
</template>
