<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { ScatterChart } from 'echarts/charts'
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { useChartTheme } from '@/presentation/composables/useChartTheme'
import { escapeHtml, formatCurrency, formatNumber, formatPercent } from '@/presentation/format'

use([ScatterChart, GridComponent, MarkLineComponent, TooltipComponent, SVGRenderer])

export interface VolumeMarginPoint {
  label: string
  quantity: number
  margin: number
  profit: number
  color: string
  group: string
}

const props = defineProps<{ points: VolumeMarginPoint[]; averageMargin: number; averageQuantity: number }>()

const theme = useChartTheme()

const option = computed<EChartsOption>(() => {
  const { chrome, fontFamily, axisTooltip } = theme.value
  const reference = { color: chrome.textMuted, type: 'dashed' as const, width: 1 }

  return {
    textStyle: { fontFamily },
    animationDuration: 500,
    grid: { left: 8, right: 24, top: 24, bottom: 8, containLabel: true },
    tooltip: {
      ...axisTooltip,
      trigger: 'item',
      formatter: (params) => {
        const point = props.points[(Array.isArray(params) ? params[0] : params)?.dataIndex ?? 0]
        if (!point) return ''
        return [
          `<b>${escapeHtml(point.label)}</b>`,
          `${escapeHtml(point.group)}`,
          `Quantidade: <b>${formatNumber(point.quantity)}</b>`,
          `Margem: <b>${formatPercent(point.margin)}</b>`,
          `Lucro: <b>${formatCurrency(point.profit)}</b>`,
        ].join('<br/>')
      },
    },
    xAxis: {
      type: 'value',
      name: 'Quantidade vendida',
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { color: chrome.textMuted },
      axisLabel: { color: chrome.textMuted },
      splitLine: { lineStyle: { color: chrome.grid } },
    },
    yAxis: {
      type: 'value',
      name: 'Margem',
      nameTextStyle: { color: chrome.textMuted },
      axisLabel: { color: chrome.textMuted, formatter: (value: number) => formatPercent(value) },
      splitLine: { lineStyle: { color: chrome.grid } },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: 12,
        data: props.points.map((point) => ({
          value: [point.quantity, point.margin],
          itemStyle: { color: point.color, borderColor: chrome.surface, borderWidth: 2 },
        })),
        emphasis: { scale: 1.4 },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: reference,
          label: { color: chrome.textMuted, fontSize: 11 },
          data: [
            { yAxis: props.averageMargin, label: { formatter: `Margem média ${formatPercent(props.averageMargin)}`, position: 'insideEndTop' } },
            { xAxis: props.averageQuantity, label: { formatter: 'Volume médio', position: 'insideEndTop' } },
          ],
        },
      },
    ],
  }
})
</script>

<template>
  <VChart :option="option" style="height: 340px" autoresize />
</template>
