<script setup lang="ts">
import ChartCard from '@/presentation/components/ChartCard.vue'
import RankingBarChart from '@/presentation/components/RankingBarChart.vue'
import StatCard from '@/presentation/components/StatCard.vue'
import { useDatasetAnalysis } from '@/presentation/composables/useDatasetAnalysis'
import { formatNumber } from '@/presentation/format'

const props = defineProps<{ id: string }>()
const { dataset, analysis } = useDatasetAnalysis(() => props.id)

const PREVIEW_ROWS = 20
</script>

<template>
  <div v-if="!dataset" class="animate-fade-up space-y-2">
    <p class="text-fg-muted">Tabela não encontrada. Os dados ficam só na memória: importe o arquivo novamente.</p>
    <RouterLink to="/" class="link">Voltar</RouterLink>
  </div>

  <section v-else class="space-y-8">
    <div class="animate-fade-up">
      <RouterLink to="/" class="group inline-flex items-center gap-1 rounded-md text-sm text-fg-subtle hover:text-accent">
        <span class="transition-transform duration-(--duration-base) ease-soft group-hover:-translate-x-0.5">←</span>
        Voltar
      </RouterLink>
      <h1 class="mt-2 text-2xl font-semibold">{{ dataset.name }}</h1>
    </div>

    <div v-if="analysis" class="space-y-3">
      <h2 class="text-lg font-semibold">Pontos de análise</h2>
      <ul class="grid gap-3 sm:grid-cols-2">
        <li
          v-for="(insight, i) in analysis.insights"
          :key="insight.title"
          class="card card-interactive animate-fade-up stagger p-4"
          :style="{ '--i': i }"
        >
          <p class="font-medium">{{ insight.title }}</p>
          <p class="mt-1 text-sm text-fg-muted">{{ insight.description }}</p>
        </li>
      </ul>
    </div>

    <div v-if="analysis?.breakdowns.length" class="space-y-3">
      <h2 class="text-lg font-semibold">Gráficos</h2>
      <div class="grid gap-3 lg:grid-cols-2">
        <ChartCard
          v-for="(breakdown, i) in analysis.breakdowns"
          :key="breakdown.valueKey"
          :title="`${breakdown.valueKey} por ${breakdown.categoryKey}`"
          subtitle="Soma por categoria, do maior para o menor"
          class="animate-fade-up stagger"
          :style="{ '--i': i }"
        >
          <RankingBarChart
            :items="breakdown.items.map((item) => ({ label: item.category, value: item.total }))"
            :value-label="breakdown.valueKey"
          />
        </ChartCard>
      </div>
    </div>

    <div
      v-for="({ column, statistics }, i) in analysis?.numericColumns"
      :key="column.key"
      class="animate-fade-up stagger space-y-3"
      :style="{ '--i': i + 2 }"
    >
      <h3 class="font-semibold">{{ column.label }}</h3>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Soma" :value="formatNumber(statistics.sum)" />
        <StatCard label="Média" :value="formatNumber(statistics.mean)" />
        <StatCard label="Mínimo" :value="formatNumber(statistics.min)" />
        <StatCard label="Máximo" :value="formatNumber(statistics.max)" />
      </div>
    </div>

    <div class="animate-fade-up space-y-3">
      <h2 class="text-lg font-semibold">Prévia dos dados</h2>
      <div class="card overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-surface-muted text-left">
            <tr>
              <th v-for="column in dataset.columns" :key="column.key" class="px-3 py-2 font-medium whitespace-nowrap">
                {{ column.label }}
                <span class="ml-1 text-xs font-normal text-fg-subtle">{{ column.type }}</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr
              v-for="(row, i) in dataset.rows.slice(0, PREVIEW_ROWS)"
              :key="i"
              class="transition-colors duration-(--duration-fast) hover:bg-accent-soft/40"
            >
              <td v-for="column in dataset.columns" :key="column.key" class="px-3 py-2 whitespace-nowrap">
                {{ row[column.key] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
