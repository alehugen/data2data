<script setup lang="ts">
import { computed } from 'vue'
import type { StatementLine } from '@/presentation/composables/useTemplates'
import { formatCurrencyWhole } from '@/presentation/format'

const props = defineProps<{ lines: readonly StatementLine[]; caption: string }>()

const rows = computed(() => {
  const base = Math.max(props.lines[0]?.value ?? 0, 1)
  let running = 0
  return props.lines.map((line, index) => {
    const from = line.kind === 'step' ? running : 0
    const to = line.kind === 'step' ? running + line.value : line.value
    running = to
    const left = Math.max(0, Math.min(from, to)) / base
    const width = Math.abs(to - from) / base
    const tone: keyof typeof BAR_CLASSES = line.kind === 'total' ? 'total' : line.value < 0 ? 'loss' : 'gain'
    return { ...line, index, left, width: Math.min(width, 1 - left), tone }
  })
})

const BAR_CLASSES = {
  gain: 'bg-success origin-left',
  loss: 'bg-destructive origin-right',
  total: 'bg-muted-foreground/70 origin-left',
}
</script>

<template>
  <table class="w-full text-[0.9375rem]">
    <caption class="pb-5 text-left font-figure text-xl font-semibold text-foreground">
      {{ caption }}
    </caption>
    <thead class="sr-only">
      <tr>
        <th scope="col">Linha da DRE</th>
        <th scope="col">Proporção da receita</th>
        <th scope="col">Valor</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="row in rows"
        :key="row.label"
        class="border-border"
        :class="row.kind === 'total' ? 'border-t font-semibold text-foreground' : 'text-body'"
      >
        <th scope="row" class="py-2.5 pr-3 text-left [font-weight:inherit]">
          <span :class="row.kind === 'total' && 'highlighter'">{{ row.label }}</span>
        </th>
        <td class="w-[36%] py-2.5" aria-hidden="true">
          <div class="relative h-2.5">
            <span
              class="absolute inset-y-0 animate-draw rounded-xs"
              :class="BAR_CLASSES[row.tone]"
              :style="{ left: `${row.left * 100}%`, width: `max(2px, ${row.width * 100}%)`, animationDelay: `${150 + row.index * 90}ms` }"
            />
          </div>
        </td>
        <td class="py-2.5 pl-3 text-right figure whitespace-nowrap" :class="row.value < 0 && 'text-destructive'">
          {{ formatCurrencyWhole(row.value) }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
