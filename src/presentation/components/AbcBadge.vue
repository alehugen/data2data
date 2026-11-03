<script setup lang="ts">
import type { AbcClass } from '@/domain/abc'
import { useChartTheme } from '@/presentation/composables/useChartTheme'

defineProps<{ abcClass: AbcClass | null }>()
const theme = useChartTheme()
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 text-xs leading-5 font-semibold"
    :class="!abcClass && 'text-muted-foreground'"
  >
    <span v-if="abcClass" class="size-2 rounded-full" :style="{ background: theme.abcClass[abcClass] }" aria-hidden="true" />
    {{ abcClass ?? '–' }}
  </span>
</template>
