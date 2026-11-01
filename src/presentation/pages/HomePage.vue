<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { comparePeriods } from '@/domain/shared'
import FileDropzone from '@/presentation/components/FileDropzone.vue'
import { monthLabel } from '@/presentation/composables/useAbcAnalysis'
import { useFileImport } from '@/presentation/composables/useFileImport'
import { useReports } from '@/presentation/composables/useReports'
import { formatPeriod } from '@/presentation/format'

const router = useRouter()
const { reports, dreReports, abcReports, datasets, refresh, remove } = useReports()
const { isImporting, errors, importFiles } = useFileImport()

onMounted(refresh)

const abcMonths = computed(() =>
  [...abcReports.value].sort((a, b) => (a.period && b.period ? comparePeriods(a.period, b.period) : 0)),
)

/** Leva direto para a análise do que acabou de ser importado. */
async function onSelect(files: File[]) {
  const imported = await importFiles(files)
  const [first] = imported
  if (!first) return
  if (imported.every((r) => r.kind === 'abc')) router.push({ name: 'abc' })
  else if (imported.length === 1 && first.kind === 'dre') router.push({ name: 'dre', params: { id: first.id } })
  else if (imported.length === 1 && first.kind === 'dataset') router.push({ name: 'dataset', params: { id: first.id } })
}
</script>

<template>
  <section class="space-y-10">
    <div class="animate-fade-up">
      <h1 class="text-2xl font-semibold">Importar relatórios</h1>
      <p class="mt-1 text-fg-muted">
        Envie a planilha da <strong class="font-medium text-fg">DRE</strong> e os CSVs de
        <strong class="font-medium text-fg">Curva ABC</strong> (um por mês). Outras tabelas também podem ser exploradas.
      </p>
    </div>

    <FileDropzone class="animate-fade-up stagger" style="--i: 1" :disabled="isImporting" @select="onSelect" />

    <TransitionGroup name="fade" tag="div" class="space-y-2">
      <p v-for="error in errors" :key="error" role="alert" class="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
        {{ error }}
      </p>
    </TransitionGroup>

    <div v-if="reports.length" class="grid gap-6 lg:grid-cols-2">
      <!-- DRE -->
      <div v-if="dreReports.length" class="space-y-3">
        <h2 class="text-lg font-semibold">Demonstração do resultado</h2>
        <TransitionGroup name="list" tag="ul" class="relative space-y-2">
          <li
            v-for="(report, i) in dreReports"
            :key="report.id"
            class="card card-interactive flex animate-fade-up stagger items-center justify-between gap-4 px-4 py-3"
            :style="{ '--i': i }"
          >
            <RouterLink :to="{ name: 'dre', params: { id: report.id } }" class="group min-w-0 flex-1 rounded-md">
              <p class="truncate font-medium group-hover:text-accent">{{ report.name }}</p>
              <p class="text-sm text-fg-subtle">
                {{ report.periods.length }} meses · {{ formatPeriod(report.periods[0]!) }} a
                {{ formatPeriod(report.periods.at(-1)!) }}
              </p>
            </RouterLink>
            <button type="button" class="btn btn-sm btn-danger" @click="remove(report.id)">Remover</button>
          </li>
        </TransitionGroup>
      </div>

      <!-- Curva ABC: todos os meses em um só painel -->
      <div v-if="abcMonths.length" class="space-y-3">
        <h2 class="text-lg font-semibold">Curva ABC</h2>
        <div class="card card-interactive animate-fade-up px-4 py-3">
          <RouterLink :to="{ name: 'abc' }" class="group block rounded-md">
            <p class="font-medium group-hover:text-accent">Análise mensal da Curva ABC</p>
            <p class="text-sm text-fg-subtle">{{ abcMonths.length }} {{ abcMonths.length === 1 ? 'mês importado' : 'meses importados' }}</p>
          </RouterLink>
          <TransitionGroup name="list" tag="ul" class="relative mt-3 flex flex-wrap gap-2">
            <li
              v-for="report in abcMonths"
              :key="report.id"
              class="inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted py-0.5 pr-1 pl-3 text-sm"
            >
              {{ monthLabel(report) }}
              <button
                type="button"
                class="btn btn-danger size-6 rounded-full p-0"
                :aria-label="`Remover ${monthLabel(report)}`"
                @click="remove(report.id)"
              >
                ×
              </button>
            </li>
          </TransitionGroup>
        </div>
      </div>

      <!-- Tabelas genéricas -->
      <div v-if="datasets.length" class="space-y-3 lg:col-span-2">
        <h2 class="text-lg font-semibold">Outras tabelas</h2>
        <TransitionGroup name="list" tag="ul" class="relative space-y-2">
          <li
            v-for="(dataset, i) in datasets"
            :key="dataset.id"
            class="card card-interactive flex animate-fade-up stagger items-center justify-between gap-4 px-4 py-3"
            :style="{ '--i': i }"
          >
            <RouterLink :to="{ name: 'dataset', params: { id: dataset.id } }" class="group min-w-0 flex-1 rounded-md">
              <p class="truncate font-medium group-hover:text-accent">{{ dataset.name }}</p>
              <p class="text-sm text-fg-subtle">
                {{ dataset.sourceFormat.toUpperCase() }} · {{ dataset.rowCount }} linhas · {{ dataset.columns.length }} colunas
              </p>
            </RouterLink>
            <button type="button" class="btn btn-sm btn-danger" @click="remove(dataset.id)">Remover</button>
          </li>
        </TransitionGroup>
      </div>
    </div>
  </section>
</template>
