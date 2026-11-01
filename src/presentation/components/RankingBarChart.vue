<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { useChartTheme } from '@/presentation/composables/useChartTheme'
import { formatCompact, formatNumber } from '@/presentation/format'

// Registro tree-shaken: só entra no bundle o que este gráfico usa
use([BarChart, GridComponent, TooltipComponent, SVGRenderer])

export interface RankingItem {
  label: string
  value: number
  /** Cor da barra (ex.: classe ABC); padrão é a primeira cor da paleta */
  color?: string
  /** Linha extra no tooltip (ex.: "50,6% da receita") */
  detail?: string
}

const props = withDefaults(
  defineProps<{
    items: RankingItem[]
    /** Nome da medida, exibido no tooltip */
    valueLabel: string
    formatValue?: (value: number) => string
    formatAxis?: (value: number) => string
  }>(),
  { formatValue: formatNumber, formatAxis: formatCompact },
)

const theme = useChartTheme()

const BAR_HEIGHT = 30
const height = computed(() => `${props.items.length * BAR_HEIGHT + 40}px`)

const option = computed<EChartsOption>(() => {
  const { chrome, series, tooltip, fontFamily } = theme.value

  return {
    textStyle: { fontFamily },
    animationDuration: 500,
    animationEasing: 'cubicOut',
    grid: { left: 8, right: 24, top: 8, bottom: 24, containLabel: true },
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: `${chrome.grid}99` } },
      formatter: (params) => {
        const index = (Array.isArray(params) ? params[0] : params)?.dataIndex ?? 0
        const item = props.items[index]
        if (!item) return ''
        const detail = item.detail ? `<br/><span style="color:${chrome.textMuted}">${item.detail}</span>` : ''
        return `${item.label}<br/>${props.valueLabel}: <b>${props.formatValue(item.value)}</b>${detail}`
      },
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: chrome.textMuted, formatter: (value: number) => props.formatAxis(value) },
      splitLine: { lineStyle: { color: chrome.grid } },
    },
    yAxis: {
      type: 'category',
      inverse: true, // maior valor no topo
      data: props.items.map((item) => item.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: chrome.axis } },
      axisLabel: { color: chrome.textMuted, width: 180, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        name: props.valueLabel,
        data: props.items.map((item) => ({
          value: item.value,
          itemStyle: { color: item.color ?? series[0], borderRadius: [0, 4, 4, 0] },
        })),
        barMaxWidth: 18,
        emphasis: { itemStyle: { opacity: 0.85 } },
      },
    ],
  }
})
</script>

<template>
  <VChart :option="option" :style="{ height }" autoresize />
</template>
