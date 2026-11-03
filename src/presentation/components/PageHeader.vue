<script setup lang="ts">
import { PhArrowLeft } from '@phosphor-icons/vue'
import { Button } from '@/presentation/components/ui/button'

defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
    <div class="min-w-0">
      <Button as-child variant="ghost" size="sm" class="-ml-2.5 text-muted-foreground hover:text-foreground">
        <RouterLink :to="{ name: 'import' }">
          <PhArrowLeft weight="bold" aria-hidden="true" />
          Meus relatórios
        </RouterLink>
      </Button>
      <h1 class="mt-3 text-4xl leading-tight font-bold tracking-tight">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 truncate text-muted-foreground">{{ subtitle }}</p>
    </div>
    <slot />
  </header>
</template>
