import { computed } from 'vue'
import { useTheme } from './useTheme'

const SERIES = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}

const CHROME = {
  light: {
    surface: '#ffffff',
    text: '#0f172a',
    textMuted: '#64748b',
    axis: '#cbd5e1',
    grid: '#e2e8f0',
    tooltipBorder: '#e2e8f0',
  },
  dark: {
    surface: '#0f172a',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    axis: '#334155',
    grid: '#1e293b',
    tooltipBorder: '#334155',
  },
}

export function useChartTheme() {
  const { isDark } = useTheme()

  return computed(() => {
    const mode = isDark.value ? 'dark' : 'light'
    const chrome = CHROME[mode]
    const series = SERIES[mode]
    const tooltip = {
      backgroundColor: chrome.surface,
      borderColor: chrome.tooltipBorder,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: chrome.text, fontSize: 13 },
      extraCssText: 'border-radius: 10px; box-shadow: 0 8px 24px -6px rgb(0 0 0 / 0.18);',
    }

    return {
      series,
      chrome,
      polarity: {
        positive: series[0]!,
        negative: series[7]!,
        total: chrome.textMuted,
      },
      abcClass: { A: series[0]!, B: series[1]!, C: series[2]! },
      fontFamily: "'Roboto Variable', ui-sans-serif, system-ui, sans-serif",
      axisTooltip: {
        ...tooltip,
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const, shadowStyle: { color: `${chrome.grid}99` } },
      },
    }
  })
}
