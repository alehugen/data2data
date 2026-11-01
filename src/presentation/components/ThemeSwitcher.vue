<script setup lang="ts">
import { computed } from 'vue'
import { ThemePreference, useTheme } from '@/presentation/composables/useTheme'

const { preference, setTheme } = useTheme()

const options = [
  { value: ThemePreference.Light, label: 'Claro' },
  { value: ThemePreference.Dark, label: 'Escuro' },
  { value: ThemePreference.System, label: 'Sistema' },
]

// Posição do indicador que desliza entre as opções
const activeIndex = computed(() => options.findIndex((option) => option.value === preference.value))
</script>

<template>
  <div
    role="radiogroup"
    aria-label="Tema"
    class="relative grid grid-cols-3 rounded-lg border border-line bg-surface-muted p-0.5 text-sm"
  >
    <span
      aria-hidden="true"
      class="absolute inset-y-0.5 left-0.5 w-[calc((100%-0.25rem)/3)] rounded-md bg-surface shadow-card transition-transform duration-(--duration-base) ease-soft"
      :style="{ transform: `translateX(${activeIndex * 100}%)` }"
    />
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="preference === option.value"
      class="relative rounded-md px-2.5 py-1"
      :class="preference === option.value ? 'text-fg' : 'text-fg-subtle hover:text-fg'"
      @click="setTheme(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
