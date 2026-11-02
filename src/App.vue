<script setup lang="ts">
import SegmentedControl from '@/presentation/components/SegmentedControl.vue'
import { ThemePreference, useTheme } from '@/presentation/composables/useTheme'

const { preference } = useTheme()

const THEME_OPTIONS = [
  { value: ThemePreference.Light, label: 'Claro' },
  { value: ThemePreference.Dark, label: 'Escuro' },
  { value: ThemePreference.System, label: 'Sistema' },
]
</script>

<template>
  <header class="sticky top-0 z-10 border-b border-line bg-surface/80 backdrop-blur-md">
    <nav class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
      <RouterLink to="/" class="group rounded-md text-lg font-bold">
        data<span
          class="inline-block text-accent transition-transform duration-(--duration-slow) ease-spring group-hover:-rotate-12 group-hover:scale-125"
          >2</span
        >data
      </RouterLink>
      <SegmentedControl v-model="preference" :options="THEME_OPTIONS" label="Tema" />
    </nav>
  </header>

  <main class="mx-auto max-w-6xl px-4 py-8">
    <RouterView v-slot="{ Component, route }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </main>
</template>
