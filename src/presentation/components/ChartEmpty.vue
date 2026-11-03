<script setup lang="ts">
import { PhChartBar } from '@phosphor-icons/vue'

withDefaults(defineProps<{ message?: string }>(), { message: 'Sem dados para exibir neste período.' })
</script>

<template>
  <div class="flex h-40 flex-col items-center justify-center gap-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
    <PhChartBar :size="24" weight="duotone" aria-hidden="true" />
    {{ message }}
  </div>
</template>
