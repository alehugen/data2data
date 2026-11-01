import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, watchEffect } from 'vue'

export const ThemePreference = {
  Light: 'light',
  Dark: 'dark',
  System: 'system',
} as const

export type ThemePreference = (typeof ThemePreference)[keyof typeof ThemePreference]

/** Chave e default também usados pelo script inline do index.html (evita flash de tema). */
const STORAGE_KEY = 'data2data:theme'
const DEFAULT_THEME: ThemePreference = ThemePreference.Dark

const isThemePreference = (value: unknown): value is ThemePreference =>
  Object.values(ThemePreference).includes(value as ThemePreference)

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isThemePreference(stored) ? stored : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export const useThemeStore = defineStore('theme', () => {
  const preference = ref<ThemePreference>(readStoredPreference())

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const systemPrefersDark = ref(mediaQuery.matches)
  mediaQuery.addEventListener('change', (event) => {
    systemPrefersDark.value = event.matches
  })

  const isDark = computed(() =>
    preference.value === ThemePreference.System
      ? systemPrefersDark.value
      : preference.value === ThemePreference.Dark,
  )

  // Store é singleton: estes efeitos são registrados uma única vez
  watchEffect(() => document.documentElement.classList.toggle('dark', isDark.value))

  watchEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference.value)
    } catch {
      // Armazenamento indisponível (modo privado etc.): o tema só não persiste
    }
  })

  function setPreference(value: ThemePreference) {
    preference.value = value
  }

  return { preference, isDark, setPreference }
})

export function useTheme() {
  const store = useThemeStore()
  const { preference, isDark } = storeToRefs(store)

  return { preference, isDark, setTheme: store.setPreference }
}
