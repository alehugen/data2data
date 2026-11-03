<script setup lang="ts">
import { PhArrowLeft } from '@phosphor-icons/vue'
import { Button } from '@/presentation/components/ui/button'

defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <header class="flex animate-fade-up flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      <Button as-child variant="ghost" size="sm" class="group -ml-2.5 text-muted-foreground hover:text-primary">
        <RouterLink :to="{ name: 'import' }">
          <PhArrowLeft
            weight="bold"
            class="transition-transform duration-(--duration-base) ease-soft group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
          Meus relatórios
        </RouterLink>
      </Button>
      <h1 class="mt-2 text-2xl font-semibold">{{ title }}</h1>
      <p v-if="subtitle" class="truncate text-sm text-muted-foreground">{{ subtitle }}</p>
    </div>
    <slot />
  </header>
</template>
