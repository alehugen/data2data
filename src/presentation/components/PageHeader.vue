<script setup lang="ts">
import { PhArrowLeft } from '@phosphor-icons/vue'

defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <header class="flex animate-fade-up flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      <RouterLink :to="{ name: 'import' }" class="group inline-flex items-center gap-1 rounded-md text-sm text-fg-subtle hover:text-accent">
        <PhArrowLeft :size="14" weight="bold" class="transition-transform duration-(--duration-base) ease-soft group-hover:-translate-x-0.5" aria-hidden="true" />
        Meus relatórios
      </RouterLink>
      <h1 class="mt-2 text-2xl font-semibold">{{ title }}</h1>
      <p v-if="subtitle" class="truncate text-sm text-fg-subtle">{{ subtitle }}</p>
    </div>
    <slot />
  </header>
</template>
