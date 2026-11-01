import { computed } from 'vue'
import { useTheme } from './useTheme'

/**
 * Paleta categórica validada (ordem fixa, segura para daltonismo nos pares adjacentes).
 * Cada tema tem seus próprios tons — o escuro não é uma inversão automática.
 * Atribua por ordem e nunca cicle: acima de 8 séries, agrupe em "Outros".
 */
const SERIES = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}

/** Espelha os tokens do main.css (slate) em hex, pois o ECharts não lê variáveis CSS. */
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

    return {
      series,
      chrome,
      /** Polaridade (cascata, variações): azul ↔ vermelho; totais em cinza neutro */
      polarity: {
        positive: series[0]!,
        negative: series[7]!,
        total: chrome.textMuted,
      },
      /** Classes ABC seguem as 3 primeiras cores (validadas em todos os pares) */
      abcClass: { A: series[0]!, B: series[1]!, C: series[2]! },
      fontFamily: "'Roboto Variable', ui-sans-serif, system-ui, sans-serif",
      tooltip: {
        backgroundColor: chrome.surface,
        borderColor: chrome.tooltipBorder,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: chrome.text, fontSize: 13 },
        extraCssText: 'border-radius: 10px; box-shadow: 0 8px 24px -6px rgb(0 0 0 / 0.18);',
      },
    }
  })
}
