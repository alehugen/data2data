<script setup lang="ts">
import AppFooter from '@/presentation/components/AppFooter.vue'
import SegmentedControl from '@/presentation/components/SegmentedControl.vue'
import { useScrolled } from '@/presentation/composables/useScroll'
import { ThemePreference, useTheme } from '@/presentation/composables/useTheme'

const { preference } = useTheme()
const scrolled = useScrolled()

const THEME_OPTIONS = [
  { value: ThemePreference.Light, label: 'Claro' },
  { value: ThemePreference.Dark, label: 'Escuro' },
  { value: ThemePreference.System, label: 'Sistema' },
]
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header
      class="sticky top-0 z-(--layer-header) h-16 border-b bg-surface/85 backdrop-blur-md transition-[box-shadow,border-color] duration-(--duration-base) ease-soft"
      :class="scrolled ? 'border-transparent shadow-(--elevation-header)' : 'border-line'"
    >
      <nav class="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4">
        <RouterLink to="/" class="group rounded-md text-lg font-bold">
          data<span
            class="inline-block text-accent transition-transform duration-(--duration-slow) ease-spring group-hover:-rotate-12 group-hover:scale-125"
            >2</span
          >data
        </RouterLink>
        <SegmentedControl v-model="preference" :options="THEME_OPTIONS" label="Tema" />
      </nav>
    </header>

    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
      <RouterView v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>

    <AppFooter />
  </div>
</template>
