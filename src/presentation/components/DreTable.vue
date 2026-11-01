<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { DreLineKind, DreMetric, type DreLine, type DreReport } from '@/domain/dre'
import { formatPercent, formatPeriod, prettifyLabel } from '@/presentation/format'

const props = defineProps<{ report: DreReport; highlight: number[] }>()

const MODES = [
  { key: 'value', label: 'Valores (R$)' },
  { key: 'av', label: 'AV % da receita' },
] as const
const mode = ref<(typeof MODES)[number]['key']>('value')
const showZero = ref(false)
// Seções começam abertas (mostram os grupos); grupos começam fechados (escondem as contas)
const expanded = ref(new Set(props.report.lines.filter((l) => l.kind === DreLineKind.Section).map((l) => l.id)))

const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const revenue = computed(() => props.report.metric(DreMetric.GrossRevenue))
const isZero = (line: DreLine) => line.values.every((v) => v === 0)
const hasChildren = (line: DreLine) => props.report.lines.some((l) => l.parentId === line.id && (showZero.value || !isZero(l)))

const byId = computed(() => new Map(props.report.lines.map((l) => [l.id, l])))
const isVisible = (line: DreLine): boolean => {
  if (!showZero.value && isZero(line)) return false
  if (!line.parentId) return true
  const parent = byId.value.get(line.parentId)
  return !!parent && expanded.value.has(parent.id) && isVisible(parent)
}
const rows = computed(() => props.report.lines.filter(isVisible))

const depth = (line: DreLine) => (line.parentId ? (byId.value.get(line.parentId)?.parentId ? 2 : 1) : 0)

function toggle(line: DreLine) {
  const next = new Set(expanded.value)
  if (next.has(line.id)) next.delete(line.id)
  else next.add(line.id)
  expanded.value = next
}

function cell(line: DreLine, index: number) {
  const value = line.values[index] ?? 0
  if (mode.value === 'value') return value === 0 ? '–' : integer.format(value)
  const base = revenue.value?.values[index] ?? 0
  return base && value ? formatPercent(value / base) : '–'
}

// Começa mostrando os meses mais recentes (fim da rolagem horizontal)
const scroller = useTemplateRef('scroller')
const scrollToHighlight = () => {
  const el = scroller.value
  const column = el?.querySelector<HTMLElement>('[data-highlight]')
  if (el && column) el.scrollLeft = column.offsetLeft - el.clientWidth / 2
}
onMounted(scrollToHighlight)
watch(() => props.highlight, scrollToHighlight, { flush: 'post' })
</script>

<template>
  <div class="card overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
      <div role="radiogroup" aria-label="Exibir" class="flex rounded-lg border border-line bg-surface-muted p-0.5 text-sm">
        <button
          v-for="option in MODES"
          :key="option.key"
          type="button"
          role="radio"
          :aria-checked="mode === option.key"
          class="rounded-md px-2.5 py-1"
          :class="mode === option.key ? 'bg-surface text-fg shadow-card' : 'text-fg-subtle hover:text-fg'"
          @click="mode = option.key"
        >
          {{ option.label }}
        </button>
      </div>
      <label class="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
        <input v-model="showZero" type="checkbox" class="size-4 accent-(--accent)" />
        Mostrar contas zeradas
      </label>
    </div>

    <div ref="scroller" class="max-h-[70vh] overflow-auto">
      <table class="min-w-full text-sm tabular-nums">
        <thead class="sticky top-0 z-10 bg-surface-muted text-left">
          <tr>
            <th class="sticky left-0 z-10 min-w-64 bg-surface-muted px-3 py-2 font-medium">Conta</th>
            <th
              v-for="(period, i) in report.periods"
              :key="i"
              :data-highlight="highlight.includes(i) ? '' : undefined"
              class="px-3 py-2 text-right font-medium whitespace-nowrap"
              :class="highlight.includes(i) && 'bg-accent-soft text-accent'"
            >
              {{ formatPeriod(period) }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr
            v-for="line in rows"
            :key="line.id"
            class="transition-colors duration-(--duration-fast) hover:bg-accent-soft/30"
            :class="{
              'bg-surface-muted/60 font-semibold': line.kind === DreLineKind.Result,
              'font-medium': line.kind === DreLineKind.Section || line.kind === DreLineKind.Group,
              'text-fg-muted': line.kind === DreLineKind.Account || line.kind === DreLineKind.Balance,
            }"
          >
            <th
              scope="row"
              class="sticky left-0 bg-surface px-3 py-1.5 text-left font-[inherit] whitespace-nowrap"
              :class="line.kind === DreLineKind.Result && 'bg-surface-muted'"
              :style="{ paddingLeft: `${0.75 + depth(line) * 1.25}rem` }"
            >
              <button
                v-if="hasChildren(line)"
                type="button"
                class="-ml-1 inline-flex items-center gap-1.5 rounded px-1 hover:text-accent"
                :aria-expanded="expanded.has(line.id)"
                @click="toggle(line)"
              >
                <span
                  class="inline-block text-xs transition-transform duration-(--duration-base) ease-soft"
                  :class="expanded.has(line.id) && 'rotate-90'"
                  aria-hidden="true"
                  >▶</span
                >
                {{ prettifyLabel(line.label) }}
              </button>
              <span v-else>{{ prettifyLabel(line.label) }}</span>
            </th>
            <td
              v-for="(value, i) in line.values"
              :key="i"
              class="px-3 py-1.5 text-right whitespace-nowrap"
              :class="[highlight.includes(i) && 'bg-accent-soft/40', value < 0 && 'text-danger']"
            >
              {{ cell(line, i) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
